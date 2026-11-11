import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Search,
  Calendar,
  Plus,
  ExternalLink,
  Eye,
  ArrowRight,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  FileSpreadsheet,
  Download,
  Loader2,
  Camera,
  Thermometer,
  CheckCircle,
  Video,
  Play,
  Building2,
  MapPin,
  Printer,
} from 'lucide-react';
import {
  canExportStage,
  canPrintStageReport,
  getStagePrintMetadata,
  isStageOwner,
} from '../utils/permissions';

export default function ComplaintTable({
  complaints,
  currentTab,
  userRole = 'Admin',
  userPermissions = null,
  searchQuery,
  onSearchChange,
  timeFilter,
  onTimeFilterChange,
  dateFilter,
  onDateFilterChange,
  dateMode = 'complaint_date',
  onDateModeChange,
  sortOrder = 'desc',
  onSortOrderChange,
  onOpenNewComplaint,
  onOpenStageAction,
  onSelectPhoto,
  onExportExcel,
  isExporting = false,
  onSignOffStockReturn,
}) {
  const isSalesTab = currentTab === 'sales';
  const isWarehouseTab = currentTab === 'warehouse';
  const isOverviewTab = currentTab === 'overview';
  const isStockReturnTab = currentTab === 'stock_return';
  const isDisposalTab = currentTab === 'disposal';

  // Granular Stage Edit & Action Permissions:
  // Admin has full edit rights. Other users check userPermissions.can_edit, falling back to role rules.
  const checkCanEdit = (stageKey, fallbackRoleCondition) => {
    if (userRole === 'Admin') return true;
    if (userPermissions && Array.isArray(userPermissions.can_edit)) {
      return userPermissions.can_edit.includes(stageKey);
    }
    return fallbackRoleCondition;
  };

  const canActionInSales = checkCanEdit('sales', userRole === 'Sale');
  const canActionInQA = currentTab === 'qa' && checkCanEdit('qa', userRole === 'QA');
  const canActionInCEO = currentTab === 'ceo' && checkCanEdit('ceo', userRole === 'CEO');
  const canActionInWarehouse = currentTab === 'warehouse' && checkCanEdit('warehouse', userRole === 'Warehouse');
  
  // Stage 05 attribute permissions breakdown:
  // 1. Warehouse Action attribute (+ Fill In Return / Edit Return)
  const canActionInStockReturn = currentTab === 'stock_return' && (
    userRole === 'Admin' ||
    (userPermissions && Array.isArray(userPermissions.can_edit)
      ? userPermissions.can_edit.includes('stock_return_action') || (userPermissions.can_edit.includes('stock_return') && userRole === 'Warehouse')
      : userRole === 'Warehouse')
  );

  // 2. QA Sign-Off attribute (Yes / No toggle)
  const canQASignOff = currentTab === 'stock_return' && (
    userRole === 'Admin' ||
    (userPermissions && Array.isArray(userPermissions.can_edit)
      ? userPermissions.can_edit.includes('stock_return_signoff') || (userPermissions.can_edit.includes('stock_return') && userRole === 'QA')
      : userRole === 'QA')
  );

  const canActionInDisposal = currentTab === 'disposal' && checkCanEdit('disposal', userRole === 'Finance');

  // Complaint intake creation permission:
  // Allowed on Sales tab if canActionInSales, or on Warehouse tab if canActionInWarehouse
  const canCreateComplaint =
    !isOverviewTab &&
    !isStockReturnTab &&
    !isDisposalTab &&
    currentTab !== 'qa' &&
    currentTab !== 'ceo' &&
    ((isSalesTab && canActionInSales) ||
     (isWarehouseTab && canActionInWarehouse));

  // Action column is shown on:
  // - Overview tab: displays "Details" for Completed/Closed items; "Not Complete" for pending items
  // - QA, CEO, Warehouse, and Stock Return stages (displays action button or Details read-only button)
  // - Sales tab and Disposal tab (Stage 06 uses top-level Batch Disposal Action button in banner) have NO per-row action column
  const showActionColumn =
    isOverviewTab ||
    currentTab === 'stock_return' ||
    (!isSalesTab && (currentTab === 'qa' || currentTab === 'ceo' || currentTab === 'warehouse'));

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    }
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Client-side sort reinforcement for instant responsiveness
  const sortedComplaints = useMemo(() => {
    if (!complaints) return [];
    return [...complaints].sort((a, b) => {
      let valA = '';
      let valB = '';
      if (dateMode === 'expiry_date') {
        valA = a.product_expiry_date || '';
        valB = b.product_expiry_date || '';
      } else if (dateMode === 'shipment_date') {
        valA = a.shipment_date || '';
        valB = b.shipment_date || '';
      } else {
        valA = a.complaint_date || '';
        valB = b.complaint_date || '';
      }
      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;
      const cmp = valA.localeCompare(valB);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [complaints, dateMode, sortOrder]);

  // Stage Owner Print & Export Authorizations:
  // Every stage owner can export file and print report for their own stage.
  // CEO & Admin have full cross-stage authority; QA has QA, Stock Return & Overview authority.
  const isCurrentStageOwner = isStageOwner(currentTab, userRole, userPermissions);
  const canExport = canExportStage(currentTab, userRole, userPermissions);
  const canPrint = canPrintStageReport(currentTab, userRole, userPermissions);

  const handlePrintStageReport = () => {
    let printWin = null;
    try {
      const esc = (val) =>
        val === undefined || val === null || val === ''
          ? '—'
          : String(val)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

      const meta = getStagePrintMetadata(currentTab);
      const todayStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const totalDefectUnits = sortedComplaints.reduce(
        (sum, c) => sum + (Number(c.defect_quantity) || 0),
        0
      );

      printWin = window.open('', '_blank', 'width=1120,height=900');
      if (!printWin) {
        window.print();
        return;
      }

      const rowsHtml = sortedComplaints.map((c, idx) => {
        let stageNotes = '';
        if (currentTab === 'sales') {
          stageNotes = `Rep: ${esc(c.sales_rep_name || '—')}${c.so_number ? ` • SO: ${esc(c.so_number)}` : ''}`;
        } else if (currentTab === 'qa') {
          const qa = c.qa_review || {};
          stageNotes = `Temp: ${esc(c.storage_temp || qa.storage_temp || '—')}${qa.findings ? ` • Notes: ${esc(qa.findings)}` : ''}`;
        } else if (currentTab === 'ceo') {
          const ceo = c.ceo_decision || {};
          stageNotes = `Decision: ${esc(ceo.action || c.status)}${ceo.compensation_type ? ` (${esc(ceo.compensation_type)})` : ''}`;
        } else if (currentTab === 'warehouse') {
          const wh = c.warehouse_fulfillment || {};
          const dispQty = wh.dispatched_quantity !== undefined && wh.dispatched_quantity !== null
            ? wh.dispatched_quantity
            : (wh.exchanged_quantity !== undefined ? wh.exchanged_quantity : 0);
          stageNotes = `Exchanged: ${dispQty} ${esc(c.unit_of_measure)}${dispQty === 0 ? ' (No exchange)' : ''}${wh.dispatch_status ? ` • ${esc(wh.dispatch_status)}` : ''}`;
        } else if (currentTab === 'stock_return') {
          const sr = c.stock_return || {};
          stageNotes = `Bin: ${esc(sr.bin_location || '—')}${sr.qa_signed_off === 'Yes' ? ' • QA Signed Off' : ' • Pending Sign-Off'}`;
        } else if (currentTab === 'disposal') {
          const disp = c.disposal || {};
          stageNotes = `Batch: ${esc(c.stock_return?.write_off_batch || disp.write_off_batch || '—')}${disp.tax_audit_officer ? ` • Tax Officer: ${esc(disp.tax_audit_officer)}` : ''}`;
        } else {
          stageNotes = `Status: ${esc(c.status)}`;
        }

        return `
          <tr>
            <td style="text-align:center;color:#64748b;font-size:10px;">${idx + 1}</td>
            <td style="font-family:monospace;font-weight:700;color:#0f172a;white-space:nowrap;">${esc(c.id)}</td>
            <td style="white-space:nowrap;font-size:10px;color:#334155;">${esc(c.complaint_date)}</td>
            <td>
              <div style="font-weight:700;color:#0f172a;font-size:10.5px;">${esc(c.customer_name)}</div>
              <div style="font-size:9px;color:#64748b;">${esc(c.customer_location)}</div>
            </td>
            <td>
              <div style="font-weight:600;color:#0f172a;font-size:10.5px;">${esc(c.product_name)}</div>
              <div style="font-size:9px;color:#64748b;">EXP: ${esc(c.product_expiry_date || '—')} • Batch: ${esc(c.production_batch || '—')}</div>
            </td>
            <td>
              <span style="font-size:10px;font-weight:600;color:#334155;">${esc(c.defect_type || 'Defective Stock')}</span>
            </td>
            <td style="text-align:right;font-weight:800;color:#b91c1c;white-space:nowrap;">
              ${(Number(c.defect_quantity) || 0).toLocaleString()} <span style="font-size:9px;color:#64748b;font-weight:500;">${esc(c.unit_of_measure || 'units')}</span>
            </td>
            <td style="text-align:center;white-space:nowrap;">
              <span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700;background:#f1f5f9;color:#334155;">
                ${esc(c.status)}
              </span>
            </td>
            <td style="font-size:9.5px;color:#475569;">
              ${stageNotes}
            </td>
          </tr>
        `;
      }).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SONAVITH - ${meta.title}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 16px; color: #0f172a; background: #fff; font-size: 11px; }
    .header-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${meta.color}; padding-bottom: 12px; margin-bottom: 14px; }
    .company-title { font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px; margin: 0; }
    .stage-title { font-size: 14px; font-weight: 800; color: ${meta.color}; margin-top: 2px; }
    .meta-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9.5px; font-weight: 700; background: ${meta.color}15; color: ${meta.color}; border: 1px solid ${meta.color}40; margin-top: 4px; }
    .header-right { text-align: right; font-size: 10px; color: #475569; }
    .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
    .kpi-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; background: #f8fafc; }
    .kpi-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .kpi-val { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 2px; }
    table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
    table.data-table th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 7px 8px; border: 1px solid #cbd5e1; font-size: 9.5px; text-transform: uppercase; }
    table.data-table td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: middle; }
    table.data-table tr:nth-child(even) { background: #fbfcfe; }
    .sig-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; page-break-inside: avoid; }
    .sig-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; text-align: center; }
    .sig-role { font-size: 9.5px; font-weight: 700; color: #334155; text-transform: uppercase; margin-bottom: 38px; }
    .sig-line { border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 10px; font-weight: 600; color: #0f172a; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      table.data-table th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <h1 class="company-title">SONAVITH DEFECTIVE PRODUCT REPORT</h1>
      <div class="stage-title">${meta.title}</div>
      <div class="meta-tag">${meta.badge} • ${meta.department}</div>
    </div>
    <div class="header-right">
      <div><strong>Printed:</strong> ${todayStr} at ${timeStr}</div>
      <div><strong>Printed By:</strong> ${esc(userRole)} User</div>
      <div><strong>Filter Period:</strong> ${esc(timeFilter || 'All time')}</div>
    </div>
  </div>

  <div class="summary-cards">
    <div class="kpi-card">
      <div class="kpi-label">Claims in Queue</div>
      <div class="kpi-val">${sortedComplaints.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Defect Volume</div>
      <div class="kpi-val" style="color:#b91c1c;">${totalDefectUnits.toLocaleString()} <span style="font-size:10px;font-weight:600;color:#64748b;">units</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Workflow Stage</div>
      <div class="kpi-val" style="color:${meta.color};">${meta.badge}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Authorized Role</div>
      <div class="kpi-val">${esc(userRole)}</div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width:24px;text-align:center;">#</th>
        <th style="width:110px;">Incident ID</th>
        <th style="width:75px;">Date</th>
        <th>Customer & Outlet</th>
        <th>Product SKU & Batch</th>
        <th>Defect Category</th>
        <th style="text-align:right;width:85px;">Defect QTY</th>
        <th style="text-align:center;width:90px;">Status</th>
        <th>Stage Specific Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="9" style="text-align:center;padding:16px;color:#64748b;">No complaints in this stage queue.</td></tr>'}
    </tbody>
  </table>

  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-role">Prepared by (${meta.roleSignOff})</div>
      <div class="sig-line">${esc(userRole)} Lead</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Reviewed by (Department Head)</div>
      <div class="sig-line">Operations Supervisor</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Verified by (Quality Assurance & Executive)</div>
      <div class="sig-line">QA Team / CEO Sign-Off</div>
    </div>
  </div>
</body>
</html>`;

      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        try {
          printWin.print();
        } catch (e) {
          console.warn('printWin.print caught:', e);
        }
      }, 250);
    } catch (err) {
      console.error('Failed to print stage report:', err);
      if (printWin && !printWin.closed) {
        printWin.document.open();
        printWin.document.write(`<html><body style="font-family:sans-serif;padding:24px;color:#b91c1c;">
          <h2>Unable to print stage report</h2>
          <p>${err?.message || 'Unknown error'}</p>
        </body></html>`);
        printWin.document.close();
      } else {
        alert('Could not print stage report: ' + (err?.message || 'Unknown error'));
      }
    }
  };

  // Helper to format status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending QA':
        return 'badge-pending-qa';
      case 'Pending approval':
        return 'badge-pending-approval';
      case 'Approved':
        return 'badge-approved';
      case 'Rejected':
        return 'badge-rejected';
      case 'Completed':
        return 'badge-completed';
      case 'Closed':
        return 'badge-closed';
      default:
        return 'badge-pending-qa';
    }
  };

  // Helper for Google maps link
  const renderCustomerLocation = (location) => {
    if (!location) return null;
    const isMaps = location.includes('maps.google') || location.includes('goo.gl') || location.toLowerCase().includes('google maps');
    if (isMaps) {
      const url = location.startsWith('http') ? location : `https://${location}`;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="gmaps-link"
          title="Open address in Google Maps"
        >
          <span>Open in Google Maps</span>
          <ExternalLink size={12} />
        </a>
      );
    }
    return <div className="customer-location-sub">{location}</div>;
  };

  // Handle clicking column header to toggle or set sorting
  const handleHeaderSort = (targetMode) => {
    if (dateMode === targetMode) {
      onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onDateModeChange(targetMode);
      // Default to ascending for expiry (soonest first), descending for complaint and shipment (newest first)
      onSortOrderChange(targetMode === 'expiry_date' ? 'asc' : 'desc');
    }
  };

  return (
    <section aria-label="Complaints Data">
      {/* Filter and Actions Bar */}
      <div className="filter-bar-card">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search customer name or complaint ID"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="filter-actions-right">
          {/* Time Filter Segmented Pills */}
          <div className="time-pills">
            {['All time', 'Day', 'Week', 'Month'].map((period) => (
              <button
                key={period}
                className={`time-pill-btn ${timeFilter === period ? 'active' : ''}`}
                onClick={() => {
                  onTimeFilterChange(period);
                  if (dateFilter) {
                    onDateFilterChange('');
                  }
                }}
                title={
                  period === 'Day'
                    ? `Filter complaints for today (${new Date().toLocaleDateString('en-CA')})`
                    : period === 'Week'
                    ? 'Filter complaints for this week (Mon - Sun)'
                    : period === 'Month'
                    ? `Filter complaints for this month (${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})`
                    : 'Show all complaints'
                }
              >
                {period}
              </button>
            ))}
          </div>

          {/* Separated Date Selection & Sort Dropdown */}
          <div className="date-select-wrapper" title="Select date field to sort and filter">
            <select
              id="date-mode-select"
              className="date-select-btn"
              value={dateMode}
              onChange={(e) => {
                const newMode = e.target.value;
                onDateModeChange(newMode);
                // When switching to expiry date, default to earliest (asc); for complaint or shipment date, newest (desc)
                if (newMode === 'expiry_date') {
                  onSortOrderChange('asc');
                } else {
                  onSortOrderChange('desc');
                }
              }}
              aria-label="Select date field to sort and filter"
            >
              <option value="complaint_date">By complaint date</option>
              <option value="shipment_date">By shipment date</option>
              <option value="expiry_date">By expiry date</option>
            </select>
            <ChevronDown size={14} className="date-select-chevron" />
          </div>

          {/* Sort Direction Toggle Button */}
          <button
            type="button"
            className="sort-order-btn"
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={`Current sort: ${dateMode === 'expiry_date' ? 'Expiry date' : dateMode === 'shipment_date' ? 'Shipment date' : 'Complaint date'} (${sortOrder === 'asc' ? 'Ascending' : 'Descending'}). Click to toggle.`}
            aria-label="Toggle sort direction"
          >
            {sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            <span>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
          </button>

          {/* Separated Date Picker Input */}
          <div className="date-picker-box">
            <input
              type="date"
              className="date-picker-input"
              value={dateFilter}
              onChange={(e) => {
                onDateFilterChange(e.target.value);
                if (e.target.value && timeFilter !== 'All time') {
                  onTimeFilterChange('All time');
                }
              }}
              title={
                dateMode === 'expiry_date'
                  ? 'Filter complaints by EXP'
                  : dateMode === 'shipment_date'
                  ? 'Filter complaints by Shipment Date'
                  : 'Filter complaints by Com.Date'
              }
              aria-label={
                dateMode === 'expiry_date'
                  ? 'Filter by EXP'
                  : dateMode === 'shipment_date'
                  ? 'Filter by Shipment Date'
                  : 'Filter by Com.Date'
              }
            />
            {dateFilter && (
              <button
                type="button"
                className="date-clear-btn"
                onClick={() => onDateFilterChange('')}
                title="Clear date filter"
              >
                ×
              </button>
            )}
          </div>

          {/* Print Stage Report Button - Authorized for stage owner (+ CEO & Admin; QA on overview/qa/stock_return) */}
          {canPrint && (
            <button
              id="btn-print-stage-report"
              type="button"
              className="btn-print-stage-report"
              onClick={handlePrintStageReport}
              title={`Print official ${currentTab === 'overview' ? 'master incident register' : `${currentTab} stage queue report`} (PDF)`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 13px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Printer size={15} color="#475569" />
              <span>Print Stage Report</span>
            </button>
          )}

          {/* Export to Excel Split Button & Dropdown - Authorized for stage owner (+ CEO & Admin; QA on overview/qa/stock_return) */}
          {canExport && (
            <div className="export-excel-wrapper" ref={exportMenuRef}>
              <div className="export-excel-split-btn">
                <button
                  id="btn-export-excel"
                  type="button"
                  className="btn-export-excel"
                  onClick={() => onExportExcel && onExportExcel(false)}
                  disabled={isExporting}
                  title="Download complaint sheet with all workflow stages and embedded defect photos in Excel (.xlsx)"
                  aria-label="Export complaints to Excel"
                >
                  {isExporting ? (
                    <Loader2 size={15} className="spin-animation" />
                  ) : (
                    <FileSpreadsheet size={15} />
                  )}
                  <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
                </button>
                <button
                  type="button"
                  className="btn-export-dropdown-toggle"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  disabled={isExporting}
                  title="Export options (current stage view or archive)"
                  aria-label="Export options"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {isExportMenuOpen && (
                <div className="export-dropdown-menu">
                  <button
                    type="button"
                    className="export-dropdown-item"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      onExportExcel && onExportExcel(false);
                    }}
                  >
                    <div className="export-item-header">
                      <Download size={14} className="export-item-icon" />
                      <span className="export-item-title">Export Current View</span>
                    </div>
                    <span className="export-item-desc">
                      {sortedComplaints.length} records matching current stage & filters
                    </span>
                  </button>
                  <button
                    type="button"
                    className="export-dropdown-item"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      onExportExcel && onExportExcel(userRole === 'Admin' || userRole === 'CEO');
                    }}
                  >
                    <div className="export-item-header">
                      <FileSpreadsheet size={14} className="export-item-icon" />
                      <span className="export-item-title">
                        {userRole === 'Admin' || userRole === 'CEO'
                          ? 'Export All Records'
                          : 'Export All Stage Records'}
                      </span>
                    </div>
                    <span className="export-item-desc">
                      {userRole === 'Admin' || userRole === 'CEO'
                        ? 'All complaints in register with complete photos'
                        : `All active records for ${currentTab === 'overview' ? 'overview register' : currentTab}`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* New Complaint Button - Functional for Sales team (Stage 01) and Warehouse team */}
          {canCreateComplaint && (
            <button
              id="btn-new-complaint"
              className="btn-primary-action"
              onClick={onOpenNewComplaint}
              title={isWarehouseTab ? "Record new defect found at warehouse (SONAVITH Warehouse)" : "Intake new customer complaint"}
            >
              <Plus size={16} />
              <span>New complaint</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table className="complaints-table">
          <thead>
            {(isStockReturnTab || isDisposalTab) ? (
              <tr>
                <th style={{ verticalAlign: 'middle', minWidth: 140 }}>ID</th>
                {isDisposalTab && (
                  <>
                    <th style={{ verticalAlign: 'middle', lineHeight: 1.25, minWidth: 120 }}>
                      Product ID
                    </th>
                    <th style={{ verticalAlign: 'middle', lineHeight: 1.25, minWidth: 140 }}>
                      Confirmed<br />Defect Type
                    </th>
                  </>
                )}
                {isStockReturnTab && (
                  <>
                    <th style={{ verticalAlign: 'middle', lineHeight: 1.25, minWidth: 120 }}>
                      Bin Location<br />of Stock Return
                    </th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center', lineHeight: 1.25, minWidth: 90 }}>
                      Photo<br />Reference
                    </th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'right', lineHeight: 1.25, minWidth: 90 }}>
                      Returned<br />QTY
                    </th>
                    <th style={{ verticalAlign: 'middle', textAlign: 'center', lineHeight: 1.25, minWidth: 120 }}>
                      Status<br />(Write Off/Rework)
                    </th>
                  </>
                )}
                <th style={{ verticalAlign: 'middle', textAlign: 'right', lineHeight: 1.25, minWidth: 125 }}>
                  Confirmed Write Off<br />QTY
                </th>
                <th style={{ verticalAlign: 'middle', textAlign: 'center', lineHeight: 1.25, minWidth: 120 }}>
                  Write Off<br />Batch Code
                </th>
                <th style={{ verticalAlign: 'middle', textAlign: 'right', lineHeight: 1.25, minWidth: 130 }}>
                  Confirmed Rework /<br />Saleable QTY
                </th>
                {isStockReturnTab && (
                  <th style={{ verticalAlign: 'middle', textAlign: 'center', lineHeight: 1.25, minWidth: 110 }}>
                    Signed Off<br />(QA)
                  </th>
                )}
                {isDisposalTab && (
                  <th style={{ verticalAlign: 'middle', textAlign: 'center', lineHeight: 1.25, minWidth: 125 }}>
                    Disposal Status<br />& Date
                  </th>
                )}
                {showActionColumn && <th style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: 120 }}>Action</th>}
              </tr>
            ) : (
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Code</th>
                <th
                  className={`sortable-header ${dateMode === 'expiry_date' ? 'header-active-sort' : ''}`}
                  onClick={() => handleHeaderSort('expiry_date')}
                  title="Click to sort by EXP"
                >
                  <div className="header-sort-content">
                    <span>EXP</span>
                    <span className={`sort-indicator ${dateMode === 'expiry_date' ? 'active' : 'inactive'}`}>
                      {dateMode === 'expiry_date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th>Pro.Time</th>
                <th>Defect type</th>
                <th>QTY</th>
                <th>UOM</th>
                <th>Photo</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }} title="Defect rate percentage of order quantity">
                  Defect (%)
                </th>
                <th
                  className={`sortable-header ${dateMode === 'complaint_date' ? 'header-active-sort' : ''}`}
                  onClick={() => handleHeaderSort('complaint_date')}
                  title="Click to sort by Com.Date"
                >
                  <div className="header-sort-content">
                    <span>Com.Date</span>
                    <span className={`sort-indicator ${dateMode === 'complaint_date' ? 'active' : 'inactive'}`}>
                      {dateMode === 'complaint_date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th>Status</th>
                {showActionColumn && <th>Action</th>}
              </tr>
            )}
          </thead>
          <tbody>
            {sortedComplaints.length === 0 ? (
              <tr>
                <td colSpan={(isStockReturnTab || isDisposalTab) ? (showActionColumn ? (isDisposalTab ? 8 : 10) : (isDisposalTab ? 7 : 9)) : (showActionColumn ? 14 : 13)} className="empty-state">
                  No complaints found matching current filters.
                </td>
              </tr>
            ) : (
              sortedComplaints.map((item) => {
                if (isStockReturnTab || isDisposalTab) {
                  return (
                    <tr key={item.id}>
                      <td className="complaint-id-cell" style={{ fontWeight: 700, color: 'var(--color-brand)', verticalAlign: 'middle' }}>
                        <div>{item.id}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400, marginTop: 2 }}>
                          {item.customer_name} • {item.product_name}
                        </div>
                      </td>

                      {/* Stage 06 Only: Product ID & Confirmed Defect Type (from Stage 02 QA) */}
                      {isDisposalTab && (
                        <>
                          <td style={{ verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                              }}
                              title="Product ID from Masterlist"
                            >
                              {item.product_id || item.product_short_code || '—'}
                            </span>
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 6,
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                              }}
                              title="Confirmed Defect Type verified in Stage 02 (QA)"
                            >
                              {item.qa_review?.confirmed_defect_type || item.defect_type || '—'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* 1, 2, 3, 4. Bin Location, Photo Reference, Returned QTY & Status (Stage 05 only) */}
                      {isStockReturnTab && (
                        <>
                          <td style={{ verticalAlign: 'middle' }}>
                            {item.stock_return?.bin_location || Number(item.stock_return?.virtual_returned_quantity) > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {item.stock_return?.bin_location && item.stock_return.bin_location !== 'Virtual Write-Off' && (
                                  <div style={{ fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: '#16a34a',
                                        boxShadow: '0 0 0 2px #bbf7d0',
                                        flexShrink: 0,
                                      }}
                                      title="Warehouse bin assigned and verified"
                                    ></span>
                                    <span>{item.stock_return.bin_location}</span>
                                  </div>
                                )}
                                {Number(item.stock_return?.virtual_returned_quantity) > 0 && (
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      fontSize: '0.70rem',
                                      fontWeight: 600,
                                      color: '#7c3aed',
                                      background: '#faf5ff',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      border: '1px solid #ddd6fe',
                                      width: 'fit-content',
                                    }}
                                    title={`Virtual stock written off on-site at province/customer: ${item.stock_return.virtual_location || 'Customer Place'}`}
                                  >
                                    <MapPin size={10} />
                                    <span>Virt: {item.stock_return.virtual_returned_quantity} {item.unit_of_measure} (On-site)</span>
                                  </div>
                                )}
                              </div>
                            ) : isStockReturnTab && canActionInStockReturn ? (
                              <button
                                type="button"
                                onClick={() => onOpenStageAction(item, 'stock_return')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0284c7',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontStyle: 'italic',
                                  fontSize: '0.8rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                                title="Click to input bin location (Warehouse team)"
                              >
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#cbd5e1', flexShrink: 0 }}></span>
                                <span>+ Input bin location</span>
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>Pending bin</span>
                            )}
                          </td>

                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                              {(item.disposal?.photo_url || item.stock_return?.photo_url) ? (
                                <button
                                  type="button"
                                  className="photo-thumb-btn"
                                  onClick={() => {
                                    const pUrl = item.disposal?.photo_url || item.stock_return.photo_url;
                                    onSelectPhoto(pUrl, `${item.id} - Stock Return Physical Photo Reference`);
                                  }}
                                  title="Click to expand physical photo reference"
                                  style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}
                                >
                                  <img
                                    src={(item.disposal?.photo_url || item.stock_return.photo_url).split(',')[0].trim()}
                                    alt="Return proof"
                                    className="photo-thumb-img"
                                    style={{ border: '2px solid #eab308', width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
                                  />
                                  {(item.disposal?.photo_url || item.stock_return.photo_url).includes(',') && (
                                    <span style={{
                                      position: 'absolute', top: -5, right: -5,
                                      background: '#d97706', color: '#fff',
                                      fontSize: '0.62rem', fontWeight: 700,
                                      borderRadius: '50%', width: 16, height: 16,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                    }}>
                                      {(item.disposal?.photo_url || item.stock_return.photo_url).split(',').filter(Boolean).length}
                                    </span>
                                  )}
                                </button>
                              ) : null}

                              {/* Virtual write-off video reference button */}
                              {item.stock_return?.virtual_video_url ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectPhoto(item.stock_return.virtual_video_url, `${item.id} - On-Site Write-Off Video`);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 7px',
                                    borderRadius: 6,
                                    background: '#ede9fe',
                                    border: '1px solid #c4b5fd',
                                    color: '#6d28d9',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title="Play customer on-site destruction video reference"
                                >
                                  <Video size={13} color="#7c3aed" />
                                  <span>Video</span>
                                </button>
                              ) : null}

                              {!(item.disposal?.photo_url || item.stock_return?.photo_url) && !item.stock_return?.virtual_video_url && (
                                isStockReturnTab && canActionInStockReturn ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenStageAction(item, 'stock_return')}
                                    style={{
                                      background: '#fef08a',
                                      color: '#854d0e',
                                      border: '1px dashed #ca8a04',
                                      borderRadius: 6,
                                      padding: '4px 8px',
                                      fontSize: '0.74rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    title="Upload stock return photo or video reference"
                                  >
                                    <Camera size={12} />
                                    <span>+ Upload</span>
                                  </button>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No media</span>
                                )
                              )}
                            </div>
                          </td>

                          {/* 3. Returned QTY: Formatted with Total Sum and Physical/Virtual Breakdown */}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', verticalAlign: 'middle' }}>
                            {item.stock_return?.returned_quantity !== undefined && item.stock_return?.returned_quantity !== null ? (
                              <div>
                                <div style={{ fontSize: '0.88rem' }}>
                                  {item.stock_return.returned_quantity} {item.unit_of_measure || ''}
                                </div>
                                {(Number(item.stock_return.physical_returned_quantity) > 0 || Number(item.stock_return.virtual_returned_quantity) > 0) && (
                                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, marginTop: 1 }}>
                                    {Number(item.stock_return.physical_returned_quantity) > 0 && (
                                      <span title="Physical stock received at warehouse">📦 {item.stock_return.physical_returned_quantity}</span>
                                    )}
                                    {Number(item.stock_return.physical_returned_quantity) > 0 && Number(item.stock_return.virtual_returned_quantity) > 0 && (
                                      <span> + </span>
                                    )}
                                    {Number(item.stock_return.virtual_returned_quantity) > 0 && (
                                      <span style={{ color: '#6d28d9', fontWeight: 600 }} title="Virtual stock written off at customer place">📍 {item.stock_return.virtual_returned_quantity}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : isStockReturnTab && canActionInStockReturn ? (
                              <button
                                type="button"
                                onClick={() => onOpenStageAction(item, 'stock_return')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0284c7',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: '0.78rem',
                                  fontStyle: 'italic',
                                }}
                                title="Input returned quantity"
                              >
                                + Input QTY
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>
                            )}
                          </td>

                          {/* 4. Status (Write Off/Rework): Color-coded pill (#fee2e2 / red for Write Off, #dcfce7 / green for Rework) */}
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            {item.stock_return?.disposition_status ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: 9999,
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: item.stock_return.disposition_status === 'Write Off' ? '#fee2e2' : (item.stock_return.disposition_status === 'Rework' ? '#dcfce7' : '#fef3c7'),
                                  color: item.stock_return.disposition_status === 'Write Off' ? '#b91c1c' : (item.stock_return.disposition_status === 'Rework' ? '#15803d' : '#92400e'),
                                  border: `1px solid ${item.stock_return.disposition_status === 'Write Off' ? '#fca5a5' : (item.stock_return.disposition_status === 'Rework' ? '#86efac' : '#fde047')}`,
                                }}
                              >
                                {item.stock_return.disposition_status}
                              </span>
                            ) : isStockReturnTab && canActionInStockReturn ? (
                              <button
                                type="button"
                                onClick={() => onOpenStageAction(item, 'stock_return')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0284c7',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: '0.78rem',
                                  fontStyle: 'italic',
                                }}
                                title="Select Write Off or Rework status"
                              >
                                + Set status
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>Pending</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* 5. Confirmed Write Off QTY: Bold red metric */}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#b91c1c', fontSize: '0.88rem', verticalAlign: 'middle' }}>
                        {item.stock_return?.confirmed_write_off_quantity !== undefined && item.stock_return?.confirmed_write_off_quantity !== null ? (
                          <div>
                            <div>{item.stock_return.confirmed_write_off_quantity} {item.unit_of_measure || ''}</div>
                            {Number(item.stock_return.virtual_returned_quantity) > 0 && (
                              <div style={{ fontSize: '0.67rem', color: '#7c3aed', fontWeight: 600 }}>
                                incl. {item.stock_return.virtual_returned_quantity} virt
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>
                        )}
                      </td>

                      {/* 5b. Write Off Batch Code: Dedicated column for Stage 05 & Stage 06 */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {(item.stock_return?.write_off_batch || (isDisposalTab && item.manufacturing_code)) ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              backgroundColor: '#fef2f2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                            }}
                            title="Write Off Batch Code"
                          >
                            {item.stock_return?.write_off_batch || (item.production_batch ? `${item.manufacturing_code}-${item.production_batch}` : item.manufacturing_code)}
                          </span>
                        ) : isStockReturnTab && canActionInStockReturn ? (
                          <button
                            type="button"
                            onClick={() => onTakeAction(item)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '0.76rem',
                              fontStyle: 'italic',
                            }}
                            title="Click to input Write Off Batch Code"
                          >
                            + Input code
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>
                        )}
                      </td>

                      {/* 6. Confirmed Rework/Saleable QTY: Bold green metric */}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#15803d', fontSize: '0.88rem', verticalAlign: 'middle' }}>
                        {item.stock_return?.confirmed_rework_quantity !== undefined && item.stock_return?.confirmed_rework_quantity !== null ? (
                          <span>{item.stock_return.confirmed_rework_quantity} {item.unit_of_measure || ''}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>
                        )}
                      </td>

                      {/* 7. Signed Off (QA): Stage 05 only */}
                      {isStockReturnTab && (
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          {canQASignOff ? (
                            <div style={{ display: 'inline-flex', borderRadius: 6, border: '1px solid #cbd5e1', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                              <button
                                type="button"
                                onClick={() => onSignOffStockReturn && onSignOffStockReturn(item.id, 'Yes')}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  backgroundColor: item.stock_return?.qa_signed_off === 'Yes' ? '#16a34a' : '#f8fafc',
                                  color: item.stock_return?.qa_signed_off === 'Yes' ? '#ffffff' : '#64748b',
                                }}
                                title="QA Sign Off: Yes (Warehouse action turns Complete)"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => onSignOffStockReturn && onSignOffStockReturn(item.id, 'No')}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  border: 'none',
                                  borderLeft: '1px solid #cbd5e1',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  backgroundColor: item.stock_return?.qa_signed_off === 'No' ? '#dc2626' : '#f8fafc',
                                  color: item.stock_return?.qa_signed_off === 'No' ? '#ffffff' : '#64748b',
                                }}
                                title="QA Sign Off: No (Warehouse action remains open as Edit Return)"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            item.stock_return?.qa_signed_off === 'Yes' ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 9px',
                                  borderRadius: 9999,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  backgroundColor: '#dcfce7',
                                  color: '#15803d',
                                  border: '1px solid #86efac',
                                }}
                                title={`Signed off by ${item.stock_return?.qa_signed_off_by || 'QA'}`}
                              >
                                ✓ Yes
                              </span>
                            ) : item.stock_return?.qa_signed_off === 'No' ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 9px',
                                  borderRadius: 9999,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1px solid #fca5a5',
                                }}
                                title="Not signed off by QA"
                              >
                                ✗ No
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.74rem', fontStyle: 'italic' }}>
                                Pending QA
                              </span>
                            )
                          )}
                        </td>
                      )}

                      {/* 8. Stage 06: Disposal Status & Date column */}
                      {isDisposalTab && (
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          {item.status === 'Closed' && item.disposal?.status !== 'Open' ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 8px',
                                  borderRadius: 9999,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  backgroundColor: '#ede9fe',
                                  color: '#5b21b6',
                                  border: '1px solid #c4b5fd'
                                }}
                                title="Closed by Finance Manager"
                              >
                                <CheckCircle size={12} />
                                <span>Closed</span>
                              </span>
                              {item.disposal?.disposal_date && (
                                <span style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 600 }}>
                                  {item.disposal.disposal_date}
                                </span>
                              )}
                            </div>
                          ) : item.disposal?.status === 'Open' ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 9px',
                                  borderRadius: 9999,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  backgroundColor: '#fef08a',
                                  color: '#854d0e',
                                  border: '1px solid #eab308'
                                }}
                                title="Disposal batch open by Finance Manager"
                              >
                                Open
                              </span>
                              {item.disposal?.disposal_date && (
                                <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600 }}>
                                  {item.disposal.disposal_date}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                borderRadius: 9999,
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a'
                              }}
                              title="Stage 05 completed & signed off. Awaiting Finance disposal action"
                            >
                              Pending Disposal
                            </span>
                          )}
                        </td>
                      )}

                      {/* Action column */}
                      {showActionColumn && (
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          {isDisposalTab ? (
                            canActionInDisposal ? (
                              item.status === 'Closed' || item.disposal ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn-table-action"
                                    style={{
                                      backgroundColor: '#ede9fe',
                                      color: '#5b21b6',
                                      border: '1px solid #c4b5fd',
                                      fontWeight: 600,
                                      padding: '5px 10px',
                                      fontSize: '0.78rem'
                                    }}
                                    onClick={() => onOpenStageAction(item, 'disposal')}
                                    title="Edit disposal record & tax count"
                                  >
                                    Edit Disposal
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-table-action"
                                    onClick={() => onOpenStageAction(item, 'view')}
                                    style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                                    title="View full timeline"
                                  >
                                    Details
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-table-action btn-table-action-primary"
                                  style={{
                                    backgroundColor: '#6d28d9',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: 700,
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    boxShadow: '0 1px 2px rgba(109, 40, 217, 0.25)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                  }}
                                  onClick={() => onOpenStageAction(item, 'disposal')}
                                  title="Input tax count, disposal date and close complaint"
                                >
                                  <span>Disposal Action</span>
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                className="btn-table-action"
                                onClick={() => onOpenStageAction(item, 'view')}
                                title="View full details"
                              >
                                Details
                              </button>
                            )
                          ) : item.stock_return?.qa_signed_off === 'Yes' ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '5px 12px',
                                  borderRadius: 6,
                                  backgroundColor: '#dcfce7',
                                  color: '#15803d',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  border: '1px solid #86efac',
                                }}
                                title="QA Signed Off: Yes - Return is Complete"
                              >
                                <CheckCircle size={13} />
                                <span>Complete</span>
                              </span>
                              <button
                                type="button"
                                className="btn-table-action"
                                onClick={() => onOpenStageAction(item, 'view')}
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                title="View details"
                              >
                                Details
                              </button>
                            </div>
                          ) : canActionInStockReturn ? (
                            <button
                              type="button"
                              className="btn-table-action btn-table-action-primary"
                              style={{
                                backgroundColor: item.stock_return ? '#0f766e' : '#ca8a04',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 600,
                                padding: '6px 12px',
                                borderRadius: 6,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              }}
                              onClick={() => onOpenStageAction(item, 'stock_return')}
                              title={item.stock_return ? 'Edit Stock Return Information' : 'Input Stock Return Information (Warehouse)'}
                            >
                              {item.stock_return ? 'Edit Return' : '+ Fill In Return'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => onOpenStageAction(item, 'view')}
                              title="View full details"
                            >
                              Details
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                }

                return (
                  <tr key={item.id}>
                    <td className="complaint-id-cell">{item.id}</td>
                    <td>
                      <div className="customer-name-cell">{item.customer_name}</div>
                      {renderCustomerLocation(item.customer_location)}
                    </td>
                    <td>
                      <div>{item.product_name}</div>
                      {(item.price_discount || item.storage_temp || item.so_number || item.order_quantity || item.shipment_date) && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                          {item.so_number && (
                            <span
                              style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}
                              title={`Sales Order: ${item.so_number}`}
                            >
                              SO: {item.so_number}
                            </span>
                          )}
                          {item.order_quantity && (
                            <span
                              style={{ fontSize: '0.68rem', background: '#e0e7ff', color: '#3730a3', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}
                              title={`Order QTY: ${item.order_quantity}`}
                            >
                              Ord: {item.order_quantity}
                            </span>
                          )}
                          {item.shipment_date && (
                            <span
                              style={{ fontSize: '0.68rem', background: '#f0fdf4', color: '#166534', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}
                              title={`Shipment Date: ${item.shipment_date}`}
                            >
                              Ship: {item.shipment_date}
                            </span>
                          )}
                          {item.price_discount && (
                            <span
                              style={{ fontSize: '0.68rem', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}
                              title={`Sales Price Discount: ${item.price_discount}`}
                            >
                              Disc: {item.price_discount}
                            </span>
                          )}
                          {item.storage_temp && (
                            <span
                              style={{ fontSize: '0.68rem', background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: 4, fontWeight: 500 }}
                              title={`Sales Intake Storage Temp: ${item.storage_temp}`}
                            >
                              {item.storage_temp}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>{item.manufacturing_code}</td>
                    <td>{item.product_expiry_date}</td>
                    <td>{item.production_batch}</td>
                    <td>
                      <div>{item.defect_type}</div>
                      {item.qa_review?.confirmed_defect_type && (
                        <div
                          style={{
                            fontSize: '0.70rem',
                            color: '#0284c7',
                            fontWeight: 600,
                            marginTop: 2,
                          }}
                          title={`QA Confirmed Defect Type: ${item.qa_review.confirmed_defect_type}`}
                        >
                          QA: {item.qa_review.confirmed_defect_type}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.defect_quantity}</div>
                      {item.qa_review?.confirmed_defect_quantity !== undefined && item.qa_review?.confirmed_defect_quantity !== null && (
                        <div
                          style={{
                            fontSize: '0.70rem',
                            color: '#0284c7',
                            fontWeight: 600,
                            marginTop: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title={`QA Confirmed: ${item.qa_review.confirmed_defect_quantity} ${item.unit_of_measure} | Storage Temp: ${item.qa_review.customer_storage_temperature || 'N/A'}`}
                        >
                          <span>QA: {item.qa_review.confirmed_defect_quantity}</span>
                          {item.qa_review?.storage_temperature_photo_url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectPhoto(item.qa_review.storage_temperature_photo_url, `${item.id} (Storage Temp: ${item.qa_review.customer_storage_temperature || 'Proof'})`);
                              }}
                              title={`View Storage Temp Photo Reference (${item.qa_review.customer_storage_temperature || 'Proof'})`}
                              style={{
                                background: '#e0f2fe',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                borderRadius: 4,
                                padding: '1px 3px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <Camera size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td>{item.unit_of_measure}</td>
                    <td>
                      {item.photo_url ? (
                        <button
                          className="photo-thumb-btn"
                          onClick={() => onSelectPhoto(item.photo_url, item.id)}
                          title={item.photo_url.includes(',') ? "Click to view photos" : "Click to view photo"}
                          style={{ position: 'relative' }}
                        >
                          <img
                            src={item.photo_url.split(',')[0].trim()}
                            alt="Defect proof"
                            className="photo-thumb-img"
                            onError={(e) => {
                              const rawPath = item.photo_url.split(',')[0].trim();
                              if (rawPath.startsWith('/') && !e.currentTarget.dataset.retriedBackend) {
                                e.currentTarget.dataset.retriedBackend = '1';
                                e.currentTarget.src = `http://127.0.0.1:8000${rawPath}`;
                              }
                            }}
                          />
                          {item.photo_url.includes(',') && (
                            <span style={{
                              position: 'absolute', top: -4, right: -4,
                              background: 'var(--color-brand)', color: '#fff',
                              fontSize: '0.6rem', fontWeight: 700,
                              borderRadius: '50%', width: 14, height: 14,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {item.photo_url.split(',').length}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem' }}>
                          None
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      {(() => {
                        const defectQty = item.qa_review?.confirmed_defect_quantity !== undefined && item.qa_review?.confirmed_defect_quantity !== null
                          ? Number(item.qa_review.confirmed_defect_quantity)
                          : Number(item.defect_quantity);
                        const orderQty = Number(item.order_quantity);

                        if (orderQty && orderQty > 0 && !isNaN(defectQty)) {
                          const pct = ((defectQty / orderQty) * 100).toFixed(1);
                          const numPct = parseFloat(pct);
                          const isHigh = numPct >= 5.0;
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background: isHigh ? '#fee2e2' : '#f1f5f9',
                                color: isHigh ? '#b91c1c' : '#334155',
                                border: isHigh ? '1px solid #fecaca' : '1px solid #e2e8f0',
                                letterSpacing: '0.01em',
                              }}
                              title={`Defect: ${defectQty} / Order: ${orderQty} (${pct}%)`}
                            >
                              {pct}%
                            </span>
                          );
                        }
                        return <span style={{ color: '#94a3b8' }}>—</span>;
                      })()}
                    </td>
                    <td>{item.complaint_date}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    {showActionColumn && (
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {/* Overview Tab: Detail of the completed/closed (view all stage details 01 to 06), or "Not Complete" for pending */}
                        {isOverviewTab && (
                          (item.status === 'Completed' || item.status === 'Closed') ? (
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => onOpenStageAction(item, 'view')}
                              title="View complete information across stages 01 to 06"
                            >
                              Details
                            </button>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.74rem',
                                color: '#94a3b8',
                                fontStyle: 'italic',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Not Complete
                            </span>
                          )
                        )}

                        {/* QA Stage */}
                        {currentTab === 'qa' && (
                          canActionInQA && item.status === 'Pending QA' ? (
                            <button
                              className="btn-table-action btn-table-action-primary"
                              onClick={() => onOpenStageAction(item, 'qa')}
                            >
                              Inspect QA
                            </button>
                          ) : (
                            <button
                              className="btn-table-action"
                              onClick={() => onOpenStageAction(item, 'view')}
                            >
                              Details
                            </button>
                          )
                        )}

                        {/* CEO Stage */}
                        {currentTab === 'ceo' && (
                          canActionInCEO && item.status === 'Pending approval' ? (
                            <button
                              className="btn-table-action btn-table-action-primary"
                              onClick={() => onOpenStageAction(item, 'ceo')}
                            >
                              CEO Review
                            </button>
                          ) : (
                            <button
                              className="btn-table-action"
                              onClick={() => onOpenStageAction(item, 'view')}
                            >
                              Details
                            </button>
                          )
                        )}

                        {/* Warehouse Stage */}
                        {currentTab === 'warehouse' && (
                          canActionInWarehouse && item.status === 'Approved' ? (
                            <button
                              className="btn-table-action btn-table-action-primary"
                              onClick={() => onOpenStageAction(item, 'warehouse')}
                            >
                              Fulfill
                            </button>
                          ) : (
                            <button
                              className="btn-table-action"
                              onClick={() => onOpenStageAction(item, 'view')}
                            >
                              Details
                            </button>
                          )
                        )}


                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
