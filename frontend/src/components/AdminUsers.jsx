import React, { useEffect, useState } from 'react';
import { getAllUsers, createUser, updateUserAccess, deleteUser, updateUserPermissions } from '../services/api';
import { 
  UserPlus, 
  Shield, 
  User, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  Key, 
  Mail, 
  Sliders, 
  Eye, 
  EyeOff, 
  Edit3, 
  X, 
  Check, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const AVAILABLE_ROLES = [
  { id: 'Sale', name: 'Sale', description: 'Can view and access only Stage 01 (Sales Intake) & Overview summary report' },
  { id: 'QA', name: 'QA', description: 'Stage 02 Quality Inspection & Lab testing' },
  { id: 'CEO', name: 'CEO', description: 'Can view all stages; can adjust/take action in Stage 03 (CEO Approval) only' },
  { id: 'Warehouse', name: 'Warehouse', description: 'Stage 04 Fulfillment & Stage 05 Stock Return Control' },
  { id: 'Finance', name: 'Finance', description: 'Stage 06 Disposal Action: Call tax to count stock, record disposal date & close complaint' },
  { id: 'Admin', name: 'Admin', description: 'Full access to all stages, masterlist & user management' }
];

export const PERMISSION_STAGES = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Dashboard cards, charts & complaint summary table',
    color: '#475569',
    canEditApplicable: false,
  },
  {
    id: 'sales',
    label: 'Stage 01: Sales Intake',
    description: 'Customer intake, product batch info & claim entry',
    color: 'var(--color-stage-sales, #0284c7)',
    canEditApplicable: true,
  },
  {
    id: 'qa',
    label: 'Stage 02: QA Inspection',
    description: 'Defect inspection, storage temp, lab test & defect QTY',
    color: 'var(--color-stage-qa, #059669)',
    canEditApplicable: true,
  },
  {
    id: 'ceo',
    label: 'Stage 03: CEO Approval',
    description: 'Executive review, approve/reject & adjust approved QTY',
    color: 'var(--color-stage-ceo, #1b4d3e)',
    canEditApplicable: true,
  },
  {
    id: 'warehouse',
    label: 'Stage 04: Warehouse Fulfillment',
    description: 'Replacement goods delivery & fulfillment dispatch',
    color: 'var(--color-stage-warehouse, #d97706)',
    canEditApplicable: true,
  },
  {
    id: 'stock_return',
    label: 'Stage 05: Stock Return Recording',
    description: 'Returned stock verification, lot check & QA sign-off',
    color: '#b45309',
    canEditApplicable: true,
    attributes: [
      {
        id: 'stock_return_action',
        label: 'Warehouse Action',
        sublabel: 'Fill in / Edit Return (Physical defect intake, bin location, scrap/rework)',
        color: '#d97706',
        badge: '📦 Warehouse Action'
      },
      {
        id: 'stock_return_signoff',
        label: 'Signed Off (QA)',
        sublabel: 'QA Verification Attribute (Yes / No sign-off toggle)',
        color: '#16a34a',
        badge: '🛡️ QA Sign-Off'
      }
    ]
  },
  {
    id: 'disposal',
    label: 'Stage 06: Disposal Action',
    description: 'Call tax, count stock, cut write-off to disposal & close',
    color: '#6d28d9',
    canEditApplicable: true,
  },
  {
    id: 'masterlist',
    label: 'Masterlist',
    description: 'Master catalog of products, SKUs & defect types',
    color: '#0f766e',
    canEditApplicable: true,
  },
  {
    id: 'admin',
    label: 'Admin Panel',
    description: 'Google account security & stage permission matrix',
    color: '#b91c1c',
    canEditApplicable: true,
  },
];

export const ROLE_DEFAULTS = {
  Admin: {
    can_view: ['overview', 'sales', 'qa', 'ceo', 'warehouse', 'stock_return', 'disposal', 'masterlist', 'admin'],
    can_edit: ['sales', 'qa', 'ceo', 'warehouse', 'stock_return_action', 'stock_return_signoff', 'disposal', 'masterlist', 'admin']
  },
  CEO: {
    can_view: ['overview', 'sales', 'qa', 'ceo', 'warehouse', 'stock_return', 'disposal', 'masterlist'],
    can_edit: ['ceo']
  },
  Sale: {
    can_view: ['overview', 'sales'],
    can_edit: ['sales']
  },
  QA: {
    can_view: ['overview', 'qa', 'stock_return'],
    can_edit: ['qa', 'stock_return_signoff']
  },
  Warehouse: {
    can_view: ['overview', 'warehouse', 'stock_return'],
    can_edit: ['warehouse', 'stock_return_action']
  },
  Finance: {
    can_view: ['overview', 'stock_return', 'disposal', 'masterlist'],
    can_edit: ['disposal']
  }
};

export default function AdminUsers({ onPermissionsUpdated, onSimulateUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add new user state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Sale');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password reset inline state
  const [resetPwdUserId, setResetPwdUserId] = useState(null);
  const [resetPwdValue, setResetPwdValue] = useState('');

  // Permission Configuration Modal State
  const [permissionUser, setPermissionUser] = useState(null);
  const [permCanView, setPermCanView] = useState([]);
  const [permCanEdit, setPermCanEdit] = useState([]);
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  const fetchUsersList = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  const handleRoleChange = async (userId, selectedRole) => {
    try {
      const isAdmin = selectedRole === 'Admin';
      await updateUserAccess(userId, { role: selectedRole, is_admin: isAdmin ? 1 : 0 });
      setSuccessMsg(`User access updated to ${selectedRole}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchUsersList();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleResetPasswordSubmit = async (userId, currentRole, isAdmin) => {
    if (!resetPwdValue || resetPwdValue.trim().length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await updateUserAccess(userId, {
        role: currentRole,
        is_admin: isAdmin,
        password: resetPwdValue.trim()
      });
      setSuccessMsg('Password updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setResetPwdUserId(null);
      setResetPwdValue('');
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');

    const emailClean = newEmail.trim().toLowerCase();
    if (!emailClean.endsWith('@gmail.com') && !emailClean.endsWith('@googlemail.com')) {
      setError('Email must be a Google email address (e.g. username@gmail.com)');
      return;
    }

    if (!newPassword || newPassword.trim().length < 6) {
      setError('Admin must assign a password with at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser({
        email: emailClean,
        password: newPassword.trim(),
        role: newRole,
        is_admin: newRole === 'Admin' ? 1 : 0
      });
      setNewEmail('');
      setNewPassword('');
      setNewRole('Sale');
      setSuccessMsg(`Google user ${emailClean} created with role ${newRole}`);
      setTimeout(() => setSuccessMsg(''), 3500);
      await fetchUsersList();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to remove user "${userEmail}"?`)) return;
    try {
      await deleteUser(userId);
      setSuccessMsg(`User ${userEmail} deleted.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchUsersList();
    } catch (e) {
      setError(e.message);
    }
  };

  // Open Permission Modal
  const handleOpenPermissions = (u) => {
    setPermissionUser(u);
    const role = u.role || (u.is_admin ? 'Admin' : 'Sale');
    const existing = u.permissions || ROLE_DEFAULTS[role] || ROLE_DEFAULTS.Sale;
    let views = existing.can_view ? [...existing.can_view] : [...(ROLE_DEFAULTS[role]?.can_view || ['overview', 'sales'])];
    let edits = existing.can_edit ? [...existing.can_edit] : [...(ROLE_DEFAULTS[role]?.can_edit || ['sales'])];
    
    // Normalize legacy 'stock_return' to specific attribute keys
    if (edits.includes('stock_return')) {
      if (role === 'QA' && !edits.includes('stock_return_signoff')) {
        edits.push('stock_return_signoff');
      } else if (role === 'Warehouse' && !edits.includes('stock_return_action')) {
        edits.push('stock_return_action');
      } else if (role === 'Admin') {
        if (!edits.includes('stock_return_action')) edits.push('stock_return_action');
        if (!edits.includes('stock_return_signoff')) edits.push('stock_return_signoff');
      }
    }
    setPermCanView(views);
    setPermCanEdit(edits);
  };

  const handleClosePermissions = () => {
    setPermissionUser(null);
  };

  // Toggle View Permission for a stage
  const handleToggleView = (stageId) => {
    if (permCanView.includes(stageId)) {
      // Uncheck View -> automatically remove associated edit permissions
      setPermCanView(permCanView.filter((id) => id !== stageId));
      if (stageId === 'stock_return') {
        setPermCanEdit(permCanEdit.filter((id) => id !== 'stock_return' && id !== 'stock_return_action' && id !== 'stock_return_signoff'));
      } else {
        setPermCanEdit(permCanEdit.filter((id) => id !== stageId));
      }
    } else {
      // Check View
      setPermCanView([...permCanView, stageId]);
    }
  };

  // Toggle Edit Permission for a stage without sub-attributes
  const handleToggleEdit = (stageId) => {
    if (permCanEdit.includes(stageId)) {
      setPermCanEdit(permCanEdit.filter((id) => id !== stageId));
    } else {
      // Checking Edit requires View to be allowed
      if (!permCanView.includes(stageId)) {
        setPermCanView([...permCanView, stageId]);
      }
      setPermCanEdit([...permCanEdit, stageId]);
    }
  };

  // Toggle Edit Permission for a specific sub-attribute (e.g. stock_return_action or stock_return_signoff)
  const handleToggleSubEdit = (attrId, parentStageId) => {
    let nextEdit = [...permCanEdit];
    if (nextEdit.includes(attrId)) {
      nextEdit = nextEdit.filter((id) => id !== attrId);
    } else {
      nextEdit.push(attrId);
      // Auto-ensure parent stage is allowed in view
      if (!permCanView.includes(parentStageId)) {
        setPermCanView([...permCanView, parentStageId]);
      }
    }
    setPermCanEdit(nextEdit);
  };

  // Quick Preset Actions
  const handlePresetRoleDefault = () => {
    if (!permissionUser) return;
    const role = permissionUser.role || (permissionUser.is_admin ? 'Admin' : 'Sale');
    const def = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.Sale;
    setPermCanView([...def.can_view]);
    setPermCanEdit([...def.can_edit]);
  };

  const handlePresetViewAll = () => {
    const isTargetAdmin = permissionUser?.is_admin === 1 || permissionUser?.role === 'Admin';
    const allViews = PERMISSION_STAGES
      .filter((s) => isTargetAdmin || s.id !== 'admin')
      .map((s) => s.id);
    setPermCanView(allViews);
  };

  const handlePresetFullAccess = () => {
    const allViews = PERMISSION_STAGES.map((s) => s.id);
    const allEdits = ['sales', 'qa', 'ceo', 'warehouse', 'stock_return_action', 'stock_return_signoff', 'disposal', 'masterlist', 'admin'];
    setPermCanView(allViews);
    setPermCanEdit(allEdits);
  };

  const handlePresetBlockOtherStages = () => {
    if (!permissionUser) return;
    const role = permissionUser.role || (permissionUser.is_admin ? 'Admin' : 'Sale');
    if (role === 'QA') {
      setPermCanView(['overview', 'qa', 'stock_return']);
      setPermCanEdit(['qa', 'stock_return_signoff']);
    } else if (role === 'Warehouse') {
      setPermCanView(['overview', 'warehouse', 'stock_return']);
      setPermCanEdit(['warehouse', 'stock_return_action']);
    } else if (role === 'CEO') {
      setPermCanView(['overview', 'ceo']);
      setPermCanEdit(['ceo']);
    } else if (role === 'Finance') {
      setPermCanView(['overview', 'disposal']);
      setPermCanEdit(['disposal']);
    } else if (role === 'Admin') {
      setPermCanView(PERMISSION_STAGES.map((s) => s.id));
      setPermCanEdit(['sales', 'qa', 'ceo', 'warehouse', 'stock_return_action', 'stock_return_signoff', 'disposal', 'masterlist', 'admin']);
    } else {
      setPermCanView(['overview', 'sales']);
      setPermCanEdit(['sales']);
    }
  };

  // Save Permissions to API
  const handleSavePermissions = async () => {
    if (!permissionUser) return;
    setIsSavingPerms(true);
    try {
      const payload = {
        can_view: permCanView,
        can_edit: permCanEdit,
      };
      await updateUserPermissions(permissionUser.id, payload);

      // Check if logged-in user is this user
      const loggedEmail = localStorage.getItem('user_email');
      if (loggedEmail === permissionUser.email) {
        localStorage.setItem('user_permissions', JSON.stringify(payload));
        if (onPermissionsUpdated) {
          onPermissionsUpdated(payload);
        }
      }

      setSuccessMsg(`Permissions updated for ${permissionUser.email}`);
      setTimeout(() => setSuccessMsg(''), 3500);
      handleClosePermissions();
      await fetchUsersList();
    } catch (e) {
      setError(e.message || 'Failed to save permissions');
    } finally {
      setIsSavingPerms(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Info */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Shield size={24} color="var(--color-brand)" />
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-brand)' }}>
            Google Account Access & Stage Permission Control
          </h2>
        </div>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.88rem', lineHeight: '1.5' }}>
          Assign authorized <strong>Google Emails</strong> and <strong>Custom Stage Permissions</strong> per team member:
          <br />
          • <strong>Allow View / Block View</strong>: Choose which stages a user can see. Blocked stages are removed from the navigation bar.
          <br />
          • <strong>Allow Edit Action</strong>: Grant permission to take action (review, approve, fulfill, sign-off, or record disposal) outside or inside their own stage.
          <br />
          • Click <strong>⚙️ Stage Permissions</strong> on any user account below to configure granular view and edit access.
        </p>

        {error && (
          <div style={{ marginTop: '14px', background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ marginTop: '14px', background: '#dcfce7', color: '#15803d', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Add New User Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} />
          <span>Add Google User & Assign Credentials</span>
        </h3>

        <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr)) 130px', gap: '14px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              <Mail size={13} />
              <span>1. Google Email (@gmail.com)</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. employee@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              <Key size={13} />
              <span>2. Password (assigned by Admin)</span>
            </label>
            <input
              type="text"
              required
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              3. Default Role & Stage
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
              }}
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              height: '38px',
              backgroundColor: 'var(--color-brand)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: isSubmitting ? 'wait' : 'pointer'
            }}
          >
            {isSubmitting ? 'Saving...' : 'Add User'}
          </button>
        </form>
      </div>

      {/* Users & Role List Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} />
            <span>Authorized Team Accounts ({users.length})</span>
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            Permissions apply instantly to navigation tabs and stage action buttons
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading team users...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 14px' }}>Google Email</th>
                <th style={{ padding: '12px 14px' }}>Assigned Role</th>
                <th style={{ padding: '12px 14px' }}>Stage Access & View Permissions</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const currentRole = u.role || (u.is_admin ? 'Admin' : 'Sale');
                const isNayhour = u.email === 'nayhour99@gmail.com';
                const isResetting = resetPwdUserId === u.id;
                
                const userPerms = u.permissions || ROLE_DEFAULTS[currentRole] || ROLE_DEFAULTS.Sale;
                const canView = userPerms.can_view || [];
                const canEdit = userPerms.can_edit || [];
                const totalStagesCount = PERMISSION_STAGES.filter((s) => u.is_admin ? true : s.id !== 'admin').length;
                const blockedCount = totalStagesCount - canView.length;

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px', fontWeight: 500, color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{u.email}</span>
                        {u.is_admin === 1 && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#4338ca', fontWeight: 600 }}>
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <select
                        value={currentRole}
                        disabled={isNayhour}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          backgroundColor: isNayhour ? '#f1f5f9' : '#ffffff',
                          cursor: isNayhour ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
                          color: currentRole === 'Sale' ? 'var(--color-stage-sales)' : currentRole === 'QA' ? 'var(--color-stage-qa)' : currentRole === 'CEO' ? 'var(--color-stage-ceo)' : currentRole === 'Warehouse' ? 'var(--color-stage-warehouse)' : '#4338ca'
                        }}
                      >
                        {AVAILABLE_ROLES.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '14px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Scope summary pill */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1'
                          }}>
                            <Eye size={12} />
                            {canView.length} View Allowed
                          </span>

                          {blockedCount > 0 && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c'
                            }}>
                              <EyeOff size={12} />
                              {blockedCount} Stages Blocked
                            </span>
                          )}

                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: '#fef3c7',
                            color: '#92400e'
                          }}>
                            <Edit3 size={12} />
                            {canEdit.length} Actions
                          </span>
                        </div>

                        {/* Allowed tabs badges list */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', color: '#64748b', fontSize: '0.75rem' }}>
                          {canView.map((stageId) => {
                            const stageDef = PERMISSION_STAGES.find((s) => s.id === stageId);
                            if (stageId === 'stock_return') {
                              const hasWh = canEdit.includes('stock_return_action');
                              const hasQa = canEdit.includes('stock_return_signoff');
                              let label = 'Stage 05 👁️ (View Only)';
                              let bg = '#f1f5f9';
                              let col = '#475569';
                              let border = '1px solid #e2e8f0';
                              if (hasWh && hasQa) {
                                label = 'Stage 05 ✏️ (Action & QA Sign-Off)';
                                bg = '#dcfce7'; col = '#15803d'; border = '1px solid #bbf7d0';
                              } else if (hasWh) {
                                label = 'Stage 05 📦 (Warehouse Action)';
                                bg = '#fef3c7'; col = '#92400e'; border = '1px solid #fde68a';
                              } else if (hasQa) {
                                label = 'Stage 05 🛡️ (QA Sign-Off)';
                                bg = '#ecfdf5'; col = '#059669'; border = '1px solid #a7f3d0';
                              }
                              return (
                                <span key={stageId} style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: bg, color: col, fontWeight: (hasWh || hasQa) ? 600 : 400, border }}>
                                  {label}
                                </span>
                              );
                            }
                            const canAct = canEdit.includes(stageId);
                            return (
                              <span
                                key={stageId}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: canAct ? '#dcfce7' : '#f1f5f9',
                                  color: canAct ? '#15803d' : '#475569',
                                  fontWeight: canAct ? 600 : 400,
                                  border: canAct ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                                }}
                              >
                                {stageDef ? stageDef.label.split(':')[0] : stageId}
                                {canAct && ' ✏️'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        
                        {/* Configure Stage Permissions Button */}
                        <button
                          onClick={() => handleOpenPermissions(u)}
                          title="Configure stage view & edit permissions"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #0284c7',
                            backgroundColor: '#f0f9ff',
                            color: '#0369a1',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <Sliders size={13} />
                          <span>Permissions</span>
                        </button>

                        {/* Password reset */}
                        {isResetting ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="text"
                              placeholder="New password"
                              value={resetPwdValue}
                              onChange={(e) => setResetPwdValue(e.target.value)}
                              style={{ width: '100px', padding: '4px 6px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            />
                            <button
                              onClick={() => handleResetPasswordSubmit(u.id, currentRole, u.is_admin)}
                              style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setResetPwdUserId(null); setResetPwdValue(''); }}
                              style={{ padding: '4px 6px', fontSize: '0.75rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setResetPwdUserId(u.id); setResetPwdValue(''); }}
                            title="Assign new password"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: 'pointer', color: '#475569' }}
                          >
                            <Key size={13} />
                            <span>Pwd</span>
                          </button>
                        )}

                        {/* Delete User */}
                        {!isNayhour && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            title="Delete user"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '4px'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Stage Permissions Configuration Modal */}
      {permissionUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            maxWidth: '820px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              flexShrink: 0
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={20} color="var(--color-brand)" />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
                    Configure Stage Permissions & View Access
                  </h3>
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#64748b' }}>
                  User: <strong style={{ color: '#0f172a' }}>{permissionUser.email}</strong> · Role: <strong style={{ color: 'var(--color-brand)' }}>{permissionUser.role || 'Sale'}</strong>
                </div>
              </div>
              <button
                onClick={handleClosePermissions}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body with Full Scrolling Support */}
            <div style={{
              padding: '16px 24px',
              overflowY: 'auto',
              flex: '1 1 auto',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f8fafc'
            }}>
              
              {/* Instructions banner */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#1e40af',
                lineHeight: '1.4',
                flexShrink: 0
              }}>
                <strong>How Stage Permissions Work:</strong>
                <div style={{ marginTop: '3px' }}>
                  • <strong>Allow View</strong>: Shows the stage in header navigation. When unchecked, this stage is <strong>completely blocked and hidden</strong> from this user.
                  <br />
                  • <strong>Allow Edit / Action</strong>: Grants rights to submit inspections, approvals, fulfillments, or disposal actions. If unchecked, user has <strong>View-Only (Details)</strong> access.
                </div>
              </div>

              {/* Quick Presets Toolbar */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Quick Presets:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handlePresetRoleDefault}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>Reset to Role Default</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetViewAll}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #93c5fd',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Eye size={12} />
                    <span>View All (Action on Own Stage Only)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetBlockOtherStages}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      backgroundColor: '#fef2f2',
                      color: '#b91c1c',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <EyeOff size={12} />
                    <span>Block All Other Stages</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetFullAccess}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #bbf7d0',
                      backgroundColor: '#f0fdf4',
                      color: '#15803d',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Check size={12} />
                    <span>Full Access (All Stages)</span>
                  </button>
                </div>
              </div>

              {/* Permission Matrix Table Container with independent scroll & sticky header */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflowY: 'auto',
                maxHeight: '340px',
                minHeight: '220px',
                flexShrink: 0,
                position: 'relative',
                backgroundColor: '#ffffff',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f8fafc'
              }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.84rem' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc' }}>
                    <tr style={{ color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Stage / Module</th>
                      <th style={{ padding: '10px 14px', width: '130px', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Allow View</th>
                      <th style={{ padding: '10px 14px', width: '280px', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Allow Edit / Action (By Attribute)</th>
                      <th style={{ padding: '10px 14px', width: '160px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_STAGES.map((stage) => {
                      // Hide Admin stage config for non-admins unless configuring admin
                      if (stage.id === 'admin' && permissionUser.email !== 'nayhour99@gmail.com' && permissionUser.role !== 'Admin') {
                        return null;
                      }

                      const isViewAllowed = permCanView.includes(stage.id);
                      const isEditAllowed = permCanEdit.includes(stage.id);

                      return (
                        <tr key={stage.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isViewAllowed ? '#ffffff' : '#fafafa' }}>
                          
                          {/* Stage Name & Info */}
                          <td style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stage.color, flexShrink: 0 }}></span>
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{stage.label}</span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', paddingLeft: '16px' }}>
                              {stage.description}
                            </div>
                          </td>

                          {/* Allow View Toggle */}
                          <td style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                              <input
                                type="checkbox"
                                checked={isViewAllowed}
                                onChange={() => handleToggleView(stage.id)}
                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--color-brand)' }}
                              />
                              <span style={{ fontSize: '0.8rem', color: isViewAllowed ? '#0369a1' : '#64748b', fontWeight: isViewAllowed ? 600 : 400 }}>
                                {isViewAllowed ? 'Allow View' : 'Blocked'}
                              </span>
                            </label>
                          </td>

                          {/* Allow Edit Toggle (Supports stage attribute breakdown, e.g. Stage 05) */}
                          <td style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                            {stage.attributes ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {stage.attributes.map((attr) => {
                                  const isAttrChecked = permCanEdit.includes(attr.id);
                                  return (
                                    <label
                                      key={attr.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: isViewAllowed ? 'pointer' : 'not-allowed',
                                        opacity: isViewAllowed ? 1 : 0.45,
                                        userSelect: 'none',
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        backgroundColor: isAttrChecked && isViewAllowed ? '#f0fdf4' : '#f8fafc',
                                        border: isAttrChecked && isViewAllowed ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={!isViewAllowed}
                                        checked={isAttrChecked && isViewAllowed}
                                        onChange={() => handleToggleSubEdit(attr.id, stage.id)}
                                        style={{ cursor: isViewAllowed ? 'pointer' : 'not-allowed', width: '15px', height: '15px', accentColor: attr.color }}
                                      />
                                      <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isAttrChecked && isViewAllowed ? '#15803d' : '#334155' }}>
                                          {attr.label}
                                        </div>
                                        <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                                          {attr.sublabel}
                                        </div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : stage.canEditApplicable ? (
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: isViewAllowed ? 'pointer' : 'not-allowed', userSelect: 'none', opacity: isViewAllowed ? 1 : 0.4 }}>
                                <input
                                  type="checkbox"
                                  disabled={!isViewAllowed}
                                  checked={isEditAllowed && isViewAllowed}
                                  onChange={() => handleToggleEdit(stage.id)}
                                  style={{ cursor: isViewAllowed ? 'pointer' : 'not-allowed', width: '16px', height: '16px', accentColor: '#16a34a' }}
                                />
                                <span style={{ fontSize: '0.8rem', color: isEditAllowed && isViewAllowed ? '#15803d' : '#64748b', fontWeight: isEditAllowed ? 600 : 400 }}>
                                  {isEditAllowed && isViewAllowed ? 'Can Take Action' : 'View Only'}
                                </span>
                              </label>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                View-only module
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding: '9px 14px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                            {!isViewAllowed ? (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                🚫 View Blocked
                              </span>
                            ) : stage.attributes ? (
                              permCanEdit.includes('stock_return_action') && permCanEdit.includes('stock_return_signoff') ? (
                                <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  ✏️ Action & QA Sign
                                </span>
                              ) : permCanEdit.includes('stock_return_action') ? (
                                <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  📦 Warehouse Action
                                </span>
                              ) : permCanEdit.includes('stock_return_signoff') ? (
                                <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#059669', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  🛡️ QA Sign-Off
                                </span>
                              ) : (
                                <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  👁️ View Only
                                </span>
                              )
                            ) : isEditAllowed ? (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                ✏️ View & Edit
                              </span>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                👁️ View Only
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary of effective access */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                flexShrink: 0
              }}>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Resulting Navigation Scope:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ color: '#15803d' }}>
                    <strong>Visible Tabs ({permCanView.length}):</strong>{' '}
                    {permCanView.map((id) => PERMISSION_STAGES.find((s) => s.id === id)?.label.split(':')[0] || id).join(', ') || 'None (All blocked)'}
                  </div>
                  <div style={{ color: '#b91c1c' }}>
                    <strong>Blocked Tabs ({PERMISSION_STAGES.length - permCanView.length}):</strong>{' '}
                    {PERMISSION_STAGES.filter((s) => !permCanView.includes(s.id)).map((s) => s.label.split(':')[0]).join(', ') || 'None (All visible)'}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={handleClosePermissions}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingPerms}
                onClick={handleSavePermissions}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--color-brand)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isSavingPerms ? 'wait' : 'pointer'
                }}
              >
                {isSavingPerms ? 'Saving Changes...' : 'Save Permissions'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
