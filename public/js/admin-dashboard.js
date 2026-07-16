/**
 * public/js/admin-dashboard.js
 * Loads ALL requests across every user, with search/filter/sort applied
 * server-side (via query params) since the admin dataset can grow large.
 * Approve happens immediately; reject asks for confirmation first.
 */

const currentAdmin = requireRole('admin');
let currentRequests = [];
let searchDebounceTimer = null;

function initSidebarAdmin() {
  if (!currentAdmin) return;
  document.getElementById('user-name').textContent = currentAdmin.name;
  document.getElementById('user-avatar').textContent = currentAdmin.name.charAt(0).toUpperCase();
}

async function loadAllRequests({ showLoader = false } = {}) {
  const search = document.getElementById('search-input').value.trim();
  const status = document.getElementById('filter-status').value;
  const sort = document.getElementById('sort-order').value;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (sort) params.set('sort', sort);

  try {
    const data = await api(`/admin/requests?${params.toString()}`);
    currentRequests = data.requests;
    renderStats();
    renderRequests();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    if (showLoader) document.getElementById('page-loader').classList.add('hidden');
  }
}

function renderStats() {
  const total = currentRequests.length;
  const pending = currentRequests.filter((r) => r.status === 'Pending').length;
  const approved = currentRequests.filter((r) => r.status === 'Approved').length;
  const rejected = currentRequests.filter((r) => r.status === 'Rejected').length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-approved').textContent = approved;
  document.getElementById('stat-rejected').textContent = rejected;
}

function renderRequests() {
  const grid = document.getElementById('request-grid');

  if (currentRequests.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🗂️</div>
        <p>No requests match your current search/filter.</p>
      </div>`;
    return;
  }

  grid.innerHTML = currentRequests.map((r) => requestCardHtml(r)).join('');
}

function requestCardHtml(r) {
  const statusClass = r.status.toLowerCase();
  const isPending = r.status === 'Pending';

  return `
    <div class="request-card status-${statusClass}">
      <div class="request-card-header">
        <h3 class="request-card-title">${escapeHtml(r.title)}</h3>
        <span class="badge badge-${statusClass}">${r.status}</span>
      </div>
      <p class="request-card-desc">${escapeHtml(r.description)}</p>
      <div class="request-meta">
        <span class="category-chip">${escapeHtml(r.category)}</span>
        <span>By <strong>${escapeHtml(r.user_name)}</strong> (${escapeHtml(r.user_email)})</span>
        <span>Created <strong>${formatDate(r.created_at)}</strong></span>
      </div>
      <div class="request-actions">
        ${
          isPending
            ? `<button class="btn btn-secondary btn-sm" onclick="approveRequest(${r.id})">Approve</button>
               <button class="btn btn-danger btn-sm" onclick="openRejectModal(${r.id})">Reject</button>`
            : `<span style="font-size:12px;color:var(--color-text-muted);">Reviewed — ${formatDate(r.updated_at)}</span>`
        }
      </div>
    </div>
  `;
}

async function approveRequest(id) {
  try {
    await api(`/admin/approve/${id}`, { method: 'PUT' });
    toast('Request approved', 'success');
    await loadAllRequests();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ------------------------------- Reject modal ------------------------------- */

let rejectingId = null;

function openRejectModal(id) {
  rejectingId = id;
  document.getElementById('reject-modal').classList.add('open');
}

function closeRejectModal() {
  rejectingId = null;
  document.getElementById('reject-modal').classList.remove('open');
}

document.getElementById('confirm-reject-btn').addEventListener('click', async () => {
  if (!rejectingId) return;
  const btn = document.getElementById('confirm-reject-btn');
  setButtonLoading(btn, true);
  try {
    await api(`/admin/reject/${rejectingId}`, { method: 'PUT' });
    toast('Request rejected', 'success');
    closeRejectModal();
    await loadAllRequests();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
});

/* ------------------------------- Toolbar wiring ------------------------------- */

document.getElementById('search-input').addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => loadAllRequests(), 350);
});
document.getElementById('filter-status').addEventListener('change', () => loadAllRequests());
document.getElementById('sort-order').addEventListener('change', () => loadAllRequests());

/* ------------------------------- Init ------------------------------- */

if (currentAdmin) {
  initSidebarAdmin();
  loadAllRequests({ showLoader: true });
}
