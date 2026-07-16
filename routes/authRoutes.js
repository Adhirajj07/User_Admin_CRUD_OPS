const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  handleValidation,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require('../utils/validators');

router.post('/register', authLimiter, registerRules, handleValidation, asyncHandler(authController.register));
router.post('/login', authLimiter, loginRules, handleValidation, asyncHandler(authController.login));
router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordRules,
  handleValidation,
  asyncHandler(authController.forgotPassword)
);
router.post(
  '/reset-password/:token',
  authLimiter,
  resetPasswordRules,
  handleValidation,
  asyncHandler(authController.resetPassword)
);

module.exports = router;
