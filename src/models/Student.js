const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
      required: true,
    },
    // Personal Details
    name: {
      type: String,
      required: [true, 'Full Name is required'],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "Father's Name is required"],
      trim: true,
    },
    motherName: {
      type: String,
      required: [true, "Mother's Name is required"],
      trim: true,
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['Male', 'Female', 'Other'],
    },
    dob: {
      type: Date,
      required: [true, 'Date of Birth is required'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    altMobile: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    aadhaar: {
      type: String,
      trim: true,
    },
    photo: {
      type: String, // Cloudinary URL
      required: [true, 'Student photo is required'],
    },
    // Address Details
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    fullAddress: {
      type: String,
      required: [true, 'Full Address is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
    },
    // Library Details
    plan: {
      type: String,
      required: [true, 'Membership Plan is required'],
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining Date is required'],
      default: Date.now,
    },
    timing: {
      type: String,
      required: [true, 'Preferred study shift timing is required'],
    },
    // Admission & Payment status
    admissionStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'under_verification', 'approved', 'rejected'],
      default: 'pending',
    },

    paymentScreenshot: {
      type: String, // Cloudinary URL
      default: '',
    },
    registrationDate: {
      type: Date,
      default: Date.now,
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

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
