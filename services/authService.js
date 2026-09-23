const bcrypt = require('bcrypt');
const pool = require('../db');
const { generateToken, TOKEN_EXPIRY_SECONDS } = require('../utils/token');

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Register a new student account.
 */
async function registerUser({ fullName, email, password, university, major }) {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = fullName.trim();
  const studentUniv = university?.trim() || null;
  const studentMajor = major?.trim() || null;

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
  if (existing.length > 0) {
    const error = new Error('Email is already registered');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO users (full_name, email, password_hash, university, major) VALUES (?, ?, ?, ?, ?)',
    [trimmedName, trimmedEmail, passwordHash, studentUniv, studentMajor]
  );

  const newUserId = result.insertId;
  const token = generateToken({ id: newUserId, email: trimmedEmail });

  return {
    user_id: `usr_${newUserId}`,
    token,
    message: 'Account created successfully'
  };
}

/**
 * Authenticate student credentials and return JWT.
 */
async function loginUser({ email, password }) {
  const trimmedEmail = email.trim().toLowerCase();

  const [users] = await pool.query(
    'SELECT id, full_name, email, password_hash FROM users WHERE email = ?',
    [trimmedEmail]
  );

  if (users.length === 0) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const user = users[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken({ id: user.id, email: user.email });

  return {
    user_id: `usr_${user.id}`,
    token,
    expires_in: TOKEN_EXPIRY_SECONDS
  };
}

/**
 * Retrieve authenticated student telemetry & profile.
 */
async function getUserProfile(userId) {
  const [users] = await pool.query(
    `SELECT id, full_name, email, university, major, avatar_url, level,
            tier_title, division, streak_days, longest_streak_days, xp_balance,
            freezes_available
     FROM users WHERE id = ?`,
    [userId]
  );

  if (users.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const user = users[0];
  return {
    id: `usr_${user.id}`,
    name: user.full_name,
    email: user.email,
    avatar_url: user.avatar_url,
    level: user.level,
    tier_title: user.tier_title,
    division: user.division,
    streak_days: user.streak_days,
    longest_streak_days: user.longest_streak_days,
    xp_balance: user.xp_balance,
    freezes_available: user.freezes_available,
    university: user.university,
    major: user.major
  };
}

module.exports = {
  registerUser,
  loginUser,
  getUserProfile
};
