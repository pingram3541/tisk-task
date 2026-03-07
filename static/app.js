/**
 * app.js - Enhanced Frontend Logic with Auth & Permissions
 */

let currentUser = null;
let todos = [];
let allUsers = [];
let selectedOwners = new Set();

let statusFilter = 'all'; // all | active | completed
let activeLabels = new Set();
let activeColors = new Set();

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

  sysTitle: document.getElementById('currentUserDisplay'),
  logoutBtn: document.getElementById('logoutBtn'),
  adminToggleBtn: document.getElementById('adminToggleBtn'),
  adminPanel: document.getElementById('adminPanel'),

  todoInput: document.getElementById('todoInput'),
  labelsInput: document.getElementById('labelsInput'),
  addBtn: document.getElementById('addBtn'),
  ownerPickerBtn: document.getElementById('ownerPickerBtn'),
  ownerDropdown: document.getElementById('ownerDropdown'),
  flagDots: document.querySelectorAll('.flag-dot'),
  chipBar: document.getElementById('chipBar'),
  filterBtns: document.querySelectorAll('.filter-btn'),
  todoList: document.getElementById('todoList'),
  emptyState: document.getElementById('emptyState'),
  itemCount: document.getElementById('itemCount'),
  clearCompletedBtn: document.getElementById('clearCompletedBtn'),
  dateDisplay: document.getElementById('dateDisplay'),

  adminUserList: document.getElementById('adminUserList'),
  adminAddUserBtn: document.getElementById('adminAddUserBtn'),
  adminMsg: document.getElementById('adminMsg')
};

let currentFlag = '';

// ── Initialization & Auth ──────────────────────────────────────────

async function init() {
  setDateDisplay();
  const res = await fetch('/api/auth/me');
  const user = await res.json();

  if (user) {
    currentUser = user;
    DOM.sysTitle.textContent = user.name;
    showApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  DOM.loginView.style.display = 'block';
  DOM.appView.style.display = 'none';
  DOM.emailStep.style.display = 'block';
  DOM.otpStep.style.display = 'none';
}

async function showApp() {
  DOM.loginView.style.display = 'none';
  DOM.appView.style.display = 'block';

  if (currentUser.role === 'admin') {
    DOM.adminToggleBtn.style.display = 'inline-block';
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
  try {
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST', body: JSON.stringify({ email })
    });
    if (res.ok) {
      DOM.emailStep.style.display = 'none';
      DOM.otpStep.style.display = 'block';
      DOM.displayLoginEmail.textContent = email;
      DOM.loginOtp.value = '';
      DOM.loginOtp.focus();
    } else {
      const e = await res.json();
      DOM.loginMsg.textContent = e.error || 'Failed to send code';
    }
  } finally {
    DOM.requestOtpBtn.disabled = false;
  }
};

DOM.verifyOtpBtn.onclick = async () => {
  const email = DOM.loginEmail.value.trim();
  const code = DOM.loginOtp.value.trim();
  if (!code || code.length !== 6) return (DOM.otpMsg.textContent = 'Enter 6-digit code');

  DOM.verifyOtpBtn.disabled = true;
  DOM.otpMsg.textContent = 'Verifying...';
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST', body: JSON.stringify({ email, code })
    });
    if (res.ok) {
      currentUser = await res.json();
      DOM.sysTitle.textContent = currentUser.name;
      DOM.otpMsg.textContent = '';
      showApp();
    } else {
      const e = await res.json();
      DOM.otpMsg.textContent = e.error || 'Invalid code';
    }
  } finally {
    DOM.verifyOtpBtn.disabled = false;
  }
};

DOM.backToEmailBtn.onclick = () => {
  DOM.emailStep.style.display = 'block';
  DOM.otpStep.style.display = 'none';
  DOM.otpMsg.textContent = '';
};

DOM.logoutBtn.onclick = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  todos = [];
  allUsers = [];
  selectedOwners.clear();
  showLogin();
};


// ── Admin Panel ────────────────────────────────────────────────────

DOM.adminToggleBtn.onclick = () => {
  DOM.adminPanel.style.display = DOM.adminPanel.style.display === 'none' ? 'block' : 'none';
};

async function setupAdminPanel() {
  await fetchAdminUsers();

  DOM.adminAddUserBtn.onclick = async () => {
    const name = document.getElementById('adminNewName').value.trim();
    const email = document.getElementById('adminNewEmail').value.trim();
    const role = document.getElementById('adminNewRole').value;
    const permission = document.getElementById('adminNewPerm').value;

    if (!name || !email) return (DOM.adminMsg.textContent = 'Name and email required');

    const res = await fetch('/api/admin/users', {
      method: 'POST', body: JSON.stringify({ name, email, role, permission })
    });
    if (res.ok) {
      document.getElementById('adminNewName').value = '';
      document.getElementById('adminNewEmail').value = '';
      DOM.adminMsg.textContent = 'User added!';
      DOM.adminMsg.className = 'form-msg success mt-2';
      await fetchAdminUsers();
      await fetchUsers(); // update dropdown
    } else {
      const e = await res.json();
      DOM.adminMsg.textContent = e.error || 'Failed';
      DOM.adminMsg.className = 'form-msg mt-2';
    }
  };
}

async function fetchAdminUsers() {
  const res = await fetch('/api/admin/users');
  if (!res.ok) return;
  const users = await res.json();

  DOM.adminUserList.innerHTML = users.map(u => `
    <tr>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>
        <select class="admin-role-sel" data-id="${u.id}">
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>
        <select class="admin-perm-sel" data-id="${u.id}">
          <option value="own" ${u.permission === 'own' ? 'selected' : ''}>Own</option>
          <option value="all" ${u.permission === 'all' ? 'selected' : ''}>All</option>
          <option value="custom" ${u.permission === 'custom' ? 'selected' : ''}>Custom</option>
        </select>
      </td>
      <td>
        <button class="action-btn delete" onclick="deleteUser(${u.id})" ${u.email.includes('support') ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.admin-role-sel, .admin-perm-sel').forEach(sel => {
    sel.onchange = async (e) => {
      const id = e.target.dataset.id;
      const tr = e.target.closest('tr');
      const role = tr.querySelector('.admin-role-sel').value;
      const permission = tr.querySelector('.admin-perm-sel').value;
      await fetch(`/api/admin/users/${id}`, {
        method: 'PUT', body: JSON.stringify({ role, permission })
      });
      fetchAdminUsers();
    };
  });
}

window.deleteUser = async (id) => {
  if (!confirm("Remove user?")) return;
  await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
  await fetchAdminUsers();
  await fetchUsers(); // update dropdowns
};


// ── Utilities & Data Fetching ──────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}

function fmtDate(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function setDateDisplay() {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  DOM.dateDisplay.textContent = new Date().toLocaleDateString(undefined, options);
}

async function fetchUsers() {
  const res = await fetch('/api/users');
  if (res.ok) {
    allUsers = await res.json();
    renderOwnerDropdown();
  }
}

async function fetchTodos() {
  const res = await fetch('/api/todos');
  if (res.ok) {
    todos = await res.json();
    render();
    renderChips();
  }
}

// ── Multi-owner Picker ─────────────────────────────────────────────

function renderOwnerDropdown() {
  // Always include yourself if no one else selected by default
  if (selectedOwners.size === 0 && currentUser) selectedOwners.add(currentUser.id);

  DOM.ownerDropdown.innerHTML = allUsers.map(u => `
    <label class="dropdown-item" onclick="event.stopPropagation()">
      <input type="checkbox" value="${u.id}" ${selectedOwners.has(u.id) ? 'checked' : ''} onchange="toggleOwnerSelection(this)">
      ${escapeHtml(u.name)}
    </label>
  `).join('');
  updateOwnerPickerLabel();
}

window.toggleOwnerSelection = (checkbox) => {
  const id = parseInt(checkbox.value, 10);
  if (checkbox.checked) selectedOwners.add(id);
  else selectedOwners.delete(id);
  updateOwnerPickerLabel();
};

function updateOwnerPickerLabel() {
  if (selectedOwners.size === 0) {
    DOM.ownerPickerBtn.textContent = 'Assign Owners...';
  } else if (selectedOwners.size === 1) {
    const uid = Array.from(selectedOwners)[0];
    const user = allUsers.find(u => u.id === uid);
    DOM.ownerPickerBtn.textContent = user ? user.name : '1 selected';
  } else {
    DOM.ownerPickerBtn.textContent = `${selectedOwners.size} selected`;
  }
}

DOM.ownerPickerBtn.onclick = (e) => {
  e.stopPropagation();
  DOM.ownerPickerBtn.parentElement.classList.toggle('open');
};
document.addEventListener('click', () => {
  document.querySelector('.dropdown-wrapper').classList.remove('open');
});


// ── Todo Rendering & State ─────────────────────────────────────────

function canEdit(todo) {
  if (currentUser.role === 'admin' || currentUser.permission === 'all') return true;
  // If user is in the owners list
  return todo.owners.some(o => o.id === currentUser.id);
}

function render() {
  const filtered = todos.filter(t => {
    if (statusFilter === 'active' && t.completed) return false;
    if (statusFilter === 'completed' && !t.completed) return false;

    if (activeLabels.size > 0) {
      if (!t.labels || !t.labels.some(l => activeLabels.has(l))) return false;
    }
    if (activeColors.size > 0) {
      if (!t.color_flag || !activeColors.has(t.color_flag)) return false;
    }
    return true;
  });

  DOM.todoList.innerHTML = '';

  if (filtered.length === 0) {
    DOM.emptyState.classList.add('visible');
  } else {
    DOM.emptyState.classList.remove('visible');

    filtered.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item glass-card ${todo.completed ? 'completed' : ''}`;
      li.id = `todo-${todo.id}`;

      const editable = canEdit(todo);

      // Meta row: owners & comment count
      const ownerChips = todo.owners.map(o => `<span class="owner-badge">${escapeHtml(o.name)}</span>`).join('');
      let commentInd = '';
      if (todo.comments && todo.comments.length > 0) {
        commentInd = `
          <span class="comment-badge-inline" title="${todo.comments.length} comments">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg> ${todo.comments.length}
          </span>
        `;
      }

      const labelsHtml = (todo.labels || []).map(l => `<span class="label-pill">${escapeHtml(l)}</span>`).join('');
      const flagStyle = todo.color_flag ? `background: var(--flag-${todo.color_flag});` : 'display:none;';

      li.innerHTML = `
        <div class="flag-stripe" style="${flagStyle}"></div>
        <div class="todo-top">
          <label class="todo-checkbox">
            <input type="checkbox" ${todo.completed ? 'checked' : ''} ${!editable ? 'disabled' : ''} onchange="toggleTodo(${todo.id}, this)">
            <span class="checkmark"></span>
          </label>
          <div class="todo-content">
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <div class="todo-meta">
              <span>${fmtDate(todo.created_at)}</span>
              ${ownerChips}
              ${commentInd}
            </div>
            ${labelsHtml ? `<div class="todo-labels">${labelsHtml}</div>` : ''}
            
            <div class="comments-section" id="comments-${todo.id}">
              <div id="comment-list-${todo.id}"></div>
              <div class="add-comment-row mt-2">
                <input type="text" id="comment-input-${todo.id}" placeholder="Write a comment..." onkeydown="if(event.key==='Enter') addComment(${todo.id})">
                <button class="add-comment-btn" onclick="addComment(${todo.id})">Send</button>
              </div>
            </div>
          </div>
          
          <div class="todo-actions">
            <button class="action-btn" title="Toggle Comments" onclick="toggleComments(${todo.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </button>
            ${editable ? `
            <button class="action-btn edit" title="Edit" onclick="startEdit(${todo.id})">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button class="action-btn delete" title="Delete" onclick="deleteTodo(${todo.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>` : ''}
          </div>
        </div>
      `;
      DOM.todoList.appendChild(li);
      renderComments(todo.id);
    });
  }

  const activeCount = todos.filter(t => !t.completed).length;
  DOM.itemCount.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
}

function toggleComments(todoId) {
  const el = document.getElementById(`comments-${todoId}`);
  el.classList.toggle('open');
}

// ── Todo Actions ───────────────────────────────────────────────────

DOM.addBtn.onclick = async () => {
  const text = DOM.todoInput.value.trim();
  if (!text) return;

  const rawLabels = DOM.labelsInput.value.split(',').map(l => l.trim()).filter(Boolean);

  const payload = {
    text,
    color_flag: currentFlag,
    labels: rawLabels,
    owner_ids: Array.from(selectedOwners)
  };

  const res = await fetch('/api/todos', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    const newTodo = await res.json();
    todos.unshift(newTodo);
    DOM.todoInput.value = '';
    DOM.labelsInput.value = '';
    currentFlag = '';
    updateFlagsUI();
    render();
    renderChips();

    // reset selection to only self
    selectedOwners.clear();
    if (currentUser) selectedOwners.add(currentUser.id);
    updateOwnerPickerLabel();
    renderOwnerDropdown();
  }
};

DOM.todoInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') DOM.addBtn.click();
});

window.toggleTodo = async (id, cb) => {
  const todo = todos.find(t => t.id === id);
  const res = await fetch(`/api/todos/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ completed: cb.checked ? 1 : 0 })
  });
  if (res.ok) {
    Object.assign(todo, await res.json());
    render();
  } else {
    cb.checked = !cb.checked; // revert UI
  }
};

window.deleteTodo = async (id) => {
  const li = document.getElementById(`todo-${id}`);
  li.classList.add('removing');
  await new Promise(r => setTimeout(r, 250)); // animation wait

  const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
  if (res.ok) {
    todos = todos.filter(t => t.id !== id);
    render();
    renderChips();
  } else {
    li.classList.remove('removing');
  }
};

window.startEdit = (id) => {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  const li = document.getElementById(`todo-${id}`);
  const textEl = li.querySelector('.todo-text');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'todo-edit-input';
  input.value = todo.text;

  textEl.replaceWith(input);
  input.focus();

  input.onblur = () => finishEdit(id, input.value, todo);
  input.onkeydown = (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = todo.text; input.blur(); }
  };
};

async function finishEdit(id, newText, todo) {
  newText = newText.trim();
  if (newText && newText !== todo.text) {
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ text: newText })
    });
    if (res.ok) Object.assign(todo, await res.json());
  }
  render();
}

DOM.clearCompletedBtn.onclick = async () => {
  const completed = todos.filter(t => t.completed);
  for (const t of completed) {
    // Check permission - skip if cannot edit
    if (!canEdit(t)) continue;
    await fetch(`/api/todos/${t.id}`, { method: 'DELETE' });
  }
  todos = todos.filter(t => !t.completed || !canEdit(t));
  render();
};


// ── Comments ───────────────────────────────────────────────────────

window.renderComments = (todoId) => {
  const container = document.getElementById(`comment-list-${todoId}`);
  if (!container) return;
  const todo = todos.find(t => t.id === todoId);
  if (!todo || !todo.comments) { container.innerHTML = ''; return; }

  container.innerHTML = todo.comments.map(c => {
    const myComment = (currentUser && c.user_id === currentUser.id);
    const canManageComment = myComment || (currentUser && currentUser.role === 'admin');

    return `
    <div class="comment-card" id="comment-${c.id}">
      <div class="comment-header">
        <span class="comment-owner">${escapeHtml(c.owner_name)}</span>
        <span>•</span>
        <span>${fmtDate(c.created_at)}</span>
      </div>
      <div class="comment-body" id="cb-${c.id}">${escapeHtml(c.text)}</div>
      
      ${canManageComment ? `
      <div class="comment-actions">
        <button class="comment-action-btn edit" onclick="startEditComment(${todo.id}, ${c.id})">✎</button>
        <button class="comment-action-btn del" onclick="deleteComment(${todo.id}, ${c.id})">×</button>
      </div>` : ''}
    </div>
  `}).join('');
};

window.addComment = async (todoId) => {
  const input = document.getElementById(`comment-input-${todoId}`);
  const text = input.value.trim();
  if (!text) return;

  const res = await fetch(`/api/todos/${todoId}/comments`, {
    method: 'POST', body: JSON.stringify({ text })
  });
  if (res.ok) {
    const newComm = await res.json();
    const todo = todos.find(t => t.id === todoId);
    todo.comments = todo.comments || [];
    todo.comments.push(newComm);
    input.value = '';

    // We do a full re-render so the comment badge count outside the section updates too
    render();
    document.getElementById(`comments-${todoId}`).classList.add('open');
  }
};

window.deleteComment = async (todoId, commentId) => {
  const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
  if (res.ok) {
    const todo = todos.find(t => t.id === todoId);
    todo.comments = todo.comments.filter(c => c.id !== commentId);
    render();
    document.getElementById(`comments-${todoId}`).classList.add('open');
  }
};

window.startEditComment = (todoId, commentId) => {
  const todo = todos.find(t => t.id === todoId);
  const comment = todo.comments.find(c => c.id === commentId);
  const bodyEl = document.getElementById(`cb-${commentId}`);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'comment-edit-input';
  input.value = comment.text;

  bodyEl.replaceWith(input);
  input.focus();

  input.onblur = () => attemptEditComment(todoId, comment, input.value);
  input.onkeydown = (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = comment.text; input.blur(); }
  };
};

async function attemptEditComment(todoId, comment, newText) {
  newText = newText.trim();
  if (newText && newText !== comment.text) {
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: 'PUT', body: JSON.stringify({ text: newText })
    });
    if (res.ok) {
      const updated = await res.json();
      Object.assign(comment, updated);
    }
  }
  render();
  document.getElementById(`comments-${todoId}`).classList.add('open');
}


// ── Filter & Chips ─────────────────────────────────────────────────

DOM.filterBtns.forEach(btn => {
  btn.onclick = () => {
    DOM.filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    statusFilter = btn.dataset.filter;
    render();
  };
});

function renderChips() {
  const allLabels = new Set();
  const allColors = new Set();

  todos.forEach(t => {
    if (t.labels) t.labels.forEach(l => allLabels.add(l));
    if (t.color_flag) allColors.add(t.color_flag);
  });

  DOM.chipBar.innerHTML = '';

  Array.from(allLabels).sort().forEach(lbl => {
    const btn = document.createElement('button');
    btn.className = `chip ${activeLabels.has(lbl) ? 'active' : ''}`;
    btn.textContent = lbl;
    btn.onclick = () => {
      activeLabels.has(lbl) ? activeLabels.delete(lbl) : activeLabels.add(lbl);
      renderChips();
      render();
    };
    DOM.chipBar.appendChild(btn);
  });

  Array.from(allColors).sort().forEach(clr => {
    const btn = document.createElement('button');
    btn.className = `chip ${activeColors.has(clr) ? 'active' : ''}`;
    btn.innerHTML = `<span class="chip-dot" style="background: var(--flag-${clr})"></span> Flag`;
    btn.onclick = () => {
      activeColors.has(clr) ? activeColors.delete(clr) : activeColors.add(clr);
      renderChips();
      render();
    };
    DOM.chipBar.appendChild(btn);
  });
}


// Flag Picker UI
function updateFlagsUI() {
  DOM.flagDots.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === currentFlag);
  });
}
DOM.flagDots.forEach(btn => {
  btn.onclick = () => {
    currentFlag = currentFlag === btn.dataset.color ? '' : btn.dataset.color;
    updateFlagsUI();
  };
});

// Run Init
init();
