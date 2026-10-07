const express = require('express');
const router = express.Router();
const multer = require('multer');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB image limit
});

// Three dedicated role login endpoints
router.post('/login/student', authController.loginStudent);
router.post('/login/faculty', authController.loginFaculty);
router.post('/login/admin', authController.loginAdmin);

// Password recovery endpoints
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Session & Current User
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put('/profile', authenticateToken, upload.single('avatarFile'), authController.updateProfile);

module.exports = router;

