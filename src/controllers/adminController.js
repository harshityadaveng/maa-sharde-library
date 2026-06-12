const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const ContactMessage = require('../models/ContactMessage');
const Notice = require('../models/Notice');

// ─────────────────────────────────────────────
// AUTH CONTROLLERS
// ─────────────────────────────────────────────

/**
 * POST /api/admin/login
 * Authenticates an admin and returns a signed JWT token.
 */
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please enter email and password');
    }

    const emailClean = email.trim().toLowerCase();

    // 1. Search in Admin collection (primary store)
    let adminUser = await Admin.findOne({ email: emailClean });

    // 2. Fallback: Search in User collection with role 'admin'
    if (!adminUser) {
      adminUser = await User.findOne({ email: emailClean, role: 'admin' });
    }

    // 3. If still not found AND credentials match env vars → auto-seed the admin
    //    This uses bcrypt comparison via matchPassword, so we must create the record first.
    if (!adminUser) {
      const envEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const envPassword = (process.env.ADMIN_PASSWORD || '').trim();

      if (emailClean === envEmail && envPassword) {
        // Verify the entered password matches the env password (plain comparison only for seeding)
        if (password.trim() === envPassword) {
          // Create the admin record — pre-save hook will hash the password
          adminUser = await Admin.create({
            name: 'Super Admin',
            email: envEmail,
            password: envPassword,
            isSuperAdmin: true,
          });
          console.log(`Super Admin auto-seeded for: ${envEmail}`);
        }
      }
    }

    // 4. Validate credentials using bcrypt

    if (adminUser && (await adminUser.matchPassword(password))) {
      const token = jwt.sign(
        { id: adminUser._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );


      return res.json({
        _id: adminUser._id,
        name: adminUser.name || 'System Admin',
        email: adminUser.email,
        role: 'admin',
        token,
      });
    }

    res.status(401);
    throw new Error('Invalid email or password');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/profile
 * Returns the authenticated admin's profile (requires JWT).
 */
const adminProfile = async (req, res, next) => {
  try {
    const adminUser = req.user;
    if (!adminUser) {
      res.status(404);
      throw new Error('Admin not found');
    }
    res.json({
      _id: adminUser._id,
      name: adminUser.name || 'System Admin',
      email: adminUser.email,
      role: 'admin',
      isSuperAdmin: adminUser.isSuperAdmin || false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/logout
 * Stateless logout — client must discard the token.
 */
const adminLogout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

/**
 * PUT /api/admin/settings/password
 * Changes the admin's password after verifying the current one.
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error('Please provide current password and new password');
    }

    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('New password must be at least 6 characters long');
    }

    // Find the admin record (check Admin collection first, then User)
    let adminUser = await Admin.findById(req.user._id);
    if (!adminUser) {
      adminUser = await User.findById(req.user._id);
    }

    if (!adminUser) {
      res.status(404);
      throw new Error('Admin user not found');
    }

    const isMatch = await adminUser.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(400);
      throw new Error('Incorrect current password');
    }

    adminUser.password = newPassword;
    await adminUser.save(); // pre-save hook re-hashes the new password

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// DASHBOARD OVERVIEW
// ─────────────────────────────────────────────

const getAdminOverview = async (req, res, next) => {
  try {
    const totalStudents = await Student.countDocuments({});
    const approvedAdmissions = await Student.countDocuments({ admissionStatus: 'approved' });
    const pendingAdmissions = await Student.countDocuments({ admissionStatus: 'pending' });
    const pendingPayments = await Payment.countDocuments({
      paymentStatus: { $in: ['pending', 'under_verification'] },
    });

    const revenueResult = await Payment.aggregate([
      { $match: { paymentStatus: 'approved' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
    ]);

    res.json({
      totalStudents,
      approvedAdmissions,
      pendingAdmissions,
      pendingPayments,
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// STUDENT MANAGEMENT
// ─────────────────────────────────────────────

const getStudents = async (req, res, next) => {
  try {
    const { search, admissionStatus, paymentStatus, plan } = req.query;
    const filter = {};

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { mobile: regex },
        { studentId: regex },
      ];
    }

    if (admissionStatus) filter.admissionStatus = admissionStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (plan) filter.plan = plan;

    const students = await Student.find(filter).sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    next(error);
  }
};

const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }
    res.json(student);
  } catch (error) {
    next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const allowedFields = [
      'name', 'fatherName', 'motherName', 'gender', 'dob',
      'mobile', 'altMobile', 'email', 'aadhaar', 'photo',
      'state', 'district', 'city', 'fullAddress', 'pincode',
      'plan', 'joiningDate', 'timing', 'admissionStatus', 'paymentStatus',
      'status', 'startDate', 'endDate',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    const student = await Student.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    res.json(student);
  } catch (error) {
    next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    await Payment.deleteMany({ studentId: student._id });
    await Student.findByIdAndDelete(student._id);

    res.json({ message: 'Student and related payments removed successfully.' });
  } catch (error) {
    next(error);
  }
};

const setStudentAdmissionStatus = async (req, res, next) => {
  try {
    const { admissionStatus } = req.body;
    if (!admissionStatus) {
      res.status(400);
      throw new Error('Admission status is required');
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    student.admissionStatus = admissionStatus;
    if (admissionStatus === 'approved') {
      student.paymentStatus = 'approved';
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
    } else if (admissionStatus === 'rejected') {
      student.paymentStatus = 'rejected';
      student.status = 'expired';
    }

    await student.save();
    res.json(student);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// PAYMENT MANAGEMENT
// ─────────────────────────────────────────────

const getPayments = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.paymentStatus = status;
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ paymentId: regex }];
    }

    const payments = await Payment.find(filter)
      .populate('studentId', 'name mobile email studentId')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    next(error);
  }
};

const approvePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404);
      throw new Error('Payment record not found');
    }

    payment.paymentStatus = 'approved';
    payment.adminRemarks = req.body.adminRemarks || 'Payment approved by admin.';
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

    res.json({ message: 'Payment approved successfully.', payment });
  } catch (error) {
    next(error);
  }
};

const rejectPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404);
      throw new Error('Payment record not found');
    }

    payment.paymentStatus = 'rejected';
    payment.adminRemarks = req.body.adminRemarks || 'Payment rejected by admin.';
    await payment.save();

    const student = await Student.findById(payment.studentId);
    if (student) {
      student.paymentStatus = 'rejected';
      student.status = 'expired';
      await student.save();
    }

    res.json({ message: 'Payment rejected successfully.', payment });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// MEMBERSHIP PLAN MANAGEMENT
// ─────────────────────────────────────────────

const getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({}).sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const { title, price, duration, description, active } = req.body;
    if (!title || !price || !duration) {
      res.status(400);
      throw new Error('Title, price and duration are required to create a plan.');
    }

    const plan = await Plan.create({
      title: title.trim(),
      price: Number(price),
      duration: duration.trim(),
      description: description ? description.trim() : '',
      active: active !== undefined ? Boolean(active) : true,
    });

    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
};

const getPlanById = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      res.status(404);
      throw new Error('Plan not found');
    }
    res.json(plan);
  } catch (error) {
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const updates = {};
    ['title', 'price', 'duration', 'description', 'active'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (updates.price !== undefined) {
      updates.price = Number(updates.price);
    }

    const plan = await Plan.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      res.status(404);
      throw new Error('Plan not found');
    }

    res.json(plan);
  } catch (error) {
    next(error);
  }
};

const deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      res.status(404);
      throw new Error('Plan not found');
    }
    await Plan.findByIdAndDelete(plan._id);
    res.json({ message: 'Plan removed successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// CONTACT MESSAGE MANAGEMENT
// ─────────────────────────────────────────────

const getContacts = async (req, res, next) => {
  try {
    const contacts = await ContactMessage.find({}).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    next(error);
  }
};

const deleteContact = async (req, res, next) => {
  try {
    const contact = await ContactMessage.findById(req.params.id);
    if (!contact) {
      res.status(404);
      throw new Error('Contact message not found');
    }
    await ContactMessage.findByIdAndDelete(contact._id);
    res.json({ message: 'Contact message deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

const resolveContact = async (req, res, next) => {
  try {
    const contact = await ContactMessage.findById(req.params.id);
    if (!contact) {
      res.status(404);
      throw new Error('Contact message not found');
    }
    contact.status = 'resolved';
    await contact.save();
    res.json({ message: 'Contact message marked as resolved successfully.', contact });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Auth
  adminLogin,
  adminProfile,
  adminLogout,
  changePassword,
  // Dashboard
  getAdminOverview,
  // Students
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  setStudentAdmissionStatus,
  // Payments
  getPayments,
  approvePayment,
  rejectPayment,
  // Plans
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  // Contacts
  getContacts,
  deleteContact,
  resolveContact,
};
