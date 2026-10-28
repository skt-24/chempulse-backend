const express = require('express');
const profileController = require('../controllers/profileController');
const { validateUpdateProfile } = require('../validators/profileValidator');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All profile endpoints require authentication
router.use(protect);

router.get('/', profileController.getProfile);
router.patch('/', validateUpdateProfile, profileController.updateProfile);

module.exports = router;