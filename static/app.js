/**
 * app.js - Tisk Task v1.0
 */

let currentUser = null;
let todos = [];
let allUsers = [];
let selectedOwners = new Set();

let statusFilter = 'all';
let activeLabels = new Set();
let activeColors = new Set();
let dateFilterRange = { start: null, end: null, label: 'month' };

const DOM = {
  loginView: document.getElementById('loginView'),
  emailStep: document.getElementById('emailStep'),
  otpStep: document.getElementById('otpStep'),
  appView: document.getElementById('appView'),
  loginEmail: document.getElementById('loginEmail'),
  requestOtpBtn: document.getElementById('requestOtpBtn'),
  loginMsg: document.getElementById('loginMsg'),
  loginOtp: document.getElementById('loginOtp'),
  verifyOtpBtn: document.getElementById('verifyOtpBtn'),
  backToEmailBtn: document.getElementById('backToEmailBtn'),
  displayLoginEmail: document.getElementById('displayLoginEmail'),
  otpMsg: document.getElementById('otpMsg'),

  currentUserDisplay: document.getElementById('currentUserDisplay'),
  profileTrigger: document.getElementById('profileTrigger'),
  profileMenu: document.getElementById('profileMenu'),
  profileDropdown: document.getElementById('profileDropdown'),
  logoutBtn: document.getElementById('logoutBtn'),
  adminToggleBtn: document.getElementById('adminToggleBtn'),
  adminModal: document.getElementById('adminModal'),
  themeCheckbox: document.getElementById('themeCheckbox'),
  themeIcon: document.getElementById('themeIcon'),

  todoInput: document.getElementById('todoInput'),
  labelsInput: document.getElementById('labelsInput'),
  addBtn: document.getElementById('addBtn'),
  ownerPickerBtn: document.getElementById('ownerPickerBtn'),
  ownerDropdown: document.getElementById('ownerDropdown'),
  datePickerBtn: document.getElementById('datePickerBtn'),
  startDateInput: document.getElementById('startDateInput'),
  dueDateInput: document.getElementById('dueDateInput'),
  tagPickerBtn: document.getElementById('tagPickerBtn'),
  chipBar: document.getElementById('chipBar'),
  temperatureFlags: document.getElementById('temperatureFlags'),
  filterBtns: document.querySelectorAll('.filter-link'),
  todoList: document.getElementById('todoList'),
  emptyState: document.getElementById('emptyState'),
  dateDisplay: document.getElementById('dateDisplay'),
  activityFeed: document.getElementById('activityFeed'),
  notifBadge: document.getElementById('notifBadge'),
  sidebarStats: document.getElementById('sidebarStats'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),

  bulkActionsContainer: document.getElementById('bulkActionsContainer'),
  clearCompletedBtnMain: document.getElementById('clearCompletedBtnMain'),
  purgeAllBtn: document.getElementById('purgeAllBtn'),

  allCount: document.getElementById('allCount'),
  activeCount: document.getElementById('activeCount'),
  completedCount: document.getElementById('completedCount'),
  pastDueCount: document.getElementById('pastDueCount'),
  commentsFilterCount: document.getElementById('commentsFilterCount'),
  deletedCount: document.getElementById('deletedCount'),

  adminUserList: document.getElementById('adminUserList'),
  adminAddUserBtn: document.getElementById('adminAddUserBtn'),
  adminMsg: document.getElementById('adminMsg'),
  adminNewName: document.getElementById('adminNewName'),
  adminNewEmail: document.getElementById('adminNewEmail'),
  adminNewRole: document.getElementById('adminNewRole'),
  adminNewPerm: document.getElementById('adminNewPerm'),

  taskOptionsModal: document.getElementById('taskOptionsModal'),
  taskOptionsTitle: document.getElementById('taskOptionsTitle'),
  modalTaskTitle: document.getElementById('modalTaskTitle'),
  taskItemsContainer: document.getElementById('taskItemsContainer'),
  modalSaveTaskBtn: document.getElementById('modalSaveTaskBtn'),
  taskItemTemplate: document.getElementById('taskItemTemplate'),
  modalFlagPicker: document.getElementById('modalFlagPicker'),

  masqueradeBar: document.getElementById('masqueradeBar'),
  masqTargetName: document.getElementById('masqTargetName'),
  masqAdminName: document.getElementById('masqAdminName'),
  quitMasqueradeBtn: document.getElementById('quitMasqueradeBtn'),

  notifBtn: document.getElementById('notifBtn'),
  dashboardWrapper: document.getElementById('dashboardWrapper'),
  activitySidebar: document.getElementById('activitySidebar'),

  viewTitle: document.getElementById('viewTitle'),
  dateFilterModal: document.getElementById('dateFilterModal'),
  filterDateStart: document.getElementById('filterDateStart'),
  filterDateEnd: document.getElementById('filterDateEnd'),
  applyDateFilterBtn: document.getElementById('applyDateFilterBtn'),
  clearDateFilterBtn: document.getElementById('clearDateFilterBtn'),

  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  newEmailInput: document.getElementById('newEmailInput'),
  requestEmailChangeBtn: document.getElementById('requestEmailChangeBtn'),
  settingsMsg: document.getElementById('settingsMsg'),
  verifyEmailModal: document.getElementById('verifyEmailModal'),
  pendingEmailDisplay: document.getElementById('pendingEmailDisplay'),
  emailChangeOtp: document.getElementById('emailChangeOtp'),
  verifyEmailChangeBtn: document.getElementById('verifyEmailChangeBtn'),
  verifyEmailMsg: document.getElementById('verifyEmailMsg')
};

let editingTodoId = null;
let modalSelectedFlag = '';

// ── Initialization ────────────────────────────────────────────────

async function init() {
  initTheme();
  setDefaultFilterRange();
  setDateDisplay();

  const res = await fetch('/api/auth/me');
  const user = await res.json();

  if (user) {
    currentUser = user;
    updateUserUI();
    showApp();
  } else {
    showLogin();
  }
}

function updateUserUI() {
  DOM.currentUserDisplay.textContent = currentUser.name;
  const profileEmail = document.querySelector('.profile-email');
  if (profileEmail) profileEmail.textContent = currentUser.email;
  const mainAvatar = document.getElementById('mainAvatar');
  if (mainAvatar) mainAvatar.src = getGravatar(currentUser.email);

  if (currentUser.is_masquerading) {
    DOM.masqueradeBar.classList.remove('hidden');
    DOM.masqTargetName.textContent = currentUser.name;
    DOM.masqAdminName.textContent = currentUser.real_user.name;
  } else {
    DOM.masqueradeBar.classList.add('hidden');
  }
}

function getGravatar(email, size = 80) {
  if (!email) return `https://www.gravatar.com/avatar/0?d=mp&s=${size}`;
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}

function showLogin() {
  DOM.loginView.style.display = 'flex';
  DOM.appView.style.display = 'none';
  DOM.emailStep.style.display = 'block';
  DOM.otpStep.style.display = 'none';
}

async function showApp() {
  DOM.loginView.style.display = 'none';
  DOM.appView.style.display = 'flex';

  const isRealAdmin = (currentUser.real_user && currentUser.real_user.role === 'admin') || (currentUser.role === 'admin');
  if (isRealAdmin) {
    DOM.adminToggleBtn.classList.remove('hidden');
    setupAdminPanel();
  }

  await fetchUsers();
  await fetchTodos();
}

// ── Auth Events ────────────────────────────────────────────────────

DOM.requestOtpBtn.onclick = async () => {
  const email = DOM.loginEmail.value.trim();
  if (!email) return (DOM.loginMsg.textContent = 'Email required');
  DOM.requestOtpBtn.disabled = true;
  DOM.loginMsg.textContent = 'Sending code...';
  const res = await fetch('/api/auth/request-otp', { method: 'POST', body: JSON.stringify({ email }) });
  if (res.ok) {
    DOM.emailStep.style.display = 'none';
    DOM.otpStep.style.display = 'block';
    DOM.displayLoginEmail.textContent = email;
    DOM.loginOtp.value = '';
    DOM.loginOtp.focus();
  } else {
    const e = await res.json();
    DOM.loginMsg.textContent = e.error || 'Failed';
  }
  DOM.requestOtpBtn.disabled = false;
};

DOM.verifyOtpBtn.onclick = async () => {
  const email = DOM.loginEmail.value.trim();
  const code = DOM.loginOtp.value.trim();
  const res = await fetch('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) });
  if (res.ok) {
    currentUser = await res.json();
    updateUserUI();
    showApp();
  } else {
    const e = await res.json();
    DOM.otpMsg.textContent = e.error || 'Invalid code';
  }
};

DOM.logoutBtn.onclick = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
};

DOM.quitMasqueradeBtn.onclick = async () => {
  await fetch('/api/admin/masquerade/quit', { method: 'POST' });
  location.reload();
};

// ── Settings & Email Change ───────────────────────────────────────

DOM.settingsBtn.onclick = (e) => {
  e.stopPropagation();
  DOM.profileDropdown.classList.add('hidden');
  DOM.newEmailInput.value = currentUser.email;
  DOM.settingsMsg.textContent = '';
  DOM.settingsModal.showModal();
};

DOM.requestEmailChangeBtn.onclick = async () => {
  const new_email = DOM.newEmailInput.value.trim().toLowerCase();
  if (!new_email || new_email === currentUser.email) {
    DOM.settingsMsg.textContent = 'Enter a different email address';
    return;
  }

  DOM.requestEmailChangeBtn.disabled = true;
  DOM.settingsMsg.textContent = 'Sending code...';

  const res = await fetch('/api/auth/request-email-change', {
    method: 'POST',
    body: JSON.stringify({ new_email })
  });

  if (res.ok) {
    DOM.settingsModal.close();
    DOM.pendingEmailDisplay.textContent = new_email;
    DOM.emailChangeOtp.value = '';
    DOM.verifyEmailMsg.textContent = '';
    DOM.verifyEmailModal.showModal();
  } else {
    const e = await res.json();
    DOM.settingsMsg.textContent = e.error || 'Failed to request change';
  }
  DOM.requestEmailChangeBtn.disabled = false;
};

DOM.verifyEmailChangeBtn.onclick = async () => {
  const new_email = DOM.pendingEmailDisplay.textContent;
  const code = DOM.emailChangeOtp.value.trim();

  if (code.length !== 6) {
    DOM.verifyEmailMsg.textContent = 'Enter 6-digit code';
    return;
  }

  DOM.verifyEmailChangeBtn.disabled = true;
  const res = await fetch('/api/auth/verify-email-change', {
    method: 'POST',
    body: JSON.stringify({ new_email, code })
  });

  if (res.ok) {
    DOM.verifyEmailModal.close();
    // Refresh user data to show new email
    const meRes = await fetch('/api/auth/me');
    currentUser = await meRes.json();
    updateUserUI();
    alert("Email updated successfully.");
  } else {
    const e = await res.json();
    DOM.verifyEmailMsg.textContent = e.error || 'Invalid code';
  }
  DOM.verifyEmailChangeBtn.disabled = false;
};

// ── Theme Management ───────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);
  if (DOM.themeCheckbox) DOM.themeCheckbox.checked = (saved === 'dark');
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  if (!DOM.themeIcon) return;
  const sun = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  const moon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  DOM.themeIcon.innerHTML = isDark ? moon : sun;
}

DOM.themeCheckbox.onchange = (e) => {
  const theme = e.target.checked ? 'dark' : 'light';
  applyTheme(theme);
  localStorage.setItem('theme', theme);
};

// ── Admin Panel ────────────────────────────────────────────────────

async function setupAdminPanel() {
  DOM.adminAddUserBtn.onclick = async () => {
    const payload = {
      name: DOM.adminNewName.value.trim(),
      email: DOM.adminNewEmail.value.trim(),
      role: DOM.adminNewRole.value,
      permission: DOM.adminNewPerm.value
    };
    if (!payload.name || !payload.email) return;
    const res = await fetch('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) });
    if (res.ok) {
      DOM.adminNewName.value = ''; DOM.adminNewEmail.value = '';
      fetchAdminUsers();
    }
  };
}

async function fetchAdminUsers() {
  const res = await fetch('/api/admin/users');
  const users = await res.json();
  DOM.adminUserList.innerHTML = users.map(u => `
    <tr class="border-b border-slate-100 dark:border-slate-800">
      <td class="p-3">
        <div class="font-bold">${escapeHtml(u.name)}</div>
        <div class="text-[10px] text-slate-400">${escapeHtml(u.email)}</div>
      </td>
      <td class="p-3">
        <div class="flex flex-col gap-1">
          <select class="admin-role-sel bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase rounded p-1 dark:text-white" data-id="${u.id}">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          <select class="admin-perm-sel bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase rounded p-1 dark:text-white" data-id="${u.id}">
            <option value="own" ${u.permission === 'own' ? 'selected' : ''}>Own</option>
            <option value="all" ${u.permission === 'all' ? 'selected' : ''}>All</option>
            <option value="custom" ${u.permission === 'custom' ? 'selected' : ''}>Custom</option>
          </select>
        </div>
      </td>
      <td class="p-3 text-right">
        <div class="flex justify-end gap-2">
          <button onclick="masqueradeAs(${u.id})" class="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded" title="Masquerade">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </button>
          <button onclick="deleteUser(${u.id})" class="p-1.5 text-slate-300 hover:text-red-500 rounded">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  DOM.adminUserList.querySelectorAll('select').forEach(sel => {
    sel.onchange = async (e) => {
      const id = e.target.dataset.id;
      const tr = e.target.closest('tr');
      const payload = {
        role: tr.querySelector('.admin-role-sel').value,
        permission: tr.querySelector('.admin-perm-sel').value
      };
      await fetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    };
  });
}

window.masqueradeAs = async (id) => {
  const res = await fetch(`/api/admin/masquerade/${id}`, { method: 'POST' });
  if (res.ok) location.reload();
};

window.deleteUser = async (id) => {
  if (confirm("Remove user?")) {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    fetchAdminUsers();
  }
};

DOM.adminToggleBtn.onclick = (e) => { e.stopPropagation(); DOM.profileDropdown.classList.add('hidden'); DOM.adminModal.showModal(); fetchAdminUsers(); };

// ── Profile Dropdown ───────────────────────────────────────────

DOM.profileTrigger.onclick = (e) => {
  e.stopPropagation();
  DOM.profileDropdown.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
  if (DOM.profileDropdown && !DOM.profileMenu.contains(e.target)) {
    DOM.profileDropdown.classList.add('hidden');
  }
});

// ── Task Modal & Items ───────────────────────────────────────────

window.openAddModal = () => {
  editingTodoId = null;
  DOM.taskOptionsTitle.textContent = 'Add New Task';
  DOM.modalTaskTitle.value = '';
  DOM.taskItemsContainer.innerHTML = '';
  DOM.labelsInput.value = '';
  DOM.startDateInput.value = new Date().toISOString().split('T')[0];
  DOM.dueDateInput.value = new Date().toISOString().split('T')[0];
  addTaskItemRow();

  updateModalFlag('');

  selectedOwners.clear();
  if (currentUser) selectedOwners.add(currentUser.id);
  renderOwnerDropdown();
  DOM.taskOptionsModal.showModal();
};

window.startEdit = (id) => {
  const t = todos.find(x => x.id === id);
  if (!t) return;
  editingTodoId = id;
  DOM.taskOptionsTitle.textContent = `Edit Task #${id}`;
  DOM.modalTaskTitle.value = t.text;
  DOM.labelsInput.value = (t.labels || []).join(', ');
  DOM.startDateInput.value = t.start_date || '';
  DOM.dueDateInput.value = t.due_date || '';

  updateModalFlag(t.color_flag || '');

  DOM.taskItemsContainer.innerHTML = '';
  if (t.items && t.items.length > 0) {
    t.items.forEach(i => addTaskItemRow(i.description, i.hours));
  } else {
    addTaskItemRow();
  }

  selectedOwners.clear();
  (t.owners || []).forEach(o => selectedOwners.add(o.id));
  renderOwnerDropdown();

  DOM.taskOptionsModal.showModal();
};

function updateModalFlag(color) {
  modalSelectedFlag = color;
  DOM.modalFlagPicker.querySelectorAll('button').forEach(btn => {
    btn.dataset.active = (btn.dataset.color === color) ? 'true' : 'false';
  });
}

DOM.modalFlagPicker.querySelectorAll('button').forEach(btn => {
  btn.onclick = () => updateModalFlag(btn.dataset.color);
});

window.addTaskItemRow = (desc = '', hrs = 0) => {
  const clone = DOM.taskItemTemplate.content.cloneNode(true);
  const row = clone.querySelector('.task-item-row');
  const editor = row.querySelector('.rich-editor');
  const hoursInput = row.querySelector('.item-hours');

  editor.innerHTML = desc;
  hoursInput.value = hrs || '';

  DOM.taskItemsContainer.appendChild(row);
};

window.formatDoc = (cmd) => {
  document.execCommand(cmd, false, null);
};

window.addHyperlink = () => {
  const url = prompt("Enter the URL (e.g. https://google.com):");
  if (url) {
    document.execCommand('createLink', false, url);
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      let node = selection.anchorNode;
      if (node.nodeType === 3) node = node.parentNode;
      if (node.tagName === 'A') {
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
      }
    }
  }
};

DOM.modalSaveTaskBtn.onclick = async () => {
  const items = Array.from(DOM.taskItemsContainer.querySelectorAll('.task-item-row')).map(row => ({
    description: row.querySelector('.rich-editor').innerHTML,
    hours: parseFloat(row.querySelector('.item-hours').value) || 0
  }));

  const payload = {
    text: DOM.modalTaskTitle.value.trim(),
    labels: DOM.labelsInput.value.split(',').map(l => l.trim()).filter(Boolean),
    start_date: DOM.startDateInput.value,
    due_date: DOM.dueDateInput.value,
    color_flag: modalSelectedFlag,
    owner_ids: Array.from(selectedOwners),
    items: items
  };

  const url = editingTodoId ? `/api/todos/${editingTodoId}` : '/api/todos';
  const method = editingTodoId ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    DOM.taskOptionsModal.close();
    fetchTodos();
  }
};

// ── Filters & Rendering ───────────────────────────────────────────

function setDateDisplay() {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const today = new Date().toLocaleDateString(undefined, options);
  DOM.dateDisplay.textContent = `Today's date: ${today} (filtered by ${dateFilterRange.label})`;
}

function setDefaultFilterRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  dateFilterRange = { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: 'month' };
}

window.setDateRangeFilter = (type) => {
  const now = new Date();
  let start, end, label;
  switch (type) {
    case 'day': start = end = now.toISOString().split('T')[0]; label = 'day'; break;
    case 'week':
      const first = now.getDate() - now.getDay();
      start = new Date(new Date().setDate(first)).toISOString().split('T')[0];
      end = new Date(new Date().setDate(first + 6)).toISOString().split('T')[0];
      label = 'week'; break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      label = 'month'; break;
    case 'quarter':
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), (q + 1) * 3, 0).toISOString().split('T')[0];
      label = 'quarter'; break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      label = 'year'; break;
    case 'all': start = end = null; label = 'all time'; break;
    default: start = end = null; label = type; break;
  }
  dateFilterRange = { start, end, label };
  DOM.dateFilterModal.close();
  setDateDisplay();
  render();
};

DOM.applyDateFilterBtn.onclick = () => {
  dateFilterRange = { start: DOM.filterDateStart.value || null, end: DOM.filterDateEnd.value || null, label: 'custom range' };
  DOM.dateFilterModal.close();
  setDateDisplay();
  render();
};

DOM.clearDateFilterBtn.onclick = () => {
  DOM.filterDateStart.value = ''; DOM.filterDateEnd.value = '';
  setDateRangeFilter('all');
};

DOM.clearFiltersBtn.onclick = () => {
  statusFilter = 'all';
  activeLabels.clear();
  activeColors.clear();
  setDefaultFilterRange();
  DOM.filterBtns.forEach(b => b.dataset.active = (b.dataset.filter === 'all'));
  setDateDisplay();
  render();
  renderChips();
};

async function fetchUsers() {
  const res = await fetch('/api/users');
  if (res.ok) { allUsers = await res.json(); renderOwnerDropdown(); }
}

async function fetchTodos() {
  const res = await fetch('/api/todos');
  if (res.ok) { todos = await res.json(); render(); renderChips(); }
}

function renderOwnerDropdown() {
  DOM.ownerDropdown.innerHTML = allUsers.map(u => `
    <label class="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors cursor-pointer">
      <input type="checkbox" class="w-3.5 h-3.5 rounded text-accent" value="${u.id}" ${selectedOwners.has(u.id) ? 'checked' : ''} onchange="toggleOwnerSelection(this)">
      <span class="text-xs font-medium dark:text-slate-200">${escapeHtml(u.name)}</span>
    </label>
  `).join('');
}

window.toggleOwnerSelection = (checkbox) => {
  const id = parseInt(checkbox.value, 10);
  if (checkbox.checked) selectedOwners.add(id); else selectedOwners.delete(id);
};

function canEdit(todo) {
  if (!currentUser) return false;
  if (currentUser.role === 'admin' || currentUser.permission === 'all') return true;
  return (todo.owners || []).some(o => o.id === currentUser.id);
}

function render() {
  const now = new Date().setHours(0, 0, 0, 0);
  const filtered = todos.filter(t => {
    if (statusFilter === 'deleted') return t.deleted === 1;
    if (t.deleted === 1) return false;
    if (statusFilter === 'active' && t.completed) return false;
    if (statusFilter === 'completed' && !t.completed) return false;
    if (statusFilter === 'past_due' && (t.completed || !t.due_date || new Date(t.due_date).getTime() >= now)) return false;
    if (statusFilter === 'with_comments' && (!t.comments || t.comments.length === 0)) return false;
    if (activeLabels.size > 0 && (!t.labels || !t.labels.some(l => activeLabels.has(l)))) return false;
    if (activeColors.size > 0 && (!t.color_flag || !activeColors.has(t.color_flag))) return false;
    if (dateFilterRange.start || dateFilterRange.end) {
      const tS = t.start_date, tD = t.due_date, fS = dateFilterRange.start, fE = dateFilterRange.end;
      let ok = !fS && !fE;
      if (tS && fS && fE && tS >= fS && tS <= fE) ok = true;
      if (tD && fS && fE && tD >= fS && tD <= fE) ok = true;
      if (fS === fE && (tS === fS || tD === fS)) ok = true;
      if (!ok) return false;
    }
    return true;
  });

  DOM.clearCompletedBtnMain.classList.toggle('hidden', statusFilter !== 'completed' || filtered.length === 0);
  DOM.purgeAllBtn.classList.toggle('hidden', statusFilter !== 'deleted' || filtered.length === 0);
  DOM.bulkActionsContainer.classList.toggle('hidden', DOM.clearCompletedBtnMain.classList.contains('hidden') && DOM.purgeAllBtn.classList.contains('hidden'));

  DOM.todoList.innerHTML = '';
  DOM.emptyState.classList.toggle('hidden', filtered.length > 0);

  filtered.forEach(t => {
    const editable = canEdit(t);
    const isOverdue = t.due_date && !t.completed && new Date(t.due_date) < now;
    const totalHours = (t.items || []).reduce((acc, curr) => acc + curr.hours, 0);

    const li = document.createElement('li');
    li.className = `todo-item group relative flex gap-4 p-5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all animate-fadeIn ${t.completed ? 'opacity-60' : ''}`;
    li.dataset.id = t.id;
    li.innerHTML = `
      <div class="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-flag-${t.color_flag || 'slate-200'}"></div>
      <div class="pt-1">
        <input type="checkbox" ${t.completed ? 'checked' : ''} ${!editable || t.deleted ? 'disabled' : ''} class="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-slate-600 appearance-none checked:bg-accent checked:border-accent cursor-pointer transition-all relative after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-xs after:opacity-0 checked:after:opacity-100" onclick="toggleTodo(${t.id}, this)" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1 min-w-0">
            <span class="text-base font-semibold leading-tight break-words ${t.completed ? 'line-through text-slate-400' : ''} cursor-pointer" onclick="${editable && !t.deleted ? `startEdit(${t.id})` : ''}">${escapeHtml(t.text)}</span>
            ${totalHours > 0 ? `<div class="text-[9px] font-black text-accent uppercase tracking-widest">${totalHours.toFixed(2)} total hours</div>` : ''}
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            ${t.deleted ? `
              <button onclick="undeleteTodo(${t.id})" class="p-1.5 text-slate-400 hover:text-green-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 19 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg></button>
              <button onclick="permanentlyDeleteTodo(${t.id})" class="p-1.5 text-slate-400 hover:text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            ` : (editable ? `
              <button onclick="startEdit(${t.id})" class="p-1.5 text-slate-400 hover:text-accent"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
              <button onclick="deleteTodo(${t.id})" class="p-1.5 text-slate-400 hover:text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            ` : '')}
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-4 mt-3">
          <div class="flex items-center">${(t.owners || []).map(o => `<img class="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 -ml-2 first:ml-0" src="${getGravatar(o.email, 48)}" title="${escapeHtml(o.name)}">`).join('')}</div>
          <div class="text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-slate-400'} flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${fmtShortDate(t.start_date)} → ${fmtShortDate(t.due_date)}
          </div>
          <button onclick="toggleComments(${t.id})" class="flex items-center gap-1 text-[10px] font-bold ${t.comments.length ? 'text-accent' : 'text-slate-400/50'} hover:text-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            ${t.comments.length}
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5 mt-3">${(t.labels || []).map(l => `<span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">${escapeHtml(l)}</span>`).join('')}</div>
        <div id="comments-${t.id}" class="hidden mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 animate-slideDown">
          <div id="comment-list-${t.id}" class="flex flex-col gap-3 mb-4"></div>
          <div class="flex items-center gap-3">
            <img class="w-6 h-6 rounded-full" src="${getGravatar(currentUser.email)}" alt="">
            <input type="text" class="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-accent/20 dark:text-white" placeholder="Add a comment..." onkeydown="if(event.key==='Enter') { addComment(${t.id}, this.value); this.value=''; }"/>
          </div>
        </div>
      </div>
    `;
    DOM.todoList.appendChild(li);
    renderComments(t.id);
  });

  updateStats();
  renderActivityFeed();
}

function updateStats() {
  const now = new Date().setHours(0, 0, 0, 0);
  const counts = { all: 0, active: 0, completed: 0, past_due: 0, comments: 0, deleted: 0, total_comm: 0 };

  todos.forEach(t => {
    counts.total_comm += (t.comments || []).length;
    if (t.deleted) { counts.deleted++; }
    else {
      counts.all++;
      if (t.completed) counts.completed++;
      else {
        counts.active++;
        if (t.due_date && new Date(t.due_date).getTime() < now) counts.past_due++;
      }
      if (t.comments && t.comments.length > 0) counts.comments++;
    }
  });

  DOM.allCount.textContent = counts.all;
  DOM.activeCount.textContent = counts.active;
  DOM.completedCount.textContent = counts.completed;
  DOM.pastDueCount.textContent = counts.past_due;
  DOM.commentsFilterCount.textContent = counts.comments;
  DOM.deletedCount.textContent = counts.deleted;
  DOM.notifBadge.textContent = counts.total_comm;
  DOM.sidebarStats.textContent = `total tasks: ${counts.all} | total comments: ${counts.total_comm}`;
}

function renderActivityFeed() {
  const allC = [];
  todos.forEach(t => (t.comments || []).forEach(c => allC.push({ ...c, todoText: t.text, todoId: t.id, owner_email: c.owner_email, owner_name: c.owner_name })));
  allC.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latest = allC.slice(0, 15);
  DOM.activityFeed.innerHTML = latest.length ? latest.map(c => `
    <div class="flex gap-3 animate-fadeIn">
      <img class="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-700" src="${getGravatar(c.owner_email || '', 64)}">
      <div class="flex-1 min-w-0">
        <div class="text-[11px] leading-tight">
          <span class="font-bold text-slate-900 dark:text-white">${escapeHtml(c.owner_name)}</span>
          <span class="text-slate-400">on</span>
          <span class="font-bold text-accent cursor-pointer hover:underline" onclick="scrollToTodo(${c.todoId})">"${escapeHtml(c.todoText)}"</span>
        </div>
        <div class="mt-1.5 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-800">${escapeHtml(c.text)}</div>
        <div class="mt-1 text-[8px] font-bold text-slate-300 uppercase">${fmtDate(c.created_at)}</div>
      </div>
    </div>
  `).join('') : '<div class="text-xs text-slate-400 italic">No recent activity.</div>';
}

function scrollToTodo(id) {
  const el = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Helpers ────────────────────────────────────────────────────────

function escapeHtml(s) { const d = document.createElement('div'); d.innerText = s || ''; return d.innerHTML; }
function fmtDate(iso) {
  const d = new Date(iso), n = new Date();
  if (n.toDateString() === d.toDateString()) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function fmtShortDate(iso) { return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''; }

window.renderComments = (todoId) => {
  const t = todos.find(x => x.id === todoId), ctn = document.getElementById(`comment-list-${todoId}`);
  if (!ctn || !t || !t.comments) return;
  ctn.innerHTML = t.comments.map(c => `
    <div class="group/comment relative bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-600 dark:text-slate-300">${escapeHtml(c.owner_name)}</span>
          <span class="text-[8px] font-bold text-slate-300 uppercase">${fmtDate(c.created_at)}</span>
        </div>
        ${(currentUser && (c.user_id === currentUser.id || currentUser.role === 'admin')) ? `
          <button onclick="deleteComment(${t.id}, ${c.id})" class="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 transition-opacity"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        ` : ''}
      </div>
      <div class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">${escapeHtml(c.text)}</div>
    </div>
  `).join('');
};

window.toggleComments = (id) => document.getElementById(`comments-${id}`).classList.toggle('hidden');

window.addComment = async (id, text) => {
  if (!text.trim()) return;
  const res = await fetch(`/api/todos/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  if (res.ok) { fetchTodos(); }
};

window.deleteComment = async (tid, cid) => {
  if (await fetch(`/api/comments/${cid}`, { method: 'DELETE' })) { fetchTodos(); }
};

window.toggleTodo = async (id, cb) => {
  const res = await fetch(`/api/todos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: cb.checked ? 1 : 0 }) });
  if (res.ok) { fetchTodos(); }
};

window.deleteTodo = async (id) => { if (confirm("Move to trash?")) { await fetch(`/api/todos/${id}`, { method: 'DELETE' }); fetchTodos(); } };
window.undeleteTodo = async (id) => { await fetch(`/api/todos/${id}/undelete`, { method: 'POST' }); fetchTodos(); };
window.permanentlyDeleteTodo = async (id) => { if (confirm("Permanently delete?")) { await fetch(`/api/todos/${id}/permanent`, { method: 'DELETE' }); fetchTodos(); } };

DOM.purgeAllBtn.onclick = async () => { if (confirm("Empty trash?")) { await fetch('/api/todos/purge', { method: 'DELETE' }); fetchTodos(); } };
DOM.clearCompletedBtnMain.onclick = async () => {
  if (confirm("Move all completed to trash?")) {
    for (const t of todos.filter(x => x.completed && !x.deleted)) if (canEdit(t)) await fetch(`/api/todos/${t.id}`, { method: 'DELETE' });
    fetchTodos();
  }
};

DOM.filterBtns.forEach(btn => {
  btn.onclick = () => {
    DOM.filterBtns.forEach(b => b.dataset.active = "false");
    btn.dataset.active = "true";
    statusFilter = btn.dataset.filter;
    render();
  };
});

function renderChips() {
  const labels = new Set();
  todos.forEach(t => (t.labels || []).forEach(l => labels.add(l)));
  DOM.chipBar.innerHTML = Array.from(labels).sort().map(lbl => {
    const act = activeLabels.has(lbl);
    return `<button onclick="toggleLabel('${lbl}')" class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${act ? 'bg-accent border-accent text-white hover:text-white' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-accent hover:text-accent'}">${escapeHtml(lbl)}</button>`;
  }).join('');

  const colors = ['red', 'orange', 'yellow', 'green', 'blue'];
  DOM.temperatureFlags.innerHTML = colors.map(clr => {
    const act = activeColors.has(clr);
    return `<button onclick="toggleColorFilter('${clr}')" class="w-4 h-4 rounded-full bg-flag-${clr} ring-2 ${act ? 'ring-slate-400 scale-110' : 'ring-transparent hover:ring-slate-300'}"></button>`;
  }).join('');
}

window.toggleLabel = (l) => { activeLabels.has(l) ? activeLabels.delete(l) : activeLabels.add(l); renderChips(); render(); };
window.toggleColorFilter = (c) => { activeColors.has(c) ? activeColors.delete(c) : activeColors.add(c); renderChips(); render(); };

DOM.notifBtn.onclick = () => {
  const sidebar = DOM.activitySidebar;
  const isHidden = sidebar.classList.contains('lg:hidden');

  if (isHidden) {
    sidebar.classList.remove('lg:hidden'); sidebar.classList.add('lg:flex');
    DOM.dashboardWrapper.classList.remove('lg:grid-cols-[260px_1fr]');
    DOM.dashboardWrapper.classList.add('lg:grid-cols-[260px_1fr_310px]');
  } else {
    sidebar.classList.add('lg:hidden'); sidebar.classList.remove('lg:flex');
    DOM.dashboardWrapper.classList.remove('lg:grid-cols-[260px_1fr_310px]');
    DOM.dashboardWrapper.classList.add('lg:grid-cols-[260px_1fr]');
  }
};

init();
