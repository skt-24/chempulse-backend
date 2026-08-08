const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../validators/authValidator');
const { authLimiter } = require('../middleware/rateLimiter');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', authLimiter, validate('signup'), authController.signup);
router.post('/login', authLimiter, validate('login'), authController.login);
router.post('/refresh', validate('refresh'), authController.refresh);
router.post('/logout', validate('logout'), authController.logout);
router.post('/forgot-password', authLimiter, validate('forgotPassword'), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate('resetPassword'), authController.resetPassword);

router.get('/me', protect, authController.me);

module.exports = router;