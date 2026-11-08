import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { X, CheckCircle2, FileSpreadsheet, Layers, CheckSquare, Square, Printer } from 'lucide-react';

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function getEffectiveBatchCode(item) {
  const explicit = item?.stock_return?.write_off_batch?.trim();
  if (explicit) return explicit;
  if (item?.manufacturing_code) {
    return item.production_batch
      ? `${item.manufacturing_code}-${item.production_batch}`
      : item.manufacturing_code;
  }
  return 'Batch-01';
}

export default function BatchDisposalModal({
  isOpen,
  onClose,
  complaints = [],
  canEdit = true,
  onSubmitBatchDisposal,
}) {
  const [letterIssueDate, setLetterIssueDate] = useState(getTodayStr());
  const [disposalDate, setDisposalDate] = useState(getTodayStr());
  const [financeManagerName, setFinanceManagerName] = useState('Finance Manager');
  const [taxOfficerName, setTaxOfficerName] = useState('Tax Authority Representative');
  const [taxCountStatus, setTaxCountStatus] = useState('Counted & Approved by Tax Authority');
  const [disposalMethod, setDisposalMethod] = useState('Physical Destruction / Dump');
  const [actionStatus, setActionStatus] = useState('Closed');
  const [notes, setNotes] = useState('');
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Group Stage 06 complaints by Write Off Batch Code
  const batchGroups = useMemo(() => {
    const map = new Map();
    (complaints || []).forEach((item) => {
      const code = getEffectiveBatchCode(item);
      if (!map.has(code)) {
        map.set(code, {
          code,
          items: [],
          allClosed: true,
        });
      }
      const group = map.get(code);
      group.items.push(item);
      const isItemClosed = item.status === 'Closed' && item.disposal?.status !== 'Open';
      if (!isItemClosed) {
        group.allClosed = false;
      }
    });
    return Array.from(map.values());
  }, [complaints]);

  // Default selection when modal opens: select all pending/open batches (or all batches if all are closed)
  useEffect(() => {
    if (isOpen && batchGroups.length > 0) {
      const pendingCodes = batchGroups.filter((g) => !g.allClosed).map((g) => g.code);
      const initialCodes = pendingCodes.length > 0 ? pendingCodes : batchGroups.map((g) => g.code);
      setSelectedBatches(initialCodes);

      // Pre-populate fields from existing disposal record if available
      const sampleItem = complaints.find(
        (c) => initialCodes.includes(getEffectiveBatchCode(c)) && c.disposal
      );
      if (sampleItem && sampleItem.disposal) {
        setLetterIssueDate(sampleItem.disposal.disposal_letter_issue_date || getTodayStr());
        setDisposalDate(sampleItem.disposal.disposal_date || getTodayStr());
        setFinanceManagerName(sampleItem.disposal.finance_manager_name || 'Finance Manager');
        setTaxOfficerName(sampleItem.disposal.tax_officer_name || 'Tax Authority Representative');
        setTaxCountStatus(sampleItem.disposal.tax_count_status || 'Counted & Approved by Tax Authority');
        setDisposalMethod(sampleItem.disposal.disposal_method || 'Physical Destruction / Dump');
        setActionStatus(sampleItem.disposal.status || (sampleItem.status === 'Closed' ? 'Closed' : 'Open'));
        setNotes(sampleItem.disposal.notes || '');
      } else {
        setLetterIssueDate(getTodayStr());
        setDisposalDate(getTodayStr());
        setFinanceManagerName('Finance Manager');
        setTaxOfficerName('Tax Authority Representative');
        setTaxCountStatus('Counted & Approved by Tax Authority');
        setDisposalMethod('Physical Destruction / Dump');
        setActionStatus('Closed');
        setNotes('');
      }
      setErrorMsg('');
    }
  }, [isOpen, batchGroups, complaints]);

  // Filter complaints belonging to selected batch codes
  const selectedComplaints = useMemo(() => {
    return (complaints || []).filter((item) =>
      selectedBatches.includes(getEffectiveBatchCode(item))
    );
  }, [complaints, selectedBatches]);

  // Aggregate Summary Write-Off Report rows by Product ID + Product Name + UOM
  const aggregatedRows = useMemo(() => {
    const prodMap = new Map();
    selectedComplaints.forEach((item) => {
      const productId = item.product_id || item.product_short_code || '—';
      const productName = item.product_name || '—';
      const uom = item.unit_of_measure || 'BTL';
      const key = `${productId}__${productName}__${uom}`;

      const sr = item.stock_return || {};
      const writeOffQty =
        sr.confirmed_write_off_quantity !== undefined && sr.confirmed_write_off_quantity !== null
          ? Number(sr.confirmed_write_off_quantity)
          : Number(item.defect_quantity || 0);
      const virtualQty = Number(sr.virtual_returned_quantity || 0);
      const physicalQty =
        sr.physical_write_off_quantity !== undefined && sr.physical_write_off_quantity !== null && Number(sr.physical_write_off_quantity) > 0
          ? Number(sr.physical_write_off_quantity)
          : Math.max(0, writeOffQty - virtualQty);

      const defectType = item.qa_review?.confirmed_defect_type || item.defect_type || '—';

      if (!prodMap.has(key)) {
        prodMap.set(key, {
          productId,
          productName,
          writeOffQty: 0,
          virtualQty: 0,
          physicalQty: 0,
          uom,
          defectTypes: new Set(),
          complaintIds: [],
        });
      }
      const entry = prodMap.get(key);
      entry.writeOffQty += writeOffQty;
      entry.virtualQty += virtualQty;
      entry.physicalQty += physicalQty;
      if (defectType) entry.defectTypes.add(defectType);
      entry.complaintIds.push(item.id);
    });

    return Array.from(prodMap.values()).map((r) => ({
      ...r,
      confirmedDefectType: Array.from(r.defectTypes).join(', '),
    }));
  }, [selectedComplaints]);

  const totals = useMemo(() => {
    return aggregatedRows.reduce(
      (acc, r) => {
        acc.writeOffQty += r.writeOffQty;
        acc.virtualQty += r.virtualQty;
        acc.physicalQty += r.physicalQty;
        return acc;
      },
      { writeOffQty: 0, virtualQty: 0, physicalQty: 0 }
    );
  }, [aggregatedRows]);

  if (!isOpen) return null;

  const mergedBatchLabel =
    selectedBatches.length > 0 ? selectedBatches.join(' & ') : 'None selected';

  const toggleBatch = (code) => {
    setSelectedBatches((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleExportSummaryExcel = () => {
    const wsData = [
      ['Disposal letter issue Date:', letterIssueDate, '', '', 'Finance Manager Name:', financeManagerName, ''],
      ['Disposal date:', disposalDate, '', '', 'Tax Officer:', taxOfficerName, ''],
      ['Tax Count Status:', taxCountStatus, '', '', 'Disposal Method:', disposalMethod, ''],
      ['Write off batch code:', mergedBatchLabel, '', '', 'Status:', actionStatus, '(Action by Finance manager)'],
      [],
      ['Product ID', 'Product Name', 'Write off QTY', 'Virtual QTY', 'Physical QTY', 'UOM', 'Confirmed Defect Type'],
      ...aggregatedRows.map((r) => [
        r.productId,
        r.productName,
        r.writeOffQty,
        r.virtualQty,
        r.physicalQty,
        r.uom,
        r.confirmedDefectType,
      ]),
      ['TOTAL', `${selectedComplaints.length} claim(s) merged`, totals.writeOffQty, totals.virtualQty, totals.physicalQty, '', ''],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 44 },
      { wch: 15 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Write-Off Summary Report');
    const safeBatch = mergedBatchLabel.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 35);
    XLSX.writeFile(wb, `Disposal_Summary_${safeBatch}_${disposalDate}.xlsx`);
  };

  const handlePrintSummaryReport = () => {
    const esc = (val) =>
      val === undefined || val === null || val === ''
        ? '—'
        : String(val)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

    const printWin = window.open('', '_blank', 'width=960,height=820');
    if (!printWin) {
      window.print();
      return;
    }

    const rowsHtml = aggregatedRows
      .map(
        (r) => `
      <tr>
        <td style="font-family:monospace;font-weight:700;">${esc(r.productId)}</td>
        <td>${esc(r.productName)}</td>
        <td style="text-align:right;font-weight:800;color:#b91c1c;">${esc(r.writeOffQty)}</td>
        <td style="text-align:right;font-weight:700;color:#6d28d9;">${esc(r.virtualQty)}</td>
        <td style="text-align:right;font-weight:700;color:#0369a1;">${esc(r.physicalQty)}</td>
        <td style="text-align:center;font-weight:700;">${esc(r.uom)}</td>
        <td>${esc(r.confirmedDefectType)}</td>
      </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Summary Write-Off Report - ${esc(mergedBatchLabel)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      font-size: 12.5px;
    }
    .header-title {
      font-size: 17px;
      font-weight: 800;
      color: #4c1d95;
      margin-bottom: 4px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px;
      border: 1px solid #cbd5e1;
    }
    .meta-table td {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      font-size: 12px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
    }
    .data-table th, .data-table td {
      padding: 9px 12px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    .data-table th {
      background: #f1f5f9;
      font-weight: 800;
    }
    .data-table tfoot td {
      background: #fef2f2;
      font-weight: 800;
    }
    .sig-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 28px;
      page-break-inside: avoid;
    }
    .sig-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;">
    <button onclick="window.print()" style="background:#5b21b6;color:#fff;border:none;padding:7px 16px;border-radius:6px;font-weight:700;cursor:pointer;">Print / Save PDF</button>
    <button onclick="window.close()" style="background:#e2e8f0;color:#334155;border:none;padding:7px 14px;border-radius:6px;font-weight:600;cursor:pointer;">Close</button>
  </div>
  <div class="header-title">SONAVITH — STAGE 06 SUMMARY WRITE-OFF & BATCH DISPOSAL REPORT</div>
  <div style="font-size:11.5px;color:#475569;">Printed: ${new Date().toLocaleString()} • Merged Claims (${selectedComplaints.length}): ${esc(selectedComplaints.map((c) => c.id).join(', '))}</div>

  <table class="meta-table">
    <tr>
      <td style="width:22%;font-weight:700;background:#f8fafc;">Disposal letter issue Date:</td>
      <td style="width:28%;">${esc(letterIssueDate)}</td>
      <td style="width:22%;font-weight:700;background:#f8fafc;">Finance Manager Name:</td>
      <td style="width:28%;">${esc(financeManagerName)}</td>
    </tr>
    <tr>
      <td style="font-weight:700;background:#f8fafc;">Disposal date:</td>
      <td>${esc(disposalDate)}</td>
      <td style="font-weight:700;background:#f8fafc;">Tax Officer:</td>
      <td>${esc(taxOfficerName)}</td>
    </tr>
    <tr>
      <td style="font-weight:700;background:#f8fafc;">Tax Count Status:</td>
      <td>${esc(taxCountStatus)}</td>
      <td style="font-weight:700;background:#f8fafc;">Disposal Method:</td>
      <td>${esc(disposalMethod)}</td>
    </tr>
    <tr>
      <td style="font-weight:700;background:#fef2f2;color:#991b1b;">Write off batch code:</td>
      <td style="font-family:monospace;font-weight:800;color:#b91c1c;">${esc(mergedBatchLabel)}</td>
      <td style="font-weight:700;background:#fefce8;color:#854d0e;">Status:</td>
      <td style="background:#fef08a;font-weight:800;">${esc(actionStatus)} <span style="font-weight:500;font-size:11px;">(Action by Finance manager)</span></td>
    </tr>
  </table>

  <table class="data-table">
    <thead>
      <tr>
        <th>Product ID</th>
        <th>Product Name</th>
        <th style="text-align:right;color:#b91c1c;">Write off QTY</th>
        <th style="text-align:right;color:#6d28d9;">Virtual QTY</th>
        <th style="text-align:right;color:#0369a1;">Physical QTY</th>
        <th style="text-align:center;">UOM</th>
        <th>Confirmed Defect Type</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="color:#991b1b;">TOTAL AGGREGATED WRITE-OFF (${selectedBatches.length} Batch${selectedBatches.length === 1 ? '' : 'es'})</td>
        <td style="text-align:right;color:#b91c1c;">${totals.writeOffQty}</td>
        <td style="text-align:right;color:#6d28d9;">${totals.virtualQty}</td>
        <td style="text-align:right;color:#0369a1;">${totals.physicalQty}</td>
        <td colspan="2">Claims: ${esc(selectedComplaints.map((c) => c.id).join(', '))}</td>
      </tr>
    </tfoot>
  </table>

  <div class="sig-row">
    <div class="sig-box">
      <div style="font-weight:700;font-size:11px;margin-bottom:34px;">Prepared By (Warehouse / QA)</div>
      <div style="border-top:1px dashed #94a3b8;padding-top:4px;font-size:11px;">Stock Return & QA Control</div>
    </div>
    <div class="sig-box">
      <div style="font-weight:700;font-size:11px;margin-bottom:34px;">Verified By Tax Officer</div>
      <div style="border-top:1px dashed #94a3b8;padding-top:4px;font-size:11px;">${esc(taxOfficerName)}</div>
    </div>
    <div class="sig-box">
      <div style="font-weight:700;font-size:11px;margin-bottom:34px;">Approved & Closed By Finance Manager</div>
      <div style="border-top:1px dashed #94a3b8;padding-top:4px;font-size:11px;">${esc(financeManagerName)}</div>
    </div>
  </div>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 250);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedComplaints.length === 0) {
      setErrorMsg('Please select at least one Write Off Batch Code to process.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');
      await onSubmitBatchDisposal({
        complaint_ids: selectedComplaints.map((c) => c.id),
        disposal_letter_issue_date: letterIssueDate,
        disposal_date: disposalDate,
        finance_manager_name: financeManagerName,
        tax_officer_name: taxOfficerName,
        tax_count_status: taxCountStatus,
        disposal_method: disposalMethod,
        write_off_batch_codes: mergedBatchLabel,
        status: actionStatus,
        disposed_quantity: totals.writeOffQty,
        notes: notes || `Batch disposal (${mergedBatchLabel}) processed as ${actionStatus}.`,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit batch disposal action');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: '16px' }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 1160,
          width: '96vw',
          maxHeight: '94vh',
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
            color: '#fff',
            padding: '14px 24px',
            borderBottom: '1px solid #5b21b6',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  padding: '2px 10px',
                  borderRadius: 999,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                STAGE 06: BATCH DISPOSAL & WRITE-OFF REPORT
              </span>
            </div>
            <h2 style={{ margin: '4px 0 2px', fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              Summary Write-Off Report & Batch Disposal Closure
            </h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#ddd6fe' }}>
              Select or merge Write Off Batch Codes below to aggregate products and close all associated claims in one click.
            </p>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', borderRadius: 8 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '16px 24px',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: '#f8fafc',
          }}
        >
          {errorMsg && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, border: '1px solid #fecaca', fontSize: '0.84rem', fontWeight: 600, flexShrink: 0 }}>
              {errorMsg}
            </div>
          )}

          {/* 1. Batch Selector & Merger Bar */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '12px 16px',
              flexShrink: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                <Layers size={16} color="#6d28d9" />
                <span>Select / Merge Write Off Batch Codes ({selectedBatches.length} of {batchGroups.length} selected):</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    const pending = batchGroups.filter((g) => !g.allClosed).map((g) => g.code);
                    setSelectedBatches(pending.length > 0 ? pending : batchGroups.map((g) => g.code));
                  }}
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #c4b5fd',
                    background: '#f5f3ff',
                    color: '#5b21b6',
                    cursor: 'pointer',
                  }}
                >
                  Select Pending Batches
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatches(batchGroups.map((g) => g.code))}
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Merge All Batches
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {batchGroups.map((grp) => {
                const isSelected = selectedBatches.includes(grp.code);
                return (
                  <button
                    key={grp.code}
                    type="button"
                    onClick={() => toggleBatch(grp.code)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      backgroundColor: isSelected ? '#ede9fe' : '#ffffff',
                      color: isSelected ? '#4c1d95' : '#64748b',
                      border: isSelected ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      boxShadow: isSelected ? '0 2px 6px rgba(124,58,237,0.15)' : 'none',
                    }}
                  >
                    {isSelected ? <CheckSquare size={15} color="#6d28d9" /> : <Square size={15} color="#94a3b8" />}
                    <span style={{ fontFamily: 'monospace' }}>{grp.code}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '1px 6px',
                        borderRadius: 999,
                        background: grp.allClosed ? '#dcfce7' : '#fef3c7',
                        color: grp.allClosed ? '#15803d' : '#92400e',
                      }}
                    >
                      {grp.items.length} claim{grp.items.length > 1 ? 's' : ''} • {grp.allClosed ? 'Closed' : 'Open'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Official Report Header Table (Matches attached Excel layout, full visibility) */}
          <div
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
              }}
            >
              {/* Row 1 Left: Disposal letter issue Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '185px 1fr', alignItems: 'center', padding: '9px 14px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                  Disposal letter issue Date:
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={letterIssueDate}
                  onChange={(e) => setLetterIssueDate(e.target.value)}
                  disabled={!canEdit}
                  style={{ padding: '5px 10px', fontSize: '0.84rem' }}
                  required
                />
              </div>

              {/* Row 1 Right: Finance Manager Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                  Finance Manager Name:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={financeManagerName}
                  onChange={(e) => setFinanceManagerName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Finance Manager"
                  style={{ padding: '5px 10px', fontSize: '0.84rem' }}
                  required
                />
              </div>

              {/* Row 2 Left: Disposal date */}
              <div style={{ display: 'grid', gridTemplateColumns: '185px 1fr', alignItems: 'center', padding: '9px 14px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                  Disposal date:
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
                  disabled={!canEdit}
                  style={{ padding: '5px 10px', fontSize: '0.84rem' }}
                  required
                />
              </div>

              {/* Row 2 Right: Tax Officer */}
              <div style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                  Tax Officer:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={taxOfficerName}
                  onChange={(e) => setTaxOfficerName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Tax Authority Representative"
                  style={{ padding: '5px 10px', fontSize: '0.84rem' }}
                />
              </div>

              {/* Row 3 Left: Tax Count Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '185px 1fr', alignItems: 'center', padding: '9px 14px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                  Tax Count Status:
                </label>
                <select
                  className="form-select"
                  value={taxCountStatus}
                  onChange={(e) => setTaxCountStatus(e.target.value)}
                  disabled={!canEdit}
                  style={{ padding: '5px 10px', fontSize: '0.84rem' }}
                >
                  <option value="Counted & Approved by Tax Authority">Counted & Approved by Tax Authority</option>
                  <option value="Pending Tax Officer Count">Pending Tax Officer Count</option>
                  <option value="Tax Exemption / Internal Finance Cut">Tax Exemption / Internal Finance Cut</option>
                </select>
              </div>

              {/* Row 3 Right: Disposal Method */}
              <div style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                  Disposal Method:
                </label>
                <select
                  className="form-select"
                  value={disposalMethod}
                  onChange={(e) => setDisposalMethod(e.target.value)}
                  disabled={!canEdit}
                  style={{ padding: '5px 10px', fontSize: '0.84rem' }}
                >
                  <option value="Physical Destruction / Dump">Physical Destruction / Dump</option>
                  <option value="On-Site Customer Destruction (Video Verified)">On-Site Customer Destruction (Video Verified)</option>
                  <option value="Authorized Waste Contractor">Authorized Waste Contractor</option>
                  <option value="Incineration / Landfill Cut">Incineration / Landfill Cut</option>
                </select>
              </div>

              {/* Row 4 Left: Write off batch code */}
              <div style={{ display: 'grid', gridTemplateColumns: '185px 1fr', alignItems: 'center', padding: '10px 14px', borderRight: '1px solid #e2e8f0', background: '#fef2f2', borderBottomLeftRadius: 10 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991b1b' }}>
                  Write off batch code:
                </label>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    color: '#b91c1c',
                    padding: '5px 10px',
                    background: '#fff',
                    borderRadius: 6,
                    border: '1px solid #fecaca',
                  }}
                >
                  {mergedBatchLabel}
                </div>
              </div>

              {/* Row 4 Right: Status: Closed/Open (Action by Finance manager) */}
              <div style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '10px 14px', background: '#fefce8', borderBottomRightRadius: 10 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#854d0e' }}>
                  Status:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <select
                    className="form-select"
                    value={actionStatus}
                    onChange={(e) => setActionStatus(e.target.value)}
                    disabled={!canEdit}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      background: '#fef08a',
                      border: '2px solid #eab308',
                      color: actionStatus === 'Closed' ? '#15803d' : '#b45309',
                      width: 'auto',
                      minWidth: 115,
                    }}
                  >
                    <option value="Closed">Closed</option>
                    <option value="Open">Open</option>
                  </select>
                  <span style={{ fontSize: '0.76rem', color: '#713f12', fontWeight: 600 }}>
                    (Action by Finance manager)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Summary Write-Off Report Table (Aggregated by Product, Scrollable) */}
          <div
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              background: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: '#f1f5f9',
                padding: '10px 16px',
                borderBottom: '1px solid #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>
                Aggregated Product Write-Off Summary ({aggregatedRows.length} Product SKU{aggregatedRows.length === 1 ? '' : 's'} from {selectedComplaints.length} Claim{selectedComplaints.length === 1 ? '' : 's'})
              </strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handlePrintSummaryReport}
                  disabled={aggregatedRows.length === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: '1px solid #6d28d9',
                    background: '#f5f3ff',
                    color: '#5b21b6',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: aggregatedRows.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Printer size={14} />
                  <span>Print Summary Report</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportSummaryExcel}
                  disabled={aggregatedRows.length === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: '1px solid #16a34a',
                    background: '#f0fdf4',
                    color: '#15803d',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: aggregatedRows.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <FileSpreadsheet size={14} />
                  <span>Export Summary Excel</span>
                </button>
              </div>
            </div>

            {/* Scrollable table container for many product rows */}
            <div style={{ maxHeight: 280, overflowY: 'auto', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr
                    style={{
                      background: '#f8fafc',
                      borderBottom: '2px solid #cbd5e1',
                      color: '#0f172a',
                      textAlign: 'left',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                    }}
                  >
                    <th style={{ padding: '10px 14px', fontWeight: 700, borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap', background: '#f8fafc' }}>Product ID</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>Product Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', borderRight: '1px solid #e2e8f0', color: '#b91c1c', whiteSpace: 'nowrap', background: '#f8fafc' }}>Write off QTY</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', borderRight: '1px solid #e2e8f0', color: '#6d28d9', whiteSpace: 'nowrap', background: '#f8fafc' }}>Virtual QTY</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', borderRight: '1px solid #e2e8f0', color: '#0369a1', whiteSpace: 'nowrap', background: '#f8fafc' }}>Physical QTY</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap', background: '#f8fafc' }}>UOM</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, background: '#f8fafc' }}>Confirmed Defect Type</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        No write-off batches selected. Please select at least one batch above.
                      </td>
                    </tr>
                  ) : (
                    aggregatedRows.map((row, idx) => (
                      <tr
                        key={`${row.productId}-${idx}`}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#334155', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                          {row.productId}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                          {row.productName}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#b91c1c', borderRight: '1px solid #e2e8f0' }}>
                          {row.writeOffQty}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#6d28d9', borderRight: '1px solid #e2e8f0' }}>
                          {row.virtualQty}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0369a1', borderRight: '1px solid #e2e8f0' }}>
                          {row.physicalQty}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                          {row.uom}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            {row.confirmedDefectType}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {aggregatedRows.length > 0 && (
                  <tfoot>
                    <tr
                      style={{
                        background: '#fef2f2',
                        borderTop: '2px solid #fca5a5',
                        fontWeight: 800,
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 2,
                      }}
                    >
                      <td colSpan={2} style={{ padding: '12px 14px', color: '#991b1b', borderRight: '1px solid #fecaca', background: '#fef2f2' }}>
                        TOTAL AGGREGATED WRITE-OFF ({selectedBatches.length} Batch{selectedBatches.length === 1 ? '' : 'es'})
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#b91c1c', fontSize: '0.94rem', borderRight: '1px solid #fecaca', background: '#fef2f2' }}>
                        {totals.writeOffQty}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#6d28d9', fontSize: '0.92rem', borderRight: '1px solid #fecaca', background: '#fef2f2' }}>
                        {totals.virtualQty}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0369a1', fontSize: '0.92rem', borderRight: '1px solid #fecaca', background: '#fef2f2' }}>
                        {totals.physicalQty}
                      </td>
                      <td colSpan={2} style={{ padding: '12px 14px', color: '#475569', fontSize: '0.78rem', background: '#fef2f2', lineHeight: 1.35 }}>
                        Includes claims: {selectedComplaints.map((c) => c.id).join(', ')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Action Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 4,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={submitting || selectedComplaints.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: actionStatus === 'Closed' ? '#6d28d9' : '#d97706',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: submitting || selectedComplaints.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(109, 40, 217, 0.28)',
                }}
              >
                <CheckCircle2 size={16} />
                <span>
                  {submitting
                    ? 'Saving Batch Disposal...'
                    : `Confirm Batch Disposal & Mark ${actionStatus} (${selectedComplaints.length} Claim${selectedComplaints.length === 1 ? '' : 's'})`}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

