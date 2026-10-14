const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin, requireHOD } = require('../middleware/auth');

// Base authentication for all administrative & oversight routes
router.use(authenticateToken);

// Read endpoints & User Enrollment accessible to both ADMIN and HOD
router.get('/users', requireHOD, adminController.getUsers);
router.post('/users', requireHOD, adminController.createUser); // HOD CAN ADD USERS!

// Strictly ADMIN ONLY (HOD is blocked from removing users or changing structure)
router.put('/users/:id', requireAdmin, adminController.updateUser);
router.delete('/users/:id', requireAdmin, adminController.deleteUser); // HOD CANNOT REMOVE USERS!
router.put('/projects/:id/faculty', requireAdmin, adminController.assignFacultyMentor);
router.put('/projects/:id/status', requireAdmin, adminController.updateProjectStatus);

// Department & Cohort Read (HOD) vs Modification (ADMIN)
router.get('/departments', requireHOD, adminController.getDepartments);
router.get('/departments/:id', requireHOD, adminController.getDepartmentDetails);
router.post('/departments', requireAdmin, adminController.createDepartment);
router.put('/departments/:id', requireAdmin, adminController.updateDepartment);

router.get('/cohorts', requireHOD, adminController.getCohorts);
router.post('/cohorts', requireAdmin, adminController.createCohort);
router.get('/audit-trail', requireHOD, adminController.getAuditTrail);

module.exports = router;
