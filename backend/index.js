const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ===== Plugins =====
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/cors'), {
  origin: 'http://localhost:3001',
  credentials: true
});

// ===== Paths =====
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DOCS_DIR = path.join(__dirname, '..', 'docs');

// ===== Password hashing (POC-grade but decent) =====
function makeSalt() {
  return crypto.randomBytes(16).toString('hex');
}
function hashPassword(password, salt) {
  // pbkdf2: ok per MVP; in prod useresti argon2/bcrypt
  const dk = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256');
  return dk.toString('hex');
}

// ===== Users storage =====
function ensureUsersFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(USERS_FILE)) {
    const salt = makeSalt();
    const passwordHash = hashPassword('password123', salt);
    const initial = [
      {
        username: 'admin',
        role: 'admin',
        enabled: true,
        salt,
        passwordHash,
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

function loadUsers() {
  ensureUsersFile();
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function findUser(username) {
  const users = loadUsers();
  return users.find(u => u.username === username);
}

// Backward compatibility: if user has "password" plaintext (older POC), accept it
function verifyPassword(user, password) {
  if (user.passwordHash && user.salt) {
    return hashPassword(password, user.salt) === user.passwordHash;
  }
  if (user.password) {
    return user.password === password;
  }
  return false;
}

// ===== Auth helpers =====
function requireAuth(req, reply) {
  const u = req.cookies.sessionUser;
  const r = req.cookies.sessionRole;
  if (!u || !r) {
    reply.code(401).send({ error: 'Not authenticated' });
    return false;
  }
  return true;
}

function requireAdmin(req, reply) {
  if (!requireAuth(req, reply)) return false;
  if (req.cookies.sessionRole !== 'admin') {
    reply.code(403).send({ error: 'Admin only' });
    return false;
  }
  return true;
}

// ===== MIME helpers for docs =====
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

// =========================
// Routes
// =========================

fastify.get('/healthz', async () => ({ status: 'ok' }));

// Who am I
fastify.get('/me', async (req, reply) => {
  if (!requireAuth(req, reply)) return;
  return {
    username: req.cookies.sessionUser,
    role: req.cookies.sessionRole
  };
});

// Login (sets session cookies)
fastify.post('/login', async (req, reply) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    reply.code(400).send({ error: 'Missing username/password' });
    return;
  }

  const user = findUser(username);
  if (!user || !user.enabled) {
    reply.code(401).send({ error: 'Invalid credentials' });
    return;
  }

  if (!verifyPassword(user, password)) {
    reply.code(401).send({ error: 'Invalid credentials' });
    return;
  }

  reply
    .setCookie('sessionUser', user.username, { httpOnly: true, sameSite: 'lax', path: '/' })
    .setCookie('sessionRole', user.role, { httpOnly: true, sameSite: 'lax', path: '/' });

  return { ok: true, username: user.username, role: user.role };
});

// Logout (clear cookies)
fastify.post('/logout', async (req, reply) => {
  reply
    .clearCookie('sessionUser', { path: '/' })
    .clearCookie('sessionRole', { path: '/' });
  return { ok: true };
});

// HOME tiles
fastify.get('/tiles', async (req, reply) => {
  if (!requireAuth(req, reply)) return;

  return [
    { title: 'Documenti', type: 'docs' },
    { title: 'POC', type: 'pocs' },
    { title: 'Demo Solution', type: 'demos' }
  ];
});

// ===== Documents dynamic listing =====
fastify.get('/api/docs', async (req, reply) => {
  if (!requireAuth(req, reply)) return;

  try {
    if (!fs.existsSync(DOCS_DIR)) return [];

    const entries = fs.readdirSync(DOCS_DIR, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile())
      .map(e => e.name)
      .filter(name => !name.startsWith('.'));

    const docs = files.map(name => {
      const full = path.join(DOCS_DIR, name);
      const stat = fs.statSync(full);
      return {
        name,
        ext: path.extname(name).replace('.', '').toLowerCase(),
        size: stat.size,
        mtime: stat.mtimeMs,
        url: `/docs/${encodeURIComponent(name)}`
      };
    });

    docs.sort((a, b) => b.mtime - a.mtime);
    return docs;
  } catch (err) {
    req.log.error(err);
    reply.code(500).send({ error: 'Unable to read docs directory' });
  }
});

// Serve docs files (auth protected)
fastify.get('/docs/:file', async (req, reply) => {
  if (!requireAuth(req, reply)) return;

  const requested = String(req.params.file || '');
  const safeName = path.basename(requested); // blocks ../
  const filePath = path.join(DOCS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    reply.code(404).send({ error: 'File not found' });
    return;
  }

  const mime = getMimeType(safeName);
  reply.header('Content-Type', mime);

  const disposition = shouldInline(safeName) ? 'inline' : 'attachment';
  reply.header('Content-Disposition', `${disposition}; filename="${safeName}"`);

  return reply.send(fs.createReadStream(filePath));
});

// =========================
// ADMIN: Users Management API
// =========================

// list users (admin-only) - do NOT return hash/salt
fastify.get('/users', async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  const users = loadUsers().map(u => ({
    username: u.username,
    role: u.role,
    enabled: !!u.enabled,
    createdAt: u.createdAt || null
  }));

  return users;
});

// create user (admin-only)
fastify.post('/users', async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    reply.code(400).send({ error: 'Missing username/password/role' });
    return;
  }
  if (!['admin', 'user'].includes(role)) {
    reply.code(400).send({ error: 'Invalid role' });
    return;
  }

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    reply.code(409).send({ error: 'User already exists' });
    return;
  }

  const salt = makeSalt();
  const passwordHash = hashPassword(password, salt);

  users.push({
    username,
    role,
    enabled: true,
    salt,
    passwordHash,
    createdAt: new Date().toISOString()
  });

  saveUsers(users);
  return { ok: true };
});

// update user (admin-only): role/enabled
fastify.put('/users/:username', async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  const target = req.params.username;
  const { role, enabled } = req.body || {};

  const users = loadUsers();
  const user = users.find(u => u.username === target);
  if (!user) {
    reply.code(404).send({ error: 'User not found' });
    return;
  }

  if (role !== undefined) {
    if (!['admin', 'user'].includes(role)) {
      reply.code(400).send({ error: 'Invalid role' });
      return;
    }
    user.role = role;
  }
  if (enabled !== undefined) {
    user.enabled = !!enabled;
  }

  saveUsers(users);
  return { ok: true };
});

// reset password (admin-only)
fastify.post('/users/:username/reset-password', async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  const target = req.params.username;
  const { password } = req.body || {};
  if (!password) {
    reply.code(400).send({ error: 'Missing password' });
    return;
  }

  const users = loadUsers();
  const user = users.find(u => u.username === target);
  if (!user) {
    reply.code(404).send({ error: 'User not found' });
    return;
  }

  const salt = makeSalt();
  user.salt = salt;
  user.passwordHash = hashPassword(password, salt);
  delete user.password; // remove old plaintext if present

  saveUsers(users);
  return { ok: true };
});

// delete user (admin-only)
fastify.delete('/users/:username', async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  const target = req.params.username;

  // safety: prevent deleting self
  if (target === req.cookies.sessionUser) {
    reply.code(400).send({ error: 'Cannot delete current logged user' });
    return;
  }

  const users = loadUsers();
  const next = users.filter(u => u.username !== target);

  if (next.length === users.length) {
    reply.code(404).send({ error: 'User not found' });
    return;
  }

  saveUsers(next);
  return { ok: true };
});

// ===== Start server (configurable port) =====
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
fastify.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => fastify.log.info(`✅ Backend listening on http://localhost:${PORT}`))
  .catch(err => {
    fastify.log.error(err);
    process.exit(1);
  });