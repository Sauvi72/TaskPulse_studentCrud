const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { redirectIfAuth } = require('../middleware/auth');

/**
 * Helper function to generate JWT and set HTTP-only cookie
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET || 'fallback_jwt_secret',
    { expiresIn: '24h' }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 Hours
    httpOnly: true,
    sameSite: 'strict'
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('token', token, cookieOptions);
  res.redirect('/dashboard');
};

/**
 * @route   GET /signup
 * @desc    Render Registration page
 */
router.get('/signup', redirectIfAuth, (req, res) => {
  res.render('signup', {
    error: req.query.error || null,
    name: '',
    email: ''
  });
});

/**
 * @route   POST /signup
 * @desc    Register new student user
 */
router.post('/signup', redirectIfAuth, async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  try {
    // Basic validations
    if (!name || !email || !password) {
      return res.render('signup', {
        error: 'Please fill in all required fields.',
        name,
        email
      });
    }

    if (password.length < 6) {
      return res.render('signup', {
        error: 'Password must be at least 6 characters long.',
        name,
        email
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.render('signup', {
        error: 'Passwords do not match.',
        name,
        email
      });
    }

    // Check if user email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.render('signup', {
        error: 'An account with this email address already exists.',
        name,
        email
      });
    }

    // Create user (password is hashed in Mongoose pre-save hook)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password
    });

    // Generate token and set HTTP-only cookie
    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Signup Error:', error);
    res.render('signup', {
      error: error.message || 'An error occurred during registration.',
      name,
      email
    });
  }
});

/**
 * @route   GET /login
 * @desc    Render Login page
 */
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('login', {
    error: req.query.error || null,
    success: req.query.success || null,
    email: ''
  });
});

/**
 * @route   POST /login
 * @desc    Authenticate user & issue JWT cookie
 */
router.post('/login', redirectIfAuth, async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.render('login', {
        error: 'Please provide both email address and password.',
        success: null,
        email
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.render('login', {
        error: 'Invalid email or password credentials.',
        success: null,
        email
      });
    }

    // Verify password match
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', {
        error: 'Invalid email or password credentials.',
        success: null,
        email
      });
    }

    // Generate token and redirect to dashboard
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login Error:', error);
    res.render('login', {
      error: 'An unexpected error occurred during login.',
      success: null,
      email
    });
  }
});

/**
 * @route   GET /logout
 * @desc    Clear JWT cookie and logout
 */
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login?success=Logged out successfully');
});

module.exports = router;
