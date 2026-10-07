const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireStudent, requireFaculty, requireAdmin } = require('../middleware/auth');

// 1. Student Dashboard API
router.get('/student', authenticateToken, requireStudent, dashboardController.getStudentDashboard);

// 2. Faculty Dashboard API
router.get('/faculty', authenticateToken, requireFaculty, dashboardController.getFacultyDashboard);

// 3. Admin Dashboard API
router.get('/admin', authenticateToken, requireAdmin, dashboardController.getAdminDashboard);

// 4. Role-Scoped Calendar Events API
router.get('/calendar-events', authenticateToken, dashboardController.getCalendarEvents);

module.exports = router;
