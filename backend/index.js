const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://genai-portal.onrender.com'
  ],
  credentials: true
}));

app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const DOCS_DIR = path.join(DATA_DIR, 'docs');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectDir = getProjectDocsDir(req.params.id);
    fs.mkdirSync(projectDir, { recursive: true });
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^\w.\- ()]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({ storage });

const readJSON = (file) => {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`Errore lettura file ${file}:`, e);
    return [];
  }
};

const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
};

const getUsersArray = () => {
  const data = readJSON(USERS_FILE);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.users)) {
    return data.users;
  }

  return [];
};

const saveUsersArray = (users) => {
  writeJSON(USERS_FILE, users);
};

const getProjectsArray = () => {
  const data = readJSON(PROJECTS_FILE);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.projects)) {
    return data.projects;
  }

  return [];
};

const saveProjectsArray = (projects) => {
  writeJSON(PROJECTS_FILE, { projects });
};

const generateId = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    || Date.now().toString();

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({
  salt,
  passwordHash: crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex'),
  hashScheme: 'sha256(password+salt)'
});

const safePathSegment = (value) =>
  String(value || '').replace(/[^a-zA-Z0-9._ -]/g, '_');

const getProjectDocsDir = (projectId) =>
  path.join(DOCS_DIR, safePathSegment(projectId));

const getDocumentUrl = (req, projectId, filename) =>
  `${req.protocol}://${req.get('host')}/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(filename)}`;

// ==========================
// LOGIN
// ==========================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const usersData = readJSON(USERS_FILE);
  const users = Array.isArray(usersData) ? usersData : usersData.users || [];

  const user = users.find((u) => u.username === username);

  if (!user || !user.enabled) {
    return res.status(401).json({ message: 'Utente non valido' });
  }

  const hash = crypto
    .createHash('sha256')
    .update(password + user.salt)
    .digest('hex');

  if (hash !== user.passwordHash) {
    return res.status(401).json({ message: 'Password errata' });
  }

  res.json({
    username: user.username,
    role: user.role
  });
});

app.get('/api/me', (req, res) => {
  res.status(401).json({ message: 'Non autenticato' });
});

// ==========================
// USERS
// ==========================
app.get('/api/users', (req, res) => {
  const users = getUsersArray().map(({ passwordHash, salt, ...user }) => user);
  res.json({ users });
});

app.post('/api/users', (req, res) => {
  const { username, password, role = 'user' } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: 'Username e password sono obbligatori'
    });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({
      message: 'Ruolo non valido'
    });
  }

  const users = getUsersArray();
  const normalizedUsername = username.trim();

  const alreadyExists = users.some(
    (user) => user.username.toLowerCase() === normalizedUsername.toLowerCase()
  );

  if (alreadyExists) {
    return res.status(409).json({
      message: 'Esiste gia un utente con questo username'
    });
  }

  const passwordData = hashPassword(password);
  const newUser = {
    username: normalizedUsername,
    role,
    enabled: true,
    ...passwordData,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsersArray(users);

  const { passwordHash, salt, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.delete('/api/users/:username', (req, res) => {
  const { username } = req.params;
  const users = getUsersArray();
  const updatedUsers = users.filter((user) => user.username !== username);

  if (updatedUsers.length === users.length) {
    return res.status(404).json({
      message: 'Utente non trovato'
    });
  }

  saveUsersArray(updatedUsers);

  res.json({
    message: 'Utente eliminato correttamente'
  });
});

app.post('/api/users/:username/reset-password', (req, res) => {
  const { username } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      message: 'Password obbligatoria'
    });
  }

  const users = getUsersArray();
  const index = users.findIndex((user) => user.username === username);

  if (index === -1) {
    return res.status(404).json({
      message: 'Utente non trovato'
    });
  }

  users[index] = {
    ...users[index],
    ...hashPassword(password)
  };

  saveUsersArray(users);

  res.json({
    message: 'Password aggiornata correttamente'
  });
});

// ==========================
// PROJECTS
// ==========================
app.get('/api/projects', (req, res) => {
  const projects = getProjectsArray();
  res.json({ projects });
});

app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({
      message: 'Nome e descrizione sono obbligatori'
    });
  }

  const projects = getProjectsArray();

  const id = generateId(name);

  const alreadyExists = projects.some(
    (project) => String(project.id) === String(id)
  );

  if (alreadyExists) {
    return res.status(409).json({
      message: 'Esiste già un progetto con questo nome'
    });
  }

  const newProject = {
    id,
    name: name.trim(),
    description: description.trim(),
    enabled: true,
    createdAt: new Date().toISOString()
  };

  projects.push(newProject);
  saveProjectsArray(projects);

  res.status(201).json(newProject);
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;

  const projects = getProjectsArray();

  const projectExists = projects.some(
    (project) => String(project.id) === String(id)
  );

  if (!projectExists) {
    return res.status(404).json({
      message: 'Progetto non trovato'
    });
  }

  const updatedProjects = projects.filter(
    (project) => String(project.id) !== String(id)
  );

  saveProjectsArray(updatedProjects);

  res.json({
    message: 'Progetto eliminato correttamente'
  });
});

app.get('/api/projects/:id/documents', (req, res) => {
  const { id } = req.params;
  const projectDir = getProjectDocsDir(id);

  if (!fs.existsSync(projectDir)) {
    return res.json({ documents: [] });
  }

  const documents = fs.readdirSync(projectDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      name: entry.name,
      url: getDocumentUrl(req, id, entry.name)
    }));

  res.json({ documents });
});

app.post('/api/projects/:id/documents', upload.array('files'), (req, res) => {
  const documents = (req.files || []).map((file) => ({
    name: file.filename,
    url: getDocumentUrl(req, req.params.id, file.filename)
  }));

  res.status(201).json({ documents });
});

app.get('/api/projects/:id/documents/:filename', (req, res) => {
  const filePath = path.join(
    getProjectDocsDir(req.params.id),
    safePathSegment(req.params.filename)
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      message: 'Documento non trovato'
    });
  }

  res.sendFile(filePath);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend attivo su http://localhost:${PORT}`);
});
