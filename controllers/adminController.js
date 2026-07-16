/**
 * controllers/adminController.js
 * Admin-only actions: view every request across all users (with
 * search/filter/sort), and approve/reject a request.
 */
const requestModel = require('../models/requestModel');

// GET /api/admin/requests?search=&status=&sort=
async function getAllRequests(req, res) {
  const { search, status, sort } = req.query;
  const requests = await requestModel.getAllRequests({ search, status, sort });
  res.json({ success: true, requests });
}

// PUT /api/admin/approve/:id
async function approveRequest(req, res) {
  const request = await requestModel.getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }
  await requestModel.updateStatus(request.id, 'Approved');
  const updated = await requestModel.getRequestById(request.id);
  res.json({ success: true, message: 'Request approved', request: updated });
}

// PUT /api/admin/reject/:id
async function rejectRequest(req, res) {
  const request = await requestModel.getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }
  await requestModel.updateStatus(request.id, 'Rejected');
  const updated = await requestModel.getRequestById(request.id);
  res.json({ success: true, message: 'Request rejected', request: updated });
}

module.exports = { getAllRequests, approveRequest, rejectRequest };
