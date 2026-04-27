import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.users.list();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (err) { console.error("Errore caricamento utenti", err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return alert("Inserisci tutti i campi");
    try {
      await api.users.create(newUser);
      alert("Utente creato con successo");
      setNewUser({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) { alert("Errore nella creazione"); }
  };

  const handleDelete = async (username) => {
    if (window.confirm(`Sei sicuro di voler eliminare l'utente ${username}?`)) {
      try {
        await api.users.delete(username);
        fetchUsers();
      } catch (err) { alert("Errore durante l'eliminazione"); }
    }
  };

  const handleResetPassword = async (username) => {
    const newPass = window.prompt(`Inserisci la nuova password per ${username}:`);
    if (newPass) {
      try {
        await api.users.resetPassword(username, newPass);
        alert("Password resettata con successo");
      } catch (err) { alert("Errore nel reset password"); }
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gestione Utenti</h1>
      
      {/* Form Creazione */}
      <form onSubmit={handleCreate} style={styles.form}>
        <input 
          style={styles.input} 
          placeholder="Username" 
          value={newUser.username} 
          onChange={e => setNewUser({...newUser, username: e.target.value})} 
        />
        <input 
          style={styles.input} 
          type="password" 
          placeholder="Password" 
          value={newUser.password} 
          onChange={e => setNewUser({...newUser, password: e.target.value})} 
        />
        <select 
          style={styles.input} 
          value={newUser.role} 
          onChange={e => setNewUser({...newUser, role: e.target.value})}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" style={styles.createBtn}>Crea Utente</button>
      </form>

      {/* Tabella Utenti */}
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Username</th>
            <th style={styles.th}>Ruolo</th>
            <th style={styles.th}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.username} style={styles.row}>
              <td style={styles.td}>{u.username}</td>
              <td style={styles.td}>{u.role}</td>
              <td style={styles.td}>
                <button onClick={() => handleResetPassword(u.username)} style={styles.resetBtn}>Reset Password</button>
                <button onClick={() => handleDelete(u.username)} style={styles.delBtn}>Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: { padding: '40px', color: '#fff' },
  title: { marginBottom: '30px', fontSize: '2rem' },
  form: { display: 'flex', gap: '10px', marginBottom: '40px', flexWrap: 'wrap' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #2a2a3d', background: '#1b1b2b', color: '#fff' },
  createBtn: { background: '#a100ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#1b1b2b', borderRadius: '8px', overflow: 'hidden' },
  th: { textAlign: 'left', padding: '15px', borderBottom: '2px solid #2a2a3d', color: '#b3b3c7' },
  td: { padding: '15px', borderBottom: '1px solid #2a2a3d' },
  delBtn: { color: '#ff6b6b', background: 'none', border: '1px solid #ff6b6b', cursor: 'pointer', padding: '5px 10px', borderRadius: '4px', marginLeft: '10px' },
  resetBtn: { color: '#4da6ff', background: 'none', border: '1px solid #4da6ff', cursor: 'pointer', padding: '5px 10px', borderRadius: '4px' }
};
