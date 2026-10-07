const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, taskController.getTasks);
router.get('/:id', authenticateToken, taskController.getTaskById);
router.post('/', authenticateToken, taskController.createTask);
router.patch('/:id/status', authenticateToken, taskController.updateTaskStatus);

module.exports = router;
