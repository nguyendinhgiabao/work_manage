// ========== API CONFIG ==========
const API_URL = '/api';

// ========== STATE ==========
let currentUser = null;
let tasks = [];
let currentFilter = 'all';
let editingTaskId = null;

// ========== DOM ELEMENTS ==========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Auth
const authSection = $('#auth-section');
const dashboardSection = $('#dashboard-section');
const loginForm = $('#login-form');
const registerForm = $('#register-form');
const authError = $('#auth-error');

// Dashboard
const taskList = $('#task-list');
const emptyState = $('#empty-state');

// Modal
const taskModal = $('#task-modal');
const taskForm = $('#task-form');

// ========== HELPERS ==========
function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Có lỗi xảy ra');
  }
  return data;
}

function showToast(message, type = 'success') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ========== AUTH FUNCTIONS ==========
function showAuth() {
  authSection.style.display = 'flex';
  dashboardSection.style.display = 'none';
}

function showDashboard() {
  authSection.style.display = 'none';
  dashboardSection.style.display = 'flex';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;

  try {
    authError.style.display = 'none';
    const data = await apiRequest('/auth/login', 'POST', { email, password });
    setToken(data.token);
    currentUser = data;
    onLoginSuccess();
  } catch (err) {
    authError.textContent = err.message;
    authError.style.display = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = $('#register-name').value.trim();
  const email = $('#register-email').value.trim();
  const password = $('#register-password').value;

  try {
    authError.style.display = 'none';
    await apiRequest('/auth/register', 'POST', { name, email, password });
    
    // Đăng ký thành công -> chuyển về form đăng nhập thay vì tự động đăng nhập
    registerForm.reset();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    $('#login-email').value = email; // Điền sẵn email giúp trải nghiệm tốt hơn
    $('#login-password').focus();
    
    showToast('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
  } catch (err) {
    authError.textContent = err.message;
    authError.style.display = 'block';
  }
}

function onLoginSuccess() {
  showDashboard();
  updateUserInfo();
  loadTasks();
}

function updateUserInfo() {
  if (!currentUser) return;
  $('#user-name').textContent = currentUser.name;
  $('#user-email').textContent = currentUser.email;
  $('#user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
}

function logout() {
  removeToken();
  currentUser = null;
  tasks = [];
  showAuth();
  loginForm.reset();
  registerForm.reset();
  authError.style.display = 'none';
}

// ========== TASK FUNCTIONS ==========
async function loadTasks() {
  try {
    tasks = await apiRequest('/tasks');
    renderTasks();
    updateStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function getFilteredTasks() {
  if (currentFilter === 'all') return tasks;
  return tasks.filter((t) => t.status === currentFilter);
}

function renderTasks() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    filtered.forEach((task) => {
      const el = createTaskElement(task);
      taskList.appendChild(el);
    });
  }
}

function createTaskElement(task) {
  const div = document.createElement('div');
  div.className = `task-item ${task.status === 'completed' ? 'completed' : ''}`;
  div.dataset.id = task._id;

  const statusLabel = {
    pending: 'Chờ xử lý',
    'in-progress': 'Đang làm',
    completed: 'Hoàn thành',
  };
  const priorityLabel = { low: 'Thấp', medium: 'Trung bình', high: 'Cao' };

  div.innerHTML = `
    <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" data-id="${task._id}"></div>
    <div class="task-info">
      <div class="task-info-title">${escapeHtml(task.title)}</div>
      <div class="task-meta">
        <span class="status-tag status-${task.status}">${statusLabel[task.status]}</span>
        <span class="priority-tag priority-${task.priority}">${priorityLabel[task.priority]}</span>
        ${task.dueDate ? `<span class="task-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${formatDate(task.dueDate)}
        </span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="task-action-btn edit" data-id="${task._id}" title="Sửa">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="task-action-btn delete" data-id="${task._id}" title="Xóa">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  `;

  // Event: checkbox toggle
  div.querySelector('.task-checkbox').addEventListener('click', () => toggleComplete(task));

  // Event: edit
  div.querySelector('.edit').addEventListener('click', () => openEditModal(task));

  // Event: delete
  div.querySelector('.delete').addEventListener('click', () => deleteTask(task._id));

  return div;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function toggleComplete(task) {
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  try {
    await apiRequest(`/tasks/${task._id}`, 'PUT', { status: newStatus });
    task.status = newStatus;
    renderTasks();
    updateStats();
    showToast(newStatus === 'completed' ? 'Đã hoàn thành!' : 'Đã mở lại công việc');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask(id) {
  if (!confirm('Bạn có chắc muốn xóa công việc này?')) return;
  try {
    await apiRequest(`/tasks/${id}`, 'DELETE');
    tasks = tasks.filter((t) => t._id !== id);
    renderTasks();
    updateStats();
    showToast('Đã xóa công việc');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateStats() {
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const progress = tasks.filter((t) => t.status === 'in-progress').length;
  const done = tasks.filter((t) => t.status === 'completed').length;

  $('#stat-total').textContent = total;
  $('#stat-pending').textContent = pending;
  $('#stat-progress').textContent = progress;
  $('#stat-done').textContent = done;

  $('#badge-all').textContent = total;
  $('#badge-pending').textContent = pending;
  $('#badge-in-progress').textContent = progress;
  $('#badge-completed').textContent = done;
}

// ========== MODAL ==========
function openAddModal() {
  editingTaskId = null;
  $('#modal-title').textContent = 'Thêm công việc mới';
  $('#modal-submit').textContent = 'Thêm';
  taskForm.reset();
  $('#task-id').value = '';
  taskModal.style.display = 'flex';
}

function openEditModal(task) {
  editingTaskId = task._id;
  $('#modal-title').textContent = 'Chỉnh sửa công việc';
  $('#modal-submit').textContent = 'Cập nhật';
  $('#task-id').value = task._id;
  $('#task-title').value = task.title;
  $('#task-description').value = task.description || '';
  $('#task-status').value = task.status;
  $('#task-priority').value = task.priority;
  $('#task-due-date').value = task.dueDate ? task.dueDate.split('T')[0] : '';
  taskModal.style.display = 'flex';
}

function closeModal() {
  taskModal.style.display = 'none';
  editingTaskId = null;
  taskForm.reset();
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  const title = $('#task-title').value.trim();
  const description = $('#task-description').value.trim();
  const status = $('#task-status').value;
  const priority = $('#task-priority').value;
  const dueDate = $('#task-due-date').value || null;

  if (!title) return;

  try {
    if (editingTaskId) {
      // Update
      const updated = await apiRequest(`/tasks/${editingTaskId}`, 'PUT', {
        title,
        description,
        status,
        priority,
        dueDate,
      });
      const idx = tasks.findIndex((t) => t._id === editingTaskId);
      if (idx !== -1) tasks[idx] = updated;
      showToast('Đã cập nhật công việc');
    } else {
      // Create
      const newTask = await apiRequest('/tasks', 'POST', {
        title,
        description,
        status,
        priority,
        dueDate,
      });
      tasks.unshift(newTask);
      showToast('Đã thêm công việc mới');
    }
    closeModal();
    renderTasks();
    updateStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== NAVIGATION & FILTER ==========
function setFilter(filter) {
  currentFilter = filter;

  // Update active nav item
  $$('.nav-item').forEach((btn) => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-filter="${filter}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Update page title
  const titles = {
    all: 'Tất cả công việc',
    pending: 'Công việc chờ xử lý',
    'in-progress': 'Công việc đang làm',
    completed: 'Công việc hoàn thành',
  };
  $('#page-title').textContent = titles[filter] || 'Tất cả công việc';

  renderTasks();
}

// ========== INIT & EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
  // Auth form switch
  $('#show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    authError.style.display = 'none';
  });

  $('#show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    authError.style.display = 'none';
  });

  // Auth submit
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);

  // Logout
  $('#logout-btn').addEventListener('click', logout);

  // Nav filter
  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFilter(btn.dataset.filter);
    });
  });

  // Add task button
  $('#add-task-btn').addEventListener('click', openAddModal);

  // Modal
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-cancel').addEventListener('click', closeModal);
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeModal();
  });
  taskForm.addEventListener('submit', handleTaskSubmit);

  // Mobile menu toggle
  $('#menu-toggle').addEventListener('click', () => {
    const sidebar = $('#sidebar');
    sidebar.classList.toggle('open');
  });

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    const sidebar = $('#sidebar');
    const menuToggle = $('#menu-toggle');
    if (
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !menuToggle.contains(e.target)
    ) {
      sidebar.classList.remove('open');
    }
  });

  // Check if already logged in
  const token = getToken();
  if (token) {
    apiRequest('/auth/profile')
      .then((user) => {
        currentUser = user;
        onLoginSuccess();
      })
      .catch(() => {
        removeToken();
        showAuth();
      });
  } else {
    showAuth();
  }
});
