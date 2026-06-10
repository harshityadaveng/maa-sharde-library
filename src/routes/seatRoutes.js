const express = require('express');
const router = express.Router();
const {
  getSeatStatus,
  createSeat,
  assignSeat,
  releaseSeat,
} = require('../controllers/seatController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/status', getSeatStatus);

// Admin-only endpoints
router.post('/', protect, admin, createSeat);
router.put('/assign', protect, admin, assignSeat);
router.put('/release/:id', protect, admin, releaseSeat);

module.exports = router;
