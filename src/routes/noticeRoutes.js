const express = require('express');
const router = express.Router();
const { getActiveNotices } = require('../controllers/noticeController');

router.get('/', getActiveNotices);

module.exports = router;
