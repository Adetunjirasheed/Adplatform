const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '..', 'uploads');
const proofsDir = path.resolve(__dirname, '..', 'uploads', 'proofs');
[uploadDir, proofsDir].forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'paymentProof') {
      cb(null, proofsDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Cryptographically safe random filename with original extension
    cb(null, `${uuidv4()}${ext}`);
  }
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
  'application/pdf'
];

const allowedExtensions = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.mp4', '.mov', '.avi', '.webm', '.mkv',
  '.pdf'
];

// Disallow dangerous or executable extensions completely
const dangerousExtensions = [
  '.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.js', '.vbs', '.py', '.rb', '.pl', '.jar', '.dll', '.bin'
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (dangerousExtensions.includes(ext)) {
    return cb(new Error('Dangerous file format detected and rejected.'), false);
  }

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.originalname}. Only images, videos, and PDF receipts are permitted.`), false);
  }
};

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter
});

const uploadCampaignMedia = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'paymentProof', maxCount: 1 }
]);

const uploadPaymentProof = upload.single('paymentProof');

module.exports = {
  uploadCampaignMedia,
  uploadPaymentProof
};
