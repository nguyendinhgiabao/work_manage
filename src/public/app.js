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
let isCalendarMode = false;
let fullCalendar = null;

// New: Inactivity Session Tracking
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 mins

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
const sidebar = $('#app-sidebar');
const mobileOverlay = $('#mobile-overlay');
const emptyWorkspace = $('#empty-workspace');
const notebookWorkspace = $('#notebook-workspace');
const notebookListUI = $('#notebook-list');
const kanbanContainer = $('#kanban-container');
const calendarViewContainer = $('#calendar-view-container');

// Kanban Columns
const listPending = $('#list-pending');
const listInProgress = $('#list-in-progress');
const listCompleted = $('#list-completed');

// Modals
const notebookModal = $('#notebook-modal');
const notebookForm = $('#notebook-form');
const taskModal = $('#task-modal');
const taskForm = $('#task-form');
const shareModal = $('#share-modal');
const shareForm = $('#share-form');

// ========== HELPERS ==========
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

async function apiRequest(endpoint, method = 'GET', body = null, timeoutMs = 15000) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const options = { method, headers, signal: controller.signal };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi hệ thống');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Yêu cầu quá thời gian chờ, vui lòng thử lại.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
  if (currentUser.role === 'admin') {
    window.location.href = '/admin.html';
    return;
  }
  
  switchView(false);
  $('#user-name').textContent = currentUser.name;
  $('#user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
  
  // Reset view state
  isCalendarMode = false;
  kanbanContainer.style.display = 'flex';
  calendarViewContainer.style.display = 'none';
  
  loadNotebooks();
  
  // Khởi động bộ đếm không hoạt động
  resetInactivityTimer();
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
  $('#admin-panel-btn').style.display = 'none';
  
  // Clear inactivity timer
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

// ========== INACTIVITY LOGIC ========== 
function resetInactivityTimer() {
  if (!getToken()) return; // Chỉ chạy khi đã đăng nhập
  
  if (inactivityTimer) clearTimeout(inactivityTimer);
  
  inactivityTimer = setTimeout(() => {
    handleAutoLogout();
  }, INACTIVITY_TIMEOUT);
}

function handleAutoLogout() {
  if (!getToken()) return;
  
  logout();
  showToast('Bạn đã bị đăng xuất do không hoạt động trong 30 phút 🔒', 'info');
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
    li.className = `notebook-item ${nb._id === currentNotebookId ? 'active' : ''}`;
    
    const isShared = nb.user._id !== currentUser._id;
    const sharedIcon = isShared ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right:4px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' : '';

    li.innerHTML = `
      <span class="nb-icon">📄</span>
      <span class="nb-title">${sharedIcon}${escapeHtml(nb.title)}</span>
    `;
    li.onclick = () => selectNotebook(nb._id);
    
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
  const nameSpan = li.querySelector('.nb-title');
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
  const notebook = notebooks.find(n => n._id === id);
  if (!notebook) return;

  $('#page-title').textContent = notebook.title;
  emptyWorkspace.style.display = 'none';
  notebookWorkspace.style.display = 'block';

  // Toggle Share button based on ownership
  const isOwner = notebook.user._id === currentUser._id;
  $('#btn-share-notebook').style.display = isOwner ? 'block' : 'none';
  $('#btn-delete-notebook').style.display = isOwner ? 'block' : 'none';

  // Mobile: close sidebar on selection
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('active');
    mobileOverlay.classList.remove('active');
  }

  loadTasks();
  renderCollaborators(notebook);
  loadNotebooks(); // Re-render list to update active class
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
async function loadTasks() {
  try {
    tasks = await apiRequest(`/tasks?notebookId=${currentNotebookId}`);
    renderKanban();
    updateStats();
    if (isCalendarMode) renderCalendar();
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
  div.dataset.priority = task.priority;
  div.draggable = true;

  const isLate = isOverdue(task.dueDate) && task.status !== 'completed';
  const prioLabel = { low: 'Thấp', medium: 'Thiết yếu', high: 'Gấp' };
  const isCompleted = task.status === 'completed';

  div.innerHTML = `
    <div class="task-title-row">
      <button class="task-check-btn ${isCompleted ? 'completed' : ''}" title="${isCompleted ? 'Hoàn tác' : 'Hoàn thành nhanh'}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </button>
      <div class="task-title" style="${isCompleted ? 'text-decoration: line-through; color: var(--text-tertiary);' : ''}">${escapeHtml(task.title)}</div>
    </div>
    
    ${task.description ? `<div class="task-desc-snippet">${escapeHtml(task.description)}</div>` : ''}
    
    <div class="task-footer">
      <div class="task-meta">
        <span class="prio-tag-pill prio-${task.priority}">${prioLabel[task.priority]}</span>
        ${task.dueDate ? `
          <div class="date-text ${isLate ? 'overdue' : ''}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${formatDateDisplay(task.dueDate)}
          </div>
        ` : ''}
      </div>
      
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
  
  // Quick Toggle Status
  div.querySelector('.task-check-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const newStatus = isCompleted ? 'pending' : 'completed';
    const taskId = task._id;
    
    // UI optimistic update
    const tIdx = tasks.findIndex(t => t._id === taskId);
    if (tIdx !== -1) tasks[tIdx].status = newStatus;
    
    renderKanban(); 
    updateStats();
    if (isCalendarMode) renderCalendar();
    
    try {
      await apiRequest(`/tasks/${taskId}`, 'PUT', { status: newStatus });
      showToast(newStatus === 'completed' ? 'Tuyệt vời, bạn đã xong việc! 🎉' : 'Đã khôi phục trạng thái');
    } catch (err) {
      showToast('Lỗi đồng bộ: ' + err.message, 'error');
      loadTasks();
    }
  });

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
    if (isCalendarMode) renderCalendar();
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
    if (isCalendarMode) renderCalendar();
    
    try {
      await apiRequest(`/tasks/${taskId}`, 'PUT', { status: newStatus });
    } catch (err) {
      showToast('Lỗi đồng bộ trạng thái', 'error');
      loadTasks();
    }
  });
});

// ========== TASK MODAL LOGIC ==========
function openTaskModal(taskOrId = null, defaultStatus = 'pending') {
  if (!currentNotebookId) return showToast('Chọn một sổ tay trước', 'error');

  let task = null;
  if (typeof taskOrId === 'string') {
    task = tasks.find(t => t._id === taskOrId);
  } else {
    task = taskOrId;
  }

  editingTaskId = task ? task._id : null;
  $('#modal-title').textContent = task ? 'Chi tiết công việc' : 'Ghi chú mới';
  $('#task-id').value = task ? task._id : '';
  $('#task-title').value = task ? task.title : '';
  $('#task-description').value = task ? (task.description || '') : '';
  $('#task-status').value = task ? task.status : (task ? task.status : defaultStatus);
  $('#task-priority').value = task ? task.priority : (task ? task.priority : 'medium');
  $('#task-due-date').value = task && task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
  
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
    if (isCalendarMode) renderCalendar();
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
  
  // Admin button
  $('#admin-panel-btn').addEventListener('click', () => {
    window.location.href = '/admin.html';
  });
  
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

  // Mobile Hamburger
  $('#btn-hamburger').addEventListener('click', () => {
    sidebar.classList.add('active');
    mobileOverlay.classList.add('active');
  });

  mobileOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    mobileOverlay.classList.remove('active');
  });

  // Share Notebook
  $('#btn-share-notebook').addEventListener('click', openShareModal);
  $('#share-modal-close').addEventListener('click', closeShareModal);
  shareForm.addEventListener('submit', handleInviteUser);

  // View Toggle (Board/Calendar)
  $('#btn-toggle-view').addEventListener('click', toggleCalendarView);

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

  // Initial Auth Check
  if (getToken()) {
    apiRequest('/auth/profile')
      .then((user) => { 
        currentUser = user; 
        onLoginSuccess(); 
      })
      .catch(() => { removeToken(); switchView(true); });
  } else {
    switchView(true);
  }

  // Global Inactivity Listeners
  ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, true);
  });
});

// ========== CALENDAR FUNCTIONS ==========
function toggleCalendarView() {
  isCalendarMode = !isCalendarMode;
  if (isCalendarMode) {
    kanbanContainer.style.display = 'none';
    calendarViewContainer.style.display = 'block';
    $('#btn-toggle-view').classList.add('active');
    renderCalendar();
  } else {
    kanbanContainer.style.display = 'flex';
    calendarViewContainer.style.display = 'none';
    $('#btn-toggle-view').classList.remove('active');
  }
}

function renderCalendar() {
  const el = $('#full-calendar');
  const events = tasks
    .filter(t => t.dueDate)
    .map(t => ({
      id: t._id,
      title: t.title,
      start: t.dueDate,
      backgroundColor: t.status === 'completed' ? '#27ae60' : (t.priority === 'high' ? '#eb5757' : '#2d68ff'),
      borderColor: 'transparent'
    }));

  if (fullCalendar) {
    fullCalendar.removeAllEvents();
    fullCalendar.addEventSource(events);
    fullCalendar.render();
    return;
  }

  fullCalendar = new FullCalendar.Calendar(el, {
    locale: 'vi',
    initialView: 'dayGridMonth',
    editable: true, // Cho phép kéo thả
    droppable: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    events: events,
    eventClick: (info) => {
      openTaskModal(info.event.id);
    },
    eventDrop: async (info) => {
      const taskId = info.event.id;
      const newDate = info.event.start.toISOString().split('T')[0];
      
      try {
        await apiRequest(`/tasks/${taskId}`, 'PUT', { dueDate: newDate });
        // Cập nhật mảng tasks cục bộ để đồng bộ
        const tIdx = tasks.findIndex(t => t._id === taskId);
        if (tIdx !== -1) tasks[tIdx].dueDate = newDate;
        
        renderKanban(); 
        updateStats();
        showToast(`Đã đổi ngày sang ${formatDateDisplay(newDate)}`);
      } catch (err) {
        showToast('Lỗi khi đổi ngày: ' + err.message, 'error');
        info.revert();
      }
    },
    height: 'auto'
  });
  
  fullCalendar.render();
}

// ========== SHARE FUNCTIONS ==========
function openShareModal() {
  if (!currentNotebookId) return;
  const notebook = notebooks.find(n => n._id === currentNotebookId);
  if (!notebook) return;

  $('#share-msg').textContent = '';
  $('#share-email-input').value = '';
  
  renderCollaboratorsList(notebook);
  shareModal.style.display = 'flex';
}

function renderCollaborators(notebook) {
  const container = $('#collaborators-list');
  if (!container) return; // Bảo vệ nếu DOM chưa sẵn sàng
  container.innerHTML = '';
  
  // Owner first
  const ownerInitial = (notebook.user.name || 'U').charAt(0).toUpperCase();
  container.innerHTML += `<div class="user-avatar" style="width:24px; height:24px; font-size:10px; border:2px solid var(--primary-color)" title="Chủ sở hữu: ${notebook.user.name}">${ownerInitial}</div>`;

  // Then collaborators
  if (notebook.collaborators) {
    notebook.collaborators.forEach(col => {
      const initial = (col.name || 'U').charAt(0).toUpperCase();
      container.innerHTML += `<div class="user-avatar" style="width:24px; height:24px; font-size:10px; margin-left:-8px;" title="${col.name}">${initial}</div>`;
    });
  }
}

function closeShareModal() {
  shareModal.style.display = 'none';
}

function renderCollaboratorsList(notebook) {
  const list = $('#collaborators-modal-list');
  list.innerHTML = '';
  
  // Owner
  list.innerHTML += `
    <li style="display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="user-avatar" style="width:32px; height:32px; font-size:14px;">${notebook.user.name.charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-size:14px; font-weight:500;">${escapeHtml(notebook.user.name)} (Bạn)</div>
          <div style="font-size:12px; color:var(--text-secondary);">Chủ sở hữu</div>
        </div>
      </div>
    </li>
  `;

  // Others
  if (notebook.collaborators) {
    notebook.collaborators.forEach(col => {
      list.innerHTML += `
        <li style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="user-avatar" style="width:32px; height:32px; font-size:14px; background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border-light)">${col.name.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-size:14px; font-weight:500;">${escapeHtml(col.name)}</div>
              <div style="font-size:12px; color:var(--text-secondary);">${escapeHtml(col.email)}</div>
            </div>
          </div>
          <button class="btn-icon" style="color:var(--danger-color)" onclick="handleRemoveMember('${col._id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </li>
      `;
    });
  }
}

async function handleInviteUser(e) {
  e.preventDefault();
  const email = $('#share-email-input').value.trim();
  const msgEl = $('#share-msg');

  try {
    const res = await apiRequest(`/notebooks/${currentNotebookId}/invite`, 'POST', { email });
    showToast(res.message);
    msgEl.textContent = res.message;
    msgEl.style.color = 'var(--success-color)';
    
    // Refresh notebook data and UI
    await loadNotebooks();
    const updatedNb = notebooks.find(n => n._id === currentNotebookId);
    renderCollaboratorsList(updatedNb);
    renderCollaborators(updatedNb);
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.style.color = 'var(--danger-color)';
  }
}

async function handleRemoveMember(userId) {
  if (!confirm('Xóa thành viên này khỏi sổ tay?')) return;
  try {
    const res = await apiRequest(`/notebooks/${currentNotebookId}/collaborators/${userId}`, 'DELETE');
    showToast(res.message);
    await loadNotebooks();
    const updatedNb = notebooks.find(n => n._id === currentNotebookId);
    renderCollaboratorsList(updatedNb);
    renderCollaborators(updatedNb);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
