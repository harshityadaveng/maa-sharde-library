const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: String,
      required: [true, 'Seat number is required'],
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved'],
      default: 'available',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    shift: {
      type: String,
      enum: ['Morning Shift', 'Afternoon Shift', 'Evening Shift', 'Full Day', 'any'],
      default: 'any',
    },
  },
  {
    timestamps: true,
  }
);

const Seat = mongoose.model('Seat', seatSchema);
module.exports = Seat;
