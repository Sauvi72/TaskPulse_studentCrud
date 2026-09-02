const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware:
 * Extracts JWT token from HTTP-only cookie `req.cookies.token`,
 * verifies token, and attaches user data to `req.user` and `res.locals.user`.
 */
const requireAuth = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login?error=Please log in to access your dashboard');
  }

  try {
    // Verify JWT payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret');

    // Optionally check if user exists in database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.clearCookie('token');
      return res.redirect('/login?error=Session expired. Please log in again.');
    }

    // Attach user information to request and response locals (for EJS rendering)
    req.user = { id: user._id, name: user.name, email: user.email };
    res.locals.user = req.user;
    next();
  } catch (error) {
    console.error('JWT Authentication Error:', error.message);
    res.clearCookie('token');
    return res.redirect('/login?error=Invalid session. Please log in again.');
  }
};

/**
 * Guest Middleware:
 * Redirects authenticated users away from auth pages (login/signup) to dashboard.
 */
const redirectIfAuth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return next();
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret');
    return res.redirect('/dashboard');
  } catch (error) {
    res.clearCookie('token');
    next();
  }
};

module.exports = { requireAuth, redirectIfAuth };
