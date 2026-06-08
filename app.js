/* ═══════════════════════════════════════════════════════
   RAGAY DOTA HUB — Frontend App
   Backend: Google Apps Script (Code.gs)
   Database: Google Sheets
═══════════════════════════════════════════════════════ */

// ── CONFIG ──────────────────────────────────────────────
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbz6lu8QXuoDEU3y0CW1cll2XaySLnSkyTWogL-TrTPXZCjkSJgguALSEqLljuH7BvjB/exec',
  PAGE_SIZE: 12,
};

// ── STATE ────────────────────────────────────────────────
const State = {
  players: [],
  teams: [],
  tournaments: [],
  filteredPlayers: [],
  playersPage: 1,
  currentTournamentTab: 'upcoming',
  currentRankTab: 'players',
  brackets: {},
  activeBracketId: null,
  dragData: null,
};

// ── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  runLoader();
  initNavbar();
  initModals();
  initTabs();
  initForms();
  initParticles();
  loadAllData();
});

/* ══════════════════════════════════════════════════════════
   LOADER
══════════════════════════════════════════════════════════ */
function runLoader() {
  const fill = document.getElementById('loaderFill');
  const loader = document.getElementById('loader');
  let w = 0;
  const iv = setInterval(() => {
    w = Math.min(w + Math.random() * 18, 95);
    if (fill) fill.style.width = w + '%';
    if (w >= 95) clearInterval(iv);
  }, 120);
  window.addEventListener('appReady', () => {
    clearInterval(iv);
    if (fill) fill.style.width = '100%';
    setTimeout(() => loader?.classList.add('hidden'), 400);
  });
  setTimeout(() => {
    clearInterval(iv);
    if (fill) fill.style.width = '100%';
    setTimeout(() => loader?.classList.add('hidden'), 300);
  }, 5000);
}

function dispatchReady() { window.dispatchEvent(new Event('appReady')); }

/* ══════════════════════════════════════════════════════════
   PARTICLES
══════════════════════════════════════════════════════════ */
function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);
  let W, H, particles;
  function resize() { W = canvas.width = container.offsetWidth; H = canvas.height = container.offsetHeight; }
  function makeParticles() {
    particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3, vy: -Math.random() * 0.4 - 0.1,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? '200,168,75' : '194,59,34',
    }));
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10 || p.x > W + 10) { p.x = Math.random() * W; p.y = H; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  resize(); makeParticles(); draw();
  window.addEventListener('resize', () => { resize(); makeParticles(); });
}

/* ══════════════════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════════════════ */
function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  window.addEventListener('scroll', () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 10);
    updateActiveNavLink();
  });
  hamburger?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });
  navLinks?.querySelectorAll('a').forEach(l => l.addEventListener('click', () => {
    navLinks.classList.remove('open'); hamburger?.classList.remove('open');
  }));
}

function updateActiveNavLink() {
  const ids = ['directory','teams','tournaments','brackets','rankings'];
  const y = window.scrollY + 120;
  let active = '';
  ids.forEach(id => { const el = document.getElementById(id); if (el && el.offsetTop <= y) active = id; });
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${active}`));
}

/* ══════════════════════════════════════════════════════════
   MODALS
══════════════════════════════════════════════════════════ */
function initModals() {
  ['openRegisterModal','heroJoinBtn','emptyJoinBtn','ctaJoinBtn'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', () => openModal('registerModalOverlay'))
  );
  document.getElementById('closeRegisterModal')?.addEventListener('click', () => closeModal('registerModalOverlay'));
  document.getElementById('successCloseBtn')?.addEventListener('click', () => { closeModal('registerModalOverlay'); scrollTo('directory'); });

  ['openCreateTeamModal','emptyCreateTeamBtn'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', () => openCreateTeamModal())
  );
  document.getElementById('closeCreateTeamModal')?.addEventListener('click', () => closeModal('createTeamModalOverlay'));
  document.getElementById('teamSuccessCloseBtn')?.addEventListener('click', () => { closeModal('createTeamModalOverlay'); scrollTo('teams'); });

  document.getElementById('closePlayerProfile')?.addEventListener('click', () => closeModal('playerProfileOverlay'));

  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); })
  );
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(o => closeModal(o.id));
  });
}

function openModal(id) { document.getElementById(id)?.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); document.body.style.overflow = ''; }
function scrollTo(id)   { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

/* ══════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll('.tournament-tabs .tab-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tournament-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.currentTournamentTab = btn.dataset.tab;
    renderTournaments();
  }));
  document.querySelectorAll('.ranking-tabs .tab-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.ranking-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.currentRankTab = btn.dataset.ranktab;
    document.querySelectorAll('.ranking-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`ranking${cap(State.currentRankTab)}Panel`)?.classList.add('active');
  }));
}

/* ══════════════════════════════════════════════════════════
   FORMS
══════════════════════════════════════════════════════════ */
function initForms() {
  document.getElementById('registerForm')?.addEventListener('submit', handlePlayerRegister);
  document.getElementById('regUncalibrated')?.addEventListener('change', e => {
    const mmr = document.getElementById('regMMR');
    mmr.disabled = e.target.checked;
    if (e.target.checked) mmr.value = '';
  });
  document.getElementById('createTeamForm')?.addEventListener('submit', handleCreateTeam);
  ['playerSearch','filterGame','filterPosition','filterMMR','filterLFT'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyPlayerFilters);
    document.getElementById(id)?.addEventListener('change', applyPlayerFilters);
  });
  document.getElementById('teamSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderTeams(State.teams.filter(t => t.name.toLowerCase().includes(q) || (t.tag||'').toLowerCase().includes(q)));
  });
  document.getElementById('loadMoreBtn')?.addEventListener('click', () => { State.playersPage++; renderPlayers(State.filteredPlayers, false); });
  document.getElementById('bracketTournamentSelect')?.addEventListener('change', e => { State.activeBracketId = e.target.value || null; renderBracket(); });
}

/* ══════════════════════════════════════════════════════════
   DATA LOADING
══════════════════════════════════════════════════════════ */
async function loadAllData() {
  try {
    const [players, teams, tournaments] = await Promise.all([
      apiFetch('getPlayers'), apiFetch('getTeams'), apiFetch('getTournaments'),
    ]);
    State.players     = players     || [];
    State.teams       = teams       || [];
    State.tournaments = tournaments || [];
    afterDataLoad();
    dispatchReady();
  } catch (err) {
    console.warn('API unavailable — loading demo data.', err);
    loadDemoData();
  }
}

function afterDataLoad() {
  updateHeroStats();
  applyPlayerFilters();
  renderTeams(State.teams);
  renderTournaments();
  renderRankings();
  populateBracketSelector();
  updateAnnouncementBar();
}

async function apiFetch(action, params = {}) {
  const url = new URL(CONFIG.API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('API ' + res.status);
  return res.json();
}

async function apiPost(action, data = {}) {
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...data }),
  });
  if (!res.ok) throw new Error('API ' + res.status);
  return res.json();
}

function loadDemoData() {
  State.players = [
    { id:'p1', name:'Phantom_PH',  realName:'Juan D.',   game:'Dota 2', position:'Carry',        mmr:4800, uncalibrated:false, heroes:'Phantom Assassin, Anti-Mage', lft:true,  teamId:'',   facebook:'', phone:'', email:'', bio:'Hard carry main. Grinding to 5k.', schedule:'Evening',   days:'Weekends', role:'Core',    steamId:'765611980001', secondaryPosition:'Mid' },
    { id:'p2', name:'InvokerKing', realName:'Pedro S.',  game:'Dota 2', position:'Mid',           mmr:5200, uncalibrated:false, heroes:'Invoker, Storm Spirit',       lft:false, teamId:'t1', facebook:'', phone:'', email:'', bio:'Invoker one-trick.',              schedule:'Evening',   days:'Everyday', role:'Captain', steamId:'765611980002', secondaryPosition:'' },
    { id:'p3', name:'WardBoy420',  realName:'Rico M.',   game:'Both',   position:'Hard Support',  mmr:2400, uncalibrated:false, heroes:'Crystal Maiden, Lion',        lft:true,  teamId:'',   facebook:'', phone:'', email:'', bio:'Support player. Willing to ward.', schedule:'Afternoon', days:'Weekdays', role:'Support', steamId:'',             secondaryPosition:'Soft Support' },
    { id:'p4', name:'TankBoy',     realName:'Alex R.',   game:'Dota 2', position:'Offlane',       mmr:0,    uncalibrated:true,  heroes:'Axe, Dragon Knight',          lft:true,  teamId:'',   facebook:'', phone:'', email:'', bio:'Offlane enthusiast.',              schedule:'Morning',   days:'Weekends', role:'Core',    steamId:'',             secondaryPosition:'' },
    { id:'p5', name:'SoftServe',   realName:'Maria L.',  game:'Dota 2', position:'Soft Support',  mmr:3200, uncalibrated:false, heroes:'Earthshaker, Bane',           lft:false, teamId:'t1', facebook:'', phone:'', email:'', bio:'Soft support flex.',              schedule:'Evening',   days:'Everyday', role:'Support', steamId:'765611980005', secondaryPosition:'Offlane' },
    { id:'p6', name:'OldSchool',   realName:'Ben T.',    game:'Dota 1', position:'Carry',         mmr:0,    uncalibrated:true,  heroes:'Mirana, Rikimaru',            lft:true,  teamId:'',   facebook:'', phone:'', email:'', bio:'Dota 1 veteran.',                  schedule:'Evening',   days:'Weekends', role:'Core',    steamId:'',             secondaryPosition:'' },
  ];
  State.teams = [
    { id:'t1', name:'Ragay Dominators', tag:'RGD', color:'#c8a84b', region:'Ragay, CamSur', server:'SEA', description:'Top team in Ragay. Scrim-ready.', roster:['p2','p5'], wins:3, matches:5, createdAt:'2025-01-10' },
    { id:'t2', name:'Creep Wave',       tag:'CRW', color:'#c23b22', region:'Ragay, CamSur', server:'SEA', description:'Casual team looking to improve.', roster:[],          wins:0, matches:1, createdAt:'2025-02-14' },
  ];
  State.tournaments = [
    { id:'trn1', name:'Ragay Dota Cup 2026', status:'upcoming',  format:'Single Elimination', teams:8, prize:'₱5,000', startDate:'2026-07-15', endDate:'2026-07-20', enrolledTeams:['t1'],       description:'Annual community tournament.' },
    { id:'trn2', name:'Summer Showdown',     status:'ongoing',   format:'Double Elimination', teams:4, prize:'₱2,000', startDate:'2026-06-01', endDate:'2026-06-30', enrolledTeams:['t1','t2'],  description:'Ongoing mid-year cup.' },
    { id:'trn3', name:'Ragay Invitational',  status:'completed', format:'Single Elimination', teams:8, prize:'₱3,000', startDate:'2025-12-01', endDate:'2025-12-10', enrolledTeams:['t1','t2'],  description:'Past invitational.' },
  ];
  State.brackets = {
    trn1: { rounds: [
      { name:'Quarter Finals', matches: [
        { id:'m1',team1:'t1',team2:'',   score1:0,score2:0,winner:null },
        { id:'m2',team1:'t2',team2:'',   score1:0,score2:0,winner:null },
        { id:'m3',team1:'',  team2:'',   score1:0,score2:0,winner:null },
        { id:'m4',team1:'',  team2:'',   score1:0,score2:0,winner:null },
      ]},
      { name:'Semi Finals', matches: [
        { id:'m5',team1:'',team2:'',score1:0,score2:0,winner:null },
        { id:'m6',team1:'',team2:'',score1:0,score2:0,winner:null },
      ]},
      { name:'Grand Final', matches: [
        { id:'m7',team1:'',team2:'',score1:0,score2:0,winner:null },
      ]},
    ]},
    trn2: { rounds: [
      { name:'Semi Finals', matches: [
        { id:'sm1',team1:'t1',team2:'t2',score1:2,score2:1,winner:'t1' },
        { id:'sm2',team1:'',  team2:'',  score1:0,score2:0,winner:null },
      ]},
      { name:'Grand Final', matches: [
        { id:'sf1',team1:'t1',team2:'',score1:0,score2:0,winner:null },
      ]},
    ]},
  };
  afterDataLoad();
  dispatchReady();
}

/* ══════════════════════════════════════════════════════════
   HERO STATS
══════════════════════════════════════════════════════════ */
function updateHeroStats() {
  const total = State.tournaments.reduce((a, t) => a + (parseInt(t.teams) || 0), 0);
  animCount('statPlayers',     State.players.length);
  animCount('statTeams',       State.teams.length);
  animCount('statTournaments', State.tournaments.length);
  animCount('statMatches',     total);
}
function animCount(id, target) {
  const el = document.querySelector(`#${id} .stat-number`);
  if (!el) return;
  let c = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const iv = setInterval(() => { c = Math.min(c + step, target); el.textContent = c; if (c >= target) clearInterval(iv); }, 30);
}

/* ══════════════════════════════════════════════════════════
   ANNOUNCEMENT BAR
══════════════════════════════════════════════════════════ */
function updateAnnouncementBar() {
  const next = State.tournaments.find(t => t.status === 'upcoming');
  const el = document.getElementById('announcementText');
  if (!el) return;
  if (next) el.innerHTML = `<strong>Next Tournament:</strong> ${esc(next.name)} — ${formatDate(next.startDate)} &nbsp;`;
  else      el.innerHTML = `<strong>Welcome</strong> to Ragay Dota Hub! Register to get started. &nbsp;`;
}

/* ══════════════════════════════════════════════════════════
   PLAYER DIRECTORY
══════════════════════════════════════════════════════════ */
function applyPlayerFilters() {
  State.playersPage = 1;
  const q   = (document.getElementById('playerSearch')?.value || '').toLowerCase();
  const gm  = document.getElementById('filterGame')?.value;
  const pos = document.getElementById('filterPosition')?.value;
  const mmr = document.getElementById('filterMMR')?.value;
  const lft = document.getElementById('filterLFT')?.value;

  State.filteredPlayers = State.players.filter(p => {
    if (q && !`${p.name} ${p.steamId||''} ${p.facebook||''} ${p.realName||''}`.toLowerCase().includes(q)) return false;
    if (gm  && p.game !== gm)   return false;
    if (pos && p.position !== pos) return false;
    if (lft === 'true'  && !p.lft)  return false;
    if (lft === 'false' &&  p.lft)  return false;
    if (mmr) {
      if (mmr === 'uncalibrated' && !p.uncalibrated) return false;
      if (mmr !== 'uncalibrated') {
        if (p.uncalibrated) return false;
        const v = parseInt(p.mmr) || 0;
        if (mmr === '0-2000'    && !(v <  2000)) return false;
        if (mmr === '2000-3500' && !(v >= 2000 && v < 3500)) return false;
        if (mmr === '3500-5000' && !(v >= 3500 && v < 5000)) return false;
        if (mmr === '5000+'     && !(v >= 5000)) return false;
      }
    }
    return true;
  });
  renderPlayers(State.filteredPlayers, true);
}

function renderPlayers(players, reset) {
  const grid   = document.getElementById('playersGrid');
  const lmWrap = document.getElementById('loadMoreWrap');
  if (!grid) return;
  if (players.length === 0) {
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-user-slash"></i><p>No players match your filters.</p><button class="btn btn-primary" onclick="openModal('registerModalOverlay')">Register Now</button></div>`;
    if (lmWrap) lmWrap.style.display = 'none';
    return;
  }
  const end  = State.playersPage * CONFIG.PAGE_SIZE;
  const from = reset ? 0 : (State.playersPage - 1) * CONFIG.PAGE_SIZE;
  if (reset) grid.innerHTML = '';
  players.slice(from, end).forEach(p => grid.appendChild(buildPlayerCard(p)));
  if (lmWrap) lmWrap.style.display = end < players.length ? 'block' : 'none';
}

function buildPlayerCard(p) {
  const el       = document.createElement('div');
  el.className   = 'player-card';
  el.dataset.id  = p.id;
  const initials = (p.name || '?').slice(0, 2).toUpperCase();
  const team     = State.teams.find(t => t.id === p.teamId);
  const mmrLbl   = p.uncalibrated ? 'Uncalibrated' : (p.mmr ? parseInt(p.mmr).toLocaleString() : '—');
  const mmrCls   = getMmrClass(p.mmr, p.uncalibrated);
  const topHero  = p.heroes ? p.heroes.split(',')[0].trim() : '—';

  el.innerHTML = `
    <div class="player-card-header">
      <div class="player-avatar" style="background:${avatarGrad(p.name)}">${initials}</div>
      <div class="player-name-wrap">
        <div class="player-name">${esc(p.name)}</div>
        ${p.realName ? `<div class="player-real-name">${esc(p.realName)}</div>` : ''}
      </div>
    </div>
    <div class="player-badges">
      <span class="badge badge-game"><i class="fas fa-gamepad"></i> ${esc(p.game)}</span>
      <span class="badge badge-pos">${esc(p.position)}</span>
      ${p.lft
        ? '<span class="badge badge-lft"><i class="fas fa-search"></i> LFT</span>'
        : team ? `<span class="badge badge-noteam"><i class="fas fa-shield-halved"></i> ${esc(team.tag || team.name)}</span>` : ''}
    </div>
    <div class="player-stats">
      <div class="player-stat"><span class="player-stat-val ${mmrCls}">${mmrLbl}</span><span class="player-stat-label">MMR</span></div>
      <div class="player-stat"><span class="player-stat-val">${esc(posShort(p.position))}</span><span class="player-stat-label">Pos</span></div>
      <div class="player-stat"><span class="player-stat-val" style="font-size:.8rem;">${esc(topHero)}</span><span class="player-stat-label">Hero</span></div>
    </div>`;
  el.addEventListener('click', () => openPlayerProfile(p));
  return el;
}

function openPlayerProfile(p) {
  const body = document.getElementById('playerProfileBody');
  if (!body) return;
  const team   = State.teams.find(t => t.id === p.teamId);
  const mmrLbl = p.uncalibrated ? 'Not Calibrated' : (p.mmr ? `${parseInt(p.mmr).toLocaleString()} MMR` : '—');
  const mmrCls = getMmrClass(p.mmr, p.uncalibrated);

  body.innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar-lg" style="background:${avatarGrad(p.name)}">${(p.name||'?').slice(0,2).toUpperCase()}</div>
      <div class="profile-main-info">
        <div class="profile-name">${esc(p.name)}</div>
        ${p.realName ? `<div class="profile-realname">${esc(p.realName)}</div>` : ''}
        <div class="profile-badges" style="margin-top:8px;">
          <span class="badge badge-game">${esc(p.game)}</span>
          <span class="badge badge-pos">${esc(p.position)}</span>
          ${p.lft ? '<span class="badge badge-lft"><i class="fas fa-search"></i> LFT</span>' : ''}
        </div>
      </div>
    </div>
    <div class="profile-grid">
      <div class="profile-field"><div class="profile-field-label">MMR / Rank</div><div class="profile-field-val ${mmrCls}">${mmrLbl}</div></div>
      <div class="profile-field"><div class="profile-field-label">Position</div><div class="profile-field-val">${esc(p.position)}${p.secondaryPosition ? ' / ' + esc(p.secondaryPosition) : ''}</div></div>
      <div class="profile-field"><div class="profile-field-label">Top Heroes</div><div class="profile-field-val">${p.heroes ? esc(p.heroes) : '—'}</div></div>
      <div class="profile-field"><div class="profile-field-label">Current Team</div><div class="profile-field-val">${team ? esc(team.name) : 'No Team'}</div></div>
      <div class="profile-field"><div class="profile-field-label">Steam / Dota 2 ID</div><div class="profile-field-val">${p.steamId ? esc(p.steamId) : '—'}</div></div>
      <div class="profile-field"><div class="profile-field-label">Availability</div><div class="profile-field-val">${[p.schedule, p.days].filter(Boolean).join(', ') || '—'}</div></div>
      ${p.facebook ? `<div class="profile-field"><div class="profile-field-label">Facebook</div><div class="profile-field-val"><a href="${esc(p.facebook)}" target="_blank" rel="noopener"><i class="fab fa-facebook"></i> View Profile</a></div></div>` : ''}
      ${p.phone    ? `<div class="profile-field"><div class="profile-field-label">Contact</div><div class="profile-field-val">${esc(p.phone)}</div></div>` : ''}
    </div>
    ${p.bio ? `<div class="profile-bio">${esc(p.bio)}</div>` : ''}
    <div class="profile-actions">
      ${p.lft ? '<span class="badge badge-lft"><i class="fas fa-search"></i> Open to joining a team</span>' : ''}
      ${p.facebook ? `<a href="${esc(p.facebook)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="fab fa-facebook"></i> Facebook</a>` : ''}
    </div>`;
  openModal('playerProfileOverlay');
}

/* ══════════════════════════════════════════════════════════
   TEAMS
══════════════════════════════════════════════════════════ */
function renderTeams(teams) {
  const grid = document.getElementById('teamsGrid');
  if (!grid) return;
  if (!teams || teams.length === 0) {
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-shield-halved"></i><p>No teams yet.</p><button class="btn btn-primary" onclick="openCreateTeamModal()">Create Team</button></div>`;
    return;
  }
  grid.innerHTML = '';
  teams.forEach(t => grid.appendChild(buildTeamCard(t)));
}

function buildTeamCard(t) {
  const el      = document.createElement('div');
  el.className  = 'team-card';
  el.dataset.id = t.id;
  const color   = t.color || '#c8a84b';
  const roster  = (t.roster || []).map(pid => State.players.find(p => p.id === pid)).filter(Boolean);

  const positions = ['Carry','Mid','Offlane','Soft Support','Hard Support'];
  const slots = positions.map((pos, i) => {
    const player = roster[i];
    return `<div class="roster-slot ${player ? 'filled' : 'empty'}">
      ${player
        ? `<i class="fas fa-user" style="color:${color};font-size:.7rem;"></i> ${esc(player.name)}`
        : `<i class="fas fa-user-slash" style="font-size:.7rem;"></i> Pos ${i+1} open`}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="team-card-banner" style="background:${color};"></div>
    <div class="team-card-body">
      <div class="team-card-header">
        <div class="team-emblem" style="background:${hexRgba(color,.15)};color:${color};border-color:${hexRgba(color,.3)};">
          ${esc((t.tag||t.name).slice(0,3).toUpperCase())}
        </div>
        <div class="team-info">
          <div class="team-name">${esc(t.name)}</div>
          <div class="team-tag">[${esc(t.tag||'???')}] · ${esc(t.region||'Ragay')}</div>
        </div>
      </div>
      ${t.description ? `<div class="team-desc">${esc(t.description)}</div>` : ''}
      <div class="team-roster-preview">${slots}</div>
      <div class="team-footer">
        <div class="team-meta">Wins: <span>${t.wins||0}</span> &nbsp;·&nbsp; Matches: <span>${t.matches||0}</span> &nbsp;·&nbsp; Members: <span>${roster.length}/5</span></div>
        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();openCreateTeamModal(State.teams.find(x=>x.id==='${t.id}'))">
          <i class="fas fa-edit"></i> Manage
        </button>
      </div>
    </div>`;
  return el;
}

function openCreateTeamModal(existing = null) {
  const form    = document.getElementById('createTeamForm');
  const success = document.getElementById('teamSuccess');
  form?.classList.remove('hidden');
  success?.classList.add('hidden');
  if (existing) {
    document.getElementById('teamName').value        = existing.name        || '';
    document.getElementById('teamTag').value         = existing.tag         || '';
    document.getElementById('teamRegion').value      = existing.region      || 'Ragay, Camarines Sur';
    document.getElementById('teamServer').value      = existing.server      || 'SEA';
    document.getElementById('teamDescription').value = existing.description || '';
    document.getElementById('teamLogoColor').value   = existing.color       || '#c8a84b';
    if (form) form.dataset.editId = existing.id;
  } else {
    form?.reset();
    if (form) delete form.dataset.editId;
  }
  populateRosterPicker(existing);
  populateTournamentEnroll();
  openModal('createTeamModalOverlay');
}

function populateRosterPicker(team) {
  const picker   = document.getElementById('rosterPicker');
  if (!picker) return;
  const selected = new Set(team?.roster || []);
  const avail    = State.players.filter(p => p.lft || selected.has(p.id));
  if (avail.length === 0) { picker.innerHTML = '<div class="roster-loading">No LFT players. Register players first.</div>'; return; }
  picker.innerHTML = avail.map(p => `
    <label class="roster-player-row">
      <input type="checkbox" name="rosterPlayer" value="${p.id}" ${selected.has(p.id)?'checked':''} />
      <span class="roster-player-name">${esc(p.name)}</span>
      <span class="roster-player-meta">${esc(p.position)} · ${p.uncalibrated?'Uncalibrated':(p.mmr?p.mmr+' MMR':'—')}</span>
    </label>`).join('');
}

function populateTournamentEnroll() {
  const list = document.getElementById('tournamentEnrollList');
  if (!list) return;
  const open = State.tournaments.filter(t => t.status === 'upcoming');
  if (open.length === 0) { list.innerHTML = '<p class="form-hint" style="padding:12px;">No open tournaments.</p>'; return; }
  list.innerHTML = open.map(t => `
    <label class="enroll-row">
      <input type="checkbox" name="enrollTournament" value="${t.id}" />
      <span class="enroll-name">${esc(t.name)}</span>
      <span class="enroll-date">${formatDate(t.startDate)}</span>
    </label>`).join('');
}

/* ══════════════════════════════════════════════════════════
   TOURNAMENTS
══════════════════════════════════════════════════════════ */
function renderTournaments() {
  const list = document.getElementById('tournamentsList');
  if (!list) return;
  const filtered = State.tournaments.filter(t => t.status === State.currentTournamentTab);
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-trophy"></i><p>No ${State.currentTournamentTab} tournaments.</p></div>`;
    return;
  }
  list.innerHTML = '';
  filtered.forEach(t => list.appendChild(buildTournamentCard(t)));
}

function buildTournamentCard(t) {
  const el       = document.createElement('div');
  el.className   = 'tournament-card';
  el.dataset.id  = t.id;
  const enrolled = (t.enrolledTeams || []).length;
  const icon     = t.status === 'ongoing' ? 'fa-play' : t.status === 'completed' ? 'fa-check' : 'fa-clock';

  el.innerHTML = `
    <div class="tournament-status-bar ${t.status}"></div>
    <div class="tournament-body">
      <div class="tournament-title-row">
        <span class="tournament-name">${esc(t.name)}</span>
        <span class="tournament-badge t-badge-${t.status}"><i class="fas ${icon}"></i> ${cap(t.status)}</span>
      </div>
      <div class="tournament-meta">
        <span class="tournament-meta-item"><i class="fas fa-sitemap"></i> ${esc(t.format||'Single Elim')}</span>
        <span class="tournament-meta-item"><i class="fas fa-users"></i> ${enrolled}/${t.teams||'?'} teams</span>
        <span class="tournament-meta-item"><i class="fas fa-calendar"></i> ${formatDate(t.startDate)}${t.endDate?' – '+formatDate(t.endDate):''}</span>
        <span class="tournament-meta-item tournament-prize"><i class="fas fa-trophy"></i> ${esc(t.prize||'TBD')}</span>
      </div>
      ${t.description ? `<p style="font-size:.85rem;color:var(--text-muted);margin-top:6px;">${esc(t.description)}</p>` : ''}
    </div>
    <div class="tournament-actions">
      ${t.status==='upcoming' ? `<button class="btn btn-primary btn-sm" onclick="enrollTeam('${t.id}')"><i class="fas fa-plus"></i> Enroll</button>` : ''}
      <button class="btn btn-outline btn-sm" onclick="viewBracket('${t.id}')"><i class="fas fa-sitemap"></i> Bracket</button>
    </div>`;
  return el;
}

function enrollTeam(tournamentId) {
  if (State.teams.length === 0) { showToast('Create a team first!', 'info'); openCreateTeamModal(); return; }
  const myTeam = State.teams[0];
  const t = State.tournaments.find(x => x.id === tournamentId);
  if (!t) return;
  if (!(t.enrolledTeams||[]).includes(myTeam.id)) {
    t.enrolledTeams = [...(t.enrolledTeams||[]), myTeam.id];
    showToast(`${myTeam.name} enrolled in ${t.name}!`, 'success');
    renderTournaments();
  } else { showToast('Your team is already enrolled!', 'info'); }
}

function viewBracket(id) {
  document.getElementById('bracketTournamentSelect').value = id;
  State.activeBracketId = id;
  renderBracket();
  document.getElementById('brackets')?.scrollIntoView({ behavior:'smooth' });
}

/* ══════════════════════════════════════════════════════════
   BRACKETS
══════════════════════════════════════════════════════════ */
function populateBracketSelector() {
  const sel = document.getElementById('bracketTournamentSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Choose a tournament —</option>';
  State.tournaments.forEach(t => {
    const o = document.createElement('option');
    o.value = t.id; o.textContent = t.name; sel.appendChild(o);
  });
}

function renderBracket() {
  const container = document.getElementById('bracketContainer');
  if (!container) return;
  if (!State.activeBracketId) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-sitemap"></i><p>Select a tournament to view its bracket.</p></div>'; return;
  }
  const tourn = State.tournaments.find(t => t.id === State.activeBracketId);
  if (!State.brackets[State.activeBracketId]) {
    const n = tourn ? parseInt(tourn.teams)||8 : 8;
    State.brackets[State.activeBracketId] = genBracket(n, tourn?.enrolledTeams||[]);
  }
  const bdata = State.brackets[State.activeBracketId];

  const assigned = new Set();
  bdata.rounds.forEach(r => r.matches.forEach(m => { if(m.team1) assigned.add(m.team1); if(m.team2) assigned.add(m.team2); }));
  const unassigned = (tourn?.enrolledTeams||[]).filter(tid => !assigned.has(tid));

  let html = '';
  if (unassigned.length > 0) {
    const chips = unassigned.map(tid => {
      const team = State.teams.find(t => t.id === tid);
      return `<div class="pool-team-chip" draggable="true" data-teamid="${tid}">
        <i class="fas fa-shield-halved" style="color:${team?.color||'#c8a84b'};font-size:.7rem;"></i>
        ${esc(team?.name||'Unknown')}
      </div>`;
    }).join('');
    html += `<div class="unassigned-pool"><div class="pool-title"><i class="fas fa-inbox"></i> Unassigned — drag to bracket</div><div class="pool-teams">${chips}</div></div>`;
  }

  html += '<div class="bracket-wrapper">';
  bdata.rounds.forEach((round, ri) => {
    const margin = ri === 0 ? 0 : (Math.pow(2, ri) * 40 - 40) / 2;
    html += `<div class="bracket-round"><div class="bracket-round-title">${esc(round.name)}</div><div class="bracket-matches">`;
    round.matches.forEach(match => {
      const t1 = State.teams.find(t => t.id === match.team1);
      const t2 = State.teams.find(t => t.id === match.team2);
      html += `<div class="bracket-match-wrapper" style="margin:${margin}px 0;">
        <div class="bracket-match" data-matchid="${match.id}">
          <div class="bracket-slot ${match.winner===match.team1?'winner':''}"
            ondragover="event.preventDefault();this.classList.add('drag-over')"
            ondragleave="this.classList.remove('drag-over')"
            ondrop="handleDrop(event,'${match.id}',1,${ri})">
            <span class="slot-name ${!match.team1?'empty':''}">${t1?esc(t1.name):'Drop team here'}</span>
            ${match.team1?`<span class="slot-score">${match.score1}</span>`:''}
          </div>
          <div class="bracket-slot ${match.winner===match.team2?'winner':''}"
            ondragover="event.preventDefault();this.classList.add('drag-over')"
            ondragleave="this.classList.remove('drag-over')"
            ondrop="handleDrop(event,'${match.id}',2,${ri})">
            <span class="slot-name ${!match.team2?'empty':''}">${t2?esc(t2.name):'Drop team here'}</span>
            ${match.team2?`<span class="slot-score">${match.score2}</span>`:''}
          </div>
        </div>
      </div>`;
    });
    html += '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;

  // Drag events for pool chips
  container.querySelectorAll('.pool-team-chip').forEach(chip =>
    chip.addEventListener('dragstart', e => { State.dragData = { teamId: chip.dataset.teamid }; e.dataTransfer.effectAllowed = 'move'; })
  );
}

function handleDrop(event, matchId, slot, ri) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  if (!State.dragData || !State.activeBracketId) return;
  const bdata = State.brackets[State.activeBracketId];
  const match = bdata?.rounds[ri]?.matches.find(m => m.id === matchId);
  if (!match) return;
  if (slot === 1) match.team1 = State.dragData.teamId;
  else            match.team2 = State.dragData.teamId;
  State.dragData = null;
  saveBracket();
  renderBracket();
  showToast('Team placed!', 'success');
}

function genBracket(n, enrolled) {
  const rounds = [];
  const rc = Math.ceil(Math.log2(n));
  for (let r = 0; r < rc; r++) {
    const mc = Math.pow(2, rc - 1 - r);
    const matches = Array.from({ length: mc }, (_, m) => ({
      id: `ar${r}_m${m}`,
      team1: r===0 && enrolled[m*2]   ? enrolled[m*2]   : '',
      team2: r===0 && enrolled[m*2+1] ? enrolled[m*2+1] : '',
      score1: 0, score2: 0, winner: null,
    }));
    const names = ['Grand Final','Semi Finals','Quarter Finals'];
    const name = mc===1?'Grand Final':mc===2?'Semi Finals':mc===4?'Quarter Finals':`Round ${r+1}`;
    rounds.push({ name, matches });
  }
  return { rounds };
}

async function saveBracket() {
  try { await apiPost('saveBracket', { tournamentId: State.activeBracketId, bracket: State.brackets[State.activeBracketId] }); }
  catch (e) { /* offline */ }
}

/* ══════════════════════════════════════════════════════════
   RANKINGS
══════════════════════════════════════════════════════════ */
function renderRankings() {
  // Player rankings by MMR
  const ptbody = document.getElementById('playerRankingBody');
  if (ptbody) {
    const sorted = [...State.players].filter(p => !p.uncalibrated && p.mmr).sort((a,b) => (parseInt(b.mmr)||0)-(parseInt(a.mmr)||0));
    if (sorted.length === 0) {
      ptbody.innerHTML = '<tr><td colspan="7" class="empty-row"><i class="fas fa-star"></i> No ranked players yet.</td></tr>';
    } else {
      ptbody.innerHTML = sorted.map((p, i) => {
        const team = State.teams.find(t => t.id === p.teamId);
        const rn   = i+1;
        const medal= rn<=3 ? ['🥇','🥈','🥉'][rn-1] : rn;
        return `<tr>
          <td><span class="rank-num ${rn<=3?'rank-'+rn:''}">${medal}</span></td>
          <td><div style="display:flex;align-items:center;gap:10px;">
            <div class="player-avatar" style="width:30px;height:30px;font-size:.72rem;background:${avatarGrad(p.name)};">${(p.name||'?').slice(0,2).toUpperCase()}</div>
            <span style="color:var(--text-primary);font-weight:600;">${esc(p.name)}</span>
          </div></td>
          <td>${esc(p.game)}</td>
          <td>${esc(p.position)}</td>
          <td class="${getMmrClass(p.mmr,false)}" style="font-weight:700;">${parseInt(p.mmr).toLocaleString()}</td>
          <td>${team?esc(team.name):'<span style="color:var(--text-muted)">—</span>'}</td>
          <td>0</td>
        </tr>`;
      }).join('');
    }
  }

  // Team rankings by wins
  const ttbody = document.getElementById('teamRankingBody');
  if (ttbody) {
    const sorted = [...State.teams].sort((a,b) => (b.wins||0)-(a.wins||0));
    if (sorted.length === 0) {
      ttbody.innerHTML = '<tr><td colspan="6" class="empty-row"><i class="fas fa-shield-halved"></i> No team rankings yet.</td></tr>';
    } else {
      ttbody.innerHTML = sorted.map((t, i) => {
        const rn   = i+1;
        const medal= rn<=3 ? ['🥇','🥈','🥉'][rn-1] : rn;
        const wr   = t.matches > 0 ? Math.round((t.wins/t.matches)*100) : 0;
        return `<tr>
          <td><span class="rank-num ${rn<=3?'rank-'+rn:''}">${medal}</span></td>
          <td><div style="display:flex;align-items:center;gap:10px;">
            <div class="team-emblem" style="width:30px;height:30px;min-width:30px;font-size:.65rem;background:${hexRgba(t.color||'#c8a84b',.15)};color:${t.color||'#c8a84b'};border-color:${hexRgba(t.color||'#c8a84b',.3)};">${(t.tag||t.name).slice(0,3).toUpperCase()}</div>
            <span style="color:var(--text-primary);font-weight:600;">${esc(t.name)}</span>
          </div></td>
          <td>${(t.roster||[]).length}/5</td>
          <td style="color:var(--dota-gold);font-weight:700;">${t.wins||0}</td>
          <td>${t.matches||0}</td>
          <td>${wr}%</td>
        </tr>`;
      }).join('');
    }
  }
}

/* ══════════════════════════════════════════════════════════
   FORM HANDLERS
══════════════════════════════════════════════════════════ */
async function handlePlayerRegister(e) {
  e.preventDefault();
  const form = e.target;
  let valid  = true;
  form.querySelectorAll('[required]').forEach(f => { f.classList.remove('error'); if (!f.value.trim()) { f.classList.add('error'); valid = false; } });
  if (!valid) { form.querySelector('.error')?.scrollIntoView({ behavior:'smooth', block:'center' }); showToast('Fill in all required fields.', 'error'); return; }

  const btn = document.getElementById('regSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering…';

  const data = {
    id:                 'p' + Date.now(),
    name:               document.getElementById('regName').value.trim(),
    realName:           document.getElementById('regRealName').value.trim(),
    game:               document.getElementById('regGame').value,
    steamId:            document.getElementById('regSteamId').value.trim(),
    position:           document.getElementById('regPosition').value,
    secondaryPosition:  document.getElementById('regSecondaryPosition').value,
    mmr:                document.getElementById('regMMR').value || 0,
    uncalibrated:       document.getElementById('regUncalibrated').checked,
    heroes:             document.getElementById('regHeroes').value.trim(),
    facebook:           document.getElementById('regFacebook').value.trim(),
    phone:              document.getElementById('regPhone').value.trim(),
    email:              document.getElementById('regEmail').value.trim(),
    schedule:           document.getElementById('regSchedule').value,
    days:               document.getElementById('regDays').value,
    role:               document.getElementById('regRole').value,
    lft:                document.getElementById('regLFT').checked,
    bio:                document.getElementById('regBio').value.trim(),
    teamId:             '',
    createdAt:          new Date().toISOString(),
  };

  try {
    await apiPost('addPlayer', data);
  } catch (e) {
    // Offline — save locally
  }

  State.players.push(data);
  updateHeroStats();
  applyPlayerFilters();
  renderRankings();

  form.classList.add('hidden');
  document.getElementById('regSuccess')?.classList.remove('hidden');
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-user-plus"></i> Register Player Profile';
  showToast(`Welcome, ${data.name}!`, 'success');
}

async function handleCreateTeam(e) {
  e.preventDefault();
  const form = e.target;
  let valid  = true;
  form.querySelectorAll('[required]').forEach(f => { f.classList.remove('error'); if (!f.value.trim()) { f.classList.add('error'); valid = false; } });
  if (!valid) { showToast('Fill in all required fields.', 'error'); return; }

  const roster = [...form.querySelectorAll('input[name="rosterPlayer"]:checked')].map(c => c.value);
  const enrollments = [...form.querySelectorAll('input[name="enrollTournament"]:checked')].map(c => c.value);

  const isEdit = !!form.dataset.editId;
  const data = {
    id:          isEdit ? form.dataset.editId : 't' + Date.now(),
    name:        document.getElementById('teamName').value.trim(),
    tag:         document.getElementById('teamTag').value.trim().toUpperCase(),
    region:      document.getElementById('teamRegion').value.trim(),
    server:      document.getElementById('teamServer').value,
    description: document.getElementById('teamDescription').value.trim(),
    color:       document.getElementById('teamLogoColor').value,
    roster,
    wins:        0, matches: 0,
    createdAt:   new Date().toISOString(),
  };

  try {
    await apiPost(isEdit ? 'updateTeam' : 'addTeam', data);
  } catch (e) { /* offline */ }

  if (isEdit) {
    const idx = State.teams.findIndex(t => t.id === data.id);
    if (idx > -1) State.teams[idx] = data;
  } else {
    State.teams.push(data);
  }

  // Enroll team into selected tournaments
  enrollments.forEach(tid => {
    const t = State.tournaments.find(x => x.id === tid);
    if (t && !(t.enrolledTeams||[]).includes(data.id)) {
      t.enrolledTeams = [...(t.enrolledTeams||[]), data.id];
    }
  });

  // Update player lft status for rostered players
  roster.forEach(pid => {
    const pl = State.players.find(p => p.id === pid);
    if (pl) { pl.teamId = data.id; pl.lft = false; }
  });

  updateHeroStats();
  renderTeams(State.teams);
  renderTournaments();
  renderRankings();
  populateBracketSelector();

  form.classList.add('hidden');
  document.getElementById('teamSuccess')?.classList.remove('hidden');
  showToast(`Team "${data.name}" ${isEdit ? 'updated' : 'created'}!`, 'success');
}

/* ══════════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════════ */
function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}

function posShort(pos) {
  const map = { 'Carry':'Carry','Mid':'Mid','Offlane':'Offlane','Soft Support':'Soft Sup','Hard Support':'Hard Sup' };
  return map[pos] || pos;
}

function getMmrClass(mmr, uncal) {
  if (uncal || !mmr) return '';
  const v = parseInt(mmr);
  if (v < 768)  return 'mmr-herald';
  if (v < 1540) return 'mmr-guardian';
  if (v < 2310) return 'mmr-crusader';
  if (v < 3080) return 'mmr-archon';
  if (v < 3850) return 'mmr-legend';
  if (v < 4620) return 'mmr-ancient';
  if (v < 5420) return 'mmr-divine';
  return 'mmr-immortal';
}

function avatarGrad(name) {
  const hue = Array.from(name||'A').reduce((a,c) => a + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue},60%,25%), hsl(${(hue+40)%360},50%,35%))`;
}

function hexRgba(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// Toast notification
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => { t.classList.remove('show'); }, 3200);
}
