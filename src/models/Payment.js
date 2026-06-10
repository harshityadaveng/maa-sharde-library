const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      unique: true,
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    studentReadableId: {
      type: String, // e.g. MSDL-2026-0001 for easy reference
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentScreenshot: {
      type: String, // Cloudinary URL
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'under_verification', 'approved', 'rejected'],
      default: 'pending',
    },
    adminRemarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
