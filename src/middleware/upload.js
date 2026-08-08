const multer = require('multer');
const ApiError = require('../utils/apiError');

// ======================================================
// Upload configuration
// ======================================================

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml'
];

// We keep the uploaded image in memory.
// Your media service/storage strategy can save req.file.buffer later.
const storage = multer.memoryStorage();

// ======================================================
// File type filter
// ======================================================

const fileFilter = (req, file, cb) => {
  console.log('[Upload] Incoming file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype
  });

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new ApiError(
        400,
        'Invalid file format. Only JPEG, PNG, WEBP and SVG images are allowed.',
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }

  cb(null, true);
};

// ======================================================
// Multer
// IMPORTANT:
// Postman form-data key MUST be exactly: file
// ======================================================

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_SIZE_BYTES,
    files: 1
  },
  fileFilter
});

// Only accept one file with field name "file"
const uploadSingleFile = upload.single('file');

// ======================================================
// Binary signature validation
// ======================================================

const validateMagicNumbers = (req, res, next) => {
  if (!req.file) {
    return next(
      new ApiError(
        400,
        'No image was uploaded. Use form-data with field name "file".',
        'MISSING_FILE'
      )
    );
  }

  if (!req.file.buffer || req.file.buffer.length === 0) {
    return next(
      new ApiError(
        400,
        'Uploaded file is empty.',
        'EMPTY_FILE'
      )
    );
  }

  const buffer = req.file.buffer;
  const mimeType = req.file.mimetype;

  let valid = false;

  // --------------------------------------------------
  // JPEG
  // FF D8 FF
  // --------------------------------------------------

  if (
    mimeType === 'image/jpeg' &&
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    valid = true;
  }

  // --------------------------------------------------
  // PNG
  // 89 50 4E 47 0D 0A 1A 0A
  // --------------------------------------------------

  if (
    mimeType === 'image/png' &&
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    valid = true;
  }

  // --------------------------------------------------
  // WEBP
  // RIFF....WEBP
  // --------------------------------------------------

  if (
    mimeType === 'image/webp' &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    valid = true;
  }

  // --------------------------------------------------
  // SVG
  // --------------------------------------------------

  if (mimeType === 'image/svg+xml') {
    const beginning = buffer
      .toString('utf8', 0, Math.min(buffer.length, 1000))
      .trim()
      .toLowerCase();

    if (
      beginning.includes('<svg') ||
      (
        beginning.startsWith('<?xml') &&
        beginning.includes('<svg')
      )
    ) {
      valid = true;
    }
  }

  if (!valid) {
    return next(
      new ApiError(
        400,
        'File contents do not match the declared image format.',
        'CORRUPTED_OR_DANGEROUS_FILE'
      )
    );
  }

  console.log('[Upload] Image validated:', {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });

  next();
};

// ======================================================
// Main middleware
// ======================================================

const handleUpload = (req, res, next) => {
  console.log('\n========== MEDIA UPLOAD ==========');
  console.log(
    '[Upload] Content-Type:',
    req.headers['content-type']
  );

  uploadSingleFile(req, res, (err) => {
    // ----------------------------------------------
    // Multer errors
    // ----------------------------------------------

    if (err instanceof multer.MulterError) {
      console.error('[Multer Error]', {
        code: err.code,
        field: err.field,
        message: err.message
      });

      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new ApiError(
            400,
            'File size exceeds the maximum limit of 5 MB.',
            'FILE_TOO_LARGE'
          )
        );
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(
          new ApiError(
            400,
            'Only one image can be uploaded at a time.',
            'TOO_MANY_FILES'
          )
        );
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(
          new ApiError(
            400,
            `Unexpected upload field "${err.field}". The form-data field must be exactly "file".`,
            'UNEXPECTED_FILE_FIELD'
          )
        );
      }

      return next(
        new ApiError(
          400,
          `Upload failed: ${err.message}`,
          'UPLOAD_ERROR'
        )
      );
    }

    // ----------------------------------------------
    // Other errors
    // ----------------------------------------------

    if (err) {
      console.error('[Upload Error]', err);
      return next(err);
    }

    // ----------------------------------------------
    // No file
    // ----------------------------------------------

    if (!req.file) {
      return next(
        new ApiError(
          400,
          'No image uploaded. Send multipart/form-data using the field name "file".',
          'MISSING_FILE'
        )
      );
    }

    // ----------------------------------------------
    // Validate actual binary
    // ----------------------------------------------

    return validateMagicNumbers(req, res, next);
  });
};

module.exports = {
  handleUpload
};