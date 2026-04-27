import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Errore durante il logout", err);
    }
  };

  return (
    <nav style={styles.nav}>
      {/* Logo cliccabile per tornare alla Home */}
      <div style={styles.logo} onClick={() => navigate('/projects')}>
        GenAI Service Portal
      </div>
      
      <div style={styles.links}>
        {user && (
          <>
            {/* Tasto Home */}
            <Link to="/projects" style={styles.navLink}>Home</Link>
            
            <span style={styles.userInfo}>
              👤 {user.username} <span style={styles.roleTag}>({user.role})</span>
            </span>
            
            {isAdmin && (
              <>
                <Link to="/admin/users" style={styles.linkBtn}>User Management</Link>
                <Link to="/admin/projects" style={styles.linkBtn}>Project Management</Link>
              </>
            )}
            
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 25px',
    height: '60px',
    background: '#1b1b2b',
    borderBottom: '1px solid #2a2a3d',
    color: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  },
  logo: { 
    fontWeight: 'bold', 
    fontSize: '1.2rem', 
    cursor: 'pointer',
    color: '#fff',
    letterSpacing: '0.5px'
  },
  links: { display: 'flex', alignItems: 'center', gap: '20px' },
  navLink: {
    textDecoration: 'none',
    color: '#b3b3c7',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  userInfo: { color: '#fff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' },
  roleTag: { color: '#b3b3c7', fontSize: '0.8rem' },
  linkBtn: { 
    textDecoration: 'none', 
    color: '#a100ff', 
    border: '1px solid #a100ff', 
    padding: '6px 14px', 
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid #ff6b6b',
    color: '#ff6b6b',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
};