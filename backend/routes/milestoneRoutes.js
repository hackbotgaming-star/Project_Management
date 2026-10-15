const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestoneController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, milestoneController.getMilestones);
router.post('/', authenticateToken, milestoneController.createMilestone);
router.put('/:id', authenticateToken, milestoneController.updateMilestone);
router.post('/:id/submit', authenticateToken, milestoneController.submitMilestone);
router.post('/:id/review', authenticateToken, milestoneController.reviewMilestone);

module.exports = router;
