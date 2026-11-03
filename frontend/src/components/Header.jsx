import React from 'react';
import { RotateCcw, LogOut } from 'lucide-react';

export default function Header({ currentTab, onSelectTab, onResetData, onLogout }) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: 'Sales' },
    { id: 'qa', label: 'QA' },
    { id: 'ceo', label: 'CEO' },
    { id: 'warehouse', label: 'Warehouse' },
    { id: 'masterlist', label: 'Masterlist' },
    { id: 'admin', label: 'Admin' },
  ];

  return (
    <header className="brand-header-card">
      <div className="brand-header-body">
        {/* Reset button in corner for convenience */}
        <div style={{ position: 'absolute', top: 16, right: 18 }}>
          <button 
            onClick={onResetData}
            title="Reset data to initial reference records"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5, 
              fontSize: '0.75rem', 
              color: 'var(--color-text-muted)',
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid var(--color-border)'
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Demo</span>
          </button>
        </div>
        {/* Logout button */}
        {onLogout && (
          <div style={{ position: 'absolute', top: 16, right: 100 }}>
            <button 
              onClick={onLogout}
              title="Log out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid var(--color-border)'
              }}
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        )}
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
          Complaint intake through sales, quality inspection, CEO approval and warehouse exchange — one record, four stages.
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

        {/* Decorative 4-Stage Multi-colored stripe */}
        <div className="stage-stripe" aria-hidden="true">
          <div className="segment-sales" title="Stage 1: Sales Intake"></div>
          <div className="segment-qa" title="Stage 2: QA Inspection"></div>
          <div className="segment-ceo" title="Stage 3: CEO Approval"></div>
          <div className="segment-warehouse" title="Stage 4: Warehouse Fulfillment"></div>
        </div>
    </header>
  );
}

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: 'Sales' },
    { id: 'qa', label: 'QA' },
    { id: 'ceo', label: 'CEO' },
    { id: 'warehouse', label: 'Warehouse' },
    { id: 'masterlist', label: 'Masterlist' },
    { id: 'admin', label: 'Admin' },
  ];

  return (
    <header className="brand-header-card">
      <div className="brand-header-body">
        {/* Reset button in corner for convenience */}
        <div style={{ position: 'absolute', top: 16, right: 18 }}>
          <button 
            onClick={onResetData}
            title="Reset data to initial reference records"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5, 
              fontSize: '0.75rem', 
              color: 'var(--color-text-muted)',
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid var(--color-border)'
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Demo</span>
          </button>
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
          Complaint intake through sales, quality inspection, CEO approval and warehouse exchange — one record, four stages.
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

      {/* Decorative 4-Stage Multi-colored stripe */}
      <div className="stage-stripe" aria-hidden="true">
        <div className="segment-sales" title="Stage 1: Sales Intake"></div>
        <div className="segment-qa" title="Stage 2: QA Inspection"></div>
        <div className="segment-ceo" title="Stage 3: CEO Approval"></div>
        <div className="segment-warehouse" title="Stage 4: Warehouse Fulfillment"></div>
      </div>
    </header>
  );
}
