const Student = require('../models/Student');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// @desc    Register a new student
// @route   POST /api/students/register
// @access  Public
const registerStudent = async (req, res, next) => {
  try {
    const {
      name,
      fatherName,
      motherName,
      gender,
      dob,
      mobile,
      altMobile,
      email,
      aadhaar,
      state,
      district,
      city,
      fullAddress,
      pincode,
      plan,
      joiningDate,
      timing,
    } = req.body;

    // 1. Basic validation of required text fields
    const requiredFields = {
      name,
      fatherName,
      motherName,
      gender,
      dob,
      mobile,
      email,
      state,
      district,
      city,
      fullAddress,
      pincode,
      plan,
      joiningDate,
      timing,
    };

    for (const [key, val] of Object.entries(requiredFields)) {
      if (!val || val.trim() === '') {
        res.status(400);
        throw new Error(`Field '${key}' is required.`);
      }
    }

    if (!req.file) {
      res.status(400);
      throw new Error('Student photo file is required');
    }

    // 2. Mobile validation (10 digits check)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile.trim())) {
      res.status(400);
      throw new Error('Mobile number must be exactly 10 digits.');
    }


    // 3. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400);
      throw new Error('Invalid email format.');
    }

    // 4. Duplicate checks
    const duplicateEmail = await Student.findOne({ email: email.trim().toLowerCase() });
    if (duplicateEmail) {
      res.status(400);
      throw new Error('Student with this email address is already registered.');
    }

    const duplicateMobile = await Student.findOne({ mobile: mobile.trim() });
    if (duplicateMobile) {
      res.status(400);
      throw new Error('Student with this mobile number is already registered.');
    }

    // 5. Cloudinary upload for photo
    let uploadResult;
    try {
      uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'maa_sharde_library/students/photos',
      });
    } catch (err) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(502);
      throw new Error(`Failed to upload student photo: ${err.message}`);
    }

    // Delete local temp file
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // 6. Generate Student ID (MSDL-YYYY-XXXX)
    const currentYear = new Date().getFullYear();
    const count = await Student.countDocuments({
      createdAt: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      },
    });
    const nextCounter = String(count + 1).padStart(4, '0');
    const studentId = `MSDL-${currentYear}-${nextCounter}`;

    // 7. Save Student
    const student = await Student.create({
      studentId,
      name: name.trim(),
      fatherName: fatherName.trim(),
      motherName: motherName.trim(),
      gender,
      dob,
      mobile: mobile.trim(),
      altMobile: altMobile ? altMobile.trim() : '',
      email: email.trim().toLowerCase(),
      aadhaar: aadhaar ? aadhaar.trim() : '',
      photo: uploadResult.secure_url,
      state: state.trim(),
      district: district.trim(),
      city: city.trim(),
      fullAddress: fullAddress.trim(),
      pincode: pincode.trim(),
      plan,
      joiningDate,
      timing,
      admissionStatus: 'pending',
      paymentStatus: 'pending',
    });

    res.status(201).json({
      message: 'Student details saved successfully. Please scan QR Code below to make payment.',
      student,
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Upload payment screenshot linked to student
// @route   POST /api/students/:id/upload-payment
// @access  Public
const uploadStudentPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      res.status(400);
      throw new Error('Payment verification screenshot file is required');
    }

    const student = await Student.findById(id);
    if (!student) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(404);
      throw new Error('Student record not found.');
    }

    // Upload to Cloudinary
    let uploadResult;
    try {
      uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'maa_sharde_library/students/payments',
      });
    } catch (err) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(502);
      throw new Error(`Failed to upload payment screenshot: ${err.message}`);
    }

    // Delete local temp file
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Update payment screenshot
    student.paymentScreenshot = uploadResult.secure_url;
    student.paymentStatus = 'pending';
    await student.save();

    res.json({
      message: 'Payment screenshot submitted successfully.',
      student,
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin)
const getAllStudents = async (req, res, next) => {
  try {
    const students = await Student.find({}).sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    next(error);
  }
};

// @desc    Update student admission/payment status
// @route   PUT /api/students/:id/status
// @access  Private (Admin)
const updateStudentStatus = async (req, res, next) => {
  try {
    const { admissionStatus, paymentStatus } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    if (admissionStatus) student.admissionStatus = admissionStatus;
    if (paymentStatus) student.paymentStatus = paymentStatus;

    const updatedStudent = await student.save();
    res.json(updatedStudent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerStudent,
  uploadStudentPayment,
  getAllStudents,
  updateStudentStatus,
};
