// ========== API CONFIG ==========
const API_URL = '/api';

// ========== STATE ==========
let currentUser = null;
let notebooks = [];
let currentNotebookId = null;
let tasks = [];
let editingTaskId = null;
let draggedTaskElement = null;
let searchQuery = '';

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
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 3000);
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== DARK MODE ==========
function initDarkMode() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.body.classList.add('dark');
    $('#icon-sun').style.display = 'block';
    $('#icon-moon').style.display = 'none';
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
  $('#icon-sun').style.display = isDark ? 'block' : 'none';
  $('#icon-moon').style.display = isDark ? 'none' : 'block';
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

async function handleLogin(e) {
  e.preventDefault();
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;
  const btn = $('#login-btn');

  try {
    authError.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';
    const data = await apiRequest(`/auth/login`, 'POST', { email, password });
    setToken(data.token);
    currentUser = data;
    onLoginSuccess();
  } catch (err) {
    authError.textContent = err.message;
    authError.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
  }
}

async function requestOtp() {
  const name = $('#register-name').value.trim();
  const email = $('#register-email').value.trim();
  const password = $('#register-password').value;

  if (!name || !email || password.length < 6) {
    authError.textContent = 'Vui lòng nhập đủ tên, email và mật khẩu (tối thiểu 6 ký tự)';
    authError.style.display = 'block';
    return;
  }

  try {
    authError.style.display = 'none';
    const btn = $('#btn-request-otp');
    btn.disabled = true;
    btn.textContent = 'Đang gửi mã...';

    await apiRequest('/auth/send-otp', 'POST', { email });
    
    $('#register-step-1').style.display = 'none';
    $('#register-step-2').style.display = 'block';
    $('#display-otp-email').textContent = email;
    $('#register-otp').focus();
    showToast('Mã xác nhận đã được gửi vào email của bạn ✉️');
  } catch (err) {
    authError.textContent = err.message;
    authError.style.display = 'block';
  } finally {
    const btn = $('#btn-request-otp');
    btn.disabled = false;
    btn.textContent = 'Lấy mã xác nhận 🚀';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = $('#register-name').value.trim();
  const email = $('#register-email').value.trim();
  const password = $('#register-password').value;
  const otp = $('#register-otp').value.trim();

  try {
    if (!otp || otp.length !== 6) {
      authError.textContent = 'Vui lòng nhập mã OTP gồm 6 chữ số';
      authError.style.display = 'block';
      return;
    }
    authError.style.display = 'none';
    await apiRequest('/auth/register', 'POST', { name, email, password, otp });
    
    resetRegisterForm();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    $('#login-email').value = email;
    $('#login-password').focus();
    
    showToast('Đăng ký thành công! Hãy đăng nhập 🎉', 'success');
  } catch (err) {
    authError.textContent = err.message;
    authError.style.display = 'block';
  }
}

function resetRegisterForm() {
  registerForm.reset();
  $('#register-step-1').style.display = 'block';
  $('#register-step-2').style.display = 'none';
}

function onLoginSuccess() {
  switchView(false);
  $('#user-name').textContent = currentUser.name;
  $('#user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
  loadNotebooks();
}

function logout() {
  removeToken();
  currentUser = null;
  notebooks = [];
  tasks = [];
  currentNotebookId = null;
  searchQuery = '';
  switchView(true);
  loginForm.reset();
  resetRegisterForm();
  authError.style.display = 'none';
}

// ========== NOTEBOOK FUNCTIONS ==========
async function loadNotebooks() {
  try {
    notebooks = await apiRequest('/notebooks');
    renderNotebookList();
    
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

    // Double-click trên tên để đổi tên inline trong sidebar
    li.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startInlineSidebarRename(li, nb);
    });

    notebookListUI.appendChild(li);
  });
}

// Đổi tên notebook inline trong sidebar dùng double-click
function startInlineSidebarRename(li, nb) {
  const nameSpan = li.querySelector('.nb-name');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'nb-rename-input';
  input.value = nb.title;
  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  const finish = async () => {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== nb.title) {
      try {
        await apiRequest(`/notebooks/${nb._id}`, 'PUT', { title: newTitle });
        nb.title = newTitle;
        if (currentNotebookId === nb._id) {
          $('#page-title').textContent = newTitle;
        }
        showToast('Đã đổi tên sổ tay');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
    renderNotebookList();
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { renderNotebookList(); }
  });
}

// Đổi tên notebook từ nút ✏️ trên header
function startHeaderRename() {
  const titleEl = $('#page-title');
  const currentTitle = titleEl.textContent;
  const nb = notebooks.find(n => n._id === currentNotebookId);
  if (!nb) return;

  const input = document.createElement('input');
  input.id = 'page-title-input';
  input.value = currentTitle;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const finish = async () => {
    const newTitle = input.value.trim() || currentTitle;
    if (newTitle !== currentTitle) {
      try {
        await apiRequest(`/notebooks/${nb._id}`, 'PUT', { title: newTitle });
        nb.title = newTitle;
        renderNotebookList();
        showToast('Đã đổi tên sổ tay');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
    // Khôi phục h2
    const h2 = document.createElement('h2');
    h2.id = 'page-title';
    h2.textContent = newTitle;
    input.replaceWith(h2);
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') {
      const h2 = document.createElement('h2');
      h2.id = 'page-title';
      h2.textContent = currentTitle;
      input.replaceWith(h2);
    }
  });
}

function selectNotebook(id) {
  currentNotebookId = id;
  searchQuery = '';
  closeSearch();
  renderNotebookList();
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

// Delete Notebook
$('#btn-delete-notebook').addEventListener('click', async () => {
  if (!currentNotebookId) return;
  if (!confirm('Xóa sổ tay này sẽ xóa TOÀN BỘ ghi chú bên trong. Bạn chắc chưa?')) return;
  
  try {
    await apiRequest(`/notebooks/${currentNotebookId}`, 'DELETE');
    showToast('Đã xóa sổ tay');
    loadNotebooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Notebook Modal
function openNotebookModal() {
  $('#nb-modal-title').textContent = 'Sổ tay mới';
  notebookForm.reset();
  $('#notebook-id').value = '';
  notebookModal.style.display = 'flex';
  setTimeout(() => $('#notebook-title').focus(), 50);
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
    notebooks.unshift(newNb);
    closeNotebookModal();
    selectNotebook(newNb._id);
    showToast('Đã tạo sổ tay mới 📔');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== SEARCH ==========
function openSearch() {
  $('#search-wrapper').classList.add('open');
  $('#search-input').focus();
}

function closeSearch() {
  $('#search-wrapper').classList.remove('open');
  $('#search-input').value = '';
  $('#search-clear-btn').style.display = 'none';
  searchQuery = '';
  applySearch();
}

function applySearch() {
  const q = searchQuery.toLowerCase().trim();
  $$('.task-item').forEach(el => {
    if (!q) {
      el.classList.remove('hidden-by-search');
    } else {
      const title = el.querySelector('.task-title').textContent.toLowerCase();
      el.classList.toggle('hidden-by-search', !title.includes(q));
    }
  });
  updateColumnEmptyState();
}

function updateColumnEmptyState() {
  ['pending', 'in-progress', 'completed'].forEach(status => {
    const list = $(`#list-${status}`);
    const existing = list.querySelector('.task-list-empty');
    const visible = [...list.querySelectorAll('.task-item')].filter(el => !el.classList.contains('hidden-by-search'));
    if (searchQuery && visible.length === 0) {
      if (!existing) {
        const ph = document.createElement('div');
        ph.className = 'task-list-empty';
        ph.textContent = 'Không tìm thấy';
        list.appendChild(ph);
      }
    } else {
      if (existing) existing.remove();
    }
  });
}

// ========== STATS WIDGET ==========
function updateStats() {
  const nonCompleted = tasks.filter(t => t.status !== 'completed');
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const overdueCount = nonCompleted.filter(t => isOverdue(t.dueDate)).length;

  $('#stat-pending-count').textContent = pendingCount;
  $('#stat-overdue-count').textContent = overdueCount;

  const overdueEl = $('#stat-overdue');
  overdueEl.setAttribute('data-zero', overdueCount === 0 ? 'true' : 'false');
  overdueEl.title = overdueCount === 0 ? 'Không có task quá hạn' : `${overdueCount} task quá hạn`;
}

// ========== TASK FUNCTIONS ==========
async function loadTasks(notebookId) {
  try {
    tasks = await apiRequest(`/tasks?notebookId=${notebookId}`);
    renderKanban();
    updateStats();
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

  // Reapply search filter after re-render
  if (searchQuery) applySearch();
}

function createTaskElement(task) {
  const div = document.createElement('div');
  div.className = `task-item`;
  div.dataset.id = task._id;
  div.draggable = true;

  const isLate = isOverdue(task.dueDate) && task.status !== 'completed';
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
        <button class="action-btn edit" title="Chỉnh sửa">
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
  div.querySelector('.edit').addEventListener('click', (e) => { e.stopPropagation(); openTaskModal(task); });
  div.querySelector('.delete').addEventListener('click', (e) => { e.stopPropagation(); deleteTask(task._id); });

  return div;
}

async function deleteTask(id) {
  if (!confirm('Xóa ghi chú này?')) return;
  try {
    await apiRequest(`/tasks/${id}`, 'DELETE');
    tasks = tasks.filter((t) => t._id !== id);
    renderKanban();
    updateStats();
    showToast('Đã xóa ghi chú');
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
    updateStats();
    
    try {
      await apiRequest(`/tasks/${taskId}`, 'PUT', { status: newStatus });
    } catch (err) {
      showToast('Lỗi đồng bộ trạng thái', 'error');
      loadTasks(currentNotebookId);
    }
  });
});

// ========== TASK MODAL LOGIC ==========
function openTaskModal(task = null, defaultStatus = 'pending') {
  if (!currentNotebookId) return showToast('Chọn một sổ tay trước', 'error');

  editingTaskId = task ? task._id : null;
  $('#modal-title').textContent = task ? 'Chi tiết công việc' : 'Ghi chú mới';
  $('#task-id').value = task ? task._id : '';
  $('#task-title').value = task ? task.title : '';
  $('#task-description').value = task ? (task.description || '') : '';
  $('#task-status').value = task ? task.status : defaultStatus;
  $('#task-priority').value = task ? task.priority : 'medium';
  $('#task-due-date').value = task && task.dueDate ? task.dueDate.split('T')[0] : '';
  
  taskModal.style.display = 'flex';
  setTimeout(() => $('#task-title').focus(), 50);
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

  const btn = $('#modal-submit');
  try {
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';
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
    updateStats();
    showToast(editingTaskId ? 'Đã cập nhật ghi chú' : 'Đã tạo ghi chú mới ✅');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Lưu lại';
  }
}

// ========== INIT & LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
  // Dark mode
  initDarkMode();
  $('#dark-mode-toggle').addEventListener('click', toggleDarkMode);

  // Auth Toggles
  $('#show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    authError.style.display = 'none';
    resetRegisterForm();
  });
  $('#show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    authError.style.display = 'none';
  });

  // Forms
  loginForm.addEventListener('submit', handleLogin);
  $('#btn-request-otp').addEventListener('click', requestOtp);
  $('#btn-back-step-1').addEventListener('click', resetRegisterForm);
  registerForm.addEventListener('submit', handleRegister);
  $('#logout-btn').addEventListener('click', logout);
  
  // Notebook Modals
  $('#btn-add-notebook').addEventListener('click', openNotebookModal);
  $('#btn-create-first-notebook').addEventListener('click', openNotebookModal);
  $('#nb-modal-close').addEventListener('click', closeNotebookModal);
  $('#nb-modal-cancel').addEventListener('click', closeNotebookModal);
  notebookModal.addEventListener('click', (e) => { if (e.target === notebookModal) closeNotebookModal(); });
  notebookForm.addEventListener('submit', handleNotebookSubmit);

  // Rename notebook header button
  $('#btn-rename-notebook').addEventListener('click', startHeaderRename);

  // Task Modals
  $('#add-task-btn').addEventListener('click', () => openTaskModal());
  $$('.add-quick-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskModal(null, btn.dataset.status);
    });
  });
  $('#modal-close').addEventListener('click', closeTaskModal);
  taskModal.addEventListener('click', (e) => { if (e.target === taskModal) closeTaskModal(); });
  taskForm.addEventListener('submit', handleTaskSubmit);

  // Search
  $('#search-toggle-btn').addEventListener('click', () => {
    const wrapper = $('#search-wrapper');
    if (wrapper.classList.contains('open')) {
      closeSearch();
    } else {
      openSearch();
    }
  });

  $('#search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    $('#search-clear-btn').style.display = searchQuery ? 'flex' : 'none';
    applySearch();
  });

  $('#search-clear-btn').addEventListener('click', () => {
    closeSearch();
  });

  // ESC to close modals / search
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (taskModal.style.display === 'flex') closeTaskModal();
      else if (notebookModal.style.display === 'flex') closeNotebookModal();
      else if ($('#search-wrapper').classList.contains('open')) closeSearch();
    }
  });

  // Delete notebook button
  $('#btn-delete-notebook').addEventListener('click', async () => {
    if (!currentNotebookId) return;
    if (!confirm('Xóa sổ tay này sẽ xóa TOÀN BỘ ghi chú bên trong. Bạn chắc chưa?')) return;
    try {
      await apiRequest(`/notebooks/${currentNotebookId}`, 'DELETE');
      showToast('Đã xóa sổ tay');
      loadNotebooks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Initial Auth Check
  if (getToken()) {
    apiRequest('/auth/profile')
      .then((user) => { currentUser = user; onLoginSuccess(); })
      .catch(() => { removeToken(); switchView(true); });
  } else {
    switchView(true);
  }
});
