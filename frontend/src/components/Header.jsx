import React from 'react';
import { RotateCcw, LogOut } from 'lucide-react';

export default function Header({ 
  currentTab, 
  onSelectTab, 
  onResetData, 
  onLogout, 
  userRole = 'Admin',
  userPermissions = null,
  userEmail = ''
}) {
  const allTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: 'Sales' },
    { id: 'qa', label: 'QA' },
    { id: 'ceo', label: 'CEO' },
    { id: 'warehouse', label: 'Warehouse' },
    { id: 'stock_return', label: 'Stock Return' },
    { id: 'disposal', label: 'Disposal' },
    { id: 'masterlist', label: 'Masterlist' },
    { id: 'admin', label: 'Admin' },
  ];

  // Restrict tabs based on granular permissions (blocking unauthorized views)
  const tabs = allTabs.filter((tab) => {
    if (userRole === 'Admin') return true;
    if (userPermissions && Array.isArray(userPermissions.can_view)) {
      return userPermissions.can_view.includes(tab.id);
    }
    if (userRole === 'CEO') {
      // CEO is able to view all operational stages
      return tab.id !== 'admin';
    }
    if (userRole === 'Finance') {
      return tab.id === 'overview' || tab.id === 'stock_return' || tab.id === 'disposal' || tab.id === 'masterlist';
    }
    if (userRole === 'Sale') {
      return tab.id === 'overview' || tab.id === 'sales';
    }
    if (userRole === 'QA') {
      return tab.id === 'overview' || tab.id === 'qa' || tab.id === 'stock_return';
    }
    if (userRole === 'Warehouse') {
      return tab.id === 'overview' || tab.id === 'warehouse' || tab.id === 'stock_return';
    }
    return tab.id === 'overview' || tab.id === 'sales';
  });

  return (
    <header className="brand-header-card">
      <div className="brand-header-body">
        {/* Top-right Action Bar: Admin tools & Logout (properly aligned without overlapping) */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 10,
          }}
        >
          {/* Reset Demo button: ONLY visible to Admin users to protect live data */}
          {userRole === 'Admin' && (
            <button
              onClick={onResetData}
              title="Admin Only: Reset database to initial reference demo state (Caution: all newly created records will be wiped)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.75rem',
                color: '#b91c1c',
                background: '#fef2f2',
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid #fecaca',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <RotateCcw size={13} color="#b91c1c" />
              <span>Reset Demo</span>
            </button>
          )}

          {/* Logout button */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Log out of current account"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                background: '#ffffff',
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          )}
        </div>
        <div className="brand-top-row">
          <div className="brand-logo-wrap">
            <img
              src="/sonavith-logo.png"
              alt="SONAVITH"
              className="brand-logo-image"
            />
          </div>
          <div style={{ height: 26, width: 1, backgroundColor: 'var(--color-border)' }}></div>
          <h1 className="brand-title">Defective Product Report</h1>
        </div>

        <p className="brand-subtitle">
          Complaint intake through sales, quality inspection, CEO approval, warehouse exchange, stock return and finance disposal — one record, six stages.
        </p>

        <span className="viewing-as-label">Viewing as</span>

        <nav className="tab-switcher" aria-label="Department Views">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              className={`tab-btn ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Decorative 5-Stage Multi-colored stripe */}
      <div className="stage-stripe" aria-hidden="true">
        <div className="segment-sales" title="Stage 1: Sales Intake"></div>
        <div className="segment-qa" title="Stage 2: QA Inspection"></div>
        <div className="segment-ceo" title="Stage 3: CEO Approval"></div>
        <div className="segment-warehouse" title="Stage 4: Warehouse Fulfillment"></div>
        <div className="segment-stock-return" title="Stage 5: Stock Return Control" style={{ backgroundColor: '#facc15' }}></div>
      </div>
    </header>
  );
}

