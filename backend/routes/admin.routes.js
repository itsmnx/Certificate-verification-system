const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  uploadStudents,
  getAllStudents,
  generateCertificate,
  getStats,
  getEmailLogs,
  retryEmail
} = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');

// configure where uploaded files go and what they're named
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'students-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// only allow .xlsx and .xls files — reject everything else
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// all routes below require admin to be logged in
router.use(protect);

// routes
router.post('/upload-students', upload.single('file'), uploadStudents);
router.get('/students', getAllStudents);
router.post('/generate-certificate/:studentId', generateCertificate);
router.get('/stats', getStats);
router.get('/email-logs', getEmailLogs);
router.post('/retry-email/:emailLogId', retryEmail);

// catch multer errors and return a clean JSON response
// without this, a wrong file type or oversized file causes an ugly server crash
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // file exceeded the size limit
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File is too large. Maximum size allowed is 5MB'
      });
    }
    // any other multer error
    return res.status(400).json({
      status: 'error',
      message: `Upload error: ${err.message}`
    });
  }

  // wrong file type thrown by fileFilter
  if (err) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }

  next();
});

module.exports = router;