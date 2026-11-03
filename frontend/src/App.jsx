import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import InsightsView from './components/InsightsView';
import ComplaintTable from './components/ComplaintTable';
import NewComplaintModal from './components/NewComplaintModal';
import StageActionModal from './components/StageActionModal';
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
  resetData,
  downloadComplaintsExcel,
  logout,
} from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('user_email') || null);

  const handleLoginSuccess = (email) => {
    setUserEmail(email);
  };

  const handleLogout = () => {
    logout();
    setUserEmail(null);
  };


  // Load data only when authenticated
  useEffect(() => {
    if (userEmail) {
      loadData();
    }
  }, [loadData, userEmail]);


  // If not logged in, show Login component
  if (!userEmail) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    return true; // overview and sales show all
  });

  // Action Handlers
  const handleCreateComplaint = async (newComplaintData) => {
    const created = await createComplaint(newComplaintData);
    showToast(`Created complaint ${created.id}`);
    await loadData();
  };

  const handleOpenStageAction = (complaint, mode) => {
    setStageModal({ isOpen: true, complaint, mode });
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
    if (window.confirm('Reset all complaints to the initial reference state?')) {
      await resetData();
      showToast('Database reset to initial 6 reference complaints.');
      await loadData();
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
      />

      {/* 5 KPI Metric Summary Cards */}
      <MetricCards kpis={metrics?.kpis} />

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

      {/* Overview Insights Charts (shown in Overview tab) */}
      {currentTab === 'overview' && <InsightsView metrics={metrics} dateMode={dateMode} complaints={complaints} />}

      {/* Masterlist View */}
      {currentTab === 'masterlist' && <MasterlistView />}

      {/* Complaints Table (hide in masterlist) */}
      {currentTab !== 'masterlist' && (
        <ComplaintTable
          complaints={filteredComplaints}
          currentTab={currentTab}
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
        />
      )}

      {/* New Complaint Modal (Sales intake) */}
      <NewComplaintModal
        isOpen={isNewComplaintOpen}
        onClose={() => setIsNewComplaintOpen(false)}
        onSubmitSuccess={handleCreateComplaint}
      />

      {/* Departmental Stage Action Modal */}
      <StageActionModal
        isOpen={stageModal.isOpen}
        complaint={stageModal.complaint}
        mode={stageModal.mode}
        onClose={() => setStageModal({ isOpen: false, complaint: null, mode: 'qa' })}
        onSubmitQA={handleSubmitQA}
        onSubmitCEO={handleSubmitCEO}
        onSubmitWarehouse={handleSubmitWarehouse}
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
