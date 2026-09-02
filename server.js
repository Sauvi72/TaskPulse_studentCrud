const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://krsauvi_72:sau1234@mycluster1.rqebw6q.mongodb.net/taskdb?appName=MyCluster1';

// Enable trust proxy for Render reverse proxy HTTPS load balancing
app.enable('trust proxy');

/**
 * Express Middleware Setup
 */
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Serve static assets from public/ folder
app.use(express.static(path.join(__dirname, 'public')));

// Configure EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/**
 * MongoDB Atlas Connection
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
  }
};

// Initiate Database Connection
connectDB();

/**
 * Application Routes
 */
app.use('/', authRoutes);
app.use('/', taskRoutes);

/**
 * 404 Handler for Undefined Routes
 */
app.use((req, res) => {
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  res.status(404).render('dashboard', {
    tasks: [],
    stats: { total: 0, pending: 0, completed: 0, overdue: 0 },
    currentFilter: 'all',
    searchQuery: '',
    error: '404 - Page Not Found. Redirected to Dashboard.',
    success: null
  });
});

/**
 * Global Error Handling Middleware
 */
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).render('dashboard', {
    tasks: [],
    stats: { total: 0, pending: 0, completed: 0, overdue: 0 },
    currentFilter: 'all',
    searchQuery: '',
    error: 'An internal server error occurred. Please try again.',
    success: null
  });
});

/**
 * Start Express Web Server
 */
app.listen(PORT, () => {
  console.log(`🚀 Task Tracker server running on port ${PORT}`);
});
