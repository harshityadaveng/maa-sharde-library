const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      required: [true, 'Membership plan is required'],
      enum: ['Daily Pass', 'Monthly Plan', 'Quarterly Plan', 'Yearly Plan'],
    },
    shift: {
      type: String,
      required: [true, 'Study shift is required'],
      enum: ['Morning Shift', 'Afternoon Shift', 'Evening Shift', 'Full Day'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending',
    },
    paymentScreenshot: {
      type: String, // Cloudinary URL
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired'],
      default: 'pending',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Registration = mongoose.model('Registration', registrationSchema);
module.exports = Registration;
