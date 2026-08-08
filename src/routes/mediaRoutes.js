const express = require('express');
const mediaController = require('../controllers/mediaController');
const { handleUpload } = require('../middleware/upload');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post(
  '/upload',
  handleUpload,
  mediaController.uploadFile
);

router.delete(
  '/:id',
  mediaController.deleteFile
);

module.exports = router;