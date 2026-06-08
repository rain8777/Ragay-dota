/* ═══════════════════════════════════════════════════════════════
   RAGAY DOTA HUB — Auth & Admin JS
   Roles:
     superadmin         — Full access, manages admins & settings
     tournament_organizer — Create/edit tournaments & brackets
     team_builder         — Create/edit teams & rosters
     moderator            — Manage players & teams (read/edit, no delete)
═══════════════════════════════════════════════════════════════ */

/* ── AUTH STATE ─────────────────────────────────────────────── */
const Auth = {
  currentUser: null,   // { id, username, displayName, role, permissions[] }
  SESSION_KEY: 'rdh_session',
};

/* ── ROLE PERMISSIONS MAP ────────────────────────────────────── */
const ROLE_PERMS = {
  superadmin:            ['manage_players','manage_teams','manage_tournaments','manage_brackets','view_contacts','delete_records','manage_admins','site_settings'],
  tournament_organizer:  ['manage_tournaments','manage_brackets','view_contacts'],
  team_builder:          ['manage_teams','manage_brackets'],
  moderator:             ['manage_players','manage_teams'],
};

/* ── ROLE DISPLAY NAMES ──────────────────────────────────────── */
const ROLE_LABELS = {
  superadmin:           'Super Admin',
  tournament_organizer: 'Tourney Org.',
  team_builder:         'Team Builder',
  moderator:            'Moderator',
};

/* ─────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  restoreSession();
  initAdminPanel();
  initTournamentModal();
  initAddAdminModal();
  initSettingsPanel();
});

/* ─────────────────────────────────────────────────────────────
   AUTH UI WIRING
───────────────────────────────────────────────────────────── */
function initAuthUI() {
  // Login modal open/close
  document.getElementById('navLoginBtn')?.addEventListener('click', () => openAuthModal('loginModalOverlay'));
  document.getElementById('closeLoginModal')?.addEventListener('click', () => closeAuthModal('loginModalOverlay'));

  // Login form submit
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);

  // Password visibility toggle
  document.getElementById('toggleLoginPw')?.addEventListener('click', () => togglePwVisibility('loginPassword', 'toggleLoginPw'));
  document.getElementById('toggleAdminPw')?.addEventListener('click', () => togglePwVisibility('adminPassword', 'toggleAdminPw'));

  // User pill dropdown
  document.getElementById('navUserPill')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('navUserDropdown')?.classList.toggle('open');
  });
  document.addEventListener('click', () => document.getElementById('navUserDropdown')?.classList.remove('open'));

  // Logout
  document.getElementById('navLogoutBtn')?.addEventListener('click', handleLogout);

  // Go to admin panel
  document.getElementById('goAdminPanel')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('navUserDropdown')?.classList.remove('open');
    showAdminPanel();
  });

  // Close on overlay click
  document.querySelectorAll('#loginModalOverlay, #addAdminModalOverlay, #createTournamentModalOverlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) closeAuthModal(o.id); })
  );
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') ['loginModalOverlay','addAdminModalOverlay','createTournamentModalOverlay'].forEach(id => closeAuthModal(id));
  });
}

function openAuthModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAuthModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}

function togglePwVisibility(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  if (btn) btn.querySelector('i').className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
}

/* ─────────────────────────────────────────────────────────────
   LOGIN
───────────────────────────────────────────────────────────── */
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errBox   = document.getElementById('loginError');
  const errMsg   = document.getElementById('loginErrorMsg');
  const btn      = document.getElementById('loginSubmitBtn');

  errBox?.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';

  try {
    const result = await apiPost('adminLogin', { username, password });

    if (result.error || !result.user) {
      showLoginError(result.error || 'Invalid username or password.');
    } else {
      loginSuccess(result.user);
    }
  } catch (err) {
    // Offline / dev fallback — check hardcoded credentials
    const devUser = devCheckCredentials(username, password);
    if (devUser) {
      loginSuccess(devUser);
    } else {
      showLoginError('Invalid username or password.');
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
  }
}

function showLoginError(msg) {
  const errBox = document.getElementById('loginError');
  const errMsg = document.getElementById('loginErrorMsg');
  if (errMsg) errMsg.textContent = msg;
  errBox?.classList.remove('hidden');
}

function loginSuccess(user) {
  // Merge role-default permissions with any custom permissions
  const rolePerms  = ROLE_PERMS[user.role] || [];
  const extraPerms = user.permissions || [];
  user.permissions = [...new Set([...rolePerms, ...extraPerms])];

  Auth.currentUser = user;
  saveSession(user);
  closeAuthModal('loginModalOverlay');
  document.getElementById('loginForm')?.reset();
  document.getElementById('loginError')?.classList.add('hidden');

  updateNavForAuth();
  showAdminPanel();
  showToast(`Welcome back, ${user.displayName}! 👋`, 'success');
  logAdminAction('login', `${user.displayName} logged in`);
}

function handleLogout() {
  Auth.currentUser = null;
  clearSession();
  updateNavForAuth();
  hideAdminPanel();
  showToast('Logged out successfully.', 'info');
}

/* ─────────────────────────────────────────────────────────────
   SESSION (localStorage)
───────────────────────────────────────────────────────────── */
function saveSession(user) {
  try { localStorage.setItem(Auth.SESSION_KEY, JSON.stringify(user)); } catch (e) {}
}
function clearSession() {
  try { localStorage.removeItem(Auth.SESSION_KEY); } catch (e) {}
}
function restoreSession() {
  try {
    const raw = localStorage.getItem(Auth.SESSION_KEY);
    if (!raw) return;
    const user = JSON.parse(raw);
    if (user && user.username) {
      // Re-apply role perms in case they changed
      const rolePerms  = ROLE_PERMS[user.role] || [];
      const extraPerms = user.permissions || [];
      user.permissions = [...new Set([...rolePerms, ...extraPerms])];
      Auth.currentUser = user;
      updateNavForAuth();
      // Don't auto-show panel on page load — user decides to navigate
    }
  } catch (e) {}
}

/* ─────────────────────────────────────────────────────────────
   NAVBAR UPDATE
───────────────────────────────────────────────────────────── */
function updateNavForAuth() {
  const user        = Auth.currentUser;
  const loginBtn    = document.getElementById('navLoginBtn');
  const navUserWrap = document.getElementById('navUser');
  const nameEl      = document.getElementById('navUserName');
  const roleEl      = document.getElementById('navUserRole');
  const avatarEl    = document.getElementById('navUserAvatar');

  if (user) {
    loginBtn?.classList.add('hidden');
    navUserWrap?.classList.remove('hidden');
    if (nameEl) nameEl.textContent = user.displayName || user.username;
    if (roleEl) {
      roleEl.textContent  = ROLE_LABELS[user.role] || user.role;
      roleEl.className    = `nav-user-role role-${user.role === 'superadmin' ? 'superadmin' : user.role === 'tournament_organizer' ? 'organizer' : user.role === 'team_builder' ? 'teambuilder' : 'moderator'}`;
    }
    if (avatarEl) {
      avatarEl.textContent  = (user.displayName || user.username).slice(0, 2).toUpperCase();
      avatarEl.className    = 'nav-user-avatar';
    }
  } else {
    loginBtn?.classList.remove('hidden');
    navUserWrap?.classList.add('hidden');
  }
}

/* ─────────────────────────────────────────────────────────────
   ADMIN PANEL SHOW/HIDE
───────────────────────────────────────────────────────────── */
function showAdminPanel() {
  const panel = document.getElementById('adminPanel');
  if (!panel) return;
  panel.classList.remove('hidden');

  // Superadmin-only elements
  const isSA = Auth.currentUser?.role === 'superadmin';
  document.querySelectorAll('.superadmin-only').forEach(el => {
    el.classList.toggle('hidden', !isSA);
  });

  // Role label
  const roleLabel = document.getElementById('adminPanelRoleLabel');
  if (roleLabel) roleLabel.textContent = ROLE_LABELS[Auth.currentUser?.role] || 'Admin';

  refreshAdminPanels();
  switchTab('admin');
}

function hideAdminPanel() {
  document.getElementById('adminPanel')?.classList.add('hidden');
}

/* ─────────────────────────────────────────────────────────────
   ADMIN PANEL TABS
───────────────────────────────────────────────────────────── */
function initAdminPanel() {
  document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!Auth.currentUser) return;
      document.querySelectorAll('.admin-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.admintab;
      document.getElementById(`adminPanel${cap(tab)}`)?.classList.add('active');

      if (tab === 'managePlayers')     refreshAdminPlayers();
      if (tab === 'manageTeams')       refreshAdminTeams();
      if (tab === 'manageTournaments') refreshAdminTournaments();
      if (tab === 'manageAdmins')      refreshAdminAccounts();
    });
  });

  document.getElementById('adminPlayerSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderAdminPlayers(State.players.filter(p => `${p.name} ${p.realName||''}`.toLowerCase().includes(q)));
  });
  document.getElementById('adminTeamSearch2')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderAdminTeams(State.teams.filter(t => t.name.toLowerCase().includes(q)));
  });

  document.getElementById('qaNewTournament')?.addEventListener('click', () => openCreateTournamentModal());
  document.getElementById('qaNewAdmin')?.addEventListener('click', () => openAddAdminModal());
  document.getElementById('openCreateTournamentModal')?.addEventListener('click', () => openCreateTournamentModal());
  document.getElementById('openAddAdminModal')?.addEventListener('click', () => openAddAdminModal());
}

function refreshAdminPanels() {
  refreshAdminOverview();
  refreshAdminPlayers();
  refreshAdminTeams();
  refreshAdminTournaments();
  refreshAdminAccounts();
}

/* ── Overview ── */
function refreshAdminOverview() {
  const lft = State.players.filter(p => p.lft).length;
  document.getElementById('aStatPlayers')?.textContent     && (document.getElementById('aStatPlayers').textContent     = State.players.length);
  document.getElementById('aStatTeams')?.textContent      && (document.getElementById('aStatTeams').textContent      = State.teams.length);
  document.getElementById('aStatTournaments')?.textContent && (document.getElementById('aStatTournaments').textContent = State.tournaments.length);
  document.getElementById('aStatLFT')?.textContent         && (document.getElementById('aStatLFT').textContent         = lft);

  // Set values directly
  if(document.getElementById('aStatPlayers'))     document.getElementById('aStatPlayers').textContent     = State.players.length;
  if(document.getElementById('aStatTeams'))       document.getElementById('aStatTeams').textContent       = State.teams.length;
  if(document.getElementById('aStatTournaments')) document.getElementById('aStatTournaments').textContent = State.tournaments.length;
  if(document.getElementById('aStatLFT'))         document.getElementById('aStatLFT').textContent         = lft;

  const recentList = document.getElementById('adminRecentList');
  if (recentList) {
    const recent = [...State.players].reverse().slice(0, 6);
    if (recent.length === 0) {
      recentList.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;padding:12px;">No players registered yet.</p>';
    } else {
      recentList.innerHTML = recent.map(p => `
        <div class="admin-recent-item">
          <div class="admin-recent-avatar" style="background:${avatarGrad(p.name)};">${(p.name||'?').slice(0,2).toUpperCase()}</div>
          <div class="admin-recent-info">
            <div class="admin-recent-name">${esc(p.name)}</div>
            <div class="admin-recent-meta">${esc(p.game)} · ${esc(p.position)}</div>
          </div>
          <div class="admin-recent-time">${p.createdAt ? timeAgo(p.createdAt) : 'Recently'}</div>
        </div>`).join('');
    }
  }
}

/* ── Players Table ── */
function refreshAdminPlayers() { renderAdminPlayers(State.players); }

function renderAdminPlayers(players) {
  const tbody = document.getElementById('adminPlayersBody');
  if (!tbody) return;
  if (players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row" style="text-align:center;color:var(--text-muted);padding:32px;">No players found.</td></tr>';
    return;
  }
  const canDelete = hasPerm('delete_records');
  tbody.innerHTML = players.map(p => {
    const team = State.teams.find(t => t.id === p.teamId);
    const mmrLbl = p.uncalibrated ? '<span style="color:var(--text-muted)">Uncal.</span>' : (p.mmr ? `<span class="${getMmrClass(p.mmr,false)}">${parseInt(p.mmr).toLocaleString()}</span>` : '—');
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="admin-recent-avatar" style="width:28px;height:28px;min-width:28px;font-size:.68rem;background:${avatarGrad(p.name)};">${(p.name||'?').slice(0,2).toUpperCase()}</div>
          <div><div style="color:var(--text-primary);font-weight:600;">${esc(p.name)}</div>${p.realName?`<div style="font-size:.75rem;color:var(--text-muted);">${esc(p.realName)}</div>`:''}</div>
        </div>
      </td>
      <td>${esc(p.game)}</td>
      <td>${esc(p.position)}</td>
      <td>${mmrLbl}</td>
      <td>${team ? esc(team.name) : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${p.lft ? '<span class="badge badge-lft" style="font-size:.68rem;">LFT</span>' : '<span style="color:var(--text-muted);font-size:.8rem;">—</span>'}</td>
      <td>
        <div class="admin-table-actions">
          <button class="btn btn-sm btn-outline" onclick="adminEditPlayer('${p.id}')"><i class="fas fa-edit"></i></button>
          ${canDelete ? `<button class="btn btn-sm" style="background:rgba(194,59,34,.15);border-color:rgba(194,59,34,.3);color:var(--text-red);" onclick="adminDeletePlayer('${p.id}')"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── Teams Table ── */
function refreshAdminTeams() { renderAdminTeams(State.teams); }

function renderAdminTeams(teams) {
  const tbody = document.getElementById('adminTeamsBody');
  if (!tbody) return;
  if (teams.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row" style="text-align:center;color:var(--text-muted);padding:32px;">No teams found.</td></tr>';
    return;
  }
  const canDelete = hasPerm('delete_records');
  tbody.innerHTML = teams.map(t => {
    const memberCount = (t.roster||[]).length;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="team-emblem" style="width:28px;height:28px;min-width:28px;font-size:.6rem;background:${hexRgba(t.color||'#c8a84b',.15)};color:${t.color||'#c8a84b'};border-color:${hexRgba(t.color||'#c8a84b',.3)};">${(t.tag||t.name).slice(0,3).toUpperCase()}</div>
          <span style="color:var(--text-primary);font-weight:600;">${esc(t.name)}</span>
        </div>
      </td>
      <td><span style="font-family:var(--font-primary);color:var(--text-muted);">[${esc(t.tag||'?')}]</span></td>
      <td>${memberCount}/5</td>
      <td style="color:var(--dota-gold);font-weight:700;">${t.wins||0}</td>
      <td>${t.matches||0}</td>
      <td>
        <div class="admin-table-actions">
          <button class="btn btn-sm btn-outline" onclick="openCreateTeamModal(State.teams.find(x=>x.id==='${t.id}'))"><i class="fas fa-edit"></i></button>
          ${canDelete ? `<button class="btn btn-sm" style="background:rgba(194,59,34,.15);border-color:rgba(194,59,34,.3);color:var(--text-red);" onclick="adminDeleteTeam('${t.id}')"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── Tournaments Table ── */
function refreshAdminTournaments() {
  const tbody = document.getElementById('adminTournamentsBody');
  if (!tbody) return;
  if (State.tournaments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row" style="text-align:center;color:var(--text-muted);padding:32px;">No tournaments yet.</td></tr>';
    return;
  }
  const canDelete = hasPerm('delete_records');
  tbody.innerHTML = State.tournaments.map(t => {
    const icon = t.status==='ongoing'?'fa-play':t.status==='completed'?'fa-check':'fa-clock';
    return `<tr>
      <td style="color:var(--text-primary);font-weight:600;">${esc(t.name)}</td>
      <td><span class="tournament-badge t-badge-${t.status}"><i class="fas ${icon}"></i> ${cap(t.status)}</span></td>
      <td style="color:var(--text-secondary);">${esc(t.format||'—')}</td>
      <td>${(t.enrolledTeams||[]).length}/${t.teams||'?'}</td>
      <td style="color:var(--dota-gold);font-weight:700;">${esc(t.prize||'—')}</td>
      <td style="color:var(--text-muted);font-size:.82rem;">${formatDate(t.startDate)}</td>
      <td>
        <div class="admin-table-actions">
          <button class="btn btn-sm btn-outline" onclick="adminEditTournament('${t.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline" onclick="viewBracket('${t.id}')"><i class="fas fa-sitemap"></i></button>
          ${canDelete ? `<button class="btn btn-sm" style="background:rgba(194,59,34,.15);border-color:rgba(194,59,34,.3);color:var(--text-red);" onclick="adminDeleteTournament('${t.id}')"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── Admin Accounts Table ── */
function refreshAdminAccounts() {
  if (!hasPerm('manage_admins')) return;
  const tbody = document.getElementById('adminAccountsBody');
  if (!tbody) return;

  const admins = getAdminAccounts();
  if (admins.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row" style="text-align:center;color:var(--text-muted);padding:32px;">No admin accounts found.</td></tr>';
    return;
  }
  tbody.innerHTML = admins.map(a => {
    const isSelf = a.username === Auth.currentUser?.username;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="admin-recent-avatar" style="width:28px;height:28px;min-width:28px;font-size:.68rem;background:${avatarGrad(a.username)};">${(a.displayName||a.username).slice(0,2).toUpperCase()}</div>
          <div><div style="color:var(--text-primary);font-weight:600;">${esc(a.username)}</div><div style="font-size:.75rem;color:var(--text-muted);">${esc(a.displayName||'')}</div></div>
        </div>
      </td>
      <td><span class="role-badge ${a.role}">${esc(ROLE_LABELS[a.role]||a.role)}</span></td>
      <td style="font-size:.78rem;color:var(--text-muted);">${(a.permissions||[]).join(', ')||'—'}</td>
      <td style="color:var(--text-muted);font-size:.8rem;">${a.createdAt ? formatDate(a.createdAt) : '—'}</td>
      <td style="color:var(--text-muted);font-size:.8rem;">${a.lastLogin ? timeAgo(a.lastLogin) : 'Never'}</td>
      <td>
        <div class="admin-table-actions">
          ${!isSelf ? `<button class="btn btn-sm" style="background:rgba(194,59,34,.15);border-color:rgba(194,59,34,.3);color:var(--text-red);" onclick="adminDeleteAdmin('${a.username}')"><i class="fas fa-trash"></i></button>` : '<span style="color:var(--text-muted);font-size:.78rem;">(you)</span>'}
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ─────────────────────────────────────────────────────────────
   ADMIN ACCOUNT CRUD (stored in localStorage for demo)
   In production, these live in Google Sheets via Apps Script
───────────────────────────────────────────────────────────── */
const ADMINS_KEY = 'rdh_admins';

function getAdminAccounts() {
  try {
    const raw = localStorage.getItem(ADMINS_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    // Always ensure superadmin exists
    if (!stored.find(a => a.username === 'superadmin')) {
      stored.unshift(getDefaultSuperAdmin());
      saveAdminAccounts(stored);
    }
    return stored;
  } catch (e) { return [getDefaultSuperAdmin()]; }
}

function saveAdminAccounts(admins) {
  try { localStorage.setItem(ADMINS_KEY, JSON.stringify(admins)); } catch (e) {}
}

function getDefaultSuperAdmin() {
  return {
    id:          'sa001',
    username:    'superadmin',
    displayName: 'Super Admin',
    // Default password: Admin@Ragay2026 — change this from Admin Panel → Settings
    plainPassword: 'Admin@Ragay2026',
    role:         'superadmin',
    permissions:  ROLE_PERMS['superadmin'],
    createdAt:    '2024-01-01T00:00:00.000Z',
    lastLogin:    null,
    notes:        'Primary super administrator account.',
  };
}

/* ── Simple hash (for demo — use bcrypt in production) ── */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ── Dev credential check (used when API is offline) ── */
function devCheckCredentials(username, password) {
  const admins = getAdminAccounts();
  const admin  = admins.find(a => a.username === username);
  if (!admin) return null;

  // For demo, allow plain-text match against default password
  const defaultPw = 'Admin@Ragay2026';
  const isDefault = (username === 'superadmin' && password === defaultPw);

  // Also check stored plain passwords (for admin accounts created in UI)
  const isPlain = admin.plainPassword === password;

  if (!isDefault && !isPlain) return null;

  // Update last login
  admin.lastLogin = new Date().toISOString();
  saveAdminAccounts(admins);

  return {
    id:          admin.id,
    username:    admin.username,
    displayName: admin.displayName,
    role:        admin.role,
    permissions: admin.permissions || ROLE_PERMS[admin.role] || [],
  };
}

/* ─────────────────────────────────────────────────────────────
   ADD ADMIN MODAL
───────────────────────────────────────────────────────────── */
function openAddAdminModal() {
  if (!hasPerm('manage_admins')) { showToast('Super Admin only.', 'error'); return; }
  document.getElementById('addAdminForm')?.classList.remove('hidden');
  document.getElementById('addAdminSuccess')?.classList.add('hidden');
  document.getElementById('addAdminForm')?.reset();
  openAuthModal('addAdminModalOverlay');
}

function initAddAdminModal() {
  document.getElementById('closeAddAdminModal')?.addEventListener('click', () => closeAuthModal('addAdminModalOverlay'));
  document.getElementById('addAdminSuccessClose')?.addEventListener('click', () => {
    closeAuthModal('addAdminModalOverlay');
    refreshAdminAccounts();
  });
  document.getElementById('addAdminForm')?.addEventListener('submit', handleAddAdmin);

  // Auto-set permissions based on role selection
  document.getElementById('adminRole')?.addEventListener('change', e => {
    const role  = e.target.value;
    const perms = ROLE_PERMS[role] || [];
    document.querySelectorAll('input[name="perm"]').forEach(cb => {
      cb.checked = perms.includes(cb.value);
    });
  });
}

async function handleAddAdmin(e) {
  e.preventDefault();
  const form = e.target;
  let valid  = true;
  form.querySelectorAll('[required]').forEach(f => { f.classList.remove('error'); if (!f.value.trim()) { f.classList.add('error'); valid = false; } });
  if (!valid) { showToast('Fill in all required fields.', 'error'); return; }

  const pw      = document.getElementById('adminPassword').value;
  const pwConf  = document.getElementById('adminConfirmPassword').value;
  if (pw !== pwConf) { showToast('Passwords do not match.', 'error'); return; }
  if (pw.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }

  const username = document.getElementById('adminUsername').value.trim();
  const existing = getAdminAccounts();
  if (existing.find(a => a.username === username)) { showToast('Username already exists.', 'error'); return; }

  const role  = document.getElementById('adminRole').value;
  const perms = [...document.querySelectorAll('input[name="perm"]:checked')].map(c => c.value);
  const notes = document.getElementById('adminNotes').value.trim();

  const newAdmin = {
    id:            'a' + Date.now(),
    username,
    displayName:    document.getElementById('adminDisplayName').value.trim(),
    plainPassword:  pw,   // stored plain for local/demo — replace with hash in production
    role,
    permissions:    perms,
    notes,
    createdAt:      new Date().toISOString(),
    lastLogin:      null,
    createdBy:      Auth.currentUser?.username,
  };

  try {
    await apiPost('addAdmin', newAdmin);
  } catch (err) { /* offline */ }

  existing.push(newAdmin);
  saveAdminAccounts(existing);

  document.getElementById('addAdminForm').classList.add('hidden');
  document.getElementById('addAdminSuccess').classList.remove('hidden');
  document.getElementById('addAdminSuccessMsg').textContent =
    `${newAdmin.displayName} (${newAdmin.username}) can now log in as ${ROLE_LABELS[role] || role}.`;

  showToast(`Admin "${newAdmin.displayName}" created!`, 'success');
  logAdminAction('create_admin', `Created admin: ${newAdmin.username} (${role})`);
}

function adminDeleteAdmin(username) {
  if (!hasPerm('manage_admins')) { showToast('Super Admin only.', 'error'); return; }
  if (username === Auth.currentUser?.username) { showToast("You can't delete your own account.", 'error'); return; }
  if (!confirm(`Delete admin "${username}"? This cannot be undone.`)) return;

  const admins = getAdminAccounts().filter(a => a.username !== username);
  saveAdminAccounts(admins);
  showToast(`Admin "${username}" deleted.`, 'success');
  refreshAdminAccounts();
  logAdminAction('delete_admin', `Deleted admin: ${username}`);
}

/* ─────────────────────────────────────────────────────────────
   TOURNAMENT MODAL (Admin creates/edits)
───────────────────────────────────────────────────────────── */
function openCreateTournamentModal(existing = null) {
  if (!hasPerm('manage_tournaments')) { showToast('No permission to manage tournaments.', 'error'); return; }
  const form    = document.getElementById('createTournamentForm');
  const success = document.getElementById('tournamentSuccess');
  form?.classList.remove('hidden');
  success?.classList.add('hidden');
  document.getElementById('tournamentModalTitle').textContent = existing ? 'Edit Tournament' : 'Create Tournament';

  if (existing) {
    document.getElementById('tName').value        = existing.name        || '';
    document.getElementById('tFormat').value      = existing.format      || '';
    document.getElementById('tTeams').value       = existing.teams       || '';
    document.getElementById('tPrize').value       = existing.prize       || '';
    document.getElementById('tStatus').value      = existing.status      || 'upcoming';
    document.getElementById('tStartDate').value   = existing.startDate   || '';
    document.getElementById('tEndDate').value     = existing.endDate     || '';
    document.getElementById('tDescription').value = existing.description || '';
    if (form) form.dataset.editId = existing.id;
  } else {
    form?.reset();
    if (form) delete form.dataset.editId;
  }
  openAuthModal('createTournamentModalOverlay');
}

function adminEditTournament(id) {
  const t = State.tournaments.find(x => x.id === id);
  if (t) openCreateTournamentModal(t);
}

function initTournamentModal() {
  document.getElementById('closeCreateTournamentModal')?.addEventListener('click', () => closeAuthModal('createTournamentModalOverlay'));
  document.getElementById('tournamentSuccessClose')?.addEventListener('click', () => {
    closeAuthModal('createTournamentModalOverlay');
    switchTab('tournaments');
  });
  document.getElementById('createTournamentForm')?.addEventListener('submit', handleCreateTournament);
}

async function handleCreateTournament(e) {
  e.preventDefault();
  if (!hasPerm('manage_tournaments')) { showToast('No permission.', 'error'); return; }
  const form  = e.target;
  let valid   = true;
  form.querySelectorAll('[required]').forEach(f => { f.classList.remove('error'); if (!f.value.trim()) { f.classList.add('error'); valid = false; } });
  if (!valid) { showToast('Fill in all required fields.', 'error'); return; }

  const isEdit = !!form.dataset.editId;
  const data   = {
    id:           isEdit ? form.dataset.editId : 'trn' + Date.now(),
    name:         document.getElementById('tName').value.trim(),
    format:       document.getElementById('tFormat').value,
    teams:        parseInt(document.getElementById('tTeams').value),
    prize:        document.getElementById('tPrize').value.trim(),
    status:       document.getElementById('tStatus').value,
    startDate:    document.getElementById('tStartDate').value,
    endDate:      document.getElementById('tEndDate').value,
    description:  document.getElementById('tDescription').value.trim(),
    enrolledTeams: isEdit ? (State.tournaments.find(t=>t.id===form.dataset.editId)?.enrolledTeams||[]) : [],
    createdAt:    isEdit ? '' : new Date().toISOString(),
    createdBy:    Auth.currentUser?.username,
  };

  try { await apiPost(isEdit ? 'updateTournament' : 'addTournament', data); }
  catch (err) { /* offline */ }

  if (isEdit) {
    const idx = State.tournaments.findIndex(t => t.id === data.id);
    if (idx > -1) State.tournaments[idx] = { ...State.tournaments[idx], ...data };
  } else {
    State.tournaments.push(data);
  }

  updateHeroStats();
  renderTournaments();
  refreshAdminTournaments();
  populateBracketSelector();
  updateAnnouncementBar();

  document.getElementById('createTournamentForm').classList.add('hidden');
  document.getElementById('tournamentSuccess').classList.remove('hidden');
  showToast(`Tournament "${data.name}" ${isEdit ? 'updated' : 'created'}!`, 'success');
  logAdminAction(isEdit ? 'edit_tournament' : 'create_tournament', data.name);
}

/* ─────────────────────────────────────────────────────────────
   ADMIN EDIT / DELETE ACTIONS
───────────────────────────────────────────────────────────── */
function adminEditPlayer(id) {
  if (!hasPerm('manage_players')) { showToast('No permission to edit players.', 'error'); return; }
  const p = State.players.find(x => x.id === id);
  if (!p) return;
  // Pre-fill registration form and open it
  document.getElementById('regName').value              = p.name              || '';
  document.getElementById('regRealName').value          = p.realName          || '';
  document.getElementById('regGame').value              = p.game              || '';
  document.getElementById('regSteamId').value           = p.steamId           || '';
  document.getElementById('regPosition').value          = p.position          || '';
  document.getElementById('regSecondaryPosition').value = p.secondaryPosition || '';
  document.getElementById('regMMR').value               = p.mmr               || '';
  document.getElementById('regUncalibrated').checked    = p.uncalibrated      || false;
  document.getElementById('regHeroes').value            = p.heroes            || '';
  document.getElementById('regFacebook').value          = p.facebook          || '';
  document.getElementById('regPhone').value             = p.phone             || '';
  document.getElementById('regEmail').value             = p.email             || '';
  document.getElementById('regSchedule').value          = p.schedule          || '';
  document.getElementById('regDays').value              = p.days              || '';
  document.getElementById('regRole').value              = p.role              || '';
  document.getElementById('regLFT').checked             = p.lft               || false;
  document.getElementById('regBio').value               = p.bio               || '';
  const form = document.getElementById('registerForm');
  if (form) form.dataset.editId = id;
  document.getElementById('registerForm')?.classList.remove('hidden');
  document.getElementById('regSuccess')?.classList.add('hidden');
  openModal('registerModalOverlay');
}

async function adminDeletePlayer(id) {
  if (!hasPerm('delete_records')) { showToast('No permission to delete records.', 'error'); return; }
  const p = State.players.find(x => x.id === id);
  if (!p || !confirm(`Delete player "${p.name}"? This cannot be undone.`)) return;
  try { await apiPost('deletePlayer', { id }); } catch (e) {}
  State.players = State.players.filter(x => x.id !== id);
  applyPlayerFilters();
  refreshAdminPlayers();
  updateHeroStats();
  renderRankings();
  showToast(`Player "${p.name}" deleted.`, 'success');
  logAdminAction('delete_player', p.name);
}

async function adminDeleteTeam(id) {
  if (!hasPerm('delete_records')) { showToast('No permission to delete records.', 'error'); return; }
  const t = State.teams.find(x => x.id === id);
  if (!t || !confirm(`Delete team "${t.name}"? This cannot be undone.`)) return;
  try { await apiPost('deleteTeam', { id }); } catch (e) {}
  State.teams = State.teams.filter(x => x.id !== id);
  renderTeams(State.teams);
  refreshAdminTeams();
  updateHeroStats();
  renderRankings();
  showToast(`Team "${t.name}" deleted.`, 'success');
  logAdminAction('delete_team', t.name);
}

async function adminDeleteTournament(id) {
  if (!hasPerm('delete_records')) { showToast('No permission to delete records.', 'error'); return; }
  const t = State.tournaments.find(x => x.id === id);
  if (!t || !confirm(`Delete tournament "${t.name}"? This cannot be undone.`)) return;
  try { await apiPost('deleteTournament', { id }); } catch (e) {}
  State.tournaments = State.tournaments.filter(x => x.id !== id);
  renderTournaments();
  refreshAdminTournaments();
  populateBracketSelector();
  updateHeroStats();
  updateAnnouncementBar();
  showToast(`Tournament "${t.name}" deleted.`, 'success');
  logAdminAction('delete_tournament', t.name);
}

/* ─────────────────────────────────────────────────────────────
   SETTINGS PANEL
───────────────────────────────────────────────────────────── */
function initSettingsPanel() {
  document.getElementById('saveAnnouncementBtn')?.addEventListener('click', async () => {
    const txt = document.getElementById('settingAnnouncement').value.trim();
    if (!txt) { showToast('Enter announcement text.', 'error'); return; }
    const el = document.getElementById('announcementText');
    if (el) el.innerHTML = `${esc(txt)} &nbsp;`;
    try { await apiPost('saveSetting', { key: 'announcement', value: txt }); } catch (e) {}
    showToast('Announcement updated!', 'success');
  });

  document.getElementById('changePasswordBtn')?.addEventListener('click', handleChangePassword);
}

async function handleChangePassword() {
  const oldPw  = document.getElementById('settingOldPass').value;
  const newPw  = document.getElementById('settingNewPass').value;
  const confPw = document.getElementById('settingConfirmPass').value;
  if (!oldPw || !newPw || !confPw) { showToast('Fill in all password fields.', 'error'); return; }
  if (newPw !== confPw) { showToast('New passwords do not match.', 'error'); return; }
  if (newPw.length < 8) { showToast('New password must be at least 8 characters.', 'error'); return; }

  // Verify old password
  const user = devCheckCredentials(Auth.currentUser?.username, oldPw);
  if (!user) { showToast('Current password is incorrect.', 'error'); return; }

  const admins = getAdminAccounts();
  const admin  = admins.find(a => a.username === Auth.currentUser?.username);
  if (admin) {
    admin.plainPassword = newPw;
    saveAdminAccounts(admins);
    try { await apiPost('updateAdminPassword', { username: admin.username, newPassword: newPw }); } catch (e) {}
    document.getElementById('settingOldPass').value  = '';
    document.getElementById('settingNewPass').value  = '';
    document.getElementById('settingConfirmPass').value = '';
    showToast('Password changed successfully!', 'success');
    logAdminAction('change_password', Auth.currentUser?.username);
  }
}

/* ─────────────────────────────────────────────────────────────
   PERMISSION HELPERS
───────────────────────────────────────────────────────────── */
function hasPerm(perm) {
  if (!Auth.currentUser) return false;
  return (Auth.currentUser.permissions || []).includes(perm);
}

function requireAuth(action) {
  if (!Auth.currentUser) {
    showToast('Please log in as admin first.', 'info');
    openAuthModal('loginModalOverlay');
    return false;
  }
  return true;
}

/* ─────────────────────────────────────────────────────────────
   AUDIT LOG (localStorage)
───────────────────────────────────────────────────────────── */
const LOG_KEY = 'rdh_audit_log';
function logAdminAction(action, detail) {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    log.unshift({ ts: new Date().toISOString(), user: Auth.currentUser?.username, action, detail });
    if (log.length > 200) log.length = 200;
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch (e) {}
}

/* ─────────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────────── */
function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Note: cap(), esc(), avatarGrad(), hexRgba(), formatDate(), getMmrClass(),
// showToast(), updateHeroStats(), applyPlayerFilters(), renderTeams(),
// renderTournaments(), renderRankings(), populateBracketSelector(),
// updateAnnouncementBar(), viewBracket(), scrollTo(), openModal(),
// openCreateTeamModal() — all defined in app.js
