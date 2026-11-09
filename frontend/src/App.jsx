import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import InsightsView from './components/InsightsView';
import ComplaintTable from './components/ComplaintTable';
import NewComplaintModal from './components/NewComplaintModal';
import StageActionModal from './components/StageActionModal';
import BatchDisposalModal from './components/BatchDisposalModal';
import PhotoPreviewModal from './components/PhotoPreviewModal';
import MasterlistView from './components/MasterlistView';
import Login from './components/Login';
import AdminUsers from './components/AdminUsers';
import {
  getMetrics,
  getComplaints,
  createComplaint,
  submitQAReview,
  submitCEODecision,
  submitWarehouseFulfill,
  submitStockReturn,
  submitStockReturnSignOff,
  submitDisposalAction,
  submitBatchDisposalAction,
  resetData,
  downloadComplaintsExcel,
  logout,
} from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('user_email') || null);
  const [userRole, setUserRole] = useState(localStorage.getItem('user_role') || 'Admin');
  const [userPermissions, setUserPermissions] = useState(() => {
    try {
      const stored = localStorage.getItem('user_permissions');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLoginSuccess = (email) => {
    setUserEmail(email);
    setUserRole(localStorage.getItem('user_role') || 'Sale');
    try {
      const stored = localStorage.getItem('user_permissions');
      setUserPermissions(stored ? JSON.parse(stored) : null);
    } catch (e) {
      setUserPermissions(null);
    }
  };

  const handleLogout = () => {
    logout();
    setUserEmail(null);
    setUserRole('Sale');
    setUserPermissions(null);
  };

  // Granular stage permission helpers
  const canViewTab = (tabId) => {
    if (userRole === 'Admin') return true;
    if (userPermissions && Array.isArray(userPermissions.can_view)) {
      return userPermissions.can_view.includes(tabId);
    }
    // Fallback role defaults:
    if (userRole === 'CEO') return tabId !== 'admin';
    if (userRole === 'Finance') return tabId === 'overview' || tabId === 'stock_return' || tabId === 'disposal' || tabId === 'masterlist';
    if (userRole === 'Sale') return tabId === 'overview' || tabId === 'sales';
    if (userRole === 'QA') return tabId === 'overview' || tabId === 'qa' || tabId === 'stock_return';
    if (userRole === 'Warehouse') return tabId === 'overview' || tabId === 'warehouse' || tabId === 'stock_return';
    return tabId === 'overview' || tabId === 'sales';
  };

  const canEditStage = (stageId) => {
    if (userRole === 'Admin') return true;
    if (userPermissions && Array.isArray(userPermissions.can_edit)) {
      if (stageId === 'stock_return') {
        return userPermissions.can_edit.includes('stock_return_action') || (userPermissions.can_edit.includes('stock_return') && userRole === 'Warehouse');
      }
      return userPermissions.can_edit.includes(stageId);
    }
    // Fallback role defaults:
    if (userRole === 'CEO') return stageId === 'ceo';
    if (userRole === 'Finance') return stageId === 'disposal';
    if (userRole === 'Sale') return stageId === 'sales';
    if (userRole === 'QA') return stageId === 'qa';
    if (userRole === 'Warehouse') return stageId === 'warehouse' || stageId === 'stock_return';
    return false;
  };

  // Enforce navigation guard: automatically switch away from blocked tabs
  useEffect(() => {
    if (userRole !== 'Admin' && !canViewTab(currentTab)) {
      const allCandidateTabs = ['overview', 'sales', 'qa', 'ceo', 'warehouse', 'stock_return', 'disposal', 'masterlist'];
      const firstAllowed = allCandidateTabs.find((t) => canViewTab(t));
      if (firstAllowed) {
        setCurrentTab(firstAllowed);
      }
    }
  }, [currentTab, userPermissions, userRole]);

  const [metrics, setMetrics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('All time');
  const [dateFilter, setDateFilter] = useState('');
  const [dateMode, setDateMode] = useState('complaint_date'); // 'complaint_date' or 'expiry_date'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'

  // Modals
  const [isNewComplaintOpen, setIsNewComplaintOpen] = useState(false);
  const [isBatchDisposalOpen, setIsBatchDisposalOpen] = useState(false);
  const [stageModal, setStageModal] = useState({ isOpen: false, complaint: null, mode: 'qa' });
  const [photoPreview, setPhotoPreview] = useState({ photoUrl: null, complaintId: null });

  // Notifications
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      const params = {
        search: searchQuery,
        timeFilter: timeFilter !== 'All time' ? timeFilter : undefined,
        dateMode: dateMode,
        sortBy: dateMode === 'expiry_date' ? 'expiry_date' : dateMode === 'shipment_date' ? 'shipment_date' : 'complaint_date',
        order: sortOrder,
        refDate: todayStr,
      };
      if (dateFilter) {
        if (dateMode === 'expiry_date') {
          params.expiryDate = dateFilter;
        } else if (dateMode === 'shipment_date') {
          params.shipmentDate = dateFilter;
        } else {
          params.date = dateFilter;
        }
      }
      const [m, c] = await Promise.all([
        getMetrics({ 
          timeFilter: params.timeFilter,
          dateMode: params.dateMode,
          sortBy: params.sortBy,
          order: params.order,
          refDate: params.refDate,
        }),
        getComplaints(params),
      ]);
      setMetrics(m);
      setComplaints(c);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, timeFilter, dateFilter, dateMode, sortOrder]);

  // Load data when authenticated
  useEffect(() => {
    if (userEmail) {
      loadData();
    }
  }, [loadData, userEmail]);

  // If not logged in, show Login component
  if (!userEmail) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Handle Tab Switch
  const handleSelectTab = (tabId) => {
    setCurrentTab(tabId);
  };

  // Filter complaints according to department view
  const filteredComplaints = complaints.filter((item) => {
    if (currentTab === 'qa') {
      return item.status === 'Pending QA';
    }
    if (currentTab === 'ceo') {
      return item.status === 'Pending approval';
    }
    if (currentTab === 'warehouse') {
      return item.status === 'Approved' || item.status === 'Completed';
    }
    if (currentTab === 'stock_return') {
      return item.status === 'Completed' || (item.warehouse_fulfillment && item.status !== 'Rejected');
    }
    if (currentTab === 'disposal') {
      // Stage 06 Disposal Action must be forwarded from Stage 05:
      // Requires completed action in Stage 05 AND QA sign-off ("Yes"), or already Closed
      const isAlreadyClosed = item.status === 'Closed' || !!item.disposal;
      const isStage05CompleteAndSignedOff = item.stock_return && item.stock_return.qa_signed_off === 'Yes';
      return isStage05CompleteAndSignedOff || isAlreadyClosed;
    }
    return true; // overview and sales show all
  });

  // Action Handlers
  const handleCreateComplaint = async (newComplaintData) => {
    const created = await createComplaint(newComplaintData);
    showToast(`Created complaint ${created.id}`);
    await loadData();
  };

  const handleOpenStageAction = (complaint, mode) => {
    // Enforce granular stage action permissions:
    // If user lacks edit permission for this stage, modal opens in safe read-only ('view') mode.
    let effectiveMode = mode;
    if (mode !== 'view') {
      if (!canEditStage(mode)) {
        effectiveMode = 'view';
      }
    }
    setStageModal({ isOpen: true, complaint, mode: effectiveMode });
  };

  const handleSubmitQA = async (id, qaData) => {
    await submitQAReview(id, qaData);
    showToast(`QA Review submitted for ${id}`);
    await loadData();
  };

  const handleSubmitCEO = async (id, ceoData) => {
    await submitCEODecision(id, ceoData);
    showToast(`CEO Decision recorded for ${id}`);
    await loadData();
  };

  const handleSubmitWarehouse = async (id, warehouseData) => {
    await submitWarehouseFulfill(id, warehouseData);
    showToast(`Exchange completed for ${id}`);
    await loadData();
  };

  const handleSubmitStockReturn = async (id, stockReturnData) => {
    await submitStockReturn(id, stockReturnData);
    showToast(`Stock Return Control recorded for ${id}`);
    await loadData();
  };

  const handleSubmitDisposal = async (id, disposalData) => {
    await submitDisposalAction(id, disposalData);
    showToast(`Stage 06 Disposal recorded & Complaint ${id} marked Closed!`);
    await loadData();
  };

  const handleSubmitBatchDisposal = async (batchDisposalPayload) => {
    const res = await submitBatchDisposalAction(batchDisposalPayload);
    const count = res?.updated_count || batchDisposalPayload?.complaint_ids?.length || 0;
    showToast(
      `Batch Disposal (${batchDisposalPayload.write_off_batch_codes}) saved as ${batchDisposalPayload.status} for ${count} claim(s)!`
    );
    await loadData();
  };

  const handleStockReturnSignOff = async (id, signedOffVal) => {
    try {
      await submitStockReturnSignOff(id, {
        signed_off: signedOffVal,
        qa_name: 'QA Team',
        notes: signedOffVal === 'Yes' ? 'QA confirmed physical return' : 'QA requested warehouse adjustments',
      });
      showToast(`QA Signed Off marked "${signedOffVal}" for ${id}`);
      await loadData();
    } catch (err) {
      console.error('Sign-off error:', err);
      showToast('Error recording QA sign-off');
    }
  };

  const handleExportExcel = async (exportAll = false) => {
    try {
      setIsExporting(true);
      const todayStr = new Date().toLocaleDateString('en-CA');
      const params = {};

      if (!exportAll) {
        if (searchQuery) params.search = searchQuery;
        if (timeFilter && timeFilter !== 'All time') params.timeFilter = timeFilter;
        params.dateMode = dateMode;
        params.sortBy = dateMode === 'expiry_date' ? 'expiry_date' : dateMode === 'shipment_date' ? 'shipment_date' : 'complaint_date';
        params.order = sortOrder;
        params.refDate = todayStr;

        if (dateFilter) {
          if (dateMode === 'expiry_date') {
            params.expiryDate = dateFilter;
          } else if (dateMode === 'shipment_date') {
            params.shipmentDate = dateFilter;
          } else {
            params.date = dateFilter;
          }
        }

        // Apply tab status context if exporting active queue
        if (currentTab === 'qa') {
          params.status = 'Pending QA';
        } else if (currentTab === 'ceo') {
          params.status = 'Pending approval';
        } else if (currentTab === 'warehouse') {
          params.status = 'Approved,Completed';
        } else if (currentTab === 'stock_return') {
          params.status = 'Completed';
        } else if (currentTab === 'disposal') {
          params.status = 'Completed,Closed';
        }
      }

      const filename = await downloadComplaintsExcel(params);
      showToast(`Exported ${filename} successfully!`);
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      showToast('Error exporting Excel report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetData = async () => {
    if (userRole !== 'Admin') {
      showToast('Action Denied: Only Admin users are authorized to reset demo data.');
      return;
    }
    if (
      window.confirm(
        '⚠️ CRITICAL WARNING: You are about to wipe all active complaints and reset the database to initial demo records!\n\nAll newly logged complaints, approvals, exchanges, and disposal records will be permanently lost.\n\nAre you sure you want to proceed?'
      )
    ) {
      try {
        await resetData();
        showToast('Database reset to initial demo state.');
        await loadData();
      } catch (err) {
        showToast(err.message || 'Failed to reset data.');
      }
    }
  };

  return (
    <div className="app-container">
      {/* Brand Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onResetData={handleResetData}
        onLogout={handleLogout}
        userRole={userRole}
        userPermissions={userPermissions}
        userEmail={userEmail}
      />

      {/* 5 KPI Metric Summary Cards */}
      <MetricCards kpis={metrics?.kpis} />

      {/* Admin User Management View */}
      {currentTab === 'admin' && (
        <AdminUsers
          onPermissionsUpdated={(newPerms) => {
            setUserPermissions(newPerms);
            showToast('Permissions updated and applied successfully');
          }}
        />
      )}

      {/* Department-specific Banner */}
      {currentTab === 'qa' && (
        <div className="dept-banner">
          <div className="dept-banner-left">
            <span className="dept-pill dept-pill-qa">QA Queue</span>
            <div>
              <strong>Quality Inspection & Laboratory Testing</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Showing {filteredComplaints.length} claims pending inspection.
              </div>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'ceo' && (
        <div className="dept-banner">
          <div className="dept-banner-left">
            <span className="dept-pill dept-pill-ceo">Executive Queue</span>
            <div>
              <strong>CEO Decision & Compensation Approval</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Showing {filteredComplaints.length} claims awaiting executive approval.
              </div>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'warehouse' && (
        <div className="dept-banner">
          <div className="dept-banner-left">
            <span className="dept-pill dept-pill-warehouse">Warehouse Queue</span>
            <div>
              <strong>Replacement Fulfillment & Inventory Dispatch</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Showing {filteredComplaints.length} approved replacement orders.
              </div>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'stock_return' && (
        <div className="dept-banner">
          <div className="dept-banner-left">
            <span className="dept-pill" style={{ background: '#fef08a', color: '#854d0e', border: '1px solid #facc15', fontWeight: 700 }}>
              Stage 05: Stock Return Control
            </span>
            <div>
              <strong>Defective Stock Return Intake, Bin Location & Write-Off / Rework Control</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Showing {filteredComplaints.length} claims with exchanged products requiring stock return control.
              </div>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'disposal' && (
        <div
          className="dept-banner"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div className="dept-banner-left">
            <span className="dept-pill" style={{ background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd', fontWeight: 700 }}>
              Stage 06: Disposal Action (Finance)
            </span>
            <div>
              <strong>Tax Stock Count Verification & Inventory Write-Off Disposal</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Showing {filteredComplaints.length} claims with stock write-offs requiring tax inspection, inventory cut, and final closure.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsBatchDisposalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                border: '1px solid #6d28d9',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
                transition: 'all 0.15s ease',
              }}
              title="Open Summary Write-Off Report by Batch Code and close batches in one click"
            >
              <span>Disposal Action</span>
            </button>
          </div>
        </div>
      )}

      {/* Overview Insights Charts (shown in Overview tab) */}
      {currentTab === 'overview' && (
        <InsightsView
          metrics={metrics}
          dateMode={dateMode}
          complaints={complaints}
          searchQuery={searchQuery}
          timeFilter={timeFilter}
          dateFilter={dateFilter}
          userRole={userRole}
          userPermissions={userPermissions}
        />
      )}

      {/* Masterlist View */}
      {currentTab === 'masterlist' && <MasterlistView />}

      {/* Complaints Table (hide in masterlist and admin tabs) */}
      {currentTab !== 'masterlist' && currentTab !== 'admin' && (
        <ComplaintTable
          complaints={filteredComplaints}
          currentTab={currentTab}
          userRole={userRole}
          userPermissions={userPermissions}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          dateMode={dateMode}
          onDateModeChange={setDateMode}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onOpenNewComplaint={() => setIsNewComplaintOpen(true)}
          onOpenStageAction={handleOpenStageAction}
          onSelectPhoto={(photoUrl, complaintId) =>
            setPhotoPreview({ photoUrl, complaintId })
          }
          onExportExcel={handleExportExcel}
          isExporting={isExporting}
          onSignOffStockReturn={handleStockReturnSignOff}
        />
      )}

      {/* New Complaint Modal (Sales intake & Warehouse defect entry) */}
      <NewComplaintModal
        isOpen={isNewComplaintOpen}
        onClose={() => setIsNewComplaintOpen(false)}
        onSubmitSuccess={handleCreateComplaint}
        currentTab={currentTab}
        userRole={userRole}
      />

      {/* Departmental Stage Action Modal */}
      <StageActionModal
        isOpen={stageModal.isOpen}
        complaint={stageModal.complaint}
        mode={stageModal.mode}
        userRole={userRole}
        userPermissions={userPermissions}
        onClose={() => setStageModal({ isOpen: false, complaint: null, mode: 'qa' })}
        onSubmitQA={handleSubmitQA}
        onSubmitCEO={handleSubmitCEO}
        onSubmitWarehouse={handleSubmitWarehouse}
        onSubmitStockReturn={handleSubmitStockReturn}
        onSubmitDisposal={handleSubmitDisposal}
      />

      {/* Stage 06 Batch Disposal & Summary Write-Off Report Modal */}
      <BatchDisposalModal
        isOpen={isBatchDisposalOpen}
        onClose={() => setIsBatchDisposalOpen(false)}
        complaints={filteredComplaints}
        canEdit={canEditStage('disposal')}
        onSubmitBatchDisposal={handleSubmitBatchDisposal}
      />

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        photoUrl={photoPreview.photoUrl}
        complaintId={photoPreview.complaintId}
        onClose={() => setPhotoPreview({ photoUrl: null, complaintId: null })}
      />

      {/* Toast Notification */}
      {toastMessage && <div className="toast-alert">{toastMessage}</div>}
    </div>
  );
}
