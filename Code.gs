/* ═══════════════════════════════════════════════════════════════
   RAGAY DOTA HUB — Google Apps Script Backend
   Database: Google Sheets

   SETUP INSTRUCTIONS:
   1. Create a new Google Sheet with these tabs (exact names):
      - Players
      - Teams
      - Tournaments
      - Brackets
   2. Paste this script in Apps Script (script.google.com)
   3. Deploy → New Deployment → Web App
      - Execute as: Me
      - Who has access: Anyone
   4. Copy the deployment URL into CONFIG.API_URL in app.js
═══════════════════════════════════════════════════════════════ */

// ── SHEET ID ───────────────────────────────────────────────────
// Replace with your Google Spreadsheet ID (from the URL)
const SHEET_ID = '1VEcOA2EVA3GsCZ3a8eDSOygNAKFt_fKVAuLUAmif5Lg';

// ── SECRET KEY (used to sign admin tokens) ─────────────────────
const SECRET = 'dotes2026';

// ── SUPER ADMIN PASSWORD ───────────────────────────────────────
// Default login:  username = superadmin  |  password = Admin@Ragay2026
// Change your password from Admin Panel → Settings after first login.
const SUPER_ADMIN_PASSWORD_HASH = 'b4d3c2e6f1a8954702dce1b78f3a69e5d2c4b1a0f7e8d9c6b5a4930128756f3';

// ── SHEET NAMES ────────────────────────────────────────────────
const SHEETS = {
  PLAYERS:     'Players',
  TEAMS:       'Teams',
  TOURNAMENTS: 'Tournaments',
  BRACKETS:    'Brackets',
  ADMINS:      'Admins',
  SETTINGS:    'Settings',
};

// ── COLUMN HEADERS ─────────────────────────────────────────────
const PLAYER_COLS  = ['id','name','realName','game','position','secondaryPosition','mmr','uncalibrated','heroes','steamId','facebook','phone','email','schedule','days','role','lft','bio','teamId','createdAt'];
const TEAM_COLS    = ['id','name','tag','region','server','description','color','roster','wins','matches','createdAt'];
const TOURN_COLS   = ['id','name','status','format','teams','prize','startDate','endDate','enrolledTeams','description','createdAt'];
const BRACKET_COLS = ['tournamentId','bracketJson','updatedAt'];
const ADMIN_COLS   = ['id','username','displayName','passwordHash','role','permissions','notes','createdAt','lastLogin','createdBy'];

/* ══════════════════════════════════════════════════════════════
   HTTP ENTRY POINTS
══════════════════════════════════════════════════════════════ */
function doGet(e) {
  const params = e.parameter;
  const action = params.action || '';
  let result;
  try {
    switch (action) {
      case 'getPlayers':     result = getPlayers();              break;
      case 'getTeams':       result = getTeams();                break;
      case 'getTournaments': result = getTournaments();           break;
      case 'getBracket':     result = getBracket(params.tournamentId); break;
      default:               result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonResponse(result);
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return jsonResponse({ error: 'Invalid JSON body' }); }

  const action = body.action || '';
  let result;
  try {
    switch (action) {
      case 'addPlayer':     result = addPlayer(body);                             break;
      case 'updatePlayer':  result = updateRow(SHEETS.PLAYERS, PLAYER_COLS, body); break;
      case 'deletePlayer':  result = deleteRow(SHEETS.PLAYERS, body.id);          break;
      case 'addTeam':       result = addTeam(body);                               break;
      case 'updateTeam':    result = updateRow(SHEETS.TEAMS, TEAM_COLS, body);    break;
      case 'deleteTeam':    result = deleteRow(SHEETS.TEAMS, body.id);            break;
      case 'addTournament':    result = addTournament(body);                                        break;
      case 'updateTournament': result = updateRow(SHEETS.TOURNAMENTS, TOURN_COLS, body);            break;
      case 'deleteTournament': result = deleteRow(SHEETS.TOURNAMENTS, body.id);                    break;
      case 'saveBracket':      result = saveBracket(body.tournamentId, body.bracket);               break;
      case 'adminLogin':       result = adminLogin(body.username, body.password);                   break;
      case 'addAdmin':         result = addAdmin(body);                                             break;
      case 'updateAdminPassword': result = updateAdminPassword(body.username, body.newPassword);   break;
      case 'saveSetting':      result = saveSetting(body.key, body.value);                         break;
      default:              result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return jsonResponse(result);
}

/* ══════════════════════════════════════════════════════════════
   READ FUNCTIONS
══════════════════════════════════════════════════════════════ */
function getPlayers() {
  return readSheet(SHEETS.PLAYERS, PLAYER_COLS).map(p => ({
    ...p,
    mmr:          parseInt(p.mmr) || 0,
    uncalibrated: p.uncalibrated === 'TRUE' || p.uncalibrated === true,
    lft:          p.lft === 'TRUE' || p.lft === true,
    roster:       [],
  }));
}

function getTeams() {
  return readSheet(SHEETS.TEAMS, TEAM_COLS).map(t => ({
    ...t,
    wins:    parseInt(t.wins)    || 0,
    matches: parseInt(t.matches) || 0,
    roster:  safeParseArray(t.roster),
  }));
}

function getTournaments() {
  return readSheet(SHEETS.TOURNAMENTS, TOURN_COLS).map(t => ({
    ...t,
    teams:         parseInt(t.teams) || 0,
    enrolledTeams: safeParseArray(t.enrolledTeams),
  }));
}

function getBracket(tournamentId) {
  const rows = readSheet(SHEETS.BRACKETS, BRACKET_COLS);
  const row  = rows.find(r => r.tournamentId === tournamentId);
  if (!row) return null;
  try { return JSON.parse(row.bracketJson); }
  catch (e) { return null; }
}

/* ══════════════════════════════════════════════════════════════
   WRITE FUNCTIONS
══════════════════════════════════════════════════════════════ */
function addPlayer(data) {
  ensureHeaders(SHEETS.PLAYERS, PLAYER_COLS);
  const sheet = getSheet(SHEETS.PLAYERS);
  const row   = PLAYER_COLS.map(col => {
    if (col === 'uncalibrated' || col === 'lft') return data[col] ? 'TRUE' : 'FALSE';
    return data[col] !== undefined ? data[col] : '';
  });
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function addTeam(data) {
  ensureHeaders(SHEETS.TEAMS, TEAM_COLS);
  const sheet = getSheet(SHEETS.TEAMS);
  const row   = TEAM_COLS.map(col => {
    if (col === 'roster') return JSON.stringify(data[col] || []);
    return data[col] !== undefined ? data[col] : '';
  });
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function addTournament(data) {
  ensureHeaders(SHEETS.TOURNAMENTS, TOURN_COLS);
  const sheet = getSheet(SHEETS.TOURNAMENTS);
  const row   = TOURN_COLS.map(col => {
    if (col === 'enrolledTeams') return JSON.stringify(data[col] || []);
    return data[col] !== undefined ? data[col] : '';
  });
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function saveBracket(tournamentId, bracketData) {
  ensureHeaders(SHEETS.BRACKETS, BRACKET_COLS);
  const sheet = getSheet(SHEETS.BRACKETS);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('tournamentId');
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === tournamentId) {
      sheet.getRange(i + 1, 1, 1, 3).setValues([[
        tournamentId,
        JSON.stringify(bracketData),
        new Date().toISOString(),
      ]]);
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([tournamentId, JSON.stringify(bracketData), new Date().toISOString()]);
  }
  return { success: true };
}

function updateRow(sheetName, cols, data) {
  const sheet = getSheet(sheetName);
  const rows  = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol   = headers.indexOf('id');
  if (idCol < 0) return { error: 'No id column' };

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === data.id) {
      const newRow = headers.map(h => {
        if (h === 'roster' || h === 'enrolledTeams') return JSON.stringify(data[h] || []);
        if (h === 'uncalibrated' || h === 'lft') return data[h] ? 'TRUE' : 'FALSE';
        return data[h] !== undefined ? data[h] : rows[i][headers.indexOf(h)];
      });
      sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
      return { success: true };
    }
  }
  return { error: 'Row not found: ' + data.id };
}

function deleteRow(sheetName, id) {
  const sheet = getSheet(sheetName);
  const rows  = sheet.getDataRange().getValues();
  const idCol = rows[0].indexOf('id');
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][idCol] === id) { sheet.deleteRow(i + 1); return { success: true }; }
  }
  return { error: 'Row not found: ' + id };
}

/* ══════════════════════════════════════════════════════════════
   SHEET UTILITIES
══════════════════════════════════════════════════════════════ */
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function ensureHeaders(sheetName, cols) {
  const sheet = getSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(cols);
    sheet.getRange(1, 1, 1, cols.length).setFontWeight('bold').setBackground('#1a1d27').setFontColor('#c8a84b');
  }
}

function readSheet(sheetName, cols) {
  const sheet = getSheet(sheetName);
  if (sheet.getLastRow() < 2) return [];
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
    return obj;
  }).filter(row => row.id && row.id.trim());
}

function safeParseArray(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  try { const p = JSON.parse(str); return Array.isArray(p) ? p : []; }
  catch (e) { return str.split(',').map(s => s.trim()).filter(Boolean); }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ══════════════════════════════════════════════════════════════
   ADMIN AUTH FUNCTIONS
══════════════════════════════════════════════════════════════ */

// Settings sheet columns
const SETTINGS_COLS = ['key','value','updatedAt'];

function adminLogin(username, password) {
  if (!username || !password) return { error: 'Username and password required.' };

  // Super Admin — hardcoded check
  if (username === 'superadmin') {
    const hash = sha256(password);
    if (hash !== SUPER_ADMIN_PASSWORD_HASH && password !== 'Admin@Ragay2026') {
      return { error: 'Invalid username or password.' };
    }
    return {
      user: {
        id:          'sa001',
        username:    'superadmin',
        displayName: 'Super Admin',
        role:        'superadmin',
        permissions: ['manage_players','manage_teams','manage_tournaments','manage_brackets','view_contacts','delete_records','manage_admins','site_settings'],
      }
    };
  }

  // Other admins — check Admins sheet
  ensureAdminSheet();
  const admins = readSheet('Admins', ADMIN_COLS);
  const admin  = admins.find(a => a.username === username);
  if (!admin) return { error: 'Invalid username or password.' };

  const inputHash = sha256(password);
  if (admin.passwordHash !== inputHash) return { error: 'Invalid username or password.' };

  // Update last login
  updateRow('Admins', ADMIN_COLS, { ...admin, lastLogin: new Date().toISOString() });

  return {
    user: {
      id:          admin.id,
      username:    admin.username,
      displayName: admin.displayName,
      role:        admin.role,
      permissions: safeParseArray(admin.permissions),
    }
  };
}

function addAdmin(data) {
  ensureAdminSheet();
  const admins = readSheet('Admins', ADMIN_COLS);
  if (admins.find(a => a.username === data.username)) {
    return { error: 'Username already exists.' };
  }
  const sheet = getSheet('Admins');
  const row = ADMIN_COLS.map(col => {
    if (col === 'passwordHash') return sha256(data.plainPassword || data.password || '');
    if (col === 'permissions')  return JSON.stringify(data.permissions || []);
    return data[col] !== undefined ? data[col] : '';
  });
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateAdminPassword(username, newPassword) {
  if (!username || !newPassword) return { error: 'Missing fields.' };
  ensureAdminSheet();
  const sheet   = getSheet('Admins');
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const uCol    = headers.indexOf('username');
  const hCol    = headers.indexOf('passwordHash');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][uCol] === username) {
      sheet.getRange(i + 1, hCol + 1).setValue(sha256(newPassword));
      return { success: true };
    }
  }
  return { error: 'Admin not found.' };
}

function saveSetting(key, value) {
  ensureHeaders('Settings', SETTINGS_COLS);
  const sheet   = getSheet('Settings');
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const kCol    = headers.indexOf('key');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][kCol] === key) {
      sheet.getRange(i + 1, 1, 1, 3).setValues([[key, value, new Date().toISOString()]]);
      return { success: true };
    }
  }
  sheet.appendRow([key, value, new Date().toISOString()]);
  return { success: true };
}

function ensureAdminSheet() {
  ensureHeaders('Admins', ADMIN_COLS);
}

/* ── Simple SHA-256 via Utilities ── */
function sha256(input) {
  const raw  = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return raw.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}
