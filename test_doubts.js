const assert = require('assert');
const http = require('http');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';

const app = require('./server');
const pool = require('./db');
const { generateToken } = require('./utils/token');
const doubtController = require('./controllers/doubt.controller');

// Helper to make HTTP requests to test server
function request(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port: port,
      path: options.path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (postData) {
      const dataStr = typeof postData === 'string' ? postData : JSON.stringify(postData);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(dataStr);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = body;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);

    if (postData) {
      const dataStr = typeof postData === 'string' ? postData : JSON.stringify(postData);
      req.write(dataStr);
    }
    req.end();
  });
}

// In-memory state for reliable test execution
const mockDb = {
  users: new Map([
    [99, { id: 99, full_name: 'Alex Mercer', email: 'alex@eduvia.ai', xp_balance: 500 }],
    [101, { id: 101, full_name: 'David Chen', email: 'david@eduvia.ai', xp_balance: 50 }]
  ]),
  doubts: new Map(),
  answers: new Map(),
  doubtAutoInc: 1001,
  answerAutoInc: 501
};

// Mock pool.query
const originalQuery = pool.query;
pool.query = async function(sql, params = []) {
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();

  // 1. SELECT xp_balance FROM users WHERE id = ?
  if (/SELECT\s+xp_balance\s+FROM\s+users\s+WHERE\s+id\s*=\s*\?/i.test(normalizedSql)) {
    const userId = Number(params[0]);
    const user = mockDb.users.get(userId);
    return [user ? [{ xp_balance: user.xp_balance }] : []];
  }

  // 2. UPDATE users SET xp_balance = xp_balance - ? WHERE id = ?
  if (/UPDATE\s+users\s+SET\s+xp_balance\s*=\s*xp_balance\s*-\s*\?\s+WHERE\s+id\s*=\s*\?/i.test(normalizedSql)) {
    const [decrement, userId] = params.map(Number);
    const user = mockDb.users.get(userId);
    if (user) user.xp_balance -= decrement;
    return [{ affectedRows: user ? 1 : 0 }];
  }

  // 3. UPDATE users SET xp_balance = xp_balance + ? WHERE id = ?
  if (/UPDATE\s+users\s+SET\s+xp_balance\s*=\s*xp_balance\s*\+\s*\?\s+WHERE\s+id\s*=\s*\?/i.test(normalizedSql)) {
    const [increment, userId] = params.map(Number);
    const user = mockDb.users.get(userId);
    if (user) user.xp_balance += increment;
    return [{ affectedRows: user ? 1 : 0 }];
  }

  // 4. INSERT INTO doubts ...
  if (/INSERT\s+INTO\s+doubts/i.test(normalizedSql)) {
    const id = mockDb.doubtAutoInc++;
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
      status: 'open'
    };
    mockDb.doubts.set(id, doubt);
    return [{ insertId: id, affectedRows: 1 }];
  }

  // 5. SELECT id, upvotes FROM doubts WHERE id = ?
  if (/SELECT\s+id,\s*upvotes\s+FROM\s+doubts\s+WHERE\s+id\s*=\s*\?/i.test(normalizedSql)) {
    const doubtId = Number(params[0]);
    const doubt = mockDb.doubts.get(doubtId);
    return [doubt ? [{ id: doubt.id, upvotes: doubt.upvotes }] : []];
  }

  // 6. UPDATE doubts SET upvotes = upvotes + 1 WHERE id = ?
  if (/UPDATE\s+doubts\s+SET\s+upvotes\s*=\s*upvotes\s*\+\s*1\s+WHERE\s+id\s*=\s*\?/i.test(normalizedSql)) {
    const doubtId = Number(params[0]);
    const doubt = mockDb.doubts.get(doubtId);
    if (doubt) doubt.upvotes += 1;
    return [{ affectedRows: doubt ? 1 : 0 }];
  }

  // 7. SELECT id, title, status FROM doubts WHERE id = ?
  if (/SELECT\s+id,\s*title,\s*status\s+FROM\s+doubts\s+WHERE\s+id\s*=\s*\?/i.test(normalizedSql)) {
    const doubtId = Number(params[0]);
    const doubt = mockDb.doubts.get(doubtId);
    return [doubt ? [{ id: doubt.id, title: doubt.title, status: doubt.status }] : []];
  }

  // 8. INSERT INTO doubt_answers ...
  if (/INSERT\s+INTO\s+doubt_answers/i.test(normalizedSql)) {
    const id = mockDb.answerAutoInc++;
    const answer = {
      id,
      doubt_id: params[0],
      author_id: params[1],
      content_markdown: params[2],
      code_snippet: params[3],
      ai_clarity_score: params[4],
      ai_feedback: params[5]
    };
    mockDb.answers.set(id, answer);
    return [{ insertId: id, affectedRows: 1 }];
  }

  // 9. UPDATE doubts SET status = 'answered' WHERE id = ?
  if (/UPDATE\s+doubts\s+SET\s+status\s*=\s*'answered'\s+WHERE\s+id\s*=\s*\?/i.test(normalizedSql)) {
    const doubtId = Number(params[0]);
    const doubt = mockDb.doubts.get(doubtId);
    if (doubt) doubt.status = 'answered';
    return [{ affectedRows: doubt ? 1 : 0 }];
  }

  // Fallback to original
  return originalQuery.apply(pool, [sql, params]);
};

async function runDoubtTests() {
  console.log('🧪 Starting Doubt Community Automated Test Suite...\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  const tokenUser99 = generateToken({ id: 99, email: 'alex@eduvia.ai' });
  const tokenUser101 = generateToken({ id: 101, email: 'david@eduvia.ai' });

  try {
    // Check 1: Unauthenticated POST /api/v1/doubts returns 401
    console.log('[Check 1] Verifying POST /api/v1/doubts requires authentication (401)...');
    const unauthDoubt = await request(server, { path: '/api/v1/doubts', method: 'POST' }, {
      title: 'Deadlock in mutex',
      subject_domain: 'Operating Systems',
      body_markdown: 'Explanation...',
      bounty_xp: 50
    });
    assert.strictEqual(unauthDoubt.status, 401);
    console.log('  -> Passed: Unauthenticated request rejected with 401.');

    // Check 2: Validation of required fields
    console.log('[Check 2] Verifying POST /api/v1/doubts field validations (400)...');
    const noTitle = await request(server, {
      path: '/api/v1/doubts',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUser99}` }
    }, { subject_domain: 'DSA', body_markdown: 'Help' });
    assert.strictEqual(noTitle.status, 400);
    assert.strictEqual(noTitle.body.error, 'Title is required');

    const noSubject = await request(server, {
      path: '/api/v1/doubts',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUser99}` }
    }, { title: 'Some title', body_markdown: 'Help' });
    assert.strictEqual(noSubject.status, 400);
    assert.strictEqual(noSubject.body.error, 'Subject domain is required');

    const noBody = await request(server, {
      path: '/api/v1/doubts',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUser99}` }
    }, { title: 'Some title', subject_domain: 'DSA' });
    assert.strictEqual(noBody.status, 400);
    assert.strictEqual(noBody.body.error, 'Body markdown is required');

    const negativeBounty = await request(server, {
      path: '/api/v1/doubts',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUser99}` }
    }, { title: 'Title', subject_domain: 'DSA', body_markdown: 'Help', bounty_xp: -20 });
    assert.strictEqual(negativeBounty.status, 400);
    console.log('  -> Passed: Required fields and bounty constraints validated.');

    // Check 3: Insufficient XP balance
    console.log('[Check 3] Verifying bounty cannot exceed user XP balance...');
    const excessiveBounty = await request(server, {
      path: '/api/v1/doubts',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUser101}` } // user 101 has 50 XP
    }, {
      title: 'Graph search',
      subject_domain: 'DSA',
      body_markdown: 'Need assistance with BFS vs DFS',
      bounty_xp: 200 // exceeds 50 XP
    });
    assert.strictEqual(excessiveBounty.status, 400);
    assert.ok(excessiveBounty.body.error.includes('Insufficient XP balance'));
    console.log('  -> Passed: Excessive bounty rejected with 400.');

    // Check 4: Successful Doubt Creation (decrements user XP)
    console.log('[Check 4] Creating doubt with 100 XP bounty and verifying XP deduction...');
    const initialXp = mockDb.users.get(99).xp_balance; // 500
    const createRes = await request(server, {
      path: '/api/v1/doubts',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUser99}` }
    }, {
      title: 'Segmentation fault during linked list pointer dereference',
      subject_domain: 'Data Structures & Algorithms',
      bounty_xp: 100,
      body_markdown: 'while(head->next != NULL) crashes on empty linked list',
      code_language: 'cpp',
      code_snippet: 'while(head->next != NULL) { head = head->next; }',
      error_type: 'SIGSEGV'
    });
    assert.strictEqual(createRes.status, 201);
    assert.ok(createRes.body.doubt_id.startsWith('dbt_'));
    assert.strictEqual(createRes.body.bounty_deducted, 100);
    assert.strictEqual(createRes.body.new_user_xp_balance, initialXp - 100);
    assert.strictEqual(createRes.body.status, 'published');
    assert.strictEqual(mockDb.users.get(99).xp_balance, initialXp - 100);
    console.log(`  -> Passed: Doubt published (${createRes.body.doubt_id}), 100 XP deducted, new balance: ${createRes.body.new_user_xp_balance}`);

    const publishedDoubtId = createRes.body.doubt_id;
    const numericDoubtId = publishedDoubtId.replace('dbt_', '');

    // Check 5: Upvote Doubt (increments upvotes counter)
    console.log('[Check 5] Verifying POST /api/v1/doubts/:id/upvote increments upvote counter...');
    const upvoteRes = await request(server, {
      path: `/api/v1/doubts/${publishedDoubtId}/upvote`,
      method: 'POST'
    });
    assert.strictEqual(upvoteRes.status, 200);
    assert.strictEqual(upvoteRes.body.upvoted, true);
    assert.strictEqual(upvoteRes.body.new_upvote_count, 1);
    assert.strictEqual(mockDb.doubts.get(Number(numericDoubtId)).upvotes, 1);

    const upvoteSecond = await request(server, {
      path: `/api/v1/doubts/${numericDoubtId}/upvote`, // test numeric param
      method: 'POST'
    });
    assert.strictEqual(upvoteSecond.status, 200);
    assert.strictEqual(upvoteSecond.body.new_upvote_count, 2);
    console.log('  -> Passed: Upvotes incremented to 2.');

    // Check 6: Upvote non-existent doubt (404)
    console.log('[Check 6] Verifying upvoting non-existent doubt returns 404...');
    const upvoteNotFound = await request(server, {
      path: '/api/v1/doubts/99999/upvote',
      method: 'POST'
    });
    assert.strictEqual(upvoteNotFound.status, 404);
    assert.strictEqual(upvoteNotFound.body.error, 'Doubt not found');
    console.log('  -> Passed: 404 returned for unknown doubt.');

    // Check 7: Answer submission validation
    console.log('[Check 7] Verifying answer submission validations...');
    const answerNoAuth = await request(server, {
      path: `/api/v1/doubts/${publishedDoubtId}/answers`,
      method: 'POST'
    }, { content_markdown: 'My solution' });
    assert.strictEqual(answerNoAuth.status, 401);

    const answerNoContent = await request(server, {
      path: `/api/v1/doubts/${publishedDoubtId}/answers`,
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUser101}` }
    }, {});
    assert.strictEqual(answerNoContent.status, 400);
    assert.strictEqual(answerNoContent.body.error, 'content_markdown is required');
    console.log('  -> Passed: Auth and content validations verified.');

    // Check 8: Submit Answer (+50 XP awarded to solver, doubt marked answered)
    console.log('[Check 8] Submitting answer and verifying +50 XP award to solver...');
    const solverPreXp = mockDb.users.get(101).xp_balance; // 50
    const answerRes = await request(server, {
      path: `/api/v1/doubts/${publishedDoubtId}/answers`,
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUser101}` }
    }, {
      content_markdown: 'Check if head itself is NULL before dereferencing head->next.',
      code_snippet: 'while(head != nullptr) { head = head->next; }'
    });
    assert.strictEqual(answerRes.status, 201);
    assert.ok(answerRes.body.answer_id.startsWith('ans_'));
    assert.strictEqual(answerRes.body.xp_credited, 50);
    assert.strictEqual(mockDb.users.get(101).xp_balance, solverPreXp + 50);
    assert.strictEqual(mockDb.doubts.get(Number(numericDoubtId)).status, 'answered');
    console.log(`  -> Passed: Answer published (${answerRes.body.answer_id}), +50 XP credited, doubt marked answered.`);

    // Check 9: Submit Answer with run_ai_check: true
    console.log('[Check 9] Submitting answer with run_ai_check: true and verifying pedagogical evaluation...');
    const answerAiRes = await request(server, {
      path: `/api/v1/doubts/${publishedDoubtId}/answers`,
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUser99}` }
    }, {
      content_markdown: 'To safely traverse, handle the empty list boundary: check head != nullptr directly. This eliminates dereferencing an invalid pointer.',
      code_snippet: 'void traverse(Node* head) { while(head != nullptr) head = head->next; }',
      run_ai_check: true
    });
    assert.strictEqual(answerAiRes.status, 201);
    assert.ok(answerAiRes.body.ai_evaluation !== null, 'ai_evaluation must be present');
    assert.ok(typeof answerAiRes.body.ai_evaluation.clarity_score === 'number');
    assert.strictEqual(answerAiRes.body.ai_evaluation.is_clear, true);
    assert.ok(typeof answerAiRes.body.ai_evaluation.feedback === 'string');
    console.log(`  -> Passed: AI clarity check executed. Score: ${answerAiRes.body.ai_evaluation.clarity_score}, Feedback: "${answerAiRes.body.ai_evaluation.feedback.slice(0, 60)}..."`);

    // Check 10: evaluatePedagogicalClarity standalone unit test
    console.log('[Check 10] Testing evaluatePedagogicalClarity standalone function...');
    const clarityResult = await doubtController.evaluatePedagogicalClarity({
      contentMarkdown: 'Binary search divides the sorted array search space in halves.',
      codeSnippet: 'int mid = low + (high - low) / 2;',
      doubtTitle: 'How to avoid integer overflow in binary search?'
    });
    assert.ok(typeof clarityResult.clarity_score === 'number');
    assert.strictEqual(typeof clarityResult.is_clear, 'boolean');
    assert.ok(typeof clarityResult.feedback === 'string');
    console.log('  -> Passed: evaluatePedagogicalClarity returns valid schema.');

    console.log('\n✨ All Doubt Community automated checks PASSED successfully! ✨\n');
  } finally {
    pool.query = originalQuery;
    server.close();
  }
}

runDoubtTests().catch((err) => {
  console.error('❌ Doubt tests failed:', err);
  process.exit(1);
});
