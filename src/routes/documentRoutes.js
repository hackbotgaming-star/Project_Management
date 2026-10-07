const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/auth');

// Multer memory storage for direct Cloudinary streaming
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB limit
});

router.get('/', authenticateToken, documentController.getDocuments);
router.post('/', authenticateToken, upload.single('file'), documentController.createDocument);

module.exports = router;
