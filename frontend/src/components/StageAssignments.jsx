import React, { useEffect, useState } from 'react';
import { getAllUsers, getStageAssignments, assignUserToStage } from '../services/api';

export default function StageAssignments() {
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState({}); // {stage: Set<userId>}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const stages = [1, 2, 3, 4]; // stages 01 to 04

  const fetchData = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      const assignMap = {};
      for (const stage of stages) {
        const assigned = await getStageAssignments(stage);
        assignMap[stage] = new Set(assigned.map(u => u.id));
      }
      setAssignments(assignMap);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleAssignment = async (stage, userId, currentlyAssigned) => {
    try {
      await assignUserToStage(stage, userId, !currentlyAssigned);
      // Update local state
      setAssignments(prev => {
        const newSet = new Set(prev[stage]);
        if (currentlyAssigned) newSet.delete(userId);
        else newSet.add(userId);
        return { ...prev, [stage]: newSet };
      });
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div>Loading stage assignments…</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div className="stage-assignments-card">
      <h2>Stage Assignments</h2>
      {stages.map(stage => (
        <div key={stage} style={{ marginBottom: '16px' }}>
          <h3>Stage {stage.toString().padStart(2, '0')}</h3>
          <table className="stage-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid var(--color-border)', padding: '8px' }}>User</th>
                <th style={{ borderBottom: '1px solid var(--color-border)', padding: '8px' }}>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const assigned = assignments[stage]?.has(u.id) ?? false;
                return (
                  <tr key={u.id + '-' + stage}>
                    <td style={{ borderBottom: '1px solid var(--color-border)', padding: '8px' }}>{u.email}</td>
                    <td style={{ borderBottom: '1px solid var(--color-border)', padding: '8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={assigned}
                        onChange={() => toggleAssignment(stage, u.id, assigned)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

