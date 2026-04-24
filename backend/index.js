/**
 * GenAI Service Portal - Backend (Express)
 * - Auth via express-session
 * - Users stored in backend/data/users.json (supports salt+passwordHash)
 * - Projects stored in backend/data/projects.json
 * - Project docs served from: docs/<projectId>/*
 */

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// ========= Paths =========
const BASE_DIR = process.cwd();
const BACKEND_DIR = path.join(BASE_DIR, 'backend');
const DATA_DIR = path.join(BACKEND_DIR, 'data');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// docs/<projectId>/
const DOCS_ROOT = path.join(BASE_DIR, 'docs');

// ========= Middleware =========
app.use(express.json({ limit: '1mb' }));

app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'genai-portal-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax'
    // secure: true // abilitalo in HTTPS
  }
}));

// ========= Helpers: JSON storage =========
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function loadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ========= Helpers: Auth =========
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden (admin only)' });
  next();
}

// ========= Helpers: Password hashing =========
// support both most common legacy schemes to match your existing users.json:
// - sha256(password + salt)
// - sha256(salt + password)
function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function makeSaltHex() {
  return crypto.randomBytes(16).toString('hex'); // 32 hex chars
}

function computeHashes(password, salt) {
  return [
    sha256Hex(password + salt),
    sha256Hex(salt + password)
  ];
}

function verifyPassword(user, password) {
  // Legacy plaintext support (if ever present)
  if (typeof user.password === 'string') {
    return user.password === password;
  }

  // Hash+salt support (your current file)
  if (user.salt && user.passwordHash) {
    const candidates = computeHashes(password, user.salt);
    return candidates.includes(user.passwordHash);
  }

  return false;
}

// When we set a password (create/reset), we will store:
function buildHashedPasswordRecord(password) {
  const salt = makeSaltHex();
  // Choose a single canonical scheme going forward:
  const passwordHash = sha256Hex(password + salt);
  return { salt, passwordHash, hashScheme: 'sha256(password+salt)' };
}

// ========= Helpers: MIME =========
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls': return 'application/vnd.ms-excel';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.ppt': return 'application/vnd.ms-powerpoint';
    case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.zip': return 'application/zip';
    default: return 'application/octet-stream';
  }
}

function shouldInline(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.txt', '.json'].includes(ext);
}

// ========= Bootstrap data files =========
ensureDir(DATA_DIR);

// projects.json bootstrap (non tocca users.json!)
if (!fs.existsSync(PROJECTS_FILE)) {
  saveJson(PROJECTS_FILE, {
    projects: [
      {
        id: 'bookstack-mcp-consip',
        name: 'Bookstack MCP - Consip',
        description: 'Documentazione e demo del progetto',
        enabled: true
      }
    ]
  });
}

// OPTIONAL: break-glass bootstrap admin password
// If you are locked out, set env var once and restart backend:
//   Windows PowerShell:  $env:GENAI_BOOTSTRAP_ADMIN_PASSWORD="NuovaPass"; node index.js
// It will update (or create) admin in users.json with that password.
function bootstrapAdminIfEnvSet() {
  const pw = process.env.GENAI_BOOTSTRAP_ADMIN_PASSWORD;
  if (!pw) return;

  const users = loadJson(USERS_FILE, []);
  const idx = users.findIndex(u => u.username === 'admin');

  const rec = buildHashedPasswordRecord(pw);
  const adminUser = {
    username: 'admin',
    role: 'admin',
    enabled: true,
    ...rec,
    createdAt: new Date().toISOString()
  };

  if (idx >= 0) {
    users[idx] = { ...users[idx], ...adminUser };
  } else {
    users.push(adminUser);
  }

  saveJson(USERS_FILE, users);
  console.log('✅ Bootstrap admin password applied from GENAI_BOOTSTRAP_ADMIN_PASSWORD');
}

bootstrapAdminIfEnvSet();

// ========= Routes =========

// Health
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

// Me
app.get('/me', (req, res) => {
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.session.user);
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing username/password' });

  const users = loadJson(USERS_FILE, []);
  const user = users.find(u => u.username === username && u.enabled !== false);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!verifyPassword(user, password)) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.user = { username: user.username, role: user.role };
  res.json(req.session.user);
});

// Logout
app.post('/logout', (req, res) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(() => res.json({ ok: true }));
});

// ========= Projects API (fix /api/projects) =========
app.get('/api/projects', requireAuth, (req, res) => {
  const cfg = loadJson(PROJECTS_FILE, { projects: [] });
  const projects = (cfg.projects || []).filter(p => p.enabled !== false);
  res.json({ projects });
});

app.get('/api/projects/:projectId', requireAuth, (req, res) => {
  const projectId = String(req.params.projectId);
  const cfg = loadJson(PROJECTS_FILE, { projects: [] });
  const project = (cfg.projects || []).find(p => p.id === projectId && p.enabled !== false);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// ========= Project Docs API (project-scoped) =========
app.get('/api/projects/:projectId/docs', requireAuth, (req, res) => {
  const projectId = String(req.params.projectId);
  const projectDir = path.join(DOCS_ROOT, projectId);

  if (!fs.existsSync(projectDir)) {
    return res.json({ projectId, documents: [] });
  }

  const files = fs.readdirSync(projectDir, { withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(n => !n.startsWith('.'));

  const documents = files.map(name => ({
    name,
    ext: path.extname(name).replace('.', '').toLowerCase(),
    url: `/api/projects/${encodeURIComponent(projectId)}/docs/${encodeURIComponent(name)}`
  }));

  res.json({ projectId, documents });
});

app.get('/api/projects/:projectId/docs/:file', requireAuth, (req, res) => {
  const projectId = String(req.params.projectId);
  const safeFile = path.basename(String(req.params.file || ''));
  const filePath = path.join(DOCS_ROOT, projectId, safeFile);

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  res.setHeader('Content-Type', getMimeType(safeFile));
  res.setHeader('Content-Disposition', `${shouldInline(safeFile) ? 'inline' : 'attachment'}; filename="${safeFile}"`);
  fs.createReadStream(filePath).pipe(res);
});

// Placeholder demos API
app.get('/api/projects/:projectId/demos', requireAuth, (req, res) => {
  const projectId = String(req.params.projectId);
  res.json({ projectId, demos: [] });
});

// ========= Users API (admin) =========
app.get('/users', requireAdmin, (req, res) => {
  const users = loadJson(USERS_FILE, []);
  // never return hashes
  res.json(users.map(u => ({
    username: u.username,
    role: u.role,
    enabled: u.enabled !== false,
    createdAt: u.createdAt || null
  })));
});

app.post('/users', requireAdmin, (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ error: 'Missing username/password/role' });
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const users = loadJson(USERS_FILE, []);
  if (users.find(u => u.username === username)) return res.status(409).json({ error: 'User already exists' });

  const rec = buildHashedPasswordRecord(password);

  users.push({
    username,
    role,
    enabled: true,
    ...rec,
    createdAt: new Date().toISOString()
  });

  saveJson(USERS_FILE, users);
  res.json({ ok: true });
});

app.put('/users/:username', requireAdmin, (req, res) => {
  const username = String(req.params.username);
  const { role, enabled } = req.body || {};

  const users = loadJson(USERS_FILE, []);
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (role !== undefined) {
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    user.role = role;
  }
  if (enabled !== undefined) user.enabled = !!enabled;

  saveJson(USERS_FILE, users);
  res.json({ ok: true });
});

app.post('/users/:username/reset-password', requireAdmin, (req, res) => {
  const username = String(req.params.username);
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Missing password' });

  const users = loadJson(USERS_FILE, []);
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const rec = buildHashedPasswordRecord(password);
  user.salt = rec.salt;
  user.passwordHash = rec.passwordHash;
  user.hashScheme = rec.hashScheme;
  delete user.password; // remove any legacy plaintext

  saveJson(USERS_FILE, users);
  res.json({ ok: true });
});

app.delete('/users/:username', requireAdmin, (req, res) => {
  const target = String(req.params.username);
  const current = req.session.user?.username;

  if (target === current) {
    return res.status(400).json({ error: 'Cannot delete current logged user' });
  }

  const users = loadJson(USERS_FILE, []);
  const next = users.filter(u => u.username !== target);

  if (next.length === users.length) return res.status(404).json({ error: 'User not found' });

  saveJson(USERS_FILE, next);
  res.json({ ok: true });
});

// ========= 404 =========
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// ========= Start =========
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`   - /api/projects ready`);
  console.log(`   - users.json path: ${USERS_FILE}`);
  console.log(`   - projects.json path: ${PROJECTS_FILE}`);
});