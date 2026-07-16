const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const requireAuth = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation, requestRules } = require('../utils/validators');

// Every route below requires a valid JWT
router.use(requireAuth);

router.get('/requests', asyncHandler(userController.getMyRequests));
router.post('/requests', requestRules, handleValidation, asyncHandler(userController.createRequest));
router.put('/requests/:id', requestRules, handleValidation, asyncHandler(userController.updateRequest));
router.delete('/requests/:id', asyncHandler(userController.deleteRequest));

module.exports = router;
