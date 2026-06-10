const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
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
  createPlan,
  updatePlan,
  deletePlan,
  getContacts,
  deleteContact,
} = require('../controllers/adminController');

router.use(protect, admin);

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

module.exports = router;
