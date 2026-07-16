/**
 * public/js/user-dashboard.js
 * Loads the user's own requests, and implements create/edit/delete.
 * Search and status filtering happen client-side over the already-loaded
 * list (the user's own request count is small; admin-side filtering happens
 * server-side instead since that list can be large -- see admin-dashboard.js).
 */

const currentUser = requireRole('user');
let allRequests = [];

function initSidebarUser() {
  if (!currentUser) return;
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
}

async function loadRequests() {
  try {
    const data = await api('/requests');
    allRequests = data.requests;
    renderStats();
    renderRequests();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    document.getElementById('page-loader').classList.add('hidden');
  }
}

function renderStats() {
  const total = allRequests.length;
  const pending = allRequests.filter((r) => r.status === 'Pending').length;
  const approved = allRequests.filter((r) => r.status === 'Approved').length;
  const rejected = allRequests.filter((r) => r.status === 'Rejected').length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-approved').textContent = approved;
  document.getElementById('stat-rejected').textContent = rejected;
}

function getFilteredRequests() {
  const search = document.getElementById('search-input').value.trim().toLowerCase();
  const status = document.getElementById('filter-status').value;

  return allRequests.filter((r) => {
    const matchesStatus = !status || r.status === status;
    const matchesSearch =
      !search ||
      r.title.toLowerCase().includes(search) ||
      r.description.toLowerCase().includes(search) ||
      r.category.toLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });
}

function renderRequests() {
  const grid = document.getElementById('request-grid');
  const requests = getFilteredRequests();

  if (requests.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🗂️</div>
        <p>No requests match here yet.</p>
      </div>`;
    return;
  }

  grid.innerHTML = requests.map((r) => requestCardHtml(r)).join('');
}

function requestCardHtml(r) {
  const statusClass = r.status.toLowerCase();
  const canModify = r.status === 'Pending';

  return `
    <div class="request-card status-${statusClass}">
      <div class="request-card-header">
        <h3 class="request-card-title">${escapeHtml(r.title)}</h3>
        <span class="badge badge-${statusClass}">${r.status}</span>
      </div>
      <p class="request-card-desc">${escapeHtml(r.description)}</p>
      <div class="request-meta">
        <span class="category-chip">${escapeHtml(r.category)}</span>
        <span>Created <strong>${formatDate(r.created_at)}</strong></span>
      </div>
      <div class="request-actions">
        ${
          canModify
            ? `<button class="btn btn-secondary btn-sm" onclick="openEditModal(${r.id})">Edit</button>
               <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${r.id})">Delete</button>`
            : `<span style="font-size:12px;color:var(--color-text-muted);">Locked — already reviewed</span>`
        }
      </div>
    </div>
  `;
}

/* ------------------------------- Create / Edit modal ------------------------------- */

let editingId = null;

function openCreateModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'New Request';
  document.getElementById('request-submit-label').textContent = 'Create request';
  document.getElementById('request-form').reset();
  clearRequestFormErrors();
  document.getElementById('request-modal').classList.add('open');
}

function openEditModal(id) {
  const req = allRequests.find((r) => r.id === id);
  if (!req) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Edit Request';
  document.getElementById('request-submit-label').textContent = 'Save changes';
  document.getElementById('title').value = req.title;
  document.getElementById('category').value = req.category;
  document.getElementById('description').value = req.description;
  clearRequestFormErrors();
  document.getElementById('request-modal').classList.add('open');
}

function closeRequestModal() {
  document.getElementById('request-modal').classList.remove('open');
}

function clearRequestFormErrors() {
  ['title', 'category', 'description'].forEach((id) => {
    document.getElementById(`${id}-error`).textContent = '';
  });
}

document.getElementById('request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearRequestFormErrors();

  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value.trim();
  const description = document.getElementById('description').value.trim();
  const submitBtn = document.getElementById('request-submit-btn');

  let hasError = false;
  if (!title) { document.getElementById('title-error').textContent = 'Title is required'; hasError = true; }
  if (!category) { document.getElementById('category-error').textContent = 'Category is required'; hasError = true; }
  if (!description) { document.getElementById('description-error').textContent = 'Description is required'; hasError = true; }
  if (hasError) return;

  setButtonLoading(submitBtn, true);
  try {
    if (editingId) {
      await api(`/requests/${editingId}`, { method: 'PUT', body: { title, category, description } });
      toast('Request updated', 'success');
    } else {
      await api('/requests', { method: 'POST', body: { title, category, description } });
      toast('Request created', 'success');
    }
    closeRequestModal();
    await loadRequests();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

/* ------------------------------- Delete modal ------------------------------- */

let deletingId = null;

function openDeleteModal(id) {
  deletingId = id;
  document.getElementById('delete-modal').classList.add('open');
}

function closeDeleteModal() {
  deletingId = null;
  document.getElementById('delete-modal').classList.remove('open');
}

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  if (!deletingId) return;
  const btn = document.getElementById('confirm-delete-btn');
  setButtonLoading(btn, true);
  try {
    await api(`/requests/${deletingId}`, { method: 'DELETE' });
    toast('Request deleted', 'success');
    closeDeleteModal();
    await loadRequests();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
});

/* ------------------------------- Search / filter wiring ------------------------------- */

document.getElementById('search-input').addEventListener('input', renderRequests);
document.getElementById('filter-status').addEventListener('change', renderRequests);

/* ------------------------------- Init ------------------------------- */

if (currentUser) {
  initSidebarUser();
  loadRequests();
}
