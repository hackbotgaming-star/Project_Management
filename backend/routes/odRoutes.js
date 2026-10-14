const express = require('express');
const router = express.Router();
const multer = require('multer');
const odController = require('../controllers/odController');
const {
  authenticateToken,
  requireStudent,
  requireFaculty,
  requireAdmin,
  requireHOD,
} = require('../middleware/auth');

// Multer in-memory storage for handling supporting documents/invitation letters
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
});

// ==========================================
// 1. STUDENT ROUTES
// ==========================================
router.get(
  '/faculty-list',
  authenticateToken,
  odController.getFacultyList
);

router.post(
  '/',
  authenticateToken,
  requireStudent,
  upload.single('file'),
  odController.submitODRequest
);

router.get(
  '/my',
  authenticateToken,
  requireStudent,
  odController.getMyODRequests
);

router.patch(
  '/:id/resubmit',
  authenticateToken,
  requireStudent,
  upload.single('file'),
  odController.resubmitODRequest
);

router.patch(
  '/:id/withdraw',
  authenticateToken,
  requireStudent,
  odController.withdrawODRequest
);

// ==========================================
// 2. FACULTY ROUTES
// ==========================================
router.get(
  '/faculty/pending',
  authenticateToken,
  requireFaculty,
  odController.getFacultyODRequests
);

router.patch(
  '/faculty/:id/action',
  authenticateToken,
  requireFaculty,
  odController.facultyAction
);

// ==========================================
// 3. ADMIN ROUTES
// ==========================================
router.get(
  '/admin/all',
  authenticateToken,
  requireAdmin,
  odController.getAdminODRequests
);

router.get(
  '/admin/pending',
  authenticateToken,
  requireAdmin,
  odController.getAdminODRequests
);

router.patch(
  '/admin/:id/action',
  authenticateToken,
  requireAdmin,
  odController.adminAction
);

// ==========================================
// 4. HOD ROUTES
// ==========================================
router.get(
  '/hod/pending',
  authenticateToken,
  requireHOD,
  odController.getHODODRequests
);

router.patch(
  '/hod/:id/action',
  authenticateToken,
  requireHOD,
  odController.hodAction
);

// ==========================================
// 5. SHARED DETAIL ROUTE
// ==========================================
router.get(
  '/:id',
  authenticateToken,
  odController.getODRequestById
);

module.exports = router;
