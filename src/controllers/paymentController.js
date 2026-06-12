const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Plan = require('../models/Plan');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// Helper: Generate sequential Payment ID
const generatePaymentId = async () => {
  const currentYear = new Date().getFullYear();
  const count = await Payment.countDocuments({
    createdAt: {
      $gte: new Date(`${currentYear}-01-01`),
      $lte: new Date(`${currentYear}-12-31`),
    },
  });
  const nextCounter = String(count + 1).padStart(5, '0');
  return `PAY-${currentYear}-${nextCounter}`;
};

// @desc    Upload payment screenshot and create payment record
// @route   POST /api/payments/upload
// @access  Public
const uploadPayment = async (req, res, next) => {
  try {
    const { studentDbId, amount } = req.body;

    // Validate inputs
    if (!studentDbId) {
      res.status(400);
      throw new Error('Student ID is required.');
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      res.status(400);
      throw new Error('A valid payment amount is required.');
    }
    if (!req.file) {
      res.status(400);
      throw new Error('Payment screenshot image is required.');
    }

    // Verify the student record exists
    const student = await Student.findById(studentDbId);
    if (!student) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(404);
      throw new Error('No student record found with this ID.');
    }

    // Upload screenshot to Cloudinary
    let uploadResult;
    try {
      uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'maa_sharde_library/payments',
      });
    } catch (err) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(502);
      throw new Error(`Screenshot upload failed: ${err.message}`);
    }

    // Delete local temp file
    if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    // Generate unique payment ID
    const paymentId = await generatePaymentId();

    // Create payment record in DB
    const payment = await Payment.create({
      paymentId,
      studentId: student._id,
      studentReadableId: student.studentId,
      amount: Number(amount),
      paymentScreenshot: uploadResult.secure_url,
      paymentStatus: 'under_verification',
    });

    // Update student's payment status
    student.paymentStatus = 'under_verification';
    await student.save();


    res.status(201).json({
      message: 'Payment screenshot uploaded successfully. Your payment is under verification.',
      payment,
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Get payment details by payment record ID
// @route   GET /api/payments/:id
// @access  Public
const getPaymentDetails = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id).populate(
      'studentId',
      'name mobile email studentId'
    );
    if (!payment) {
      res.status(404);
      throw new Error('Payment record not found.');
    }
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment status by student DB ID
// @route   GET /api/payments/student/:studentDbId
// @access  Public
const getPaymentByStudent = async (req, res, next) => {
  try {
    const payments = await Payment.find({
      studentId: req.params.studentDbId,
    }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments (admin dashboard)
// @route   GET /api/payments
// @access  Private (Admin)
const getAllPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({})
      .populate('studentId', 'name mobile email studentId')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify/Approve a payment
// @route   PUT /api/payments/:id/verify
// @access  Private (Admin)
const verifyPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404);
      throw new Error('Payment record not found.');
    }

    payment.paymentStatus = 'approved';
    payment.adminRemarks = req.body.adminRemarks || 'Payment verified and approved.';
    await payment.save();

    const student = await Student.findById(payment.studentId);
    if (student) {
      student.paymentStatus = 'approved';
      student.admissionStatus = 'approved';
      student.status = 'active';
      if (!student.startDate) {
        student.startDate = new Date();
      }
      if (!student.endDate) {
        let durationDays = 30;
        const plan = await Plan.findOne({ title: student.plan });
        if (plan) {
          const durStr = plan.duration.toLowerCase();
          const match = durStr.match(/^(\d+)\s*(day|month|year|week)/);
          if (match) {
            const val = parseInt(match[1]);
            const type = match[2];
            if (type.startsWith('day')) durationDays = val;
            else if (type.startsWith('week')) durationDays = val * 7;
            else if (type.startsWith('month')) durationDays = val * 30;
            else if (type.startsWith('year')) durationDays = val * 365;
          }
        } else {
          const planLower = student.plan.toLowerCase();
          if (planLower.includes('daily')) durationDays = 1;
          else if (planLower.includes('monthly')) durationDays = 30;
          else if (planLower.includes('quarterly')) durationDays = 90;
          else if (planLower.includes('yearly')) durationDays = 365;
        }
        const end = new Date(student.startDate);
        end.setDate(end.getDate() + durationDays);
        student.endDate = end;
      }
      await student.save();
    }


    res.json({
      message: 'Payment has been approved successfully.',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a payment
// @route   PUT /api/payments/:id/reject
// @access  Private (Admin)
const rejectPayment = async (req, res, next) => {
  try {
    const { adminRemarks } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      res.status(404);
      throw new Error('Payment record not found.');
    }

    payment.paymentStatus = 'rejected';
    payment.adminRemarks = adminRemarks || 'Payment rejected by admin.';
    await payment.save();

    const student = await Student.findById(payment.studentId);
    if (student) {
      student.paymentStatus = 'rejected';
      student.status = 'expired';
      await student.save();
    }


    res.json({
      message: 'Payment has been rejected.',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPayment,
  getPaymentDetails,
  getPaymentByStudent,
  getAllPayments,
  verifyPayment,
  rejectPayment,
};
