const cloudinary = require('../config/cloudinary');
const Registration = require('../models/Registration');
const fs = require('fs');

// @desc    Upload payment verification screenshot
// @route   POST /api/payments/upload-screenshot
// @access  Private (Student)
const uploadScreenshot = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an image file');
    }

    // Find the latest pending registration for the student
    const registration = await Registration.findOne({
      student: req.user.id,
      status: 'pending',
    }).sort({ createdAt: -1 });

    if (!registration) {
      // Remove local temp file
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400);
      throw new Error(
        'No pending membership registration request found to attach payment to.'
      );
    }

    // Upload to Cloudinary
    let uploadResult;
    try {
      uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'maa_sharde_library/payments',
      });
    } catch (cloudinaryErr) {
      // Always remove local temp file on error
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(502);
      throw new Error(`Cloudinary upload failed: ${cloudinaryErr.message}`);
    }

    // Delete local file after successful upload to Cloudinary
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Save Cloudinary URL and update payment status to pending verification
    registration.paymentScreenshot = uploadResult.secure_url;
    registration.paymentStatus = 'pending';
    await registration.save();

    res.json({
      message: 'Screenshot uploaded and payment registered for verification.',
      screenshotUrl: uploadResult.secure_url,
      registration,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadScreenshot,
};
