const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/adminAuth');
const { asyncHandler } = require('../middleware/errorHandler');

// Every route below requires a valid JWT AND role === 'admin'
router.use(requireAuth, requireAdmin);

router.get('/requests', asyncHandler(adminController.getAllRequests));
router.put('/approve/:id', asyncHandler(adminController.approveRequest));
router.put('/reject/:id', asyncHandler(adminController.rejectRequest));

module.exports = router;
