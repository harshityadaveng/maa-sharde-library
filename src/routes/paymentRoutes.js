const express = require('express');
const router = express.Router();
const { uploadScreenshot } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post(
  '/upload-screenshot',
  protect,
  upload.single('paymentScreenshot'),
  uploadScreenshot
);

module.exports = router;
