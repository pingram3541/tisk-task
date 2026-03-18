/**
 * app.js - Tisk Task v1.0.3
 */

let currentUser = null;
let todos = [];
let allUsers = [];
let selectedOwners = new Set();

let statusFilter = 'all';
let activeLabels = new Set();
let activeColors = new Set();
let dateFilterRange = { start: null, end: null, label: 'month' };
let globalSearchQuery = '';

const DOM = {
  loginView: document.getElementById('loginView'),
  emailStep: document.getElementById('emailStep'),
  otpStep: document.getElementById('otpStep'),
  appView: document.getElementById('appView'),
  loginEmail: document.getElementById('loginEmail'),
  requestOtpBtn: document.getElementById('requestOtpBtn'),
  loginMsg: document.getElementById('loginMsg'),
  loginOtp: document.getElementById('loginOtp'),
  otpInputs: document.querySelectorAll('#otpInputsContainer .otp-input'),
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
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
  leftSidebar: document.getElementById('leftSidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),

  globalSearch: document.getElementById('globalSearch'),
  labelsInput: document.getElementById('labelsInput'),
  ownerDropdown: document.getElementById('ownerDropdown'),
  startDateInput: document.getElementById('startDateInput'),
  dueDateInput: document.getElementById('dueDateInput'),
  chipBar: document.getElementById('chipBar'),
  temperatureFlags: document.getElementById('temperatureFlags'),
  filterBtns: document.querySelectorAll('.filter-link'),

  todoColumn: document.getElementById('todoColumn'),
  todoColumnWrapper: document.getElementById('todoColumnWrapper'),
  inProgressColumn: document.getElementById('inProgressColumn'),
  inProgressColumnWrapper: document.getElementById('inProgressColumnWrapper'),
  doneColumn: document.getElementById('doneColumn'),
  doneColumnWrapper: document.getElementById('doneColumnWrapper'),
  todoCount: document.getElementById('todoCount'),
  inProgressCount: document.getElementById('inProgressCount'),
  doneCount: document.getElementById('doneCount'),

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
  modalTaskStatus: document.getElementById('modalTaskStatus'),
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

  searchToggleBtn: document.getElementById('searchToggleBtn'),
  searchModal: document.getElementById('searchModal'),
  mobileSearchInput: document.getElementById('mobileSearchInput'),

  viewTitle: document.getElementById('viewTitle'),
  dateFilterModal: document.getElementById('dateFilterModal'),
  filterDateStart: document.getElementById('filterDateStart'),
  filterDateEnd: document.getElementById('filterDateEnd'),
  applyDateFilterBtn: document.getElementById('applyDateFilterBtn'),
  clearDateFilterBtn: document.getElementById('clearDateFilterBtn'),

  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  timezoneInput: document.getElementById('timezoneInput'),
  newEmailInput: document.getElementById('newEmailInput'),
  requestEmailChangeBtn: document.getElementById('requestEmailChangeBtn'),
  settingsMsg: document.getElementById('settingsMsg'),
  verifyEmailModal: document.getElementById('verifyEmailModal'),
  pendingEmailDisplay: document.getElementById('pendingEmailDisplay'),
  emailChangeOtpInputs: document.querySelectorAll('#emailChangeOtpInputs .otp-input'),
  emailChangeOtp: document.getElementById('emailChangeOtp'),
  verifyEmailChangeBtn: document.getElementById('verifyEmailChangeBtn'),
  verifyEmailMsg: document.getElementById('verifyEmailMsg'),

  modalCommentSection: document.getElementById('modalCommentSection'),
  modalCommentList: document.getElementById('modalCommentList'),
  modalCommentCount: document.getElementById('modalCommentCount'),
  modalCommentInput: document.getElementById('modalCommentInput'),
  modalAddCommentBtn: document.getElementById('modalAddCommentBtn'),
  modalCommentAvatar: document.getElementById('modalCommentAvatar')
};

let editingTodoId = null;
let modalSelectedFlag = '';

// ── Initialization ────────────────────────────────────────────────

async function init() {
  initTheme();
  setDefaultFilterRange();
  setDateDisplay();
  setupOtpInputs(DOM.otpInputs, DOM.loginOtp);
  setupOtpInputs(DOM.emailChangeOtpInputs, DOM.emailChangeOtp);

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

function setupOtpInputs(inputs, hiddenInput) {
  inputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
      updateHiddenOtp(inputs, hiddenInput);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = e.clipboardData.getData('text').slice(0, inputs.length);
      pasteData.split('').forEach((char, i) => {
        if (inputs[i]) inputs[i].value = char;
      });
      updateHiddenOtp(inputs, hiddenInput);
      inputs[Math.min(pasteData.length, inputs.length - 1)].focus();
    });
  });
}

function updateHiddenOtp(inputs, hiddenInput) {
  hiddenInput.value = Array.from(inputs).map(i => i.value).join('');
}

function updateUserUI() {
  DOM.currentUserDisplay.textContent = currentUser.name;
  const profileEmail = document.querySelector('.profile-email');
  if (profileEmail) profileEmail.textContent = currentUser.email;
  const mainAvatar = document.getElementById('mainAvatar');
  if (mainAvatar) mainAvatar.src = getGravatar(currentUser.email);

  if (DOM.profileTrigger) {
    DOM.profileTrigger.title = `${currentUser.name} (${currentUser.email})`;
  }

  if (currentUser.is_masquerading) {
    DOM.masqueradeBar.classList.remove('hidden');
    document.body.classList.add('is-masquerading');
    DOM.masqTargetName.textContent = currentUser.name;
    DOM.masqAdminName.textContent = currentUser.real_user.name;
  } else {
    DOM.masqueradeBar.classList.add('hidden');
    document.body.classList.remove('is-masquerading');
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
    DOM.otpInputs[0].focus();
  } else {
    const e = await res.json();
    DOM.loginMsg.textContent = e.error || 'Failed';
  }
  DOM.requestOtpBtn.disabled = false;
};

DOM.verifyOtpBtn.onclick = async () => {
  const email = DOM.loginEmail.value.trim();
  const code = DOM.loginOtp.value.trim();
  if (code.length < 6) return (DOM.otpMsg.textContent = 'Enter 6-digit code');

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

DOM.backToEmailBtn.onclick = () => {
  DOM.emailStep.style.display = 'block';
  DOM.otpStep.style.display = 'none';
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
  DOM.timezoneInput.value = currentUser.timezone || 'UTC';
  DOM.settingsMsg.textContent = '';
  DOM.settingsModal.showModal();
};

DOM.timezoneInput.onchange = async () => {
  const timezone = DOM.timezoneInput.value;
  const res = await fetch('/api/auth/timezone', {
    method: 'POST',
    body: JSON.stringify({ timezone })
  });
  if (res.ok) {
    currentUser.timezone = timezone;
    DOM.settingsMsg.textContent = 'Timezone updated';
    setTimeout(() => DOM.settingsMsg.textContent = '', 2000);
  }
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
    DOM.emailChangeOtpInputs.forEach(i => i.value = '');
    DOM.emailChangeOtp.value = '';
    DOM.verifyEmailMsg.textContent = '';
    DOM.verifyEmailModal.showModal();
    setTimeout(() => DOM.emailChangeOtpInputs[0].focus(), 100);
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
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  if (!DOM.themeIcon) return;
  const sun = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  const moon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  DOM.themeIcon.innerHTML = isDark ? sun : moon;
}

DOM.themeToggleBtn.onclick = (e) => {
  const isDark = document.documentElement.classList.contains('dark');
  const theme = isDark ? 'light' : 'dark';
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

window.masqueradeAs = async (e, id) => {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  const res = await fetch(`/api/admin/masquerade/${id}`, { method: 'POST' });
  if (res.ok) location.reload();
};

window.deleteUser = async (e, id) => {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const realUserId = currentUser.real_user ? currentUser.real_user.id : currentUser.id;
  if (id === realUserId) return alert("You cannot delete your own account.");
  if (confirm("Are you sure you want to remove this user?")) {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) fetchAdminUsers();
    else { const err = await res.json(); alert(err.error || "Failed to delete user"); }
  }
};

async function fetchAdminUsers() {
  const res = await fetch('/api/admin/users');
  const users = await res.json();
  const realUserId = currentUser.real_user ? currentUser.real_user.id : currentUser.id;

  DOM.adminUserList.innerHTML = users.map(u => `
    <tr class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td class="px-4 py-4">
        <div class="flex items-center gap-3">
          <img class="w-10 h-10 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm" src="${getGravatar(u.email)}" alt="">
          <div class="flex flex-col">
            <span class="font-black text-sm dark:text-white">${escapeHtml(u.name)}</span>
            <span class="text-xs text-slate-400 font-medium">${escapeHtml(u.email)}</span>
          </div>
        </div>
      </td>
      <td class="px-4 py-4">
        <div class="flex flex-col gap-1.5">
          <select class="admin-role-sel bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl p-2 border border-slate-100 dark:border-slate-800 outline-none focus:border-primary-600 dark:text-white" data-id="${u.id}">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>User Role</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin Role</option>
          </select>
          <select class="admin-perm-sel bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl p-2 border border-slate-100 dark:border-slate-800 outline-none focus:border-primary-600 dark:text-white" data-id="${u.id}">
            <option value="own" ${u.permission === 'own' ? 'selected' : ''}>Own Tasks</option>
            <option value="all" ${u.permission === 'all' ? 'selected' : ''}>Full Access</option>
          </select>
        </div>
      </td>
      <td class="px-4 py-4 text-right">
        <div class="flex justify-end gap-2">
          ${u.id !== realUserId ? `
          <button type="button" onclick="masqueradeAs(event, ${u.id})" class="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all" title="Masquerade">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </button>
          ` : ''}
          <button type="button" onclick="deleteUser(event, ${u.id})" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
  DOM.modalTaskStatus.value = 'todo';
  DOM.taskItemsContainer.innerHTML = '';
  DOM.labelsInput.value = '';
  DOM.startDateInput.value = new Date().toISOString().split('T')[0];
  DOM.dueDateInput.value = new Date().toISOString().split('T')[0];
  addTaskItemRow();
  updateModalFlag('');
  selectedOwners.clear();
  if (currentUser) selectedOwners.add(currentUser.id);
  renderOwnerDropdown();

  DOM.modalCommentSection.classList.add('hidden');

  DOM.taskOptionsModal.showModal();
};

window.startEdit = (id) => {
  const t = todos.find(x => x.id === id);
  if (!t) return;
  editingTodoId = id;
  DOM.taskOptionsTitle.textContent = `Edit Task #${id}`;
  DOM.modalTaskTitle.value = t.text;
  DOM.modalTaskStatus.value = t.status || (t.completed ? 'done' : 'todo');
  DOM.labelsInput.value = (t.labels || []).join(', ');
  DOM.startDateInput.value = t.start_date || '';
  DOM.dueDateInput.value = t.due_date || '';
  updateModalFlag(t.color_flag || '');
  DOM.taskItemsContainer.innerHTML = '';
  if (t.items && t.items.length > 0) t.items.forEach(i => addTaskItemRow(i.description, i.hours));
  else addTaskItemRow();
  selectedOwners.clear();
  (t.owners || []).forEach(o => selectedOwners.add(o.id));
  renderOwnerDropdown();

  DOM.modalCommentSection.classList.remove('hidden');
  DOM.modalCommentAvatar.src = getGravatar(currentUser.email);
  renderModalComments(t);

  DOM.taskOptionsModal.showModal();
};

function renderModalComments(todo) {
  DOM.modalCommentCount.textContent = (todo.comments || []).length;
  DOM.modalCommentList.innerHTML = (todo.comments || []).map(c => `
    <div class="flex gap-4 group">
      <img class="w-10 h-10 rounded-xl object-cover border border-slate-100 dark:border-slate-800" src="${getGravatar(c.owner_email)}" alt="">
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-black dark:text-white leading-none">${escapeHtml(c.owner_name)}</span>
            <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">${fmtDate(c.created_at)}</span>
          </div>
          ${(currentUser && (c.user_id === currentUser.id || currentUser.role === 'admin')) ? `
            <button onclick="deleteCommentFromModal(${todo.id}, ${c.id})" class="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
          ` : ''}
        </div>
        <div class="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">${escapeHtml(c.text)}</div>
      </div>
    </div>
  `).join('');
}

DOM.modalAddCommentBtn.onclick = async () => {
  const text = DOM.modalCommentInput.value.trim();
  if (!text || !editingTodoId) return;
  const res = await fetch(`/api/todos/${editingTodoId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  if (res.ok) {
    DOM.modalCommentInput.value = '';
    await fetchTodos();
    const t = todos.find(x => x.id === editingTodoId);
    renderModalComments(t);
  }
};

DOM.modalCommentInput.onkeydown = (e) => {
  if (e.key === 'Enter') DOM.modalAddCommentBtn.click();
};

window.deleteCommentFromModal = async (todoId, commentId) => {
  if (confirm("Delete this comment?")) {
    const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchTodos();
      const t = todos.find(x => x.id === todoId);
      renderModalComments(t);
    }
  }
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

window.formatDoc = (cmd) => document.execCommand(cmd, false, null);
window.addHyperlink = () => {
  const url = prompt("Enter the URL:");
  if (url) {
    document.execCommand('createLink', false, url);
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      let node = selection.anchorNode;
      if (node.nodeType === 3) node = node.parentNode;
      if (node.tagName === 'A') { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
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
    status: DOM.modalTaskStatus.value,
    labels: DOM.labelsInput.value.split(',').map(l => l.trim()).filter(Boolean),
    start_date: DOM.startDateInput.value,
    due_date: DOM.dueDateInput.value,
    color_flag: modalSelectedFlag,
    owner_ids: Array.from(selectedOwners),
    items: items
  };

  const url = editingTodoId ? `/api/todos/${editingTodoId}` : '/api/todos';
  const res = await fetch(url, {
    method: editingTodoId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) { DOM.taskOptionsModal.close(); fetchTodos(); }
};

// ── Filters & Rendering ───────────────────────────────────────────

function setDateDisplay() {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const today = new Date().toLocaleDateString(undefined, options);
  DOM.dateDisplay.textContent = `${today} • ${dateFilterRange.label}`;
}

function setDefaultFilterRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  dateFilterRange = { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: 'This Month' };
}

window.setDateRangeFilter = (type) => {
  const now = new Date();
  let start, end, label;
  switch (type) {
    case 'day': start = end = now.toISOString().split('T')[0]; label = 'Today'; break;
    case 'week':
      const first = now.getDate() - now.getDay();
      start = new Date(new Date().setDate(first)).toISOString().split('T')[0];
      end = new Date(new Date().setDate(first + 6)).toISOString().split('T')[0];
      label = 'This Week'; break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      label = 'This Month'; break;
    case 'all': start = end = null; label = 'All Time'; break;
    default: start = end = null; label = type; break;
  }
  dateFilterRange = { start, end, label };
  DOM.dateFilterModal.close();
  setDateDisplay();
  render();
};

DOM.applyDateFilterBtn.onclick = () => {
  dateFilterRange = { start: DOM.filterDateStart.value || null, end: DOM.filterDateEnd.value || null, label: 'Custom Range' };
  DOM.dateFilterModal.close();
  setDateDisplay();
  render();
};

DOM.clearDateFilterBtn.onclick = () => { DOM.filterDateStart.value = ''; DOM.filterDateEnd.value = ''; setDateRangeFilter('all'); };

DOM.clearFiltersBtn.onclick = () => {
  statusFilter = 'all';
  activeLabels.clear();
  activeColors.clear();
  globalSearchQuery = '';
  DOM.globalSearch.value = '';
  setDefaultFilterRange();
  DOM.filterBtns.forEach(b => b.dataset.active = (b.dataset.filter === 'all'));
  setDateDisplay();
  render();
  renderChips();
};

DOM.globalSearch.addEventListener('input', (e) => {
  globalSearchQuery = e.target.value.toLowerCase().trim();
  render();
});

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
    <label class="flex items-center gap-3 p-2.5 hover:bg-white dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
      <input type="checkbox" class="w-4 h-4 rounded text-primary-600 focus:ring-primary-600/20" value="${u.id}" ${selectedOwners.has(u.id) ? 'checked' : ''} onchange="toggleOwnerSelection(this)">
      <div class="flex items-center gap-2">
        <img class="w-6 h-6 rounded-lg" src="${getGravatar(u.email)}" alt="">
        <span class="text-xs font-black dark:text-slate-200">${escapeHtml(u.name)}</span>
      </div>
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
    if (activeLabels.size > 0 && (!t.labels || !t.labels.some(l => activeLabels.has(l)))) return false;
    if (activeColors.size > 0 && (!t.color_flag || !activeColors.has(t.color_flag))) return false;
    if (globalSearchQuery && !t.text.toLowerCase().includes(globalSearchQuery)) return false;
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

  // Column Visibility
  DOM.todoColumnWrapper.classList.toggle('hidden', statusFilter === 'completed');
  DOM.inProgressColumnWrapper.classList.toggle('hidden', statusFilter === 'completed');
  DOM.doneColumnWrapper.classList.toggle('hidden', statusFilter === 'active' || statusFilter === 'past_due');

  DOM.todoColumn.innerHTML = '';
  DOM.inProgressColumn.innerHTML = '';
  DOM.doneColumn.innerHTML = '';
  DOM.emptyState.classList.toggle('hidden', filtered.length > 0);

  let cTodo = 0, cProg = 0, cDone = 0;

  filtered.forEach(t => {
    const editable = canEdit(t);
    const isOverdue = t.due_date && !(t.status === 'done' || t.completed) && new Date(t.due_date) < now;
    const isDone = (t.status === 'done' || t.completed);
    const totalHours = (t.items || []).reduce((acc, curr) => acc + curr.hours, 0);
    const cardStatus = t.status || (t.completed ? 'done' : 'todo');

    const card = document.createElement('div');
    card.className = `todo-card group bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-soft hover:shadow-hard transition-all animate-[modalEnter_0.3s_ease-out] relative ${isDone ? 'opacity-70' : ''}`;
    card.dataset.id = t.id;
    card.innerHTML = `
      <div class="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
        ${t.deleted ? `
          <button onclick="undeleteTodo(${t.id})" class="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-green-500 rounded-xl shadow-sm transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="23 4 23 10 19 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg></button>
          <button onclick="permanentlyDeleteTodo(${t.id})" class="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-xl shadow-sm transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        ` : (editable ? `
          <button onclick="startEdit(${t.id})" class="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary-600 rounded-xl shadow-sm transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
          <button onclick="deleteTodo(${t.id})" class="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-xl shadow-sm transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        ` : '')}
      </div>
      
      <div class="flex items-center gap-2 mb-3">
        ${t.color_flag ? `<span class="px-2 py-0.5 bg-flag-${t.color_flag} text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-sm shadow-flag-${t.color_flag}/30">${t.color_flag}</span>` : ''}
        <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">ID #${t.id}</span>
      </div>

      <h4 class="text-sm font-black dark:text-white leading-tight mb-4 cursor-pointer hover:text-primary-600 transition-colors ${isDone ? 'line-through text-slate-400' : ''}" onclick="${editable && !t.deleted ? `startEdit(${t.id})` : ''}">${escapeHtml(t.text)}</h4>
      
      <div class="flex flex-wrap gap-1.5 mb-5">
        ${(t.labels || []).map(l => `<span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-500 dark:text-slate-400">#${escapeHtml(l)}</span>`).join('')}
      </div>

      <div class="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 pt-4 mt-2">
        <div class="flex items-center -space-x-2">
          ${(t.owners || []).map(o => `<img class="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 shadow-sm" src="${getGravatar(o.email, 56)}" title="${escapeHtml(o.name)}">`).join('')}
        </div>
        <div class="flex items-center gap-3">
          ${t.comments.length ? `<div class="flex items-center gap-1 text-[10px] font-black text-slate-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>${t.comments.length}</div>` : ''}
          <div class="text-[9px] font-black ${isOverdue ? 'text-red-500' : 'text-slate-400'} uppercase tracking-tighter">${fmtShortDate(t.due_date)}</div>
        </div>
      </div>
    `;

    if (cardStatus === 'done') { DOM.doneColumn.appendChild(card); cDone++; }
    else if (cardStatus === 'in_progress') { DOM.inProgressColumn.appendChild(card); cProg++; }
    else { DOM.todoColumn.appendChild(card); cTodo++; }
  });

  DOM.todoCount.textContent = cTodo;
  DOM.inProgressCount.textContent = cProg;
  DOM.doneCount.textContent = cDone;
  updateStats();
  renderActivityFeed();
}

function updateStats() {
  const now = new Date().setHours(0, 0, 0, 0);
  const counts = { all: 0, active: 0, completed: 0, past_due: 0, deleted: 0, total_comm: 0 };
  todos.forEach(t => {
    counts.total_comm += (t.comments || []).length;
    if (t.deleted) counts.deleted++;
    else {
      counts.all++;
      if (t.completed || t.status === 'done') counts.completed++;
      else {
        counts.active++;
        if (t.due_date && new Date(t.due_date).getTime() < now) counts.past_due++;
      }
    }
  });
  DOM.allCount.textContent = counts.all;
  DOM.activeCount.textContent = counts.active;
  DOM.completedCount.textContent = counts.completed;
  DOM.pastDueCount.textContent = counts.past_due;
  DOM.deletedCount.textContent = counts.deleted;
  DOM.notifBadge.textContent = counts.total_comm;
  DOM.sidebarStats.innerHTML = `Tracked: <b>${counts.all}</b> • Engagement: <b>${counts.total_comm}</b> comms`;
}

function renderActivityFeed() {
  const allC = [];
  todos.forEach(t => (t.comments || []).forEach(c => allC.push({ ...c, todoText: t.text, todoId: t.id })));
  allC.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latest = allC.slice(0, 15);
  DOM.activityFeed.innerHTML = latest.length ? latest.map(c => `
    <div class="flex gap-4 group cursor-pointer" onclick="scrollToTodo(${c.todoId})">
      <img class="w-10 h-10 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800" src="${getGravatar(c.owner_email || '', 64)}">
      <div class="flex-1 min-w-0">
        <div class="text-[11px] leading-tight mb-1">
          <span class="font-black text-slate-900 dark:text-white">${escapeHtml(c.owner_name)}</span>
          <span class="text-slate-400 font-medium ml-1">commented on</span>
        </div>
        <div class="text-[10px] font-black text-primary-600 truncate mb-1.5 uppercase tracking-tighter">"${escapeHtml(c.todoText)}"</div>
        <div class="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed border border-slate-100 dark:border-slate-800 group-hover:border-primary-600/20 transition-all">${escapeHtml(c.text)}</div>
        <div class="mt-1.5 text-[8px] font-black text-slate-300 uppercase tracking-widest">${fmtDate(c.created_at)}</div>
      </div>
    </div>
  `).join('') : '<div class="text-xs text-slate-400 italic text-center mt-10">No recent activity</div>';
}

function scrollToTodo(id) {
  const el = document.querySelector(`.todo-card[data-id="${id}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-4', 'ring-primary-600/30');
    setTimeout(() => el.classList.remove('ring-4', 'ring-primary-600/30'), 2000);
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function escapeHtml(s) { const d = document.createElement('div'); d.innerText = s || ''; return d.innerHTML; }
function fmtDate(iso) {
  const d = new Date(iso), n = new Date();
  if (n.toDateString() === d.toDateString()) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function fmtShortDate(iso) { return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Due Date'; }

window.toggleTodo = async (id, cb) => {
  const status = cb.checked ? 'done' : 'todo';
  const res = await fetch(`/api/todos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  if (res.ok) fetchTodos();
};

window.deleteTodo = async (id) => { if (confirm("Move this task to trash?")) { await fetch(`/api/todos/${id}`, { method: 'DELETE' }); fetchTodos(); } };
window.undeleteTodo = async (id) => { await fetch(`/api/todos/${id}/undelete`, { method: 'POST' }); fetchTodos(); };
window.permanentlyDeleteTodo = async (id) => { if (confirm("Permanently delete this task? This cannot be undone.")) { await fetch(`/api/todos/${id}/permanent`, { method: 'DELETE' }); fetchTodos(); } };

DOM.purgeAllBtn.onclick = async () => { if (confirm("Permanently empty the trash?")) { await fetch('/api/todos/purge', { method: 'DELETE' }); fetchTodos(); } };
DOM.clearCompletedBtnMain.onclick = async () => {
  if (confirm("Move all completed tasks to trash?")) {
    for (const t of todos.filter(x => (x.status === 'done' || x.completed) && !x.deleted)) if (canEdit(t)) await fetch(`/api/todos/${t.id}`, { method: 'DELETE' });
    fetchTodos();
  }
};

DOM.filterBtns.forEach(btn => {
  btn.onclick = () => {
    DOM.filterBtns.forEach(b => b.dataset.active = "false");
    btn.dataset.active = "true";
    statusFilter = btn.dataset.filter;
    DOM.viewTitle.textContent = btn.innerText.split('\n')[0];
    render();
  };
});

function renderChips() {
  const labels = new Set();
  todos.forEach(t => (t.labels || []).forEach(l => labels.add(l)));
  DOM.chipBar.innerHTML = Array.from(labels).sort().map(lbl => {
    const act = activeLabels.has(lbl);
    return `<button onclick="toggleLabel('${lbl}')" class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border-2 ${act ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-primary-600 hover:text-primary-600'}">${escapeHtml(lbl)}</button>`;
  }).join('');

  const colors = ['red', 'orange', 'yellow', 'green', 'blue'];
  DOM.temperatureFlags.innerHTML = colors.map(clr => {
    const act = activeColors.has(clr);
    return `<button onclick="toggleColorFilter('${clr}')" class="w-6 h-6 rounded-xl bg-flag-${clr} border-2 ${act ? 'border-primary-600 scale-110 shadow-lg' : 'border-transparent hover:border-slate-300'} shadow-sm shadow-flag-${clr}/20 transition-all"></button>`;
  }).join('');
}

window.toggleLabel = (l) => { activeLabels.has(l) ? activeLabels.delete(l) : activeLabels.add(l); renderChips(); render(); };
window.toggleColorFilter = (c) => { activeColors.has(c) ? activeColors.delete(c) : activeColors.add(c); renderChips(); render(); };

DOM.notifBtn.onclick = () => {
  if (window.innerWidth < 1024) {
    DOM.activitySidebar.classList.toggle('sidebar-open');
    DOM.activitySidebar.classList.remove('hidden'); // Ensure it's not display:none when open on mobile
    DOM.sidebarOverlay.classList.toggle('show');
    DOM.leftSidebar.classList.remove('sidebar-open');
  } else {
    DOM.activitySidebar.classList.toggle('hidden');
  }
};

DOM.searchToggleBtn.onclick = () => {
  DOM.mobileSearchInput.value = globalSearchQuery;
  DOM.searchModal.showModal();
  setTimeout(() => DOM.mobileSearchInput.focus(), 100);
};

DOM.mobileSearchInput.addEventListener('input', (e) => {
  globalSearchQuery = e.target.value.toLowerCase().trim();
  if (DOM.globalSearch) DOM.globalSearch.value = globalSearchQuery;
  render();
});

DOM.sidebarToggleBtn.onclick = () => {
  DOM.leftSidebar.classList.toggle('sidebar-open');
  DOM.sidebarOverlay.classList.toggle('show');
  DOM.activitySidebar.classList.remove('sidebar-open');
};

DOM.sidebarOverlay.onclick = () => {
  DOM.leftSidebar.classList.remove('sidebar-open');
  DOM.activitySidebar.classList.remove('sidebar-open');
  DOM.sidebarOverlay.classList.remove('show');
};

init();
