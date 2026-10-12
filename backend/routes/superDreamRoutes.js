const express = require('express');
const router = express.Router();
const superDreamController = require('../controllers/superDreamController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All Super Dream endpoints require authentication
router.use(authenticateToken);

// Admin Management
router.get('/admin/overview', requireAdmin, superDreamController.getAdminOverview);
router.post('/admin/create', requireAdmin, superDreamController.createGroup);
router.put('/admin/:id', requireAdmin, superDreamController.updateGroup);
router.delete('/admin/:id', requireAdmin, superDreamController.deleteGroup);

// Faculty & Student Portal Views
router.get('/faculty', superDreamController.getFacultySuperDream);
router.get('/student', superDreamController.getStudentSuperDream);

// Shared Communication Stream between Mentor & Mentees
router.get('/group/:id/messages', superDreamController.getGroupMessages);
router.post('/group/:id/messages', superDreamController.postMessage);
router.post('/message/:messageId/comments', superDreamController.addComment);

module.exports = router;
