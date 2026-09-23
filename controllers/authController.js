const authService = require('../services/authService');

/**
 * Handle new student registration.
 */
async function register(req, res, next) {
  try {
    const { full_name, email, password, university, major } = req.body;

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const result = await authService.registerUser({
      fullName: full_name,
      email,
      password,
      university,
      major
    });

    return res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during registration' });
  }
}

/**
 * Handle student authentication & token generation.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const result = await authService.loginUser({ email, password });
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during login' });
  }
}

/**
 * Handle user session logout.
 */
function logout(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}

/**
 * Retrieve authenticated user profile telemetry.
 */
async function getMe(req, res, next) {
  try {
    const profile = await authService.getUserProfile(req.user.id);
    return res.status(200).json(profile);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe
};
