import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  AlertTriangle,
  PackageCheck,
  Thermometer,
  ShieldCheck,
  ArrowRight,
  Upload,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
} from 'lucide-react';
import { uploadPhoto } from '../services/api';

/** Lightbox viewer for viewing storage temp photos in high resolution */
function PhotoGalleryLightbox({ photos, startIndex = 0, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(startIndex);

  if (!photos || photos.length === 0) return null;

  const goNext = (e) => {
    e.stopPropagation();
    setCurrentIdx((i) => (i + 1) % photos.length);
  };
  const goPrev = (e) => {
    e.stopPropagation();
    setCurrentIdx((i) => (i - 1 + photos.length) % photos.length);
  };

  const currentPhoto = typeof photos[currentIdx] === 'string' ? photos[currentIdx] : photos[currentIdx]?.url;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 2200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        padding: 24,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: '#fff',
          borderRadius: 6,
          padding: '6px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.85rem',
        }}
      >
        <X size={18} /> Close
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        {photos.length > 1 && (
          <button
            onClick={goPrev}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <img
            src={currentPhoto}
            alt="Customer storage temp reference"
            style={{
              maxWidth: 'min(640px, 85vw)',
              maxHeight: '65vh',
              objectFit: 'contain',
              borderRadius: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 10,
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              fontSize: '0.78rem',
              borderRadius: 4,
              padding: '2px 8px',
            }}
          >
            {currentIdx + 1} / {photos.length}
          </div>
        </div>

        {photos.length > 1 && (
          <button
            onClick={goNext}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {photos.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 600 }}
        >
          {photos.map((p, idx) => {
            const url = typeof p === 'string' ? p : p?.url;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                style={{
                  border: idx === currentIdx ? '2px solid #38bdf8' : '2px solid transparent',
                  borderRadius: 6,
                  padding: 0,
                  cursor: 'pointer',
                  background: 'none',
                }}
              >
                <img
                  src={url}
                  alt={`Thumb ${idx + 1}`}
                  style={{
                    width: 50,
                    height: 50,
                    objectFit: 'cover',
                    borderRadius: 4,
                    opacity: idx === currentIdx ? 1 : 0.6,
                  }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StageActionModal({
  isOpen,
  complaint,
  mode, // 'qa', 'ceo', 'warehouse', 'view'
  onClose,
  onSubmitQA,
  onSubmitCEO,
  onSubmitWarehouse,
}) {
  const [inspectorName, setInspectorName] = useState('Dr. Chanreth');
  const [customerStorageTemp, setCustomerStorageTemp] = useState('4°C');
  const [confirmedDefectQty, setConfirmedDefectQty] = useState(1);
  const [batchStatus, setBatchStatus] = useState('Confirmed out-of-spec acidity');
  const [rootCause, setRootCause] = useState('Chilled chain temperature drop during distributor transit');
  const [recommendation, setRecommendation] = useState('Recommend Exchange');

  // Customer storage temp photos state
  const [tempPhotos, setTempPhotos] = useState([]);
  const [uploadingTempPhoto, setUploadingTempPhoto] = useState(false);
  const [lightboxState, setLightboxState] = useState({ isOpen: false, photos: [], startIndex: 0 });

  const [ceoName, setCeoName] = useState('Executive Director');
  const [ceoDecision, setCeoDecision] = useState('Approved');
  const [ceoComments, setCeoComments] = useState('');

  const [officerName, setOfficerName] = useState('Vicheka Kem');
  const [replacementBatch, setReplacementBatch] = useState('MAC-20260928-BATCH2');
  const [dispatchedQty, setDispatchedQty] = useState(1);
  const [dispatchDate, setDispatchDate] = useState('2026-09-20');
  const [deliveryNotes, setDeliveryNotes] = useState('Dispatched with morning chilled delivery route.');

  const [loading, setLoading] = useState(false);

  // Sync modal state when complaint or mode changes
  useEffect(() => {
    if (!complaint) return;
    
    // QA state
    setInspectorName(complaint.qa_review?.inspector_name || 'Dr. Chanreth');
    setCustomerStorageTemp(complaint.qa_review?.customer_storage_temperature || '4°C');
    const initialConfirmedQty = complaint.qa_review?.confirmed_defect_quantity !== undefined && complaint.qa_review?.confirmed_defect_quantity !== null
      ? complaint.qa_review.confirmed_defect_quantity
      : complaint.defect_quantity;
    setConfirmedDefectQty(initialConfirmedQty);
    setBatchStatus(complaint.qa_review?.batch_status || 'Confirmed out-of-spec acidity');
    setRootCause(complaint.qa_review?.root_cause_notes || 'Chilled chain temperature drop during distributor transit');
    setRecommendation(complaint.qa_review?.recommendation || 'Recommend Exchange');

    // Sync Customer Storage Temp photos
    const rawTempPhotoUrl = complaint.qa_review?.storage_temperature_photo_url || '';
    if (rawTempPhotoUrl) {
      const urls = rawTempPhotoUrl.split(',').map((u) => u.trim()).filter(Boolean);
      setTempPhotos(urls.map((url, i) => ({ url, name: `Storage temp photo ${i + 1}` })));
    } else {
      setTempPhotos([]);
    }

    // CEO state
    setCeoName(complaint.ceo_decision?.reviewer_name || 'Executive Director');
    setCeoDecision(complaint.ceo_decision?.decision || 'Approved');
    setCeoComments(
      complaint.ceo_decision?.comments ||
      `Approved replacement of ${initialConfirmedQty} ${complaint.unit_of_measure} based on QA verified defect quantity.`
    );

    // Warehouse state
    setOfficerName(complaint.warehouse_fulfillment?.officer_name || 'Vicheka Kem');
    setReplacementBatch(complaint.warehouse_fulfillment?.replacement_batch || 'MAC-20260928-BATCH2');
    setDispatchedQty(
      complaint.warehouse_fulfillment?.dispatched_quantity !== undefined && complaint.warehouse_fulfillment?.dispatched_quantity !== null
        ? complaint.warehouse_fulfillment.dispatched_quantity
        : initialConfirmedQty
    );
    setDispatchDate(complaint.warehouse_fulfillment?.dispatch_date || new Date().toISOString().slice(0, 10));
    setDeliveryNotes(
      complaint.warehouse_fulfillment?.delivery_notes ||
      `Dispatched ${initialConfirmedQty} ${complaint.unit_of_measure} replacement with morning chilled route.`
    );
  }, [complaint, mode, isOpen]);

  if (!isOpen || !complaint) return null;

  const qaConfirmedQty = complaint.qa_review?.confirmed_defect_quantity !== undefined && complaint.qa_review?.confirmed_defect_quantity !== null
    ? complaint.qa_review.confirmed_defect_quantity
    : complaint.defect_quantity;

  const qaStorageTemp = complaint.qa_review?.customer_storage_temperature || 'Not recorded';

  const handleTempPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingTempPhoto(true);
    const newPhotos = [];
    for (const file of files) {
      try {
        const res = await uploadPhoto(file);
        newPhotos.push({ url: res.url, name: file.name });
      } catch {
        newPhotos.push({ url: URL.createObjectURL(file), name: file.name });
      }
    }
    setTempPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = '';
    setUploadingTempPhoto(false);
  };

  const removeTempPhoto = (idx) => {
    setTempPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const openLightbox = (photos, startIndex = 0) => {
    const photoList = Array.isArray(photos) ? photos : [photos];
    setLightboxState({ isOpen: true, photos: photoList, startIndex });
  };

  const formatTempInput = (val) => {
    if (!val) return '';
    const trimmed = String(val).trim();
    if (!trimmed) return '';
    if (/^[+-]?\d+(\.\d+)?(\s*-\s*[+-]?\d+(\.\d+)?)?$/.test(trimmed)) {
      return `${trimmed}°C`;
    }
    if (/^[+-]?\d+(\.\d+)?(\s*-\s*[+-]?\d+(\.\d+)?)?\s*[cC]$/.test(trimmed)) {
      return trimmed.replace(/\s*[cC]$/, '°C');
    }
    return trimmed;
  };

  const handleQASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const storagePhotoUrl = tempPhotos.length > 0 ? tempPhotos.map((p) => p.url).join(',') : '';
      const formattedTemp = formatTempInput(customerStorageTemp);
      await onSubmitQA(complaint.id, {
        inspector_name: inspectorName,
        customer_storage_temperature: formattedTemp,
        storage_temperature_photo_url: storagePhotoUrl,
        confirmed_defect_quantity: Number(confirmedDefectQty),
        batch_status: batchStatus,
        root_cause_notes: rootCause,
        recommendation: recommendation,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCEOSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmitCEO(complaint.id, {
        reviewer_name: ceoName,
        decision: ceoDecision,
        comments: ceoComments,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmitWarehouse(complaint.id, {
        officer_name: officerName,
        replacement_batch: replacementBatch,
        dispatched_quantity: Number(dispatchedQty),
        dispatch_date: dispatchDate,
        delivery_notes: deliveryNotes,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '640px' }}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {mode === 'qa' && 'Stage 2: QA Inspection & Assessment'}
              {mode === 'ceo' && 'Stage 3: Executive CEO Approval'}
              {mode === 'warehouse' && 'Stage 4: Warehouse Exchange Fulfillment'}
              {mode === 'view' && 'Complaint Record Details'}
            </h2>
            <div className="modal-subtitle">
              ID: <strong>{complaint.id}</strong> — Customer: {complaint.customer_name}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Summary Box */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: 14,
              fontSize: '0.85rem',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <strong>Product:</strong> {complaint.product_name} {complaint.product_short_code ? `(${complaint.product_short_code})` : ''}
              </div>
              <div>
                <strong>Claimed Defect:</strong> {complaint.defect_type} (QTY: {complaint.defect_quantity} {complaint.unit_of_measure})
              </div>
              <div><strong>Code / EXP:</strong> {complaint.manufacturing_code} · {complaint.product_expiry_date}</div>
              <div><strong>Status:</strong> <span style={{ fontWeight: 600 }}>{complaint.status}</span></div>
              {complaint.so_number && (
                <div><strong>Sales Order (SO):</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{complaint.so_number}</span></div>
              )}
              {complaint.order_quantity && (
                <div><strong>Order QTY:</strong> <span style={{ color: '#3730a3', fontWeight: 600 }}>{complaint.order_quantity} {complaint.unit_of_measure}</span></div>
              )}
              {complaint.price_discount && (
                <div><strong>Price Discount:</strong> <span style={{ color: '#0284c7', fontWeight: 600 }}>{complaint.price_discount}</span></div>
              )}
              {complaint.shipment_date && (
                <div><strong>Shipment Date:</strong> {complaint.shipment_date}</div>
              )}
              {complaint.storage_temp && (
                <div><strong>Sales Storage Temp:</strong> <span style={{ color: '#0f766e', fontWeight: 600 }}>{complaint.storage_temp}</span></div>
              )}
            </div>
          </div>

          {/* QA Form */}
          {mode === 'qa' && (
            <form onSubmit={handleQASubmit}>
              <div className="form-group-full">
                <label className="form-label">QA Inspector Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  required
                />
              </div>

              {/* Stage 2 additions: Storage Temp & Confirmed Defect Qty */}
              <div className="form-grid-2col" style={{ marginBottom: 14 }}>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Thermometer size={14} color="#0284c7" />
                    <span>Customer Storage Temp</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 4 or 4°C"
                    value={customerStorageTemp}
                    onChange={(e) => setCustomerStorageTemp(e.target.value)}
                    onBlur={() => setCustomerStorageTemp((prev) => formatTempInput(prev))}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 3 }}>
                    Chilled standard: 2°C – 4°C
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={14} color="#0284c7" />
                    <span>Confirmed Defect Qty ({complaint.unit_of_measure})</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={complaint.defect_quantity * 2}
                    className="form-input"
                    value={confirmedDefectQty}
                    onChange={(e) => setConfirmedDefectQty(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 3 }}>
                    Customer claimed: <strong>{complaint.defect_quantity} {complaint.unit_of_measure}</strong>
                  </div>
                </div>
              </div>

              {/* Customer Storage Temp Photo Reference Upload */}
              <div className="form-group-full" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Camera size={14} color="#0284c7" />
                    <span>Customer Storage Temp Photo Reference</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                      (Thermometer / Cold Room Reading)
                    </span>
                  </span>
                  {tempPhotos.length > 0 && (
                    <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600 }}>
                      {tempPhotos.length} photo{tempPhotos.length > 1 ? 's' : ''} attached
                    </span>
                  )}
                </label>

                <label
                  className="photo-upload-box"
                  style={{
                    padding: tempPhotos.length > 0 ? '10px 14px' : '14px',
                    borderColor: '#93c5fd',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleTempPhotoUpload}
                    style={{ display: 'none' }}
                  />
                  {uploadingTempPhoto ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', fontSize: '0.84rem' }}>
                      <span style={{ fontWeight: 500 }}>Uploading photo...</span>
                    </div>
                  ) : tempPhotos.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={16} color="#0284c7" />
                        <span style={{ fontSize: '0.84rem', color: '#0369a1', fontWeight: 600 }}>
                          {tempPhotos.length} photo reference attached
                        </span>
                      </div>
                      <span style={{ fontSize: '0.76rem', color: '#0284c7', fontWeight: 500 }}>
                        + Add more photos
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
                      <Upload size={18} color="#0284c7" />
                      <span style={{ fontSize: '0.84rem' }}>
                        Upload photo as reference of storage temp <span style={{ color: '#94a3b8' }}>(thermometer / cold gauge)</span>
                      </span>
                    </div>
                  )}
                </label>

                {/* Thumbnails of uploaded storage temp photos */}
                {tempPhotos.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {tempPhotos.map((photo, idx) => (
                      <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => openLightbox(tempPhotos.map(p => p.url), idx)}
                          title="Click to preview photo"
                          style={{
                            padding: 0,
                            border: '2px solid #bae6fd',
                            borderRadius: 6,
                            background: '#fff',
                            cursor: 'pointer',
                            display: 'block',
                            overflow: 'hidden',
                          }}
                        >
                          <img
                            src={photo.url}
                            alt={`Storage temp proof ${idx + 1}`}
                            style={{ width: 48, height: 48, objectFit: 'cover', display: 'block' }}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTempPhoto(idx);
                          }}
                          title="Remove photo"
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: 18,
                            height: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group-full">
                <label className="form-label">Batch Lab Assessment</label>
                <input
                  type="text"
                  className="form-input"
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-full">
                <label className="form-label">Root Cause Analysis</label>
                <textarea
                  rows="3"
                  className="form-textarea"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="form-group-full">
                <label className="form-label">QA Recommendation for CEO & Warehouse</label>
                <select
                  className="form-select"
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                >
                  <option value="Recommend Exchange">Recommend Exchange (Forward to CEO with confirmed qty: {confirmedDefectQty} {complaint.unit_of_measure})</option>
                  <option value="Recommend Credit Note">Recommend Credit Note (Forward to CEO)</option>
                  <option value="Reject">Reject Claim (Out of policy / Improper storage)</option>
                </select>
              </div>

              <button type="submit" className="btn-submit-modal" disabled={loading}>
                {loading ? 'Submitting QA...' : 'Submit QA Assessment'}
              </button>
            </form>
          )}

          {/* CEO Form */}
          {mode === 'ceo' && (
            <form onSubmit={handleCEOSubmit}>
              {complaint.qa_review && (
                <div
                  style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: 8,
                    padding: 14,
                    fontSize: '0.84rem',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={16} />
                    <span>QA Inspection Assessment Details</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                    <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 6, border: '1px solid #e0f2fe' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Customer Storage Temp</div>
                      <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 2 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Thermometer size={14} color="#0284c7" />
                          <span>{qaStorageTemp}</span>
                        </span>
                        {complaint.qa_review?.storage_temperature_photo_url && (
                          <button
                            type="button"
                            onClick={() => openLightbox(complaint.qa_review.storage_temperature_photo_url.split(','), 0)}
                            style={{
                              fontSize: '0.72rem',
                              color: '#0284c7',
                              background: '#e0f2fe',
                              padding: '2px 6px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="View temperature proof photo"
                          >
                            <Camera size={12} /> Photo
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 6, border: '1px solid #e0f2fe' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>QA Confirmed Defect Qty</div>
                      <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.95rem', marginTop: 2 }}>
                        {qaConfirmedQty} {complaint.unit_of_measure}
                        {Number(qaConfirmedQty) !== Number(complaint.defect_quantity) && (
                          <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 500, marginLeft: 4 }}>
                            (Claimed: {complaint.defect_quantity})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
                    <div><strong>QA Recommendation:</strong> <span style={{ color: '#0369a1', fontWeight: 600 }}>{complaint.qa_review.recommendation}</span></div>
                    <div><strong>Lab Status:</strong> {complaint.qa_review.batch_status}</div>
                    <div><strong>Root Cause:</strong> {complaint.qa_review.root_cause_notes}</div>
                  </div>
                </div>
              )}

              <div className="form-group-full">
                <label className="form-label">Executive Reviewer Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={ceoName}
                  onChange={(e) => setCeoName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-full">
                <label className="form-label">Executive Decision</label>
                <select
                  className="form-select"
                  value={ceoDecision}
                  onChange={(e) => setCeoDecision(e.target.value)}
                >
                  <option value="Approved">Approve Exchange for {qaConfirmedQty} {complaint.unit_of_measure} (Send to Warehouse)</option>
                  <option value="Rejected">Reject Claim</option>
                </select>
              </div>

              <div className="form-group-full">
                <label className="form-label">Executive Decision Notes & Approvals</label>
                <textarea
                  rows="2"
                  className="form-textarea"
                  value={ceoComments}
                  onChange={(e) => setCeoComments(e.target.value)}
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn-submit-modal"
                style={{
                  backgroundColor: ceoDecision === 'Approved' ? 'var(--color-brand)' : '#be123c',
                }}
                disabled={loading}
              >
                {loading ? 'Submitting Decision...' : `Confirm Decision: ${ceoDecision}`}
              </button>
            </form>
          )}

          {/* Warehouse Form */}
          {mode === 'warehouse' && (
            <form onSubmit={handleWarehouseSubmit}>
              {/* QA & CEO verified callout */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: '0.84rem',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PackageCheck size={16} />
                  <span>Approved Exchange Order to Dispatch</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 6 }}>
                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 6, border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>QA Confirmed Exchange Qty</div>
                    <div style={{ fontWeight: 700, color: '#15803d', fontSize: '1.05rem', marginTop: 2 }}>
                      {qaConfirmedQty} {complaint.unit_of_measure}
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 6, border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Customer Storage Condition</div>
                    <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Thermometer size={14} color="#0284c7" />
                      <span>{qaStorageTemp}</span>
                    </div>
                  </div>
                </div>

                {complaint.ceo_decision?.comments && (
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                    <strong>CEO Approval Note:</strong> {complaint.ceo_decision.comments}
                  </div>
                )}
              </div>

              <div className="form-group-full">
                <label className="form-label">Warehouse Officer Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2col">
                <div>
                  <label className="form-label">Exchange Quantity Dispatched ({complaint.unit_of_measure})</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={dispatchedQty}
                    onChange={(e) => setDispatchedQty(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 500, marginTop: 3 }}>
                    Matching QA confirmed: {qaConfirmedQty} {complaint.unit_of_measure}
                  </div>
                </div>

                <div>
                  <label className="form-label">Replacement Fresh Batch Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={replacementBatch}
                    onChange={(e) => setReplacementBatch(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group-full">
                <label className="form-label">Dispatch Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-full">
                <label className="form-label">Dispatch / Delivery Route Notes</label>
                <textarea
                  rows="2"
                  className="form-textarea"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                ></textarea>
              </div>

              <button type="submit" className="btn-submit-modal" disabled={loading}>
                {loading ? 'Fulfilling Exchange...' : `Confirm Dispatch of ${dispatchedQty} ${complaint.unit_of_measure} & Complete`}
              </button>
            </form>
          )}

          {/* View Details Mode */}
          {mode === 'view' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Stage 1: Sales Intake & Commercial Details */}
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ color: 'var(--color-brand)' }}>Stage 1: Sales Intake & Defect Profile</strong>
                  <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                    Sales Logged
                  </span>
                </div>
                <div style={{ fontSize: '0.84rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                  <div><strong>Sales Rep:</strong> {complaint.sales_rep_name}</div>
                  <div><strong>Com.Date:</strong> {complaint.complaint_date}</div>
                  <div><strong>Customer:</strong> {complaint.customer_name}</div>
                  <div><strong>Contact:</strong> {complaint.customer_contact || 'N/A'}</div>
                  <div style={{ gridColumn: 'span 2' }}><strong>Location:</strong> {complaint.customer_location || 'N/A'}</div>
                  <div><strong>Product:</strong> {complaint.product_name} {complaint.product_short_code ? `(${complaint.product_short_code})` : ''}</div>
                  <div><strong>Claimed Defect:</strong> {complaint.defect_type} (QTY: {complaint.defect_quantity} {complaint.unit_of_measure})</div>
                  {complaint.so_number && (
                    <div><strong>SO #:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{complaint.so_number}</span></div>
                  )}
                  {complaint.order_quantity && (
                    <div><strong>Order QTY:</strong> <span style={{ color: '#3730a3', fontWeight: 600 }}>{complaint.order_quantity} {complaint.unit_of_measure}</span></div>
                  )}
                  <div><strong>Code / EXP:</strong> {complaint.manufacturing_code} · {complaint.product_expiry_date}</div>
                  <div><strong>Pro.Time:</strong> {complaint.production_batch || 'N/A'}</div>
                  {complaint.price_discount && (
                    <div><strong>Price Discount:</strong> <span style={{ color: '#0284c7', fontWeight: 600 }}>{complaint.price_discount}</span></div>
                  )}
                  {complaint.shipment_date && (
                    <div><strong>Shipment Date:</strong> {complaint.shipment_date}</div>
                  )}
                  {complaint.storage_temp && (
                    <div><strong>Sales Storage Temp:</strong> <span style={{ color: '#0f766e', fontWeight: 600 }}>{complaint.storage_temp}</span></div>
                  )}
                </div>
              </div>
              {complaint.qa_review && (
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ color: '#0369a1' }}>Stage 2: QA Inspection & Assessment</strong>
                    <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                      Verified
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div><strong>Inspector:</strong> {complaint.qa_review.inspector_name}</div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong>Customer Storage Temp:</strong>
                        <span style={{ color: '#0284c7', fontWeight: 600 }}>{complaint.qa_review.customer_storage_temperature || 'N/A'}</span>
                        {complaint.qa_review?.storage_temperature_photo_url && (
                          <button
                            type="button"
                            onClick={() => openLightbox(complaint.qa_review.storage_temperature_photo_url.split(','), 0)}
                            style={{
                              fontSize: '0.72rem',
                              color: '#0284c7',
                              background: '#e0f2fe',
                              padding: '2px 6px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="View customer storage temp photo reference"
                          >
                            <Camera size={12} /> View Photo
                          </button>
                        )}
                      </div>
                      <div><strong>QA Confirmed Defect Qty:</strong> <span style={{ color: '#0369a1', fontWeight: 700 }}>{qaConfirmedQty} {complaint.unit_of_measure}</span></div>
                    </div>
                    <div><strong>Lab Assessment:</strong> {complaint.qa_review.batch_status}</div>
                    <div><strong>Root Cause:</strong> {complaint.qa_review.root_cause_notes}</div>
                    <div><strong>Recommendation:</strong> {complaint.qa_review.recommendation}</div>
                  </div>
                </div>
              )}

              {complaint.ceo_decision && (
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <strong style={{ color: '#b45309' }}>Stage 3: Executive CEO Decision</strong>
                  <div style={{ fontSize: '0.84rem', marginTop: 4 }}>
                    <div><strong>Reviewer:</strong> {complaint.ceo_decision.reviewer_name}</div>
                    <div><strong>Decision:</strong> <span style={{ fontWeight: 600, color: complaint.ceo_decision.decision === 'Approved' ? '#15803d' : '#be123c' }}>{complaint.ceo_decision.decision}</span></div>
                    <div><strong>Comments:</strong> {complaint.ceo_decision.comments}</div>
                  </div>
                </div>
              )}

              {complaint.warehouse_fulfillment && (
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <strong style={{ color: '#15803d' }}>Stage 4: Warehouse Fulfillment</strong>
                  <div style={{ fontSize: '0.84rem', marginTop: 4 }}>
                    <div><strong>Officer:</strong> {complaint.warehouse_fulfillment.officer_name}</div>
                    <div><strong>Replacement Batch:</strong> {complaint.warehouse_fulfillment.replacement_batch}</div>
                    {complaint.warehouse_fulfillment.dispatched_quantity && (
                      <div><strong>Dispatched Qty:</strong> {complaint.warehouse_fulfillment.dispatched_quantity} {complaint.unit_of_measure} (QA Confirmed)</div>
                    )}
                    <div><strong>Dispatch Date:</strong> {complaint.warehouse_fulfillment.dispatch_date}</div>
                    <div><strong>Notes:</strong> {complaint.warehouse_fulfillment.delivery_notes}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for storage temperature photos */}
      {lightboxState.isOpen && (
        <PhotoGalleryLightbox
          photos={lightboxState.photos}
          startIndex={lightboxState.startIndex}
          onClose={() => setLightboxState({ isOpen: false, photos: [], startIndex: 0 })}
        />
      )}
    </div>
  );
}

