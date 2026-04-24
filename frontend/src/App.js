import { useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:3000';

function App() {
  // ===== Session / Me =====
  const [logged, setLogged] = useState(false);
  const [me, setMe] = useState({ username: '', role: '' });
  const isAdmin = me.role === 'admin';

  // ===== Login form =====
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

  // ===== Views =====
  const [view, setView] = useState('projects-home'); // projects-home | project-dashboard | adminUsers
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');

  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProject, setActiveProject] = useState(null);

  // ===== Docs modal (project-scoped) =====
  const [showDocs, setShowDocs] = useState(false);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [docsSearch, setDocsSearch] = useState('');

  // ===== Admin Users (placeholder UI) =====
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  // ===== Helpers =====
  const getFileIcon = (name) => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext)) return '🧾';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📽️';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    if (['zip'].includes(ext)) return '🗜️';
    return '📁';
  };

  const goProjectsHome = () => {
    setView('projects-home');
    setActiveProjectId(null);
    setActiveProject(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ===== Bootstrap session =====
  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch(`${API}/me`, { credentials: 'include' });
        if (!meRes.ok) return;
        setMe(await meRes.json());
        setLogged(true);
        await loadProjects();
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== API calls =====
  const loadProjects = async () => {
    setProjectsLoading(true);
    setProjectsError('');
    try {
      const res = await fetch(`${API}/api/projects`, { credentials: 'include' });
      if (!res.ok) {
        setProjectsError('Impossibile caricare i progetti (API /api/projects)');
        setProjects([]);
        return;
      }
      const data = await res.json();
      const list = data.projects || [];
      setProjects(list.filter(p => p.enabled !== false));
    } catch {
      setProjectsError('Errore di connessione (progetti)');
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const openProject = async (project) => {
    setActiveProjectId(project.id);
    setActiveProject(project);
    setView('project-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openProjectDocs = async () => {
    if (!activeProjectId) return;

    setShowDocs(true);
    setDocs([]);
    setDocsSearch('');
    setDocsError('');
    setDocsLoading(true);

    try {
      const res = await fetch(`${API}/api/projects/${encodeURIComponent(activeProjectId)}/docs`, {
        credentials: 'include'
      });
      if (!res.ok) {
        setDocsError('Impossibile caricare documenti del progetto');
        setDocs([]);
        return;
      }
      const data = await res.json();
      setDocs(data.documents || []);
    } catch {
      setDocsError('Errore di connessione (docs progetto)');
      setDocs([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const filteredDocs = useMemo(() => {
    const q = docsSearch.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(d => d.name.toLowerCase().includes(q));
  }, [docs, docsSearch]);

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await fetch(`${API}/users`, { credentials: 'include' });
      if (!res.ok) {
        setUsersError('Impossibile caricare utenti (solo admin)');
        setUsers([]);
        return;
      }
      setUsers(await res.json());
    } catch {
      setUsersError('Errore di connessione (users)');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // ===== Auth =====
  const login = async () => {
    setError('');
    if (!loginUser.trim() || !loginPass) {
      setError('Inserisci username e password');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: loginUser.trim(), password: loginPass })
      });

      if (!res.ok) {
        setError('Credenziali non valide');
        return;
      }

      const data = await res.json();
      setMe({ username: data.username, role: data.role });
      setLogged(true);
      setView('projects-home');

      await loadProjects();
    } catch {
      setError('Backend non raggiungibile');
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try { await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    setLogged(false);
    setMe({ username: '', role: '' });
    setLoginUser('');
    setLoginPass('');
    setError('');
    goProjectsHome();
  };

  // ===== LOGIN PAGE =====
  if (!logged) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>GenAI Service Portal</h1>
          <p style={styles.subtitle}>Projects &amp; Knowledge Portal</p>

          <form onSubmit={(e) => { e.preventDefault(); login(); }}>
            <div style={styles.formRow}>
              <label style={styles.label}>Username</label>
              <input
                style={styles.input}
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="Inserisci username"
              />
            </div>

            <div style={styles.formRow}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                autoComplete="current-password"
                placeholder="Inserisci password"
              />
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <button
              type="submit"
              style={{ ...styles.primaryButton, opacity: authLoading ? 0.85 : 1 }}
              disabled={authLoading}
            >
              {authLoading ? 'Accesso…' : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ===== APP =====
  return (
    <div style={styles.page}>
      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.brand} onClick={goProjectsHome} title="Torna ai progetti">
          GenAI Service Portal
        </div>

        <div style={styles.userArea}>
          <span style={styles.userLabel}>👤 {me.username} ({me.role})</span>

          {isAdmin && (
            <button
              style={styles.secondaryButton}
              onClick={async () => { setView('adminUsers'); await loadUsers(); }}
            >
              User Management
            </button>
          )}

          <button style={styles.logoutButton} onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        {/* HOME = PROJECTS */}
        {view === 'projects-home' && (
          <>
            <h1 style={styles.pageTitle}>Projects</h1>

            {projectsError && <p style={styles.muted}>{projectsError}</p>}
            {projectsLoading && <p style={styles.muted}>Caricamento progetti…</p>}

            {!projectsLoading && (
              <div style={styles.grid}>
                {projects.map(p => (
                  <Tile
                    key={p.id}
                    title={p.name}
                    desc={p.description || 'Apri progetto'}
                    onClick={() => openProject(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* PROJECT DASHBOARD */}
        {view === 'project-dashboard' && activeProject && (
          <>
            <div style={styles.breadcrumbRow}>
              <button style={styles.backButton} onClick={goProjectsHome}>← Progetti</button>
              <h1 style={styles.pageTitle}>{activeProject.name}</h1>
            </div>

            <p style={styles.muted}>{activeProject.description}</p>

            <div style={styles.grid}>
              <Tile title="Documenti" desc="File del progetto" onClick={openProjectDocs} />
              <Tile title="Demo" desc="Demo del progetto" onClick={() => alert('Demo placeholder (project-scoped)')} />
            </div>
          </>
        )}

        {/* ADMIN USERS */}
        {view === 'adminUsers' && (
          <>
            <div style={styles.breadcrumbRow}>
              <button style={styles.backButton} onClick={goProjectsHome}>← Progetti</button>
              <h1 style={styles.pageTitle}>User Management</h1>
            </div>

            {usersLoading && <p style={styles.muted}>Caricamento…</p>}
            {usersError && <p style={styles.errorText}>{usersError}</p>}

            {!usersLoading && !usersError && (
              <div style={styles.adminTableCard}>
                {users.length === 0 ? (
                  <p style={styles.muted}>Nessun utente.</p>
                ) : (
                  users.map(u => (
                    <div key={u.username} style={styles.userRow}>
                      <div style={{ fontWeight: 700 }}>{u.username}</div>
                      <div style={styles.mutedSmall}>{u.role}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* PROJECT DOCS MODAL */}
      {showDocs && (
        <div style={styles.modalOverlay} onClick={() => setShowDocs(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Documenti — {activeProject?.name}</h3>
              <button style={styles.modalCloseX} onClick={() => setShowDocs(false)}>✕</button>
            </div>

            <input
              style={styles.input}
              placeholder="Cerca…"
              value={docsSearch}
              onChange={(e) => setDocsSearch(e.target.value)}
            />

            {docsLoading && <p style={styles.muted}>Caricamento…</p>}
            {docsError && <p style={styles.errorText}>{docsError}</p>}

            {!docsLoading && !docsError && (
              <div style={styles.docList}>
                {filteredDocs.length === 0 ? (
                  <p style={styles.muted}>Nessun documento trovato.</p>
                ) : (
                  filteredDocs.map(d => (
                    <a
                      key={d.name}
                      className="doc-item"
                      style={styles.docItem}
                      href={`${API}${d.url}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span style={styles.docIcon}>{getFileIcon(d.name)}</span>
                      <span style={styles.docName}>{d.name}</span>
                      <span style={styles.docMeta}>{(d.ext || '').toUpperCase()}</span>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ title, desc, onClick }) {
  return (
    <div className="tile" style={styles.tile} onClick={onClick} role="button" tabIndex={0}>
      <h3 style={styles.tileTitle}>{title}</h3>
      <p style={styles.tileType}>{desc}</p>
      <span className="acn-link">Apri →</span>
    </div>
  );
}

const styles = {
  // LOGIN
  loginPage: {
    minHeight: '100vh',
    background: '#0f0f17',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontFamily: 'system-ui, Arial'
  },
  loginCard: {
    width: '400px',
    padding: '32px',
    background: '#1b1b2b',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 0 0 1px #2a2a3d'
  },
  logo: {
    margin: '0 0 10px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap'
  },
  subtitle: { margin: '0 0 18px', color: '#b3b3c7' },
  formRow: { marginBottom: 12, textAlign: 'left' },
  label: { display: 'block', marginBottom: 6, color: '#b3b3c7', fontSize: 14 },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #2a2a3d',
    background: '#121224',
    color: '#fff'
  },
  primaryButton: {
    width: '100%',
    padding: '12px 18px',
    background: '#a100ff',
    border: 'none',
    color: '#fff',
    fontWeight: 800,
    borderRadius: 8,
    cursor: 'pointer'
  },
  errorText: { color: '#ff6b6b', margin: '8px 0 10px' },

  // PAGE
  page: { minHeight: '100vh', background: '#0f0f17', color: '#fff' },
  topBar: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: 64,
    background: '#1b1b2b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 40px',
    boxShadow: '0 1px 0 #2a2a3d',
    zIndex: 1000
  },
  brand: { fontWeight: 800, cursor: 'pointer', letterSpacing: '0.2px' },
  userArea: { display: 'flex', alignItems: 'center', gap: 12 },
  userLabel: { color: '#b3b3c7', fontSize: 14, whiteSpace: 'nowrap' },
  logoutButton: {
    background: 'transparent',
    border: '1px solid #a100ff',
    color: '#a100ff',
    padding: '8px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 700
  },
  secondaryButton: {
    padding: '8px 14px',
    background: 'transparent',
    border: '1px solid #a100ff',
    color: '#a100ff',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 700
  },

  content: { padding: '96px 40px 40px' },
  pageTitle: { margin: '0 0 24px 0' },
  muted: { color: '#b3b3c7' },

  breadcrumbRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 },
  backButton: {
    background: 'transparent',
    border: '1px solid #2a2a3d',
    color: '#b3b3c7',
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer'
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 320px)', gap: 24, justifyContent: 'flex-start' },
  tile: {
    background: '#1b1b2b',
    padding: 24,
    borderRadius: 10,
    boxShadow: '0 0 0 1px #2a2a3d',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  tileTitle: { margin: '0 0 10px 0' },
  tileType: { margin: '0 0 18px 0', color: '#b3b3c7', fontSize: 14 },

  // Modal docs
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: 24
  },
  modal: {
    width: 'min(760px, 95vw)',
    background: '#1b1b2b',
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
    padding: 18,
    border: '1px solid #2a2a3d'
  },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalCloseX: { background: 'transparent', border: 'none', color: '#b3b3c7', cursor: 'pointer', fontSize: 18 },

  docList: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '46vh', overflow: 'auto' },
  docItem: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr auto',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #2a2a3d',
    background: '#161629',
    textDecoration: 'none',
    color: '#fff'
  },
  docIcon: { fontSize: 18 },
  docName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  docMeta: { color: '#b3b3c7', fontSize: 12 },

  // Admin view placeholder
  adminTableCard: { marginTop: 16, padding: 18, border: '1px solid #2a2a3d', borderRadius: 12, background: '#1b1b2b' },
  userRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #2a2a3d' },
  mutedSmall: { color: '#b3b3c7', fontSize: 12 }
};

export default App;