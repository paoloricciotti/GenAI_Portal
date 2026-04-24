import { useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:3000';

function App() {
  // ===== Session / Me =====
  const [logged, setLogged] = useState(false);
  const [me, setMe] = useState({ username: '', role: '' });

  // ===== Login form =====
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

  // ===== App =====
  const [tiles, setTiles] = useState([]);
  const [view, setView] = useState('home'); // home | pocs | pocDetail | demos | demoDetail | adminUsers
  const [selectedPoc, setSelectedPoc] = useState(null);
  const [selectedDemo, setSelectedDemo] = useState(null);

  const pocs = ['POC 1', 'POC 2', 'POC 3', 'POC 4', 'POC 5', 'POC 6'];
  const demos = [
    'Demo Solution 1',
    'Demo Solution 2',
    'Demo Solution 3',
    'Demo Solution 4',
    'Demo Solution 5',
    'Demo Solution 6'
  ];

  const isAdmin = me.role === 'admin';

  // ===== Documenti modal =====
  const [showDocs, setShowDocs] = useState(false);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [docsSearch, setDocsSearch] = useState('');

  // ===== Admin: Users =====
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  const [newU, setNewU] = useState('');
  const [newP, setNewP] = useState('');
  const [newR, setNewR] = useState('user');
  const [createMsg, setCreateMsg] = useState('');

  const [resetTarget, setResetTarget] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [resetMsg, setResetMsg] = useState('');

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

  // ===== Bootstrap session (refresh-safe) =====
  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch(`${API}/me`, { credentials: 'include' });
        if (!meRes.ok) return;

        const meData = await meRes.json();
        setMe(meData);
        setLogged(true);

        const tilesRes = await fetch(`${API}/tiles`, { credentials: 'include' });
        if (tilesRes.ok) setTiles(await tilesRes.json());
      } catch {
        // ignore
      }
    })();
  }, []);

  // ===== Navigation (HOME sempre funzionante) =====
  const goHome = () => {
    setView('home');
    setSelectedPoc(null);
    setSelectedDemo(null);
    // non serve history.back: siamo SPA state-based
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      setView('home');

      const tilesRes = await fetch(`${API}/tiles`, { credentials: 'include' });
      if (tilesRes.ok) setTiles(await tilesRes.json());
    } catch {
      setError('Backend non raggiungibile');
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }

    setLogged(false);
    setMe({ username: '', role: '' });
    setTiles([]);
    setView('home');
    setSelectedPoc(null);
    setSelectedDemo(null);

    setLoginUser('');
    setLoginPass('');
    setError('');

    setShowDocs(false);
    setDocs([]);
    setDocsError('');
    setDocsSearch('');

    setUsers([]);
    setUsersError('');
    setCreateMsg('');
    setResetMsg('');
  };

  // ===== Documenti =====
  const openDocs = async () => {
    setDocsError('');
    setDocsSearch('');
    setShowDocs(true);
    setDocsLoading(true);

    try {
      const res = await fetch(`${API}/api/docs`, { credentials: 'include' });
      if (!res.ok) {
        setDocsError('Impossibile caricare documenti');
        setDocs([]);
      } else {
        setDocs(await res.json());
      }
    } catch {
      setDocsError('Errore di connessione');
      setDocs([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const filteredDocs = useMemo(() => {
    const q = docsSearch.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.name.toLowerCase().includes(q));
  }, [docs, docsSearch]);

  // ===== Admin: Users =====
  const loadUsers = async () => {
    setUsersError('');
    setUsersLoading(true);
    try {
      const res = await fetch(`${API}/users`, { credentials: 'include' });
      if (!res.ok) {
        setUsersError('Impossibile caricare utenti (solo admin)');
        setUsers([]);
      } else {
        setUsers(await res.json());
      }
    } catch {
      setUsersError('Errore di connessione');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const createUser = async () => {
    setCreateMsg('');
    if (!newU.trim() || !newP || !newR) {
      setCreateMsg('Compila username, password e ruolo.');
      return;
    }

    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: newU.trim(), password: newP, role: newR })
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setCreateMsg(j.error || 'Errore creazione utente');
        return;
      }

      setCreateMsg('✅ Utente creato');
      setNewU('');
      setNewP('');
      setNewR('user');
      await loadUsers();
    } catch {
      setCreateMsg('Errore di connessione');
    }
  };

  const updateUser = async (username, patch) => {
    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch)
      });
      if (res.ok) await loadUsers();
    } catch {
      // ignore
    }
  };

  const deleteUser = async (username) => {
    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) await loadUsers();
    } catch {
      // ignore
    }
  };

  const resetPassword = async () => {
    setResetMsg('');
    if (!resetTarget || !resetPass) {
      setResetMsg('Seleziona utente e inserisci nuova password.');
      return;
    }

    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(resetTarget)}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: resetPass })
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setResetMsg(j.error || 'Errore reset password');
        return;
      }

      setResetMsg('✅ Password aggiornata');
      setResetPass('');
    } catch {
      setResetMsg('Errore di connessione');
    }
  };

  // ===== LOGIN PAGE =====
  if (!logged) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>GenAI Service Portal</h1>
          <p style={styles.subtitle}>Solutions &amp; Knowledge Portal</p>

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

          <p style={styles.loginHint}>(MVP) Login interno con ruoli — evolvibile a SSO.</p>
        </div>
      </div>
    );
  }

  // ===== APP =====
  return (
    <div style={styles.page}>
      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.brand} onClick={goHome} title="Torna alla Home">
          GenAI Service Portal
        </div>

        <div style={styles.userArea}>
          <span style={styles.userLabel}>👤 {me.username} ({me.role})</span>
          <button style={styles.logoutButton} onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        {/* HOME */}
        {view === 'home' && (
          <>
            <h1 style={styles.pageTitle}>Solutions Portal</h1>

            <div style={styles.grid}>
              <Tile title="Documenti" desc="Seleziona un file" onClick={openDocs} />
              <Tile title="POC" desc="Vedi tutte le POC" onClick={() => setView('pocs')} />
              <Tile title="Demo Solution" desc="Vedi tutte le demo" onClick={() => setView('demos')} />

              {isAdmin && (
                <Tile
                  title="User Management"
                  desc="Gestione utenti e ruoli"
                  onClick={async () => { setView('adminUsers'); await loadUsers(); }}
                />
              )}
            </div>
          </>
        )}

        {/* POC LIST */}
        {view === 'pocs' && (
          <>
            <div style={styles.breadcrumbRow}>
              <button style={styles.backButton} onClick={goHome}>← Home</button>
              <h1 style={styles.pageTitle}>POC</h1>
            </div>

            <div style={styles.grid}>
              {pocs.map((p) => (
                <Tile
                  key={p}
                  title={p}
                  desc="Apri dettaglio"
                  onClick={() => { setSelectedPoc(p); setView('pocDetail'); }}
                />
              ))}
            </div>
          </>
        )}

        {/* POC DETAIL */}
        {view === 'pocDetail' && (
          <>
            <div style={styles.breadcrumbRow}>
              <button style={styles.backButton} onClick={goHome}>← Home</button>
              <h1 style={styles.pageTitle}>{selectedPoc}</h1>
            </div>

            <div style={styles.detailCard}>
              <p style={styles.muted}>Contenuti in arrivo per <strong>{selectedPoc}</strong>.</p>
            </div>
          </>
        )}

        {/* DEMO LIST */}
        {view === 'demos' && (
          <>
            <div style={styles.breadcrumbRow}>
              <button style={styles.backButton} onClick={goHome}>← Home</button>
              <h1 style={styles.pageTitle}>Demo Solution</h1>
            </div>

            <div style={styles.grid}>
              {demos.map((d) => (
                <Tile
                  key={d}
                  title={d}
                  desc="Apri dettaglio"
                  onClick={() => { setSelectedDemo(d); setView('demoDetail'); }}
                />
              ))}
            </div>
          </>
        )}

        {/* DEMO DETAIL */}
        {view === 'demoDetail' && (
          <>
            <div style={styles.breadcrumbRow}>
              <button style={styles.backButton} onClick={goHome}>← Home</button>
              <h1 style={styles.pageTitle}>{selectedDemo}</h1>
            </div>

            <div style={styles.detailCard}>
              <p style={styles.muted}>Contenuti demo in arrivo per <strong>{selectedDemo}</strong>.</p>
            </div>
          </>
        )}

        {/* ADMIN USERS */}
        {view === 'adminUsers' && (
          <>
            <div style={styles.breadcrumbRow}>
              <button style={styles.backButton} onClick={goHome}>← Home</button>
              <h1 style={styles.pageTitle}>User Management</h1>
            </div>

            <div style={styles.adminGrid}>
              {/* Create user */}
              <div style={styles.adminCard}>
                <h3 style={{ marginTop: 0 }}>Crea nuovo utente</h3>

                <div style={styles.formRow}>
                  <label style={styles.label}>Username</label>
                  <input style={styles.input} value={newU} onChange={(e) => setNewU(e.target.value)} />
                </div>

                <div style={styles.formRow}>
                  <label style={styles.label}>Password</label>
                  <input style={styles.input} type="password" value={newP} onChange={(e) => setNewP(e.target.value)} />
                </div>

                <div style={styles.formRow}>
                  <label style={styles.label}>Ruolo</label>
                  <select style={styles.input} value={newR} onChange={(e) => setNewR(e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <button style={styles.primaryButton} onClick={createUser}>Crea utente</button>
                {createMsg && <p style={styles.muted}>{createMsg}</p>}
              </div>

              {/* Reset password */}
              <div style={styles.adminCard}>
                <h3 style={{ marginTop: 0 }}>Reset password</h3>

                <div style={styles.formRow}>
                  <label style={styles.label}>Utente</label>
                  <select style={styles.input} value={resetTarget} onChange={(e) => setResetTarget(e.target.value)}>
                    <option value="">-- seleziona --</option>
                    {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                  </select>
                </div>

                <div style={styles.formRow}>
                  <label style={styles.label}>Nuova password</label>
                  <input style={styles.input} type="password" value={resetPass} onChange={(e) => setResetPass(e.target.value)} />
                </div>

                <button style={styles.secondaryButton} onClick={resetPassword}>Aggiorna password</button>
                {resetMsg && <p style={styles.muted}>{resetMsg}</p>}
              </div>
            </div>

            {/* Users list */}
            <div style={styles.adminTableCard}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3 style={{ margin: 0 }}>Utenti</h3>
                <button style={styles.secondaryButton} onClick={loadUsers}>Ricarica</button>
              </div>

              {usersLoading && <p style={styles.muted}>Caricamento…</p>}
              {usersError && <p style={styles.errorText}>{usersError}</p>}

              {!usersLoading && !usersError && (
                <div style={{ marginTop: 12 }}>
                  {users.length === 0 ? (
                    <p style={styles.muted}>Nessun utente.</p>
                  ) : (
                    users.map(u => (
                      <div key={u.username} style={styles.userRow}>
                        <div style={{ minWidth: 160 }}>
                          <div style={{ fontWeight: 700 }}>{u.username}</div>
                          <div style={styles.mutedSmall}>{u.createdAt ? `created: ${u.createdAt}` : ''}</div>
                        </div>

                        <div style={{ display:'flex', gap: 10, alignItems:'center', flexWrap:'wrap' }}>
                          <label style={styles.mutedSmall}>role</label>
                          <select
                            style={styles.smallSelect}
                            value={u.role}
                            onChange={(e) => updateUser(u.username, { role: e.target.value })}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>

                          <label style={styles.mutedSmall}>enabled</label>
                          <input
                            type="checkbox"
                            checked={!!u.enabled}
                            onChange={(e) => updateUser(u.username, { enabled: e.target.checked })}
                          />

                          <button
                            style={styles.dangerButton}
                            onClick={() => deleteUser(u.username)}
                            title="Elimina utente"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ===== MODAL DOCUMENTI (VERSIONE CORRETTA “come seconda immagine”) ===== */}
      {showDocs && (
        <div style={styles.modalOverlay} onClick={() => setShowDocs(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Documenti</h3>
              <button
                style={styles.modalCloseX}
                onClick={() => setShowDocs(false)}
                title="Chiudi"
              >
                ✕
              </button>
            </div>

            <p style={styles.modalSubtitle}>
              Elenco file presenti in <code>/docs</code>.
            </p>

            <input
              style={styles.input}
              placeholder="Cerca per nome file…"
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
                  filteredDocs.map((d) => (
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

            <div style={styles.modalFooter}>
              <button style={styles.secondaryButton} onClick={() => setShowDocs(false)}>
                Chiudi
              </button>
            </div>
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
    width: '380px',
    padding: '32px',
    background: '#1b1b2b',
    borderRadius: '10px',
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

  // common form
  formRow: { marginBottom: 12, textAlign: 'left' },
  label: { display: 'block', marginBottom: 6, color: '#b3b3c7', fontSize: 14 },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #2a2a3d',
    background: '#121224',
    color: '#fff',
    outline: 'none'
  },
  errorText: { color: '#ff6b6b', margin: '8px 0 10px' },
  muted: { color: '#b3b3c7' },
  mutedSmall: { color: '#b3b3c7', fontSize: 12 },

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
  secondaryButton: {
    padding: '10px 14px',
    background: 'transparent',
    border: '1px solid #a100ff',
    color: '#a100ff',
    fontWeight: 700,
    borderRadius: 8,
    cursor: 'pointer'
  },
  dangerButton: {
    padding: '8px 12px',
    background: 'transparent',
    border: '1px solid #ff6b6b',
    color: '#ff6b6b',
    fontWeight: 700,
    borderRadius: 8,
    cursor: 'pointer'
  },
  loginHint: { marginTop: 14, fontSize: 13, color: '#b3b3c7' },

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

  content: { padding: '96px 40px 40px' },
  pageTitle: { margin: '0 0 24px 0' },

  breadcrumbRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  backButton: {
    background: 'transparent',
    border: '1px solid #2a2a3d',
    color: '#b3b3c7',
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer'
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 24
  },

  tile: {
    background: '#1b1b2b',
    padding: 24,
    borderRadius: 10,
    boxShadow: '0 0 0 1px #2a2a3d',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    userSelect: 'none'
  },
  tileTitle: { margin: '0 0 10px 0' },
  tileType: { margin: '0 0 18px 0', color: '#b3b3c7', fontSize: 14 },

  detailCard: {
    background: '#1b1b2b',
    border: '1px solid #2a2a3d',
    borderRadius: 12,
    padding: 20
  },

  // ADMIN
  adminGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 24,
    marginBottom: 24
  },
  adminCard: {
    background: '#1b1b2b',
    border: '1px solid #2a2a3d',
    borderRadius: 12,
    padding: 18
  },
  adminTableCard: {
    background: '#1b1b2b',
    border: '1px solid #2a2a3d',
    borderRadius: 12,
    padding: 18
  },
  userRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    padding: '12px 0',
    borderBottom: '1px solid #2a2a3d'
  },
  smallSelect: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #2a2a3d',
    background: '#121224',
    color: '#fff'
  },

  // MODAL (DOCUMENTI) — “come seconda immagine”
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
  modalCloseX: {
    background: 'transparent',
    border: 'none',
    color: '#b3b3c7',
    cursor: 'pointer',
    fontSize: 18
  },
  modalSubtitle: { margin: '10px 0 12px', color: '#b3b3c7', fontSize: 14 },
  modalFooter: { marginTop: 14, display: 'flex', justifyContent: 'flex-end' },

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
  docMeta: { color: '#b3b3c7', fontSize: 12 }
};

export default App;