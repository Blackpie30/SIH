const { verifyToken } = require('../utils/token');

/**
 * Middleware to authenticate requests using a JSON Web Token.
 * Reads token from Authorization: Bearer <token>
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authorization header format must be Bearer <token>' });
  }

  verifyToken(token, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = decodedUser;
    next();
  });
}

module.exports = authenticateToken;
