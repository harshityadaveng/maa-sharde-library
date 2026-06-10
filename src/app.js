const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const planRoutes = require('./routes/planRoutes');
const contactRoutes = require('./routes/contactRoutes');
const seatRoutes = require('./routes/seatRoutes');

const app = express();

// Enable Helmet for security headers (excluding strict CSP to prevent maps/images from breaking)
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Enable Cross-Origin Resource Sharing with configured allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS policy.'));
  },
  credentials: true
}));

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Protect against MongoDB query injection
app.use(mongoSanitize());

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 mins
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Custom XSS Sanitization Middleware
const sanitizeInput = (val) => {
  if (typeof val === 'string') {
    return val.replace(/<[^>]*>/g, '').trim(); // strip HTML tags
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeInput);
  }
  if (typeof val === 'object' && val !== null) {
    const clean = {};
    for (const key in val) {
      clean[key] = sanitizeInput(val[key]);
    }
    return clean;
  }
  return val;
};

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
});

// Serve static frontend assets from public/ folder
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/payments', paymentRoutes);  // Full QR payment system routes
app.use('/api/seats', seatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/contacts', contactRoutes);

// Admin Page Routes
app.get('/admin', (req, res) => {
  res.redirect('/admin/dashboard');
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-login.html'));
});

app.get(['/admin/dashboard', '/admin/students', '/admin/payments', '/admin/admissions'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-dashboard.html'));
});

// Fallback to index.html for undefined routes (supporting SPA routing if needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;

