require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const { seedDatabase } = require('./seed/seedData');
const { authenticateToken, requireStudent, requireFaculty, requireAdmin } = require('./middleware/auth');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const adminRoutes = require('./routes/adminRoutes');
const documentRoutes = require('./routes/documentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// Serve static assets from public folder and extracted workspace
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/stitch', express.static(path.join(__dirname, '../stitch_projecthub_academic_workspace')));

// ==========================================
// 1. PUBLIC WEB ROUTES
// ==========================================

// Landing Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/views/landing.html'));
});

// Dedicated Login Portals
app.get('/login/student', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/views/login-student.html'));
});

app.get('/login/faculty', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/views/login-faculty.html'));
});

app.get('/login/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/views/login-admin.html'));
});

// General /login fallback
app.get('/login', (req, res) => {
  res.redirect('/');
});

// ==========================================
// 2. ROLE-BASED PROTECTED WEB ROUTES
// Strictly enforced by Express Middleware
// ==========================================

// Student Protected Dashboard & Subroutes
app.get(/^\/student\/.*/, authenticateToken, requireStudent, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/views/student-dashboard.html'));
});

// Faculty Protected Dashboard & Subroutes
app.get(/^\/faculty\/.*/, authenticateToken, requireFaculty, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/views/faculty-dashboard.html'));
});

// Admin Protected Dashboard & Subroutes
app.get(/^\/admin\/.*/, authenticateToken, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/views/admin-dashboard.html'));
});

// Dedicated Working Task Details Page (accessible by Student, Faculty, Admin)
app.get(['/tasks/:id', '/task/:id', '/tasks'], authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/views/task-details.html'));
});

// Dedicated Working Project Details Page (accessible by Student, Faculty, Admin)
app.get(['/projects/:id', '/project/:id', '/projects'], authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/views/project-details.html'));
});

// ==========================================
// 3. REST API ENDPOINTS
// ==========================================

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    platform: 'ProjectHub Academic Project Management',
    architecture: 'Role-Based Authorization Architecture (STUDENT, FACULTY, ADMIN)',
    timestamp: new Date().toISOString(),
  });
});

// 404 Not Found Handler
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.status(404).redirect('/');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
  res.status(500).send('ProjectHub encountered an internal server error.');
});

// Start Server
async function startServer() {
  try {
    await connectDB();
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 ProjectHub Server running on http://localhost:${PORT}`);
      console.log(`- Landing Page:     http://localhost:${PORT}/`);
      console.log(`- Student Portal:   http://localhost:${PORT}/login/student`);
      console.log(`- Faculty Portal:   http://localhost:${PORT}/login/faculty`);
      console.log(`- Admin Portal:     http://localhost:${PORT}/login/admin`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
