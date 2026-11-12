import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, Image as ImageIcon, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { uploadPhoto, getCustomers, getProducts, getDefectTypes } from '../services/api';

/** Inline gallery lightbox shown when user clicks on any uploaded thumbnail */
function PhotoGalleryLightbox({ photos, startIndex, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(startIndex ?? 0);

  const goNext = (e) => {
    e.stopPropagation();
    setCurrentIdx((i) => (i + 1) % photos.length);
  };
  const goPrev = (e) => {
    e.stopPropagation();
    setCurrentIdx((i) => (i - 1 + photos.length) % photos.length);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(4px)',
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        padding: 24,
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 18, right: 18,
          background: 'rgba(255,255,255,0.15)',
          border: 'none', color: '#fff',
          borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem',
        }}
      >
        <X size={18} /> Close
      </button>

      {/* Main Image */}
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
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              borderRadius: '50%', width: 40, height: 40, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <img
            src={photos[currentIdx].url}
            alt={`Photo ${currentIdx + 1}`}
            style={{
              maxWidth: 'min(640px, 80vw)',
              maxHeight: '65vh',
              objectFit: 'contain',
              borderRadius: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute', bottom: 8, right: 10,
              background: 'rgba(0,0,0,0.55)',
              color: '#fff', fontSize: '0.78rem',
              borderRadius: 4, padding: '2px 8px',
            }}
          >
            {currentIdx + 1} / {photos.length}
          </div>
        </div>

        {photos.length > 1 && (
          <button
            onClick={goNext}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              borderRadius: '50%', width: 40, height: 40, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
            maxWidth: 600,
          }}
        >
          {photos.map((photo, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              style={{
                border: idx === currentIdx ? '2px solid #38bdf8' : '2px solid transparent',
                borderRadius: 6, padding: 0, cursor: 'pointer', background: 'none',
                transition: 'border-color 0.15s',
              }}
            >
              <img
                src={photo.url}
                alt={`Thumb ${idx + 1}`}
                style={{
                  width: 54, height: 54,
                  objectFit: 'cover', borderRadius: 4,
                  opacity: idx === currentIdx ? 1 : 0.6,
                  transition: 'opacity 0.15s',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFutureDaysStr = (days = 7) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function NewComplaintModal({ isOpen, onClose, onSubmitSuccess, currentTab = 'sales', userRole = 'Sale' }) {
  const isWarehouseMode = currentTab === 'warehouse' || currentTab === 'stock_return' || userRole === 'Warehouse';

  const [salesRepName, setSalesRepName] = useState(isWarehouseMode ? 'Warehouse Team' : 'Sophea Chea');
  const [customerName, setCustomerName] = useState(isWarehouseMode ? 'SONAVITH Warehouse' : '');
  const [customerLocation, setCustomerLocation] = useState(isWarehouseMode ? 'No. A49, Street Camko, Sangkat Toul Sangke, Khan Russey Keo, Phnom Penh, Cambodia.' : '');
  const [customerContact, setCustomerContact] = useState(isWarehouseMode ? 'warehouse-ambient-food-sp-a1@sonavith.com' : '');
  const [complaintDate, setComplaintDate] = useState(getTodayStr());
  const [productName, setProductName] = useState('');
  const [productShortCode, setProductShortCode] = useState('');
  const [defectType, setDefectType] = useState('Physical damage');
  const [defectQuantity, setDefectQuantity] = useState(1);
  const [unitOfMeasure, setUnitOfMeasure] = useState('2L-BTL');
  const [productExpiryDate, setProductExpiryDate] = useState(getFutureDaysStr(7));
  const [manufacturingCode, setManufacturingCode] = useState('MAC');
  const [productionBatch, setProductionBatch] = useState('12:00');
  const [priceDiscount, setPriceDiscount] = useState('');
  const [storageTemp, setStorageTemp] = useState('');
  const [shipmentDate, setShipmentDate] = useState('');
  const [soNumber, setSoNumber] = useState(isWarehouseMode ? 'WH-INT' : '');
  const [orderQuantity, setOrderQuantity] = useState('');

  // Multi-photo state: array of { url, name }
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStart, setLightboxStart] = useState(0);

  const [dbCustomers, setDbCustomers] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [dbDefectTypes, setDbDefectTypes] = useState([]);

  const setWarehouseCustomerValues = (allCustomers = dbCustomers) => {
    const whCust = allCustomers.find((c) => c.name.toLowerCase() === 'sonavith warehouse') || {
      id: '6b4e0a60',
      name: 'SONAVITH Warehouse',
      location: 'No. A49, Street Camko, Sangkat Toul Sangke, Khan Russey Keo, Phnom Penh, Cambodia.',
      contact: 'warehouse-ambient-food-sp-a1@sonavith.com',
    };
    setCustomerName('SONAVITH Warehouse');
    setCustomerLocation(whCust.location || 'No. A49, Street Camko, Sangkat Toul Sangke, Khan Russey Keo, Phnom Penh, Cambodia.');
    setCustomerContact(whCust.contact || 'warehouse-ambient-food-sp-a1@sonavith.com');
    setSalesRepName('Warehouse Team');
    if (!soNumber) setSoNumber('WH-INT');
  };

  useEffect(() => {
    if (isOpen) {
      getCustomers().then((data) => {
        const whCust = data.find((c) => c.name.toLowerCase() === 'sonavith warehouse') || {
          id: '6b4e0a60',
          name: 'SONAVITH Warehouse',
          location: 'No. A49, Street Camko, Sangkat Toul Sangke, Khan Russey Keo, Phnom Penh, Cambodia.',
          contact: 'warehouse-ambient-food-sp-a1@sonavith.com',
        };

        if (isWarehouseMode) {
          // Warehouse Team: strictly exclude other customer info, keep ONLY SONAVITH Warehouse
          setDbCustomers([whCust]);
          setCustomerName('SONAVITH Warehouse');
          setCustomerLocation(whCust.location || 'No. A49, Street Camko, Sangkat Toul Sangke, Khan Russey Keo, Phnom Penh, Cambodia.');
          setCustomerContact(whCust.contact || 'warehouse-ambient-food-sp-a1@sonavith.com');
          setSalesRepName('Warehouse Team');
          setSoNumber('WH-INT');
        } else {
          // Sales team: common external customers only
          const externalCustomers = data.filter((c) => c.name.toLowerCase() !== 'sonavith warehouse');
          setDbCustomers(externalCustomers);
          setCustomerName('');
          setCustomerLocation('');
          setCustomerContact('');
          setSalesRepName('Sophea Chea');
          setSoNumber('');
        }
      }).catch(console.error);

      getProducts().then(setDbProducts).catch(console.error);
      getDefectTypes().then(setDbDefectTypes).catch(console.error);
      setComplaintDate(getTodayStr());
      setProductExpiryDate(getFutureDaysStr(7));
      setPhotos([]);
      setErrorMsg('');
    }
  }, [isOpen, isWarehouseMode]);

  if (!isOpen) return null;

  const handleProductChange = (val) => {
    setProductName(val);
    const matched = dbProducts.find((p) => p.name.toLowerCase() === val.toLowerCase());
    if (matched) {
      if (matched.unit_of_measure) setUnitOfMeasure(matched.unit_of_measure);
      if (matched.short_code) setProductShortCode(matched.short_code);
    }
  };

  const handleCustomerChange = (val) => {
    setCustomerName(val);
    const matched = dbCustomers.find((c) => c.name.toLowerCase() === val.toLowerCase());
    if (matched) {
      if (matched.location) setCustomerLocation(matched.location);
      if (matched.contact) setCustomerContact(matched.contact);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setErrorMsg('');
    const newPhotos = [];
    for (const file of files) {
      try {
        const res = await uploadPhoto(file);
        newPhotos.push({ url: res.url, name: file.name });
      } catch {
        // If backend upload fails, use local object URL preview
        newPhotos.push({ url: URL.createObjectURL(file), name: file.name });
      }
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
    // Reset the file input so the same file can be re-added if needed
    e.target.value = '';
    setUploading(false);
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const openLightbox = (idx) => {
    setLightboxStart(idx);
    setLightboxOpen(true);
  };

  const formatDiscountInput = (val) => {
    if (!val) return '';
    const trimmed = val.trim();
    if (!trimmed) return '';
    // If user typed a pure number/decimal (e.g. "10", "10.5", "5"), auto-append "%"
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return `${trimmed}%`;
    }
    return trimmed;
  };

  const formatTempInput = (val) => {
    if (!val) return '';
    const trimmed = val.trim();
    if (!trimmed) return '';
    // If user typed a pure number/decimal or range of numbers (e.g. "2", "4.5", "2-6", "2 - 6"), auto-append "°C"
    // Also if ends with 'C' or 'c' without degree symbol (e.g. "4C" -> "4°C")
    if (/^[+-]?\d+(\.\d+)?(\s*-\s*[+-]?\d+(\.\d+)?)?$/.test(trimmed)) {
      return `${trimmed}°C`;
    }
    if (/^[+-]?\d+(\.\d+)?(\s*-\s*[+-]?\d+(\.\d+)?)?\s*[cC]$/.test(trimmed)) {
      return trimmed.replace(/\s*[cC]$/, '°C');
    }
    return trimmed;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Please provide a customer name.');
      return;
    }
    if (!productName.trim()) {
      setErrorMsg('Please select or specify a product name.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    // Store all photo URLs as comma-separated
    const primaryPhotoUrl =
      photos.length > 0 ? photos.map(p => p.url).join(',') : '/api/static/sample1.svg';

    const formattedDiscount = formatDiscountInput(priceDiscount);
    const formattedStorageTemp = formatTempInput(storageTemp);

    const payload = {
      sales_rep_name: isWarehouseMode ? (salesRepName || 'Warehouse Team') : salesRepName,
      customer_name: isWarehouseMode ? 'SONAVITH Warehouse' : customerName,
      customer_location: isWarehouseMode ? (customerLocation || 'No. A49, Street Camko, Sangkat Toul Sangke, Khan Russey Keo, Phnom Penh, Cambodia.') : customerLocation,
      customer_contact: isWarehouseMode ? (customerContact || 'warehouse-ambient-food-sp-a1@sonavith.com') : customerContact,
      complaint_date: complaintDate,
      product_name: productName,
      product_short_code: productShortCode.trim().toUpperCase(),
      defect_type: defectType,
      defect_quantity: parseInt(defectQuantity, 10) || 1,
      unit_of_measure: unitOfMeasure,
      product_expiry_date: productExpiryDate,
      manufacturing_code: manufacturingCode,
      production_batch: productionBatch,
      price_discount: formattedDiscount,
      storage_temp: formattedStorageTemp,
      shipment_date: shipmentDate,
      so_number: isWarehouseMode ? (soNumber || 'WH-INT') : soNumber,
      order_quantity: orderQuantity !== '' ? parseInt(orderQuantity, 10) : null,
      // Store all photo URLs as comma-separated; latest is at end
      photo_url: primaryPhotoUrl,
    };

    try {
      await onSubmitSuccess(payload);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error submitting complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const lastPhoto = photos[photos.length - 1];

  return (
    <>
      {lightboxOpen && photos.length > 0 && (
        <PhotoGalleryLightbox
          photos={photos}
          startIndex={lightboxStart}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-dialog"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-header">
            <div>
              <h2 className="modal-title">
                {isWarehouseMode ? 'New Complaint (Warehouse Defect)' : 'New complaint'}
              </h2>
              <div className="modal-subtitle">
                {isWarehouseMode ? 'Stage 04: Warehouse internal defect intake' : 'Stage 01: Sales intake'}
              </div>
            </div>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>

          <form className="modal-body" onSubmit={handleSubmit}>
            {errorMsg && (
              <div
                style={{
                  backgroundColor: '#fee2e2', color: '#b91c1c',
                  padding: '8px 12px', borderRadius: 6,
                  fontSize: '0.85rem', marginBottom: 14,
                }}
              >
                {errorMsg}
              </div>
            )}

            <div className="form-grid-2col">
              <div>
                <label className="form-label">{isWarehouseMode ? 'Inspector / Reporter name' : 'Sales rep name'}</label>
                <input type="text" className="form-input" value={salesRepName}
                  onChange={(e) => setSalesRepName(e.target.value)} required />
              </div>
              <div>
                {isWarehouseMode ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Customer name</label>
                      <span
                        style={{
                          fontSize: '0.70rem',
                          color: '#047857',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          padding: '1px 8px',
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        🏢 SONAVITH Warehouse
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      value="SONAVITH Warehouse"
                      readOnly
                      style={{
                        backgroundColor: '#f8fafc',
                        cursor: 'default',
                        fontWeight: 700,
                        color: 'var(--color-brand)',
                        border: '1px solid #cbd5e1',
                      }}
                      required
                    />
                    <div style={{ fontSize: '0.71rem', color: '#b45309', background: '#fef3c7', padding: '3px 7px', borderRadius: 4, marginTop: 4 }}>
                      ⚠️ Warehouse internal defect — exclusively assigned to SONAVITH Warehouse.
                    </div>
                  </>
                ) : (
                  <>
                    <label className="form-label">Customer name</label>
                    <input
                      type="text"
                      list="customer-list"
                      className="form-input"
                      placeholder="Type to search or pick a customer"
                      value={customerName}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      required
                    />
                    <datalist id="customer-list">
                      {dbCustomers.map((c, idx) => (
                        <option key={idx} value={c.name} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>
            </div>

            <div className="form-grid-2col">
              <div>
                <label className="form-label">{isWarehouseMode ? 'Warehouse location' : 'Customer location'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Address, or paste a Google Maps link"
                  value={customerLocation}
                  onChange={(e) => setCustomerLocation(e.target.value)}
                  readOnly={isWarehouseMode}
                  style={isWarehouseMode ? { backgroundColor: '#f8fafc', color: '#334155', cursor: 'default' } : {}}
                />
              </div>
              <div>
                <label className="form-label">{isWarehouseMode ? 'Warehouse contact' : 'Customer contact'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Phone or contact person"
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  readOnly={isWarehouseMode}
                  style={isWarehouseMode ? { backgroundColor: '#f8fafc', color: '#334155', cursor: 'default' } : {}}
                />
              </div>
            </div>

            <div className="form-grid-2col">
              <div>
                <label className="form-label">Com.Date</label>
                <input type="date" className="form-input" value={complaintDate}
                  onChange={(e) => setComplaintDate(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Product name</label>
                <input type="text" list="product-list" className="form-input"
                  placeholder="Type to search or pick a product"
                  value={productName} onChange={(e) => handleProductChange(e.target.value)} required />
                <datalist id="product-list">
                  {dbProducts.map((p, idx) => <option key={idx} value={p.name} />)}
                </datalist>
              </div>
            </div>

            <div className="form-group-full">
              <label className="form-label">Product short code</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. FFCM, FFAF, COOK — used to build complaint ID"
                value={productShortCode}
                onChange={(e) => setProductShortCode(e.target.value)}
              />
            </div>


            <div className="form-grid-2col">
              <div>
                <label className="form-label">Defect type</label>
                <select className="form-select" value={defectType}
                  onChange={(e) => setDefectType(e.target.value)}>
                  {dbDefectTypes.length > 0 ? (
                    dbDefectTypes.map((dt) => (
                      <option key={dt.id} value={dt.name}>{dt.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Physical damage">Physical damage</option>
                      <option value="Off smell/taste">Off smell/taste</option>
                      <option value="Packaging leak">Packaging leak</option>
                      <option value="Curdling">Curdling</option>
                      <option value="Foreign object">Foreign object</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="form-label">QTY</label>
                <input type="number" min="1" className="form-input" value={defectQuantity}
                  onChange={(e) => setDefectQuantity(e.target.value)} required />
              </div>
            </div>

            <div className="form-group-full">
              <label className="form-label">Unit of measure</label>
              <select className="form-select" value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}>
                {Array.from(new Set([
                  ...dbProducts.map(p => p.unit_of_measure).filter(Boolean),
                  '2L-BTL', '1L-BTL', 'L', 'Carton', 'Box', '—'
                ])).map((uom, idx) => (
                  <option key={idx} value={uom}>{uom}</option>
                ))}
              </select>
            </div>

            <div className="form-grid-2col">
              <div>
                <label className="form-label">EXP</label>
                <input type="date" className="form-input" value={productExpiryDate}
                  onChange={(e) => setProductExpiryDate(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Code</label>
                <input type="text" className="form-input" placeholder="e.g. MAC"
                  value={manufacturingCode} onChange={(e) => setManufacturingCode(e.target.value)} required />
              </div>
            </div>

            <div className="form-group-full">
              <label className="form-label">Pro.Time / batch</label>
              <input type="text" className="form-input" placeholder="e.g. 12:00 or 12:00 AM"
                value={productionBatch} onChange={(e) => setProductionBatch(e.target.value)} />
            </div>

            {/* ── New Sales Fields ── */}
            <div className="form-grid-2col">
              <div>
                <label className="form-label">
                  Price Discount
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6, fontSize: '0.78rem' }}>(e.g. 10 or 10%)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 10 or $5.00"
                  value={priceDiscount}
                  onChange={(e) => setPriceDiscount(e.target.value)}
                  onBlur={() => setPriceDiscount((prev) => formatDiscountInput(prev))}
                />
              </div>
              <div>
                <label className="form-label">Shipment Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={shipmentDate}
                  onChange={(e) => setShipmentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-2col">
              <div>
                <label className="form-label">
                  SO #
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6, fontSize: '0.78rem' }}>(Sales Order)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. SO-2026-0891"
                  value={soNumber}
                  onChange={(e) => setSoNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">
                  Order QTY
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6, fontSize: '0.78rem' }}>(Units)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 50"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group-full" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Storage Temp
                </label>
                <span style={{ fontSize: '0.74rem', color: '#0f766e', fontWeight: 600 }}>Standard: 2°C – 4°C</span>
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 2°C"
                value={storageTemp}
                onChange={(e) => setStorageTemp(e.target.value)}
                onBlur={() => setStorageTemp((prev) => formatTempInput(prev))}
              />
            </div>

            <div className="form-group-full">
              <label className="form-label">
                Product photos
                {photos.length > 0 && (
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6 }}>
                    ({photos.length} file{photos.length > 1 ? 's' : ''})
                  </span>
                )}
              </label>

              {/* Drop zone */}
              <label className="photo-upload-box" style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  accept="*/*"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                {uploading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
                    <span style={{ fontSize: '0.85rem' }}>Uploading…</span>
                  </div>
                ) : lastPhoto ? (
                  /* Show latest thumbnail + count badge */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={lastPhoto.url}
                        alt="Latest upload"
                        style={{
                          width: 52, height: 52, borderRadius: 7,
                          objectFit: 'cover', border: '2px solid #e2e8f0',
                        }}
                      />
                      {photos.length > 1 && (
                        <span style={{
                          position: 'absolute', bottom: -6, right: -6,
                          background: 'var(--color-brand)', color: '#fff',
                          fontSize: '0.68rem', fontWeight: 700,
                          borderRadius: '50%', width: 20, height: 20,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}>
                          {photos.length}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <CheckCircle2 size={15} /> {photos.length} photo{photos.length > 1 ? 's' : ''} attached
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Click to add more — or click a thumbnail to view all
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={22} color="var(--color-text-muted)" />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      Click to add photos <span style={{ color: '#94a3b8' }}>(multiple files allowed)</span>
                    </span>
                  </>
                )}
              </label>

              {/* Thumbnail strip with remove buttons */}
              {photos.length > 0 && (
                <div
                  style={{
                    display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10,
                  }}
                >
                  {photos.map((photo, idx) => (
                    <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                      {/* Clickable thumbnail → open lightbox at this index */}
                      <button
                        type="button"
                        onClick={() => openLightbox(idx)}
                        style={{
                          padding: 0, border: '2px solid var(--color-border)',
                          borderRadius: 7, background: 'none', cursor: 'pointer',
                          transition: 'border-color 0.15s, transform 0.15s',
                          display: 'block',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-brand)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                        title={`Click to view all photos (Photo ${idx + 1})`}
                      >
                        <img
                          src={photo.url}
                          alt={`Photo ${idx + 1}`}
                          style={{
                            width: 52, height: 52, borderRadius: 5,
                            objectFit: 'cover', display: 'block',
                          }}
                        />
                        {/* "latest" indicator */}
                        {idx === photos.length - 1 && photos.length > 1 && (
                          <span style={{
                            position: 'absolute', top: -6, left: -6,
                            background: '#0284c7', color: '#fff',
                            fontSize: '0.58rem', fontWeight: 700,
                            borderRadius: 3, padding: '1px 4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            letterSpacing: '0.3px',
                          }}>
                            LATEST
                          </span>
                        )}
                      </button>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        title="Remove this photo"
                        style={{
                          position: 'absolute', top: -6, right: -6,
                          background: '#ef4444', color: '#fff',
                          border: 'none', borderRadius: '50%',
                          width: 18, height: 18,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          fontSize: '0.65rem',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="btn-submit-modal" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit complaint'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
