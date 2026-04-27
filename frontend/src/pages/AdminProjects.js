import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function AdminProjects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });
  const [initialFiles, setInitialFiles] = useState([]);
  const [initialFileInputKey, setInitialFileInputKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [uploadingProjectId, setUploadingProjectId] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await api.projects.list();
      const projectList = Array.isArray(data) ? data : data.projects || [];
      setProjects(projectList);
    } catch (err) {
      console.error('Errore caricamento progetti:', err);
      alert('Errore nel caricamento dei progetti');
    }
  };

  const buildDocumentsPayload = (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return formData;
  };

  const uploadProjectDocuments = async (projectId, files) => {
    if (!files.length) return;
    await api.projects.uploadDocs(projectId, buildDocumentsPayload(files));
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!newProject.name.trim()) {
      alert('Il nome progetto e obbligatorio');
      return;
    }

    if (!newProject.description.trim()) {
      alert('La descrizione e obbligatoria');
      return;
    }

    setCreating(true);

    try {
      const createdProject = await api.projects.create({
        name: newProject.name.trim(),
        description: newProject.description.trim()
      });

      await uploadProjectDocuments(createdProject.id, initialFiles);

      alert(
        initialFiles.length
          ? 'Progetto creato e documenti caricati con successo'
          : 'Progetto creato con successo'
      );

      setNewProject({
        name: '',
        description: ''
      });
      setInitialFiles([]);
      setInitialFileInputKey((key) => key + 1);

      fetchProjects();
    } catch (err) {
      console.error('Errore creazione progetto:', err);
      alert(err.message || 'Errore nella creazione progetto');
    } finally {
      setCreating(false);
    }
  };

  const handleUploadExistingProject = async (project, fileList) => {
    const files = Array.from(fileList || []);

    if (!project?.id || !files.length) {
      return;
    }

    setUploadingProjectId(project.id);

    try {
      await uploadProjectDocuments(project.id, files);
      alert('Documenti caricati con successo');
    } catch (err) {
      console.error('Errore caricamento documenti:', err);
      alert(err.message || 'Errore durante il caricamento documenti');
    } finally {
      setUploadingProjectId(null);
    }
  };

  const handleDelete = async (project) => {
    if (!project?.id) {
      alert('Impossibile eliminare: ID progetto mancante');
      console.error('Progetto senza ID:', project);
      return;
    }

    const confirmed = window.confirm(
      `Eliminare definitivamente il progetto "${project.name}"?`
    );

    if (!confirmed) return;

    try {
      await api.projects.delete(project.id);
      alert('Progetto eliminato con successo');
      fetchProjects();
    } catch (err) {
      console.error('Errore eliminazione progetto:', err);
      alert(err.message || 'Errore durante eliminazione progetto');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.breadcrumb}>
        <span onClick={() => navigate('/projects')} style={styles.backLink}>
          Dashboard
        </span>
        <span style={styles.separator}> / </span>
        <span style={styles.current}>Project Management</span>
      </div>

      <h1 style={styles.title}>Project Management</h1>

      <form onSubmit={handleCreate} style={styles.formCard}>
        <h3 style={{ marginTop: 0 }}>Crea Nuovo Progetto</h3>

        <input
          style={styles.input}
          placeholder="Nome Progetto"
          value={newProject.name}
          onChange={(e) =>
            setNewProject({
              ...newProject,
              name: e.target.value
            })
          }
          required
        />

        <textarea
          style={{ ...styles.input, minHeight: '80px' }}
          placeholder="Descrizione"
          value={newProject.description}
          onChange={(e) =>
            setNewProject({
              ...newProject,
              description: e.target.value
            })
          }
          required
        />

        <label style={styles.fileUploadBox}>
          <span style={styles.fileUploadTitle}>Documenti iniziali</span>
          <input
            key={initialFileInputKey}
            type="file"
            multiple
            onChange={(e) => setInitialFiles(Array.from(e.target.files || []))}
            disabled={creating}
            style={styles.fileInput}
          />
          <span style={styles.fileUploadHint}>
            {initialFiles.length
              ? `${initialFiles.length} file selezionati`
              : 'Seleziona uno o piu file da associare al progetto'}
          </span>
        </label>

        <button type="submit" style={styles.btnPrimary} disabled={creating}>
          {creating ? 'Creazione in corso...' : 'Crea Progetto'}
        </button>
      </form>

      <div style={styles.list}>
        <h3>Progetti Esistenti</h3>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>Descrizione</th>
              <th style={styles.th}>Documenti</th>
              <th style={styles.th}>Azioni</th>
            </tr>
          </thead>

          <tbody>
            {projects.map((project) => (
              <tr key={project.id || project.name} style={styles.row}>
                <td style={styles.td}>{project.name}</td>
                <td style={styles.td}>{project.description}</td>
                <td style={styles.td}>
                  <label style={styles.inlineUpload}>
                    <input
                      type="file"
                      multiple
                      disabled={uploadingProjectId === project.id}
                      onChange={(e) => {
                        handleUploadExistingProject(project, e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <span>
                      {uploadingProjectId === project.id
                        ? 'Caricamento...'
                        : 'Carica documenti'}
                    </span>
                  </label>
                </td>
                <td style={styles.td}>
                  <button
                    onClick={() => handleDelete(project)}
                    style={styles.btnDelete}
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}

            {projects.length === 0 && (
              <tr>
                <td colSpan="4" style={{ ...styles.td, textAlign: 'center' }}>
                  Nessun progetto trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px', color: '#fff' },
  title: { marginBottom: '30px', fontSize: '2rem' },
  breadcrumb: {
    marginBottom: '20px',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center'
  },
  backLink: { color: '#a100ff', cursor: 'pointer', fontWeight: 'bold' },
  separator: { color: '#b3b3c7', margin: '0 10px' },
  current: { color: '#b3b3c7' },
  formCard: {
    background: '#1b1b2b',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '40px',
    border: '1px solid #2a2a3d'
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '10px',
    background: '#0f0f17',
    border: '1px solid #2a2a3d',
    color: '#fff',
    borderRadius: '6px',
    boxSizing: 'border-box'
  },
  fileUploadBox: {
    display: 'block',
    margin: '15px 0',
    fontSize: '0.9rem',
    color: '#b3b3c7',
    padding: '15px',
    border: '1px dashed #a100ff',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  fileUploadTitle: {
    display: 'block',
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  fileInput: {
    display: 'block',
    marginBottom: '8px',
    color: '#fff'
  },
  fileUploadHint: {
    display: 'block'
  },
  btnPrimary: {
    background: '#a100ff',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
    background: '#1b1b2b',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  th: {
    textAlign: 'left',
    padding: '15px',
    background: '#2a2a3d',
    color: '#b3b3c7'
  },
  td: {
    padding: '15px',
    borderBottom: '1px solid #2a2a3d',
    verticalAlign: 'middle'
  },
  inlineUpload: {
    display: 'inline-flex',
    flexDirection: 'column',
    gap: '6px',
    color: '#b3b3c7',
    fontSize: '0.85rem'
  },
  btnDelete: {
    background: 'none',
    border: '1px solid #ff6b6b',
    color: '#ff6b6b',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};
