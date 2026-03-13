// ========== API CONFIG ==========
const API_URL = '/api';

// ========== STATE ==========
let currentUser = null;
let notebooks = [];
let currentNotebookId = null;
let tasks = [];
let editingTaskId = null;
let draggedTaskElement = null;

// ========== DOM ELEMENTS ==========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Auth
const authSection = $('#auth-section');
const dashboardSection = $('#dashboard-section');
const loginForm = $('#login-form');
const registerForm = $('#register-form');
const authError = $('#auth-error');

// Layout
const emptyWorkspace = $('#empty-workspace');
const notebookWorkspace = $('#notebook-workspace');
const notebookListUI = $('#notebook-list');

// Kanban Columns
const listPending = $('#list-pending');
const listInProgress = $('#list-in-progress');
const listCompleted = $('#list-completed');

// Modals
const notebookModal = $('#notebook-modal');
const notebookForm = $('#notebook-form');
const taskModal = $('#task-modal');
const taskForm = $('#task-form');

// ========== HELPERS ==========
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi hệ thống');
  return data;
}

function showToast(message, type = 'success') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function formatDateDisplay(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  const tmrw = new Date(today); tmrw.setDate(tmrw.getDate() + 1);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return 'Hôm nay';
  if (date.toDateString() === tmrw.toDateString()) return 'Ngày mai';
  if (date.toDateString() === yest.toDateString()) return 'Hôm qua';

  return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
}

function isOverdue(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// ========== AUTH FUNCTIONS ==========
function switchView(isAuth) {
  if (isAuth) {
    authSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
  } else {
    authSection.style.display = 'none';
    dashboardSection.style.display = 'flex';
  }
}

async function handleAuth(action, e) {
  e.preventDefault();
  const formPrefix = action === 'login' ? 'login' : 'register';
  const email = $(`#${formPrefix}-email`).value.trim();
  const password = $(`#${formPrefix}-password`).value;
  const name = action === 'register' ? $('#register-name').value.trim() : undefined;

  try {
    authError.style.display = 'none';
    const body = action === 'register' ? { name, email, password } : { email, password };
    const data = await apiRequest(`/auth/${action}`, 'POST', body);
    
    if (action === 'register') {
      registerForm.reset();
      registerForm.classList.remove('active');
      loginForm.classList.add('active');
      $('#login-email').value = email;
      showToast('Tạo tài khoản thành công! Vui lòng truy cập.');
      return;
    }

    setToken(data.token);
    currentUser = data;
    onLoginSuccess();
  } catch (err) {
    authError.textContent = err.message;
    authError.style.display = 'block';
  }
}

function onLoginSuccess() {
  switchView(false);
  $('#user-name').textContent = currentUser.name;
  $('#user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
  loadNotebooks(); // Start by loading notebooks
}

function logout() {
  removeToken();
  currentUser = null;
  notebooks = [];
  tasks = [];
  currentNotebookId = null;
  switchView(true);
  loginForm.reset();
  registerForm.reset();
}

// ========== NOTEBOOK FUNCTIONS ==========
async function loadNotebooks() {
  try {
    notebooks = await apiRequest('/notebooks');
    renderNotebookList();
    
    // Auto-select first notebook if exists
    if (notebooks.length > 0) {
      selectNotebook(notebooks[0]._id);
    } else {
      currentNotebookId = null;
      updateWorkspaceView();
    }
  } catch (err) {
    showToast('Lỗi tải sổ tay', 'error');
  }
}

function renderNotebookList() {
  notebookListUI.innerHTML = '';
  notebooks.forEach(nb => {
    const li = document.createElement('li');
    li.className = `nb-item ${nb._id === currentNotebookId ? 'active' : ''}`;
    li.dataset.id = nb._id;
    li.innerHTML = `
      <span class="nb-icon">📄</span>
      <span class="nb-name">${escapeHtml(nb.title)}</span>
    `;
    li.addEventListener('click', () => selectNotebook(nb._id));
    notebookListUI.appendChild(li);
  });
}

function selectNotebook(id) {
  currentNotebookId = id;
  renderNotebookList(); // Update active class
  updateWorkspaceView();
  
  if (id) {
    const nb = notebooks.find(n => n._id === id);
    $('#page-title').textContent = nb ? nb.title : 'Sổ tay';
    loadTasks(id);
  }
}

function updateWorkspaceView() {
  if (currentNotebookId) {
    emptyWorkspace.style.display = 'none';
    notebookWorkspace.style.display = 'flex';
  } else {
    emptyWorkspace.style.display = 'flex';
    notebookWorkspace.style.display = 'none';
  }
}

// Header Delete Notebook
$('#btn-delete-notebook').addEventListener('click', async () => {
  if (!currentNotebookId) return;
  if (!confirm('Xóa sổ tay này sẽ xóa TOÀN BỘ ghi chú bên trong. Bạn chắc chưa?')) return;
  
  try {
    await apiRequest(`/notebooks/${currentNotebookId}`, 'DELETE');
    showToast('Đã xóa sổ tay vô thùng rác');
    loadNotebooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Notebook Modal Logic
function openNotebookModal() {
  $('#nb-modal-title').textContent = 'Sổ tay mới';
  notebookForm.reset();
  $('#notebook-id').value = '';
  notebookModal.style.display = 'flex';
}

function closeNotebookModal() {
  notebookModal.style.display = 'none';
}

async function handleNotebookSubmit(e) {
  e.preventDefault();
  const title = $('#notebook-title').value.trim();
  if (!title) return;

  try {
    const newNb = await apiRequest('/notebooks', 'POST', { title });
    notebooks.unshift(newNb); // Add to top
    closeNotebookModal();
    selectNotebook(newNb._id);
    showToast('Đã tạo sổ tay');
  } catch (err) {
    showToast(err.message, 'error');
  }
}


// ========== TASK KANBAN FUNCTIONS ==========
async function loadTasks(notebookId) {
  try {
    tasks = await apiRequest(`/tasks?notebookId=${notebookId}`);
    renderKanban();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderKanban() {
  listPending.innerHTML = '';
  listInProgress.innerHTML = '';
  listCompleted.innerHTML = '';

  let counts = { pending: 0, 'in-progress': 0, completed: 0 };

  tasks.forEach((task) => {
    const el = createTaskElement(task);
    if (task.status === 'pending') { listPending.appendChild(el); counts.pending++; }
    else if (task.status === 'in-progress') { listInProgress.appendChild(el); counts['in-progress']++; }
    else if (task.status === 'completed') { listCompleted.appendChild(el); counts.completed++; }
  });

  $('#badge-pending').textContent = counts.pending;
  $('#badge-progress').textContent = counts['in-progress'];
  $('#badge-completed').textContent = counts.completed;
}

function createTaskElement(task) {
  const div = document.createElement('div');
  div.className = `task-item`;
  div.dataset.id = task._id;
  div.draggable = true;

  const isLate = isOverdue(task.dueDate) && task.status !== 'completed';
  
  // Tag badges
  const prioLabel = { low: 'Thấp', medium: 'Thiết yếu', high: 'Gấp' };

  div.innerHTML = `
    <div class="task-title">${escapeHtml(task.title)}</div>
    <div class="task-tags">
      <span class="tag tag-priority-${task.priority}">${prioLabel[task.priority]}</span>
    </div>
    <div class="task-footer">
      ${task.dueDate ? `
        <div class="date-text ${isLate ? 'overdue' : ''}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${formatDateDisplay(task.dueDate)}
        </div>
      ` : '<div></div>'}
      
      <div class="task-actions">
        <button class="action-btn edit" title="Mở">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="action-btn delete" title="Xóa">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `;

  div.addEventListener('dragstart', handleDragStart);
  div.addEventListener('dragend', handleDragEnd);
  div.querySelector('.edit').addEventListener('click', () => openTaskModal(task));
  div.querySelector('.delete').addEventListener('click', () => deleteTask(task._id));

  return div;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function deleteTask(id) {
  try {
    await apiRequest(`/tasks/${id}`, 'DELETE');
    tasks = tasks.filter((t) => t._id !== id);
    renderKanban();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== DRAG & DROP LOGIC ==========
function handleDragStart(e) {
  draggedTaskElement = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
  setTimeout(() => { this.classList.add('dragging'); }, 0);
}
function handleDragEnd() {
  this.classList.remove('dragging');
  draggedTaskElement = null;
}

$$('.kanban-column').forEach(column => {
  column.addEventListener('dragover', e => e.preventDefault());
  column.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!draggedTaskElement) return;

    const taskId = draggedTaskElement.dataset.id;
    const newStatus = column.dataset.status;

    const taskIndex = tasks.findIndex(t => t._id === taskId);
    if (taskIndex === -1 || tasks[taskIndex].status === newStatus) return;

    tasks[taskIndex].status = newStatus;
    renderKanban(); 
    
    try {
      await apiRequest(`/tasks/${taskId}`, 'PUT', { status: newStatus });
    } catch (err) {
      showToast('Lỗi đồng bộ', 'error');
      loadTasks(currentNotebookId); 
    }
  });
});

// ========== TASK MODAL LOGIC ==========
function openTaskModal(task = null, defaultStatus = 'pending') {
  if (!currentNotebookId) return showToast('Chọn một sổ tay trước', 'error');

  editingTaskId = task ? task._id : null;
  $('#modal-title').textContent = task ? 'Chi tiết' : 'Ghi chú mới';
  $('#task-id').value = task ? task._id : '';
  $('#task-title').value = task ? task.title : '';
  $('#task-description').value = task ? (task.description || '') : '';
  $('#task-status').value = task ? task.status : defaultStatus;
  $('#task-priority').value = task ? task.priority : 'medium';
  $('#task-due-date').value = task && task.dueDate ? task.dueDate.split('T')[0] : '';
  
  taskModal.style.display = 'flex';
}

function closeTaskModal() {
  taskModal.style.display = 'none';
  editingTaskId = null;
  taskForm.reset();
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  const title = $('#task-title').value.trim();
  if (!title) return;

  const payload = {
    title,
    description: $('#task-description').value.trim(),
    status: $('#task-status').value,
    priority: $('#task-priority').value,
    dueDate: $('#task-due-date').value || null,
    notebookId: currentNotebookId,
  };

  try {
    if (editingTaskId) {
      const updated = await apiRequest(`/tasks/${editingTaskId}`, 'PUT', payload);
      const idx = tasks.findIndex(t => t._id === editingTaskId);
      if (idx !== -1) tasks[idx] = updated;
    } else {
      const newTask = await apiRequest('/tasks', 'POST', payload);
      tasks.push(newTask);
    }
    closeTaskModal();
    renderKanban();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== INIT & LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
  // Auth Toggles
  $('#show-register').addEventListener('click', (e) => {
    e.preventDefault(); loginForm.classList.remove('active'); registerForm.classList.add('active'); authError.style.display = 'none';
  });
  $('#show-login').addEventListener('click', (e) => {
    e.preventDefault(); registerForm.classList.remove('active'); loginForm.classList.add('active'); authError.style.display = 'none';
  });

  // Forms
  loginForm.addEventListener('submit', (e) => handleAuth('login', e));
  registerForm.addEventListener('submit', (e) => handleAuth('register', e));
  $('#logout-btn').addEventListener('click', logout);
  
  // Modals
  $('#btn-add-notebook').addEventListener('click', openNotebookModal);
  $('#btn-create-first-notebook').addEventListener('click', openNotebookModal);
  $('#nb-modal-close').addEventListener('click', closeNotebookModal);
  $('#nb-modal-cancel').addEventListener('click', closeNotebookModal);
  notebookModal.addEventListener('click', (e) => { if (e.target === notebookModal) closeNotebookModal(); });
  notebookForm.addEventListener('submit', handleNotebookSubmit);

  $('#add-task-btn').addEventListener('click', () => openTaskModal());
  $$('.add-quick-task').forEach(btn => {
    btn.addEventListener('click', (e) => openTaskModal(null, e.target.dataset.status));
  });
  $('#modal-close').addEventListener('click', closeTaskModal);
  taskModal.addEventListener('click', (e) => { if (e.target === taskModal) closeTaskModal(); });
  taskForm.addEventListener('submit', handleTaskSubmit);

  // Initial Auth Check
  if (getToken()) {
    apiRequest('/auth/profile')
      .then((user) => { currentUser = user; onLoginSuccess(); })
      .catch(() => { removeToken(); switchView(true); });
  } else {
    switchView(true);
  }
});
