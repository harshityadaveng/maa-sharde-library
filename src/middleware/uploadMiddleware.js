const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory and its subdirectories exist
const uploadDir = path.join(__dirname, '../../uploads');
const subfolders = ['students', 'payments', 'documents'];

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

subfolders.forEach((sub) => {
  const subpath = path.join(uploadDir, sub);
  if (!fs.existsSync(subpath)) {
    fs.mkdirSync(subpath, { recursive: true });
  }
});

// Configure storage with dynamic subdirectories
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subfolder = 'documents';
    if (file.fieldname === 'studentPhoto') {
      subfolder = 'students';
    } else if (file.fieldname === 'paymentScreenshot') {
      subfolder = 'payments';
    }
    cb(null, path.join(uploadDir, subfolder));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Configure file filter (images only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/i;
  const extname = allowedTypes.test(path.extname(file.originalname));
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Error: Only images (jpeg, jpg, png, gif) are allowed!'));
  }
};

// Set limits and compile upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max size
  fileFilter: fileFilter,
});

module.exports = upload;

