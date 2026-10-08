const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'projecthub_academic_super_secret_jwt_key_2026';

// Authenticate token and load current user directly from MongoDB
async function authenticateToken(req, res, next) {
  try {
    let token = null;

    // 1. Check cookies first (used by web navigation)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fall back to Authorization Header (Bearer token)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      const isApi = req.originalUrl.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
      if (isApi) {
        return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      }

      // Web route: redirect to corresponding login page or general login
      if (req.originalUrl.startsWith('/student')) return res.redirect('/login/student');
      if (req.originalUrl.startsWith('/faculty')) return res.redirect('/login/faculty');
      if (req.originalUrl.startsWith('/admin')) return res.redirect('/login/admin');
      return res.redirect('/');
    }

    // Verify token signature
    const decoded = jwt.verify(token, JWT_SECRET);

    // CRITICAL SECURITY REQUIREMENT:
    // ALWAYS fetch and verify the user and their exact role directly from MongoDB database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.clearCookie('token');
      const isApi = req.originalUrl.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
      if (isApi) {
        return res.status(401).json({ success: false, message: 'User not found or session expired.' });
      }
      return res.redirect('/');
    }

    if (user.status !== 'ACTIVE') {
      res.clearCookie('token');
      return res.status(403).json({ success: false, message: 'Your account is inactive or suspended.' });
    }

    // Set verified user on request object
    req.user = user;
    next();
  } catch (err) {
    res.clearCookie('token');
    const isApi = req.originalUrl.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isApi) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
    if (req.originalUrl.startsWith('/student')) return res.redirect('/login/student');
    if (req.originalUrl.startsWith('/faculty')) return res.redirect('/login/faculty');
    if (req.originalUrl.startsWith('/admin')) return res.redirect('/login/admin');
    return res.redirect('/');
  }
}

// Role verification middleware factory
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Check if user's verified MongoDB role is authorized
    if (!allowedRoles.includes(req.user.role)) {
      const isApi = req.originalUrl.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));

      if (isApi) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Role '${req.user.role}' is not authorized to access this resource. Allowed: ${allowedRoles.join(', ')}`,
        });
      }

      // Web Route handling for unauthorized cross-role attempts:
      // If STUDENT attempts /faculty/dashboard -> return 403 Forbidden or redirect to /student/dashboard
      if (req.user.role === 'STUDENT') {
        return res.redirect('/student/dashboard?error=unauthorized_faculty_area');
      }
      // If FACULTY or HOD attempts /admin/dashboard -> deny access / redirect to /faculty/dashboard
      if (req.user.role === 'FACULTY' || req.user.role === 'HOD') {
        return res.redirect('/faculty/dashboard?error=unauthorized_admin_area');
      }
      // If ADMIN attempts student or faculty, admin can view or redirect
      if (req.user.role === 'ADMIN') {
        return res.redirect('/admin/dashboard');
      }

      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head><title>403 Forbidden - ProjectHub</title></head>
        <body style="background:#0f131c; color:#dfe2ef; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column;">
          <h1 style="color:#ffb4ab; margin-bottom:8px;">403 Forbidden</h1>
          <p>Your role (${req.user.role}) does not have permission to access this page.</p>
          <a href="/${req.user.role === 'HOD' ? 'faculty' : req.user.role.toLowerCase()}/dashboard" style="color:#c3c0ff; margin-top:16px;">Return to your Dashboard</a>
        </body>
        </html>
      `);
    }

    next();
  };
}

const requireStudent = requireRole('STUDENT');
const requireFaculty = requireRole('FACULTY', 'HOD');
const requireAdmin = requireRole('ADMIN');

module.exports = {
  authenticateToken,
  requireRole,
  requireStudent,
  requireFaculty,
  requireAdmin,
  JWT_SECRET,
};
