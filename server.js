/**
 * server.js
 * -----------
 * Application entry point. Sets up security middleware, static file serving,
 * API routes, HTML page routes, and starts listening after the database
 * has been initialized.
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

const { initDatabase } = require('./config/database');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Security & core middleware ----------
app.use(
  helmet({
    // Relaxed CSP so our own inline-free public/js and public/css load correctly.
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// ---------- Static assets (css/js/images) ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- API routes ----------
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes); // -> GET/POST /api/requests, PUT/DELETE /api/requests/:id
app.use('/api/admin', adminRoutes); // -> GET /api/admin/requests, PUT /api/admin/approve|reject/:id

// ---------- HTML page routes ----------
const viewsPath = path.join(__dirname, 'views');
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(path.join(viewsPath, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(viewsPath, 'register.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(viewsPath, 'forgot-password.html')));
// The :token is read client-side from the URL, so this always serves the same page.
app.get('/reset-password/:token', (req, res) => res.sendFile(path.join(viewsPath, 'reset-password.html')));
app.get('/user-dashboard', (req, res) => res.sendFile(path.join(viewsPath, 'user-dashboard.html')));
app.get('/admin-dashboard', (req, res) => res.sendFile(path.join(viewsPath, 'admin-dashboard.html')));

// ---------- 404 for anything else ----------
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ---------- Centralized error handler (must be last) ----------
app.use(errorHandler);

// ---------- Start ----------
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
