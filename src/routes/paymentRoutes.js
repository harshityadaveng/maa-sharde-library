const express = require('express');
const router = express.Router();
const {
  uploadPayment,
  getPaymentDetails,
  getPaymentByStudent,
  getAllPayments,
  verifyPayment,
  rejectPayment,
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.post('/upload', upload.single('paymentScreenshot'), uploadPayment);
router.get('/student/:studentDbId', getPaymentByStudent);
router.get('/:id', getPaymentDetails);

// Admin-only routes
router.get('/', protect, admin, getAllPayments);
router.put('/:id/verify', protect, admin, verifyPayment);
router.put('/:id/reject', protect, admin, rejectPayment);

module.exports = router;
