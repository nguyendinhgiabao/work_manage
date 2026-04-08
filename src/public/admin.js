// ========== API CONFIG ==========
const API_URL = '/api';

// ========== DOM ELEMENTS ==========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const loadingView = $('#admin-loading');
const contentView = $('#admin-content');
const btnBackHome = $('#btn-back-home');
const btnLogout = $('#logout-btn');

// State
let taskStatusChart = null;
let growthChart = null;
let currentUsers = [];
let currentPage = 1;
let currentLimit = 10;
let searchQuery = '';
let currentTotalPages = 1;
let selectedUserId = null;
let adminUser = null; // To store current admin's own info

// Helpers
const getToken = () => localStorage.getItem('token');
const removeToken = () => localStorage.removeItem('token');

function showToast(message, type = 'success') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

async function adminApiRequest(endpoint, method = 'GET', body = null) {
  const token = getToken();
  if (!token) {
    window.location.href = '/';
    throw new Error('Not logged in');
  }

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      removeToken();
      window.location.href = '/'; 
    }
    throw new Error(data.message || 'Lỗi hệ thống');
  }
  return data;
}

// ========== INITIAL LOAD ==========
async function loadAdminData() {
  try {
    const stats = await adminApiRequest('/admin/stats');
    renderOverviewStats(stats.overview, stats.newUsers7Days);
    renderCharts(stats);

    await loadUsers();
    await loadLogs();
    
    // Load admin's own profile for the Profile Modal
    adminUser = await adminApiRequest('/auth/profile');
    $('#admin-user-display-name').textContent = adminUser.name;

    loadingView.style.display = 'none';
    contentView.style.display = 'block';
  } catch (error) {
    console.error(error);
  }
}

// ========== ADMIN PROFILE FUNCTIONS ==========
function openAdminProfileModal() {
  if (!adminUser) return;
  $('#profile-name-input').value = adminUser.name;
  $('#profile-old-pwd').value = '';
  $('#profile-new-pwd').value = '';
  $('#profile-modal').style.display = 'flex';
}

function closeAdminProfileModal() {
  $('#profile-modal').style.display = 'none';
}

async function handleUpdateAdminProfile(e) {
  e.preventDefault();
  const name = $('#profile-name-input').value.trim();
  const currentPassword = $('#profile-old-pwd').value;
  const newPassword = $('#profile-new-pwd').value;

  if (!name) return showToast('Tên không được để trống', 'error');
  
  const body = { name };
  if (newPassword) {
    if (!currentPassword) return showToast('Nhập mật khẩu cũ để đổi mật khẩu mới', 'error');
    if (newPassword.length < 6) return showToast('Mật khẩu mới từ 6 ký tự', 'error');
    body.currentPassword = currentPassword;
    body.newPassword = newPassword;
  }

  try {
    const data = await adminApiRequest('/auth/profile', 'PUT', body);
    adminUser = { ...adminUser, ...data };
    $('#admin-user-display-name').textContent = adminUser.name;
    
    showToast(data.message || 'Cập nhật thành công');
    closeAdminProfileModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== TAB 1: DASHBOARD ==========
function renderOverviewStats(overview, newUsersStr) {
  $('#stat-total-users').textContent = overview.users;
  $('#stat-total-notebooks').textContent = overview.notebooks;
  $('#stat-total-tasks').textContent = overview.tasks;
  $('#stat-new-users').textContent = newUsersStr;
}

function getChartColors() {
  const isDark = document.body.classList.contains('dark');
  return {
    textColor: isDark ? '#ebedea' : '#37352f',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  };
}

function renderCharts(stats) {
  const colors = getChartColors();
  Chart.defaults.color = colors.textColor;
  Chart.defaults.font.family = "'Inter', Arial, sans-serif";

  // Task Doughnut Chart
  const ctxStatus = $('#taskStatusChart').getContext('2d');
  if (taskStatusChart) taskStatusChart.destroy();
  
  taskStatusChart = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Đang chờ', 'Đang xử lý', 'Hoàn thành'],
      datasets: [{
        data: [stats.taskDistribution.pending, stats.taskDistribution.inProgress, stats.taskDistribution.completed],
        backgroundColor: ['#eb5757', '#f2994a', '#27ae60'],
        borderWidth: 0, hoverOffset: 4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '70%' }
  });

  // Overview Bar Chart
  const ctxGrowth = $('#growthChart').getContext('2d');
  if (growthChart) growthChart.destroy();

  growthChart = new Chart(ctxGrowth, {
    type: 'bar',
    data: {
      labels: ['Người dùng', 'Sổ tay', 'Công việc'],
      datasets: [{
        label: 'Số lượng lưu trữ',
        data: [stats.overview.users, stats.overview.notebooks, stats.overview.tasks],
        backgroundColor: 'rgba(45, 104, 255, 0.7)',
        borderColor: '#2d68ff', borderWidth: 1, borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: colors.gridColor }, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ========== TAB 2: USERS ==========
async function loadUsers() {
  try {
    const data = await adminApiRequest(`/admin/users?page=${currentPage}&limit=${currentLimit}&search=${encodeURIComponent(searchQuery)}`);
    currentUsers = data.users;
    currentTotalPages = data.totalPages || 1;
    
    $('#pagination-info').textContent = `Trang ${data.currentPage} / ${currentTotalPages} (Tổng: ${data.totalUsers})`;
    $('#btn-prev-page').disabled = (data.currentPage === 1);
    $('#btn-next-page').disabled = (data.currentPage >= currentTotalPages);

    renderUsers(currentUsers);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderUsers(users) {
  const tbody = $('#users-table-body');
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-secondary);">Không có dữ liệu</td></tr>`;
    return;
  }

  users.forEach(user => {
    const tr = document.createElement('tr');
    
    let roleBadge = user.role === 'admin' ? 'badge-admin' : 'badge-user';
    let roleText = user.role === 'admin' ? 'Admin' : 'User';
    let statusText = user.status === 'blocked' ? '<span class="status-blocked">Đã khoá</span>' : '<span class="status-active">Hoạt động</span>';
    let btnBlockText = user.status === 'blocked' ? 'Mở khoá' : 'Khoá';

    tr.innerHTML = `
      <td><strong>${escapeHtml(user.name)}</strong></td>
      <td style="color: var(--text-secondary);">${escapeHtml(user.email)}</td>
      <td>
        <span class="badge-role ${roleBadge}" style="cursor:pointer;" title="Click để đổi quyền" onclick="handleToggleRole('${user._id}')">
          ${roleText}
        </span>
      </td>
      <td>${statusText}</td>
      <td>${formatDate(user.createdAt)}</td>
      <td style="text-align: right;">
        ${user.role !== 'admin' ? `
          <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="openResetPwdModal('${user._id}', '${escapeHtml(user.name)}', '${escapeHtml(user.email)}')">
            Mật khẩu
          </button>
          <button class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="handleToggleStatus('${user._id}', '${escapeHtml(user.name)}')">
            ${btnBlockText}
          </button>
          <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="handleDeleteUser('${user._id}', '${escapeHtml(user.name)}')">
            Xóa
          </button>
        ` : `<span style="color: var(--text-muted); font-size: 13px; font-style: italic;">Protected</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// User Actions
window.handleToggleRole = async function(id) {
  if (!confirm('Bạn có muốn thay đổi quyền hạn của tài khoản này?')) return;
  try {
    await adminApiRequest(`/admin/users/${id}/role`, 'PUT');
    showToast('Thay đổi quyền thành công');
    loadUsers();
    loadLogs();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

window.handleToggleStatus = async function(id, name) {
  if (!confirm(`Xác nhận khóa/mở khóa tài khoản: ${name}?`)) return;
  try {
    await adminApiRequest(`/admin/users/${id}/status`, 'PUT');
    showToast(`Thay đổi trạng thái tài khoản thành công`);
    loadUsers();
    loadLogs();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

window.openResetPwdModal = function(id, name, email) {
  selectedUserId = id;
  $('#reset-pwd-user-info').innerHTML = `Người dùng: <strong>${name}</strong> (${email})`;
  $('#reset-pwd-input').value = '';
  $('#reset-password-modal').style.display = 'flex';
};

window.closeResetPwdModal = function() {
  $('#reset-password-modal').style.display = 'none';
  selectedUserId = null;
};

window.handleForceResetPassword = async function() {
  const newPassword = $('#reset-pwd-input').value.trim();
  if(!newPassword || newPassword.length < 6) {
    return showToast('Mật khẩu tối thiểu 6 ký tự', 'error');
  }

  try {
    const btn = $('#reset-pwd-submit');
    btn.disabled = true;
    btn.textContent = 'Đang đổi...';
    
    await adminApiRequest(`/admin/users/${selectedUserId}/password`, 'PUT', { newPassword });
    
    showToast('Đã cấp lại mật khẩu thành công!');
    closeResetPwdModal();
    loadLogs();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    const btn = $('#reset-pwd-submit');
    btn.disabled = false;
    btn.textContent = 'Xác nhận Đổi';
  }
};

window.handleDeleteUser = async function(id, name) {
  if (!confirm(`Hành động này XÓA VĨNH VIỄN tài khoản "${name}" cùng toàn bộ dữ liệu. KHÔNG THỂ KHÔI PHỤC. Chắc chắn?`)) return;
  try {
    await adminApiRequest(`/admin/users/${id}`, 'DELETE');
    showToast(`Đã xóa tài khoản ${name}`);
    loadUsers(); 
    loadLogs();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

// CSV Export
window.downloadCSV = function() {
  if (currentUsers.length === 0) return showToast('Không có dữ liệu để xuất', 'error');

  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
  csvContent += "ID,Tên,Email,Phân Quyền,Trạng Thái,Ngày Tạo\n";

  currentUsers.forEach(function(u) {
    const row = [
      u._id,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      u.role,
      u.status,
      new Date(u.createdAt).toISOString()
    ];
    csvContent += row.join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `danh_sach_users_${new Date().getTime()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ========== TAB 3: ACTIVITY LOGS ==========
async function loadLogs() {
  try {
    const logs = await adminApiRequest('/admin/logs?limit=20');
    renderLogs(logs);
  } catch (err) {
    console.error('Lỗi tải Activity Logs:', err);
  }
}

function renderLogs(logs) {
  const tbody = $('#logs-table-body');
  tbody.innerHTML = '';
  
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 24px; color: var(--text-secondary);">Chưa có hoạt động nào</td></tr>`;
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement('tr');
    const actor = log.byUser ? escapeHtml(log.byUser.email) : 'Hệ thống';
    const actionBadge = `<span class="badge-role badge-secondary">${log.action}</span>`;

    tr.innerHTML = `
      <td style="color: var(--text-secondary);">${formatDate(log.createdAt)}</td>
      <td><strong>${actor}</strong></td>
      <td>${actionBadge}</td>
      <td style="color: var(--text-secondary);">${escapeHtml(log.details || '')}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ========== TAB 4: BROADCAST EMAIL ==========
async function handleBroadcast(e) {
  e.preventDefault();
  const targetEmail = $('#broadcast-target').value.trim();
  const subject = $('#broadcast-subject').value.trim();
  const html = $('#broadcast-content').value.trim();

  if(!subject || !html) return;
  const confirmMsg = targetEmail 
    ? `Bạn chuẩn bị gửi email tới RIÊNG địa chỉ: ${targetEmail}. Bạn có chắc chắn?`
    : 'Bạn chuẩn bị gửi email tới TẤT CẢ thành viên Active. Bạn có chắc chắn?';
    
  if (!confirm(confirmMsg)) return;

  const btn = $('#btn-send-broadcast');
  btn.disabled = true;
  btn.textContent = 'Đang gửi...';

  try {
    const res = await adminApiRequest('/admin/broadcast', 'POST', { subject, html, targetEmail });
    showToast(res.message);
    $('#broadcast-form').reset();
    loadLogs();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Gửi Thông Báo`;
  }
}

// ========== EVENT LISTENERS & INIT ==========
function setupTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Deactive old
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab-pane').forEach(p => p.style.display = 'none');
      // Active new
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      $(`#${targetId}`).style.display = 'block';
      
      // Update charts container specific sizing if needed
      if(targetId === 'tab-dashboard') {
        const stats = {
          taskDistribution: { pending: taskStatusChart?.data.datasets[0].data[0], inProgress: taskStatusChart?.data.datasets[0].data[1], completed: taskStatusChart?.data.datasets[0].data[2] },
          overview: { users: growthChart?.data.datasets[0].data[0], notebooks: growthChart?.data.datasets[0].data[1], tasks: growthChart?.data.datasets[0].data[2] }
        };
        // Render again to fix canvas sizes issue inside hidden div
        if(taskStatusChart && growthChart && stats.overview.users !== undefined) renderCharts(stats); 
      }
    });
  });
}

function setupDarkMode() {
  const toggleBtn = $('#dark-mode-toggle');
  const isDark = localStorage.getItem('darkMode') === 'true';
  const iconSun = $('#icon-sun');
  const iconMoon = $('#icon-moon');

  if (isDark) {
    document.body.classList.add('dark');
    iconSun.style.display = 'block';
    iconMoon.style.display = 'none';
  }

  toggleBtn.addEventListener('click', () => {
    const darkOn = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', darkOn);
    iconSun.style.display = darkOn ? 'block' : 'none';
    iconMoon.style.display = darkOn ? 'none' : 'block';
    
    // Refresh charts specific to mode transition
    if(taskStatusChart) {
      setTimeout(async () => {
        const stats = await adminApiRequest('/admin/stats');
        renderCharts(stats);
      }, 50);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupDarkMode();
  setupTabs();
  loadAdminData();

  // Route back/logout
  btnBackHome.addEventListener('click', () => window.location.href = '/');
  btnLogout.addEventListener('click', () => { removeToken(); window.location.href = '/'; });

  // Pagination & Search
  $('#btn-search-users').addEventListener('click', () => {
    searchQuery = $('#user-search-input').value;
    currentPage = 1;
    loadUsers();
  });
  
  $('#user-search-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
      searchQuery = $('#user-search-input').value;
      currentPage = 1;
      loadUsers();
    }
  });

  $('#btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; loadUsers(); }
  });

  $('#btn-next-page').addEventListener('click', () => {
    if (currentPage < currentTotalPages) { currentPage++; loadUsers(); }
  });

  // Export
  $('#btn-export-csv').addEventListener('click', window.downloadCSV);

  // Broadcast
  $('#broadcast-form').addEventListener('submit', handleBroadcast);
  
  // Refresh Logs
  $('#btn-refresh-logs').addEventListener('click', loadLogs);

  // Admin Profile Modal
  $('#profile-btn').onclick = openAdminProfileModal;
  $('#profile-modal-close').onclick = closeAdminProfileModal;
  $('#profile-modal-cancel').onclick = closeAdminProfileModal;
  $('#profile-form').onsubmit = handleUpdateAdminProfile;

  // Admin Reset Password Modal
  $('#reset-pwd-close').onclick = closeResetPwdModal;
  $('#reset-pwd-cancel').onclick = closeResetPwdModal;
  $('#reset-pwd-submit').onclick = handleForceResetPassword;

  // ESC to close reset modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('#reset-password-modal').style.display === 'flex') closeResetPwdModal();
      if ($('#profile-modal').style.display === 'flex') closeAdminProfileModal();
    }
  });
});
