const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middleware/auth');

router.get('/students/available', authenticateToken, projectController.getAvailableStudents);
router.get('/my-projects', authenticateToken, projectController.getMyProjects);
router.get('/:id', authenticateToken, projectController.getProjectById);
router.patch('/:id', authenticateToken, projectController.updateProject);
router.post('/', authenticateToken, projectController.createProject);
router.post('/:id/members', authenticateToken, projectController.addTeamMembers);
router.delete('/:id/members/:memberId', authenticateToken, projectController.removeTeamMember);

module.exports = router;
