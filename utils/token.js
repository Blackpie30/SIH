const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'brainbytes_jwt_secret_dev_key_2026';
const TOKEN_EXPIRY_SECONDS = 86400; // 24 hours

/**
 * Generate a signed JWT for an authenticated user.
 */
function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verify a JWT and return the decoded payload or throw an error.
 */
function verifyToken(token, callback) {
  return jwt.verify(token, JWT_SECRET, callback);
}

module.exports = {
  JWT_SECRET,
  TOKEN_EXPIRY_SECONDS,
  generateToken,
  verifyToken
};
