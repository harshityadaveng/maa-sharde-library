const Seat = require('../models/Seat');

// @desc    Get counts and details of seats
// @route   GET /api/seats/status
// @access  Public
const getSeatStatus = async (req, res, next) => {
  try {
    const totalCount = await Seat.countDocuments({});
    const availableCount = await Seat.countDocuments({ status: 'available' });
    const occupiedCount = await Seat.countDocuments({ status: 'occupied' });
    const reservedCount = await Seat.countDocuments({ status: 'reserved' });

    const seats = await Seat.find({}).populate('assignedTo', 'name email phone');

    res.json({
      totalSeats: totalCount,
      availableSeats: availableCount,
      occupiedSeats: occupiedCount,
      reservedSeats: reservedCount,
      seats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new seat record
// @route   POST /api/seats
// @access  Private (Admin)
const createSeat = async (req, res, next) => {
  try {
    const { seatNumber, shift } = req.body;

    if (!seatNumber) {
      res.status(400);
      throw new Error('Seat number is required');
    }

    const existingSeat = await Seat.findOne({ seatNumber });
    if (existingSeat) {
      res.status(400);
      throw new Error(`Seat number ${seatNumber} already exists`);
    }

    const seat = await Seat.create({
      seatNumber,
      shift: shift || 'any',
    });

    res.status(201).json(seat);
  } catch (error) {
    next(error);
  }
};

// @desc    Assign a seat to a student
// @route   PUT /api/seats/assign
// @access  Private (Admin)
const assignSeat = async (req, res, next) => {
  try {
    const { seatNumber, studentId, shift } = req.body;

    if (!seatNumber || !studentId) {
      res.status(400);
      throw new Error('Please specify both seat number and student ID');
    }

    const seat = await Seat.findOne({ seatNumber });
    if (!seat) {
      res.status(404);
      throw new Error('Seat not found');
    }

    if (seat.status !== 'available') {
      res.status(400);
      throw new Error('Seat is not currently available');
    }

    seat.status = 'occupied';
    seat.assignedTo = studentId;
    if (shift) {
      seat.shift = shift;
    }

    const updatedSeat = await seat.save();
    res.json(updatedSeat);
  } catch (error) {
    next(error);
  }
};

// @desc    Release a seat (make available)
// @route   PUT /api/seats/release/:id
// @access  Private (Admin)
const releaseSeat = async (req, res, next) => {
  try {
    const seat = await Seat.findById(req.params.id);

    if (!seat) {
      res.status(404);
      throw new Error('Seat record not found');
    }

    seat.status = 'available';
    seat.assignedTo = null;

    const updatedSeat = await seat.save();
    res.json(updatedSeat);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSeatStatus,
  createSeat,
  assignSeat,
  releaseSeat,
};
