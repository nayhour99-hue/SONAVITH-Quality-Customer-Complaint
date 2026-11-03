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
} from 'lucide-react';

export default function ComplaintTable({
  complaints,
  currentTab,
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
}) {
  const isSalesTab = currentTab === 'sales';
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

          {/* Export to Excel Split Button & Dropdown */}
          <div className="export-excel-wrapper" ref={exportMenuRef}>
            <div className="export-excel-split-btn">
              <button
                id="btn-export-excel"
                type="button"
                className="btn-export-excel"
                onClick={() => onExportExcel && onExportExcel(false)}
                disabled={isExporting}
                title="Download complaint sheet with all 4 workflow stages and embedded defect photos in Excel (.xlsx)"
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
                title="Export options (current view or full archive)"
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
                    {sortedComplaints.length} records matching current tab & filters
                  </span>
                </button>
                <button
                  type="button"
                  className="export-dropdown-item"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExportExcel && onExportExcel(true);
                  }}
                >
                  <div className="export-item-header">
                    <FileSpreadsheet size={14} className="export-item-icon" />
                    <span className="export-item-title">Export All Records</span>
                  </div>
                  <span className="export-item-desc">
                    All complaints in register with complete photos
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* New Complaint Button (Especially in Sales View) */}
          <button
            id="btn-new-complaint"
            className="btn-primary-action"
            onClick={onOpenNewComplaint}
          >
            <Plus size={16} />
            <span>+ New complaint</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table className="complaints-table">
          <thead>
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
              <th
                className={`sortable-header ${dateMode === 'shipment_date' ? 'header-active-sort' : ''}`}
                onClick={() => handleHeaderSort('shipment_date')}
                title="Click to sort by Shipment Date"
              >
                <div className="header-sort-content">
                  <span>Ship.Date</span>
                  <span className={`sort-indicator ${dateMode === 'shipment_date' ? 'active' : 'inactive'}`}>
                    {dateMode === 'shipment_date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </div>
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedComplaints.length === 0 ? (
              <tr>
                <td colSpan="14" className="empty-state">
                  No complaints found matching current filters.
                </td>
              </tr>
            ) : (
              sortedComplaints.map((item) => (
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
                  <td>{item.defect_type}</td>
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
                          src={item.photo_url.split(',')[0]}
                          alt="Defect proof"
                          className="photo-thumb-img"
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
                  <td>{item.shipment_date || '—'}</td>
                  <td>{item.complaint_date}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    {/* Stage transition button based on status and view */}
                    {item.status === 'Pending QA' && (
                      <button
                        className="btn-table-action btn-table-action-primary"
                        onClick={() => onOpenStageAction(item, 'qa')}
                      >
                        Inspect QA
                      </button>
                    )}
                    {item.status === 'Pending approval' && (
                      <button
                        className="btn-table-action btn-table-action-primary"
                        onClick={() => onOpenStageAction(item, 'ceo')}
                      >
                        CEO Review
                      </button>
                    )}
                    {item.status === 'Approved' && (
                      <button
                        className="btn-table-action btn-table-action-primary"
                        onClick={() => onOpenStageAction(item, 'warehouse')}
                      >
                        Fulfill
                      </button>
                    )}
                    {item.status === 'Completed' && (
                      <button
                        className="btn-table-action"
                        onClick={() => onOpenStageAction(item, 'view')}
                      >
                        Details
                      </button>
                    )}
                    {item.status === 'Rejected' && (
                      <button
                        className="btn-table-action"
                        onClick={() => onOpenStageAction(item, 'view')}
                      >
                        Details
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
