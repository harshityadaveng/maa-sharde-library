const Notice = require('../models/Notice');

// @desc    Get all active notices
// @route   GET /api/notices
// @access  Public
const getActiveNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find({ active: true }).sort({ createdAt: -1 });
    res.json(notices);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all notices
// @route   GET /api/admin/notices
// @access  Private (Admin)
const getAllNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find({}).sort({ createdAt: -1 });
    res.json(notices);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new notice
// @route   POST /api/admin/notices
// @access  Private (Admin)
const createNotice = async (req, res, next) => {
  try {
    const { title, content, active } = req.body;
    if (!title || !content) {
      res.status(400);
      throw new Error('Title and content are required');
    }
    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      active: active !== undefined ? Boolean(active) : true,
    });
    res.status(201).json(notice);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a notice
// @route   PUT /api/admin/notices/:id
// @access  Private (Admin)
const updateNotice = async (req, res, next) => {
  try {
    const { title, content, active } = req.body;
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      res.status(404);
      throw new Error('Notice not found');
    }
    if (title !== undefined) notice.title = title.trim();
    if (content !== undefined) notice.content = content.trim();
    if (active !== undefined) notice.active = Boolean(active);
    await notice.save();
    res.json(notice);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a notice
// @route   DELETE /api/admin/notices/:id
// @access  Private (Admin)
const deleteNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      res.status(404);
      throw new Error('Notice not found');
    }
    await Notice.findByIdAndDelete(notice._id);
    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveNotices,
  getAllNotices,
  createNotice,
  updateNotice,
  deleteNotice,
};
