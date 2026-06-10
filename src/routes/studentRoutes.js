const express = require('express');
const router = express.Router();
const {
  registerStudent,
  uploadStudentPayment,
  getAllStudents,
  updateStudentStatus,
} = require('../controllers/studentController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public registration endpoints
router.post('/register', upload.single('studentPhoto'), registerStudent);
router.post('/:id/upload-payment', upload.single('paymentScreenshot'), uploadStudentPayment);

// Admin endpoints
router.get('/', protect, admin, getAllStudents);
router.put('/:id/status', protect, admin, updateStudentStatus);

module.exports = router;
