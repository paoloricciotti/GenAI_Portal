import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProjectsHome() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.projects.list()
      .then((data) => setProjects(data.projects || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.centered}>Caricamento progetti...</div>;

  return (
    <div style={styles.container}>
      <h1>Benvenuto, {user?.username}</h1>
      <div style={styles.grid}>
        {projects.map((project) => (
          <div key={project.id} style={styles.tile}>
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <button onClick={() => navigate(`/projects/${project.id}`)}>
              Apri
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  tile: {
    background: '#1b1b2b',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #2a2a3d'
  },
  centered: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '100px',
    color: '#fff'
  }
};
