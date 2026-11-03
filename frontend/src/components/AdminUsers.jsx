import React, { useEffect, useState } from 'react';
import { getAllUsers, setUserRole } from '../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleAdmin = async (userId, current) => {
    try {
      const user = users.find(u => u.id === userId);
      await setUserRole(userId, { isAdmin: !current, role: user?.role || '' });
      await fetchUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div>Loading users…</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div className="admin-users-card">
      <h2>Admin Users</h2>
      <table className="admin-users-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid var(--color-border)', padding: '8px' }}>Email</th>
            <th style={{ borderBottom: '1px solid var(--color-border)', padding: '8px' }}>Admin</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ borderBottom: '1px solid var(--color-border)', padding: '8px' }}>{u.email}</td>
              <td style={{ borderBottom: '1px solid var(--color-border)', padding: '8px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={!!u.is_admin}
                  onChange={() => toggleAdmin(u.id, !!u.is_admin)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

