const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware:
 * Extracts JWT token from HTTP-only cookie `req.cookies.token`,
 * verifies token, and attaches user data to `req.user` and `res.locals.user`.
 */
const requireAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login?error=Please log in to access your dashboard');
  }

  try {
    // Verify JWT payload
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_key_student_portal_2026_x89a!'
    );

    // Attach user payload directly from decoded token
    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email
    };

    res.locals.user = req.user;
    next();
  } catch (error) {
    console.error('JWT Authentication Error:', error.message);
    res.clearCookie('token');
    return res.redirect('/login?error=Invalid or expired session. Please log in again.');
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
    jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_key_student_portal_2026_x89a!'
    );
    return res.redirect('/dashboard');
  } catch (error) {
    res.clearCookie('token');
    next();
  }
};

module.exports = { requireAuth, redirectIfAuth };
