const express = require('express');
const router = express.Router();
const { getPlans } = require('../controllers/adminController');

router.get('/', getPlans);

module.exports = router;
