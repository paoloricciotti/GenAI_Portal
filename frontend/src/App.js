import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Context e UI Components
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Pagine
import LoginPage from './pages/LoginPage';
import ProjectsHome from './pages/ProjectsHome';
import ProjectDashboard from './pages/ProjectDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminProjects from './pages/AdminProjects';

/**
 * Protezione per utenti loggati
 */
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={styles.loading}>Caricamento...</div>;
  return user ? children : <Navigate to="/login" />;
};

/**
 * Protezione per soli Amministratori
 */
const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  return isAdmin ? children : <Navigate to="/projects" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={styles.appContainer}>
          <Routes>
            {/* Pagina di accesso (senza Navbar) */}
            <Route path="/login" element={<LoginPage />} />

            {/* Area Riservata (Tutte con Layout/Navbar) */}
            <Route path="/projects" element={
              <PrivateRoute>
                <Layout><ProjectsHome /></Layout>
              </PrivateRoute>
            } />

            <Route path="/projects/:id" element={
              <PrivateRoute>
                <Layout><ProjectDashboard /></Layout>
              </PrivateRoute>
            } />

            {/* Area Admin: User Management */}
            <Route path="/admin/users" element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout><AdminUsers /></Layout>
                </AdminRoute>
              </PrivateRoute>
            } />

            {/* Area Admin: Project Management */}
            <Route path="/admin/projects" element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout><AdminProjects /></Layout>
                </AdminRoute>
              </PrivateRoute>
            } />

            {/* Fallback per URL errati */}
            <Route path="/" element={<Navigate to="/projects" />} />
            <Route path="*" element={<Navigate to="/projects" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    backgroundColor: '#0f0f17', // Sfondo scuro GenAI
    color: '#fff',
    fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: '#a100ff'
  }
};

export default App;