import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProjectDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.projects.getDocs(id);
      setDocs(data.documents || []);
    } catch (err) {
      console.error('Errore caricamento documenti', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    setUploading(true);
    try {
      await api.projects.uploadDocs(id, formData);
      await loadDocs();
      e.target.value = '';
    } catch (err) {
      console.error('Errore upload documenti:', err);
      alert("Errore durante l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>
        Torna ai Progetti
      </button>

      <div style={styles.header}>
        <span style={styles.eyebrow}>Project Dashboard</span>
        <h1 style={styles.title}>{id}</h1>
      </div>

      <div style={styles.cardGrid}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Documenti</h2>
              <p style={styles.cardSubtitle}>
                File caricati e disponibili per questo progetto.
              </p>
            </div>
            <span style={styles.countBadge}>{docs.length}</span>
          </div>

          {isAdmin && (
            <label style={styles.uploadBox}>
              <span style={styles.uploadLabel}>
                {uploading ? 'Caricamento in corso...' : 'Carica documenti'}
              </span>
              <input
                type="file"
                multiple
                onChange={handleUpload}
                disabled={uploading}
                style={styles.fileInput}
              />
            </label>
          )}

          <div style={styles.docList}>
            {loading && <p style={styles.emptyText}>Caricamento documenti...</p>}

            {!loading && docs.map((doc) => (
              <a
                key={doc.name}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                style={styles.docItem}
              >
                <span style={styles.docIcon}>DOC</span>
                <span style={styles.docName}>{doc.name}</span>
              </a>
            ))}

            {!loading && docs.length === 0 && (
              <p style={styles.emptyText}>Nessun documento presente.</p>
            )}
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Demo</h2>
              <p style={styles.cardSubtitle}>
                Area pronta per ospitare la demo del progetto.
              </p>
            </div>
          </div>

          <div style={styles.demoPlaceholder}>
            <span style={styles.demoStatus}>In preparazione</span>
            <p style={styles.emptyText}>
              La demo sara disponibile in uno step successivo.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px', color: '#fff' },
  backBtn: {
    background: 'none',
    border: '1px solid #2a2a3d',
    color: '#b3b3c7',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  header: { marginBottom: '24px' },
  eyebrow: {
    display: 'block',
    color: '#b3b3c7',
    fontSize: '0.85rem',
    marginBottom: '6px'
  },
  title: {
    margin: 0,
    fontSize: '2rem'
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    alignItems: 'start'
  },
  card: {
    background: '#1b1b2b',
    padding: '24px',
    borderRadius: '8px',
    border: '1px solid #2a2a3d',
    minHeight: '280px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px'
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.25rem'
  },
  cardSubtitle: {
    margin: '6px 0 0',
    color: '#b3b3c7',
    fontSize: '0.92rem'
  },
  countBadge: {
    minWidth: '32px',
    height: '32px',
    borderRadius: '16px',
    background: '#a100ff',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  },
  uploadBox: {
    display: 'block',
    marginBottom: '18px',
    padding: '14px',
    border: '1px dashed #a100ff',
    borderRadius: '8px',
    color: '#b3b3c7'
  },
  uploadLabel: {
    display: 'block',
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  fileInput: {
    color: '#fff',
    width: '100%'
  },
  docList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  docItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#fff',
    textDecoration: 'none',
    padding: '10px',
    background: '#121224',
    borderRadius: '6px',
    border: '1px solid #2a2a3d'
  },
  docIcon: {
    flex: '0 0 auto',
    fontSize: '0.7rem',
    color: '#0f0f17',
    background: '#b3b3c7',
    borderRadius: '4px',
    padding: '3px 5px',
    fontWeight: 'bold'
  },
  docName: {
    overflowWrap: 'anywhere'
  },
  demoPlaceholder: {
    minHeight: '170px',
    border: '1px dashed #2a2a3d',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: '20px'
  },
  demoStatus: {
    color: '#a100ff',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  emptyText: {
    color: '#b3b3c7',
    margin: 0
  }
};
