const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  adminLogin,
  adminProfile,
  adminLogout,
  changePassword,
  getAdminOverview,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  setStudentAdmissionStatus,
  getPayments,
  approvePayment,
  rejectPayment,
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getContacts,
  deleteContact,
  resolveContact,
} = require('../controllers/adminController');

const {
  getAllNotices,
  createNotice,
  updateNotice,
  deleteNotice,
} = require('../controllers/noticeController');

// Public routes
router.post('/login', adminLogin);

// Protected routes
router.use(protect, admin);

router.get('/profile', adminProfile);
router.post('/logout', adminLogout);
router.put('/settings/password', changePassword);

// Dashboard overview
router.get('/overview', getAdminOverview);

// Student management
router.get('/students', getStudents);
router.get('/students/:id', getStudentById);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);
router.put('/students/:id/admission', setStudentAdmissionStatus);

// Payment management
router.get('/payments', getPayments);
router.put('/payments/:id/approve', approvePayment);
router.put('/payments/:id/reject', rejectPayment);

// Membership plan management
router.get('/plans', getPlans);
router.get('/plans/:id', getPlanById);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Contact management
router.get('/contacts', getContacts);
router.delete('/contacts/:id', deleteContact);
router.put('/contacts/:id/resolve', resolveContact);

// Notice management
router.get('/notices', getAllNotices);
router.post('/notices', createNotice);
router.put('/notices/:id', updateNotice);
router.delete('/notices/:id', deleteNotice);

module.exports = router;
