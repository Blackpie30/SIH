/**
 * Database Connection & Resilient Data Layer
 * Brain Bytes / EDUVIA Platform - Node.js & MySQL (mysql2/promise)
 * Supports live MySQL database and resilient fallback for local development/demo.
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// In-memory data store for fallback when MySQL is unreachable or unconfigured
const memoryStore = {
  users: new Map([
    [1, {
      id: 1,
      full_name: 'Alex Mercer',
      email: 'alex@eduvia.ai',
      password_hash: bcrypt.hashSync('Password123!', 10),
      university: 'Stanford University',
      major: 'Computer Science',
      avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHEm1VKlvIr1GGpW8PMjNrM8b8yyzPbNJLDoL2UNvqvy4mBubJWPJIYJdkUvUXXP_35X3Fv7xmaRRiUDQ8QONdKol7tIdhOow4MoOx90Z7nQ9aEaWGlCANxQlUbaE7B4xz_DiUp0msonFXrdSZnPEMnATTSh8GCRuJpyQ62-eueUNY-Nfc0a49ImSXn13w-kSZw0fmfxuQOGiiytGOXVpqCLx0KoESZkHM1bhzN2crcPAm7y7autvG',
      level: 4,
      tier_title: 'Level 4 • Problem Solver',
      division: 'Diamond Div II',
      streak_days: 12,
      longest_streak_days: 14,
      xp_balance: 2840,
      freezes_available: 2
    }]
  ]),
  doubts: new Map([
    [1001, {
      id: 1001,
      author_id: 1,
      title: 'Memory leak in linked list deletion',
      subject_domain: 'Data Structures & Algorithms',
      bounty_xp: 100,
      body_markdown: 'How does a linked list actually store nodes without causing memory leaks when deleting head nodes?',
      code_language: 'C++',
      code_snippet: 'void deleteNode(Node*& head) { ... }',
      error_type: 'Segmentation Fault',
      upvotes: 18,
      status: 'open',
      created_at: new Date()
    }]
  ]),
  doubtAnswers: new Map(),
  weakTopics: new Map(),
  voiceEvaluations: new Map(),
  nextDoubtId: 1002,
  nextAnswerId: 501,
  nextUserId: 2
};

let mysqlPool = null;
let isMySQLAvailable = null; // null = untried, true = active, false = fallback

try {
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'brain_bytes_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });

  if (mysqlPool && typeof mysqlPool.on === 'function') {
    mysqlPool.on('error', (err) => {
      isMySQLAvailable = false;
      console.warn('[Database] MySQL Pool error captured:', err.message);
    });
  }
} catch (err) {
  console.warn('[Database] Initial pool error:', err.message);
}

function handleMemoryQuery(sql, params = []) {
  const norm = sql.replace(/\s+/g, ' ').trim();

  // 1. SELECT xp_balance FROM users WHERE id = ?
  if (/SELECT\s+xp_balance\s+FROM\s+users\s+WHERE\s+id\s*=\s*\?/i.test(norm)) {
    const user = memoryStore.users.get(Number(params[0]));
    return [user ? [{ xp_balance: user.xp_balance }] : [], []];
  }

  // 2. UPDATE users SET xp_balance = xp_balance - ? WHERE id = ?
  if (/UPDATE\s+users\s+SET\s+xp_balance\s*=\s*xp_balance\s*-\s*\?\s+WHERE\s+id\s*=\s*\?/i.test(norm)) {
    const [decrement, userId] = params.map(Number);
    const user = memoryStore.users.get(userId);
    if (user) user.xp_balance = Math.max(0, user.xp_balance - decrement);
    return [{ affectedRows: user ? 1 : 0 }, []];
  }

  // 3. UPDATE users SET xp_balance = xp_balance + ? WHERE id = ?
  if (/UPDATE\s+users\s+SET\s+xp_balance\s*=\s*xp_balance\s*\+\s*\?\s+WHERE\s+id\s*=\s*\?/i.test(norm)) {
    const [increment, userId] = params.map(Number);
    const user = memoryStore.users.get(userId);
    if (user) user.xp_balance += increment;
    return [{ affectedRows: user ? 1 : 0 }, []];
  }

  // 4. INSERT INTO doubts ...
  if (/INSERT\s+INTO\s+doubts/i.test(norm)) {
    const id = memoryStore.nextDoubtId++;
    const doubt = {
      id,
      author_id: params[0],
      title: params[1],
      subject_domain: params[2],
      bounty_xp: params[3],
      body_markdown: params[4],
      code_language: params[5],
      code_snippet: params[6],
      error_type: params[7],
      upvotes: 0,
      status: 'open',
      created_at: new Date()
    };
    memoryStore.doubts.set(id, doubt);
    return [{ insertId: id, affectedRows: 1 }, []];
  }

  // 5. SELECT id, upvotes FROM doubts WHERE id = ?
  if (/SELECT\s+id,\s*upvotes\s+FROM\s+doubts\s+WHERE\s+id\s*=\s*\?/i.test(norm)) {
    const doubtId = Number(params[0]);
    const doubt = memoryStore.doubts.get(doubtId);
    return [doubt ? [{ id: doubt.id, upvotes: doubt.upvotes }] : [], []];
  }

  // 6. UPDATE doubts SET upvotes = upvotes + 1 WHERE id = ?
  if (/UPDATE\s+doubts\s+SET\s+upvotes\s*=\s*upvotes\s*\+\s*1\s+WHERE\s+id\s*=\s*\?/i.test(norm)) {
    const doubtId = Number(params[0]);
    const doubt = memoryStore.doubts.get(doubtId);
    if (doubt) doubt.upvotes += 1;
    return [{ affectedRows: doubt ? 1 : 0 }, []];
  }

  // 7. SELECT id, title, status FROM doubts WHERE id = ?
  if (/SELECT\s+id,\s*title,\s*status\s+FROM\s+doubts\s+WHERE\s+id\s*=\s*\?/i.test(norm)) {
    const doubtId = Number(params[0]);
    const doubt = memoryStore.doubts.get(doubtId);
    return [doubt ? [{ id: doubt.id, title: doubt.title, status: doubt.status }] : [], []];
  }

  // 8. INSERT INTO doubt_answers ...
  if (/INSERT\s+INTO\s+doubt_answers/i.test(norm)) {
    const id = memoryStore.nextAnswerId++;
    memoryStore.doubtAnswers.set(id, {
      id,
      doubt_id: params[0],
      author_id: params[1],
      content_markdown: params[2],
      code_snippet: params[3],
      ai_clarity_score: params[4],
      ai_feedback: params[5],
      created_at: new Date()
    });
    return [{ insertId: id, affectedRows: 1 }, []];
  }

  // 9. UPDATE doubts SET status = 'answered' WHERE id = ?
  if (/UPDATE\s+doubts\s+SET\s+status\s*=\s*'answered'\s+WHERE\s+id\s*=\s*\?/i.test(norm)) {
    const doubtId = Number(params[0]);
    const doubt = memoryStore.doubts.get(doubtId);
    if (doubt) doubt.status = 'answered';
    return [{ affectedRows: doubt ? 1 : 0 }, []];
  }

  // 10. SELECT streak_days, longest_streak_days, xp_balance, freezes_available FROM users WHERE id = ?
  if (/SELECT\s+streak_days,\s*longest_streak_days,\s*xp_balance,\s*freezes_available\s+FROM\s+users\s+WHERE\s+id\s*=\s*\?/i.test(norm)) {
    const user = memoryStore.users.get(Number(params[0])) || memoryStore.users.get(1);
    return [user ? [{
      streak_days: user.streak_days,
      longest_streak_days: user.longest_streak_days,
      xp_balance: user.xp_balance,
      freezes_available: user.freezes_available
    }] : [], []];
  }

  // 11. UPDATE users SET xp_balance = xp_balance + ?, streak_days = streak_days + 1 ...
  if (/UPDATE\s+users\s+SET\s+xp_balance\s*=\s*xp_balance\s*\+\s*\?,\s*streak_days\s*=\s*streak_days\s*\+\s*1/i.test(norm)) {
    const [increment, userId] = [Number(params[0]), Number(params[1])];
    const user = memoryStore.users.get(userId) || memoryStore.users.get(1);
    if (user) {
      user.xp_balance += increment;
      user.streak_days += 1;
      user.longest_streak_days = Math.max(user.longest_streak_days, user.streak_days);
    }
    return [{ affectedRows: user ? 1 : 0 }, []];
  }

  // 12. SELECT streak_days, xp_balance FROM users WHERE id = ?
  if (/SELECT\s+streak_days,\s*xp_balance\s+FROM\s+users\s+WHERE\s+id\s*=\s*\?/i.test(norm)) {
    const user = memoryStore.users.get(Number(params[0])) || memoryStore.users.get(1);
    return [user ? [{ streak_days: user.streak_days, xp_balance: user.xp_balance }] : [], []];
  }

  // 13. SELECT id FROM users WHERE email = ?
  if (/SELECT\s+id\s+FROM\s+users\s+WHERE\s+email\s*=\s*\?/i.test(norm)) {
    const email = String(params[0]).toLowerCase();
    const found = [...memoryStore.users.values()].find(u => u.email.toLowerCase() === email);
    return [found ? [{ id: found.id }] : [], []];
  }

  // 14. SELECT id, full_name, email, password_hash FROM users WHERE email = ?
  if (/SELECT\s+id,\s*full_name,\s*email,\s*password_hash\s+FROM\s+users\s+WHERE\s+email\s*=\s*\?/i.test(norm)) {
    const email = String(params[0]).toLowerCase();
    const found = [...memoryStore.users.values()].find(u => u.email.toLowerCase() === email);
    return [found ? [{
      id: found.id,
      full_name: found.full_name,
      email: found.email,
      password_hash: found.password_hash
    }] : [], []];
  }

  // 15. SELECT id, full_name, email, university, major, level, tier_title, division, streak_days, xp_balance, freezes_available FROM users WHERE id = ?
  if (/SELECT\s+id,\s*full_name,\s*email/i.test(norm)) {
    const user = memoryStore.users.get(Number(params[0])) || memoryStore.users.get(1);
    return [user ? [user] : [], []];
  }

  // 16. INSERT INTO users ...
  if (/INSERT\s+INTO\s+users/i.test(norm)) {
    const id = memoryStore.nextUserId++;
    const user = {
      id,
      full_name: params[0],
      email: params[1],
      password_hash: params[2],
      university: params[3] || 'Stanford University',
      major: params[4] || 'Computer Science',
      level: 1,
      tier_title: 'Level 1 • Novice',
      division: 'Novice',
      streak_days: 0,
      longest_streak_days: 0,
      xp_balance: 100,
      freezes_available: 2
    };
    memoryStore.users.set(id, user);
    return [{ insertId: id, affectedRows: 1 }, []];
  }

  // 17. weak_topics queries
  if (/weak_topics/i.test(norm)) {
    return [[], []];
  }

  // Default empty result
  return [[], []];
}

const pool = {
  async query(sql, params = []) {
    if (isMySQLAvailable !== false && mysqlPool) {
      try {
        const result = await mysqlPool.query(sql, params);
        if (isMySQLAvailable === null) {
          isMySQLAvailable = true;
          console.log('[Database] Connected to MySQL database successfully.');
        }
        return result;
      } catch (err) {
        if (
          err.code === 'ER_ACCESS_DENIED_ERROR' ||
          err.code === 'ECONNREFUSED' ||
          err.code === 'ER_BAD_DB_ERROR' ||
          err.code === 'ENOTFOUND' ||
          err.code === 'PROTOCOL_CONNECTION_LOST'
        ) {
          if (isMySQLAvailable !== false) {
            isMySQLAvailable = false;
            console.warn(`[Database] MySQL connection note (${err.code}). Running with resilient in-memory data store.`);
            if (mysqlPool) {
              try { mysqlPool.end().catch(() => {}); } catch (e) {}
              mysqlPool = null;
            }
          }
          return handleMemoryQuery(sql, params);
        }
        throw err;
      }
    }

    return handleMemoryQuery(sql, params);
  },

  async getConnection() {
    if (isMySQLAvailable !== false && mysqlPool) {
      try {
        return await mysqlPool.getConnection();
      } catch (err) {
        isMySQLAvailable = false;
      }
    }
    return {
      query: (sql, params) => pool.query(sql, params),
      release: () => {}
    };
  },

  async end() {
    if (mysqlPool) {
      await mysqlPool.end();
    }
  }
};

module.exports = pool;
