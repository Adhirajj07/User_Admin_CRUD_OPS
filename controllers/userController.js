/**
 * controllers/userController.js
 * CRUD operations a logged-in user can perform on THEIR OWN requests.
 * Every read/update/delete re-checks ownership server-side -- the frontend
 * hiding a button is not security.
 */
const requestModel = require('../models/requestModel');

// GET /api/requests
async function getMyRequests(req, res) {
  const requests = await requestModel.getRequestsByUser(req.user.id);
  res.json({ success: true, requests });
}

// POST /api/requests
async function createRequest(req, res) {
  const { title, description, category } = req.body;
  const id = await requestModel.createRequest({ userId: req.user.id, title, description, category });
  const created = await requestModel.getRequestById(id);
  res.status(201).json({ success: true, message: 'Request created', request: created });
}

// PUT /api/requests/:id
async function updateRequest(req, res) {
  const { id } = req.params;
  const { title, description, category } = req.body;

  const existing = await requestModel.getRequestById(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }
  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You do not own this request' });
  }
  if (existing.status !== 'Pending') {
    return res.status(400).json({ success: false, message: 'Only pending requests can be edited' });
  }

  await requestModel.updateRequest(id, { title, description, category });
  const updated = await requestModel.getRequestById(id);
  res.json({ success: true, message: 'Request updated', request: updated });
}

// DELETE /api/requests/:id  (only allowed while status is Pending)
async function deleteRequest(req, res) {
  const { id } = req.params;

  const existing = await requestModel.getRequestById(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }
  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You do not own this request' });
  }
  if (existing.status !== 'Pending') {
    return res.status(400).json({ success: false, message: 'Only pending requests can be deleted' });
  }

  await requestModel.deleteRequest(id);
  res.json({ success: true, message: 'Request deleted' });
}

module.exports = { getMyRequests, createRequest, updateRequest, deleteRequest };
