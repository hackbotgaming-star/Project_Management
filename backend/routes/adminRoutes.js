const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes here strictly require ADMIN role
router.use(authenticateToken, requireAdmin);

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/projects/:id/faculty', adminController.assignFacultyMentor);
router.put('/projects/:id/status', adminController.updateProjectStatus);
router.get('/departments', adminController.getDepartments);
router.get('/departments/:id', adminController.getDepartmentDetails);
router.post('/departments', adminController.createDepartment);
router.put('/departments/:id', adminController.updateDepartment);
router.get('/cohorts', adminController.getCohorts);
router.post('/cohorts', adminController.createCohort);
router.get('/audit-trail', adminController.getAuditTrail);

module.exports = router;
