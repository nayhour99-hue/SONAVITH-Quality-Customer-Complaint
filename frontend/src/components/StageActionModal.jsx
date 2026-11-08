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
  Video,
  Play,
  Film,
  MapPin,
  Building2,
  Layers,
  Printer,
} from 'lucide-react';
import { uploadPhoto, getDefectTypes } from '../services/api';

function isVideoUrl(url) {
  if (!url) return false;
  const clean = String(url).split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') || clean.endsWith('.avi') || clean.endsWith('.mkv') || clean.includes('/video/');
}

/** Lightbox viewer for viewing media (photos and videos) in high resolution */
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
  const isVideo = isVideoUrl(currentPhoto);

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
          {isVideo ? (
            <video
              key={currentPhoto}
              src={currentPhoto}
              controls
              autoPlay
              style={{
                maxWidth: 'min(760px, 90vw)',
                maxHeight: '68vh',
                borderRadius: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                background: '#000',
              }}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={currentPhoto}
              alt="Media reference"
              style={{
                maxWidth: 'min(640px, 85vw)',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            />
          )}
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
  mode, // 'qa', 'ceo', 'warehouse', 'stock_return', 'view'
  userRole = 'Admin',
  onClose,
  onSubmitQA,
  onSubmitCEO,
  onSubmitWarehouse,
  onSubmitStockReturn,
  onSubmitDisposal,
}) {
  const [inspectorName, setInspectorName] = useState('QA Team');
  const [customerStorageTemp, setCustomerStorageTemp] = useState('4°C');
  const [tempBottom, setTempBottom] = useState('');
  const [tempUpper, setTempUpper] = useState('');
  const [tempSide, setTempSide] = useState('');
  const [confirmedDefectQty, setConfirmedDefectQty] = useState(1);
  const [confirmedDefectType, setConfirmedDefectType] = useState('');
  const [defectPlacement, setDefectPlacement] = useState('At Store');
  const [storageHygiene, setStorageHygiene] = useState(5);
  const [improvementPoint, setImprovementPoint] = useState('Improve storage temp');
  const [dbDefectTypes, setDbDefectTypes] = useState([]);
  const [batchStatus, setBatchStatus] = useState('Confirmed out-of-spec acidity');
  const [rootCause, setRootCause] = useState('Chilled chain temperature drop during distributor transit');
  const [recommendation, setRecommendation] = useState('Recommend Exchange');

  // Customer storage temp photos state
  const [tempPhotos, setTempPhotos] = useState([]);
  const [uploadingTempPhoto, setUploadingTempPhoto] = useState(false);
  const [lightboxState, setLightboxState] = useState({ isOpen: false, photos: [], startIndex: 0 });

  const [ceoName, setCeoName] = useState('Executive Director');
  const [ceoDecision, setCeoDecision] = useState('Approved');
  const [ceoApprovedQty, setCeoApprovedQty] = useState(1);
  const [ceoComments, setCeoComments] = useState('');

  const [officerName, setOfficerName] = useState('Vicheka Kem');
  const [replacementBatch, setReplacementBatch] = useState('MAC-20260928-BATCH2');
  const [dispatchedQty, setDispatchedQty] = useState(1);
  const [dispatchDate, setDispatchDate] = useState('2026-09-20');
  const [deliveryNotes, setDeliveryNotes] = useState('Dispatched with morning chilled delivery route.');

  // Stage 05: Stock Return Control State (Physical & Virtual Breakdown)
  // Category 1: Physical Stock (Returned at Warehouse)
  const [physicalReturnedQty, setPhysicalReturnedQty] = useState(1);
  const [binLocation, setBinLocation] = useState('');
  const [returnPhotos, setReturnPhotos] = useState([]);
  const [uploadingReturnPhoto, setUploadingReturnPhoto] = useState(false);
  const [physicalDisposition, setPhysicalDisposition] = useState('Write Off');
  const [physicalWriteOffQty, setPhysicalWriteOffQty] = useState(1);
  const [physicalReworkQty, setPhysicalReworkQty] = useState(0);

  // Category 2: Virtual Stock (Written Off at Customer Place / Province)
  const [virtualReturnedQty, setVirtualReturnedQty] = useState(0);
  const [virtualLocation, setVirtualLocation] = useState('');
  const [virtualVideos, setVirtualVideos] = useState([]);
  const [uploadingVirtualVideo, setUploadingVirtualVideo] = useState(false);
  const [virtualNotes, setVirtualNotes] = useState('');

  // Common Controller & Notes
  const [writeOffBatch, setWriteOffBatch] = useState('');
  const [stockControllerName, setStockControllerName] = useState('Stock Controller');
  const [stockReturnNotes, setStockReturnNotes] = useState('');

  // Stage 06: Disposal Action State (Finance Manager & Tax Cut)
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().slice(0, 10));
  const [financeManagerName, setFinanceManagerName] = useState('Finance Manager');
  const [taxOfficerName, setTaxOfficerName] = useState('Tax Authority Representative');
  const [taxCountStatus, setTaxCountStatus] = useState('Counted & Approved by Tax Authority');
  const [disposedQty, setDisposedQty] = useState(1);
  const [disposalMethod, setDisposalMethod] = useState('Physical Destruction / Dump');
  const [disposalNotes, setDisposalNotes] = useState('');
  const [disposalPhotos, setDisposalPhotos] = useState([]);
  const [uploadingDisposalPhoto, setUploadingDisposalPhoto] = useState(false);

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  // Load defect types from masterlist
  useEffect(() => {
    getDefectTypes().then(setDbDefectTypes).catch(console.error);
  }, []);

  // Sync modal state when complaint or mode changes
  useEffect(() => {
    if (!complaint) return;
    setErrorMessage('');
    
    // QA state
    setInspectorName(complaint.qa_review?.inspector_name || 'QA Team');
    setConfirmedDefectType(complaint.qa_review?.confirmed_defect_type || complaint.defect_type || 'Physical damage');
    const existingTemp = complaint.qa_review?.customer_storage_temperature || '';
    setCustomerStorageTemp(existingTemp);

    // Parse Bottom, Upper, Side if recorded in format "B: ... | U: ... | S: ..."
    if (existingTemp) {
      const bMatch = existingTemp.match(/Bottom:\s*([^\s|]+)/i) || existingTemp.match(/B:\s*([^\s|]+)/i);
      const uMatch = existingTemp.match(/Upper:\s*([^\s|]+)/i) || existingTemp.match(/U:\s*([^\s|]+)/i);
      const sMatch = existingTemp.match(/Side:\s*([^\s|]+)/i) || existingTemp.match(/S:\s*([^\s|]+)/i);
      setTempBottom(bMatch ? bMatch[1] : '');
      setTempUpper(uMatch ? uMatch[1] : '');
      setTempSide(sMatch ? sMatch[1] : '');
      if (!bMatch && !uMatch && !sMatch) {
        setTempBottom(existingTemp);
      }
    } else {
      setTempBottom('');
      setTempUpper('');
      setTempSide('');
    }
    const initialConfirmedQty = complaint.qa_review?.confirmed_defect_quantity !== undefined && complaint.qa_review?.confirmed_defect_quantity !== null
      ? complaint.qa_review.confirmed_defect_quantity
      : complaint.defect_quantity;
    setConfirmedDefectQty(initialConfirmedQty);
    setDefectPlacement(complaint.qa_review?.defect_placement || 'At Store');
    setStorageHygiene(complaint.qa_review?.storage_hygiene !== undefined && complaint.qa_review?.storage_hygiene !== null ? Number(complaint.qa_review.storage_hygiene) : 5);
    setImprovementPoint(complaint.qa_review?.improvement_point || 'Improve storage temp');
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
    const initialCeoQty = complaint.ceo_decision?.approved_quantity !== undefined && complaint.ceo_decision?.approved_quantity !== null
      ? complaint.ceo_decision.approved_quantity
      : initialConfirmedQty;
    setCeoApprovedQty(initialCeoQty);
    setCeoComments(
      complaint.ceo_decision?.comments ||
      `Approved replacement of ${initialCeoQty} ${complaint.unit_of_measure} based on QA verified defect quantity.`
    );

    // Warehouse state
    setOfficerName(complaint.warehouse_fulfillment?.officer_name || 'Vicheka Kem');
    setReplacementBatch(complaint.warehouse_fulfillment?.replacement_batch || 'MAC-20260928-BATCH2');
    setDispatchedQty(
      complaint.warehouse_fulfillment?.dispatched_quantity !== undefined && complaint.warehouse_fulfillment?.dispatched_quantity !== null
        ? complaint.warehouse_fulfillment.dispatched_quantity
        : initialCeoQty
    );
    setDispatchDate(complaint.warehouse_fulfillment?.dispatch_date || new Date().toISOString().slice(0, 10));
    setDeliveryNotes(
      complaint.warehouse_fulfillment?.delivery_notes ||
      `Dispatched ${initialConfirmedQty} ${complaint.unit_of_measure} replacement with morning chilled route.`
    );

    // Stage 05: Stock Return state (Physical & Virtual Breakdown)
    const existingSR = complaint.stock_return || {};
    
    // Category 1: Physical Stock (Warehouse)
    const hasPhysicalField = existingSR.physical_returned_quantity !== undefined && existingSR.physical_returned_quantity !== null;
    const defaultTotal = existingSR.returned_quantity !== undefined && existingSR.returned_quantity !== null
      ? existingSR.returned_quantity
      : (complaint.warehouse_fulfillment?.dispatched_quantity || complaint.defect_quantity || 1);
    
    const initPhysicalQty = hasPhysicalField
      ? existingSR.physical_returned_quantity
      : (existingSR.virtual_returned_quantity ? 0 : defaultTotal);
    setPhysicalReturnedQty(initPhysicalQty);

    setBinLocation(existingSR.bin_location || '');
    const rawSRPhotos = existingSR.photo_url || '';
    if (rawSRPhotos) {
      const urls = rawSRPhotos.split(',').map((u) => u.trim()).filter(Boolean);
      setReturnPhotos(urls.map((url, i) => ({ url, name: `Physical return photo ${i + 1}` })));
    } else {
      setReturnPhotos([]);
    }

    const initPhysWriteOff = existingSR.physical_write_off_quantity !== undefined && existingSR.physical_write_off_quantity !== null
      ? existingSR.physical_write_off_quantity
      : (existingSR.confirmed_write_off_quantity !== undefined
          ? Math.max(0, existingSR.confirmed_write_off_quantity - (Number(existingSR.virtual_returned_quantity) || 0))
          : (existingSR.disposition_status === 'Rework' ? 0 : initPhysicalQty));
    
    const initPhysRework = existingSR.physical_rework_quantity !== undefined && existingSR.physical_rework_quantity !== null
      ? existingSR.physical_rework_quantity
      : (existingSR.confirmed_rework_quantity !== undefined
          ? existingSR.confirmed_rework_quantity
          : (existingSR.disposition_status === 'Rework' ? initPhysicalQty : 0));

    setPhysicalWriteOffQty(initPhysWriteOff);
    setPhysicalReworkQty(initPhysRework);
    setPhysicalDisposition(
      initPhysWriteOff > 0 && initPhysRework > 0 ? 'Split' : (initPhysRework > 0 ? 'Rework' : 'Write Off')
    );

    // Category 2: Virtual Stock (Province / Customer Place)
    const initVirtualQty = existingSR.virtual_returned_quantity !== undefined && existingSR.virtual_returned_quantity !== null
      ? existingSR.virtual_returned_quantity
      : 0;
    setVirtualReturnedQty(initVirtualQty);
    setVirtualLocation(
      existingSR.virtual_location ||
      (complaint.customer_location ? `At customer place (${complaint.customer_location})` : '')
    );
    const rawVirtualVideo = existingSR.virtual_video_url || '';
    if (rawVirtualVideo) {
      const vUrls = rawVirtualVideo.split(',').map((u) => u.trim()).filter(Boolean);
      setVirtualVideos(vUrls.map((url, i) => ({ url, name: `Write-off video reference ${i + 1}` })));
    } else {
      setVirtualVideos([]);
    }
    setVirtualNotes(existingSR.virtual_notes || '');

    // Common Controller & Notes
    setWriteOffBatch(
      existingSR.write_off_batch ||
      (complaint.manufacturing_code
        ? `${complaint.manufacturing_code}${complaint.production_batch ? `-${complaint.production_batch}` : ''}`
        : '')
    );
    setStockControllerName(existingSR.controller_name || 'Stock Controller');
    setStockReturnNotes(existingSR.notes || '');

    // Stage 06: Disposal state
    const existingDisp = complaint.disposal || {};
    setDisposalDate(existingDisp.disposal_date || new Date().toISOString().slice(0, 10));
    setFinanceManagerName(existingDisp.finance_manager_name || 'Finance Manager');
    setTaxOfficerName(existingDisp.tax_officer_name || 'Tax Authority Representative');
    setTaxCountStatus(existingDisp.tax_count_status || 'Counted & Approved by Tax Authority');
    const defaultDispQty = existingDisp.disposed_quantity !== undefined && existingDisp.disposed_quantity !== null
      ? existingDisp.disposed_quantity
      : (existingSR.confirmed_write_off_quantity !== undefined && existingSR.confirmed_write_off_quantity !== null
          ? existingSR.confirmed_write_off_quantity
          : (complaint.defect_quantity || 1));
    setDisposedQty(defaultDispQty);
    setDisposalMethod(existingDisp.disposal_method || 'Physical Destruction / Dump');
    setDisposalNotes(
      existingDisp.notes ||
      `Tax authority attended and counted write-off stock (${defaultDispQty} ${complaint.unit_of_measure}). Official stock cut and disposal completed.`
    );
    const rawDispPhotos = existingDisp.photo_url || '';
    if (rawDispPhotos) {
      const urls = rawDispPhotos.split(',').map((u) => u.trim()).filter(Boolean);
      setDisposalPhotos(urls.map((url, i) => ({ url, name: `Disposal photo ${i + 1}` })));
    } else {
      setDisposalPhotos([]);
    }
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
    setErrorMessage('');
    if (!tempBottom.trim() || !tempUpper.trim() || !tempSide.trim()) {
      setErrorMessage('Please fill in all three storage temperature readings: Bottom, Upper, and Side.');
      return;
    }
    setLoading(true);
    try {
      const storagePhotoUrl = tempPhotos.length > 0 ? tempPhotos.map((p) => p.url).join(',') : '';
      const formattedB = formatTempInput(tempBottom);
      const formattedU = formatTempInput(tempUpper);
      const formattedS = formatTempInput(tempSide);
      const compositeTemp = `Bottom: ${formattedB} | Upper: ${formattedU} | Side: ${formattedS}`;
      await onSubmitQA(complaint.id, {
        inspector_name: inspectorName,
        customer_storage_temperature: compositeTemp,
        storage_temperature_photo_url: storagePhotoUrl,
        confirmed_defect_quantity: Number(confirmedDefectQty),
        confirmed_defect_type: confirmedDefectType,
        defect_placement: defectPlacement,
        storage_hygiene: Number(storageHygiene),
        improvement_point: improvementPoint,
        batch_status: batchStatus,
        root_cause_notes: rootCause,
        recommendation: recommendation,
      });
      onClose();
    } catch (err) {
      console.error('QA submission error:', err);
      setErrorMessage(err.message || 'Failed to submit QA assessment. Please check fields.');
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
        approved_quantity: ceoDecision === 'Approved' ? Number(ceoApprovedQty) : 0,
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

  const handleReturnPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    setUploadingReturnPhoto(true);
    setErrorMessage('');
    try {
      for (const file of files) {
        const res = await uploadPhoto(file);
        if (res && res.url) {
          setReturnPhotos((prev) => [...prev, { url: res.url, name: file.name }]);
        }
      }
    } catch (err) {
      console.error('Error uploading return photo:', err);
      setErrorMessage('Failed to upload stock return photo. Please try again.');
    } finally {
      setUploadingReturnPhoto(false);
      e.target.value = '';
    }
  };

  const handleVirtualVideoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    setUploadingVirtualVideo(true);
    setErrorMessage('');
    try {
      for (const file of files) {
        const res = await uploadPhoto(file);
        if (res && res.url) {
          setVirtualVideos((prev) => [...prev, { url: res.url, name: file.name }]);
        }
      }
    } catch (err) {
      console.error('Error uploading virtual write-off video:', err);
      setErrorMessage('Failed to upload write-off video reference. Please try again.');
    } finally {
      setUploadingVirtualVideo(false);
      e.target.value = '';
    }
  };

  const removeVirtualVideo = (idx) => {
    setVirtualVideos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStockReturnSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const numPhysical = Math.max(0, Number(physicalReturnedQty) || 0);
    const numVirtual = Math.max(0, Number(virtualReturnedQty) || 0);
    const totalReturned = numPhysical + numVirtual;

    if (totalReturned <= 0) {
      setErrorMessage('Please specify returned quantity: at least Physical Stock or Virtual Stock must be greater than 0.');
      return;
    }

    if (numPhysical > 0 && !binLocation.trim()) {
      setErrorMessage('Please specify the Warehouse Bin Location for physical stock received.');
      return;
    }

    const numPhysWriteOff = Math.max(0, Number(physicalWriteOffQty) || 0);
    const numPhysRework = Math.max(0, Number(physicalReworkQty) || 0);

    if (numPhysWriteOff + numPhysRework !== numPhysical) {
      if (!window.confirm(`Notice: Physical write-off (${numPhysWriteOff}) + Physical rework (${numPhysRework}) = ${numPhysWriteOff + numPhysRework}, which does not match physical returned qty (${numPhysical}). Do you still want to proceed?`)) {
        return;
      }
    }

    // All virtual stock written off at customer place is classified as Write Off
    const totalWriteOff = numPhysWriteOff + numVirtual;
    const totalRework = numPhysRework;

    let disposition = 'Write Off';
    if (totalWriteOff > 0 && totalRework > 0) {
      disposition = 'Write Off & Rework';
    } else if (totalRework > 0) {
      disposition = 'Rework';
    } else {
      disposition = 'Write Off';
    }

    const videoUrls = virtualVideos.map((v) => v.url).filter(Boolean).join(',');

    setLoading(true);
    try {
      await onSubmitStockReturn(complaint.id, {
        bin_location: numPhysical > 0 ? binLocation.trim() : (virtualLocation.trim() ? `On-site: ${virtualLocation.trim()}` : 'Virtual Write-Off'),
        photo_url: returnPhotos.map((p) => p.url).join(','),
        returned_quantity: totalReturned,
        disposition_status: disposition,
        confirmed_write_off_quantity: totalWriteOff,
        confirmed_rework_quantity: totalRework,
        write_off_batch: writeOffBatch.trim(),
        
        physical_returned_quantity: numPhysical,
        physical_write_off_quantity: numPhysWriteOff,
        physical_rework_quantity: numPhysRework,
        
        virtual_returned_quantity: numVirtual,
        virtual_location: virtualLocation.trim(),
        virtual_video_url: videoUrls,
        virtual_notes: virtualNotes.trim(),
        
        controller_name: stockControllerName.trim(),
        notes: stockReturnNotes.trim(),
        recorded_date: new Date().toLocaleDateString('en-CA'),
        qa_signed_off: complaint.stock_return?.qa_signed_off || 'No',
        qa_signed_off_by: complaint.stock_return?.qa_signed_off_by || '',
        qa_signed_off_date: complaint.stock_return?.qa_signed_off_date || '',
      });
      onClose();
    } catch (err) {
      console.error('Stock return error:', err);
      setErrorMessage(err.message || 'Failed to submit stock return control.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisposalPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    setUploadingDisposalPhoto(true);
    setErrorMessage('');
    try {
      for (const file of files) {
        const res = await uploadPhoto(file);
        if (res && res.url) {
          setDisposalPhotos((prev) => [...prev, { url: res.url, name: file.name }]);
        }
      }
    } catch (err) {
      console.error('Error uploading disposal photo:', err);
      setErrorMessage('Failed to upload disposal/tax certificate photo. Please try again.');
    } finally {
      setUploadingDisposalPhoto(false);
      e.target.value = '';
    }
  };

  const removeDisposalPhoto = (idx) => {
    setDisposalPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDisposalSubmit = async (e) => {
    e.preventDefault();
    if (!disposalDate) {
      setErrorMessage('Please specify the Disposal Date.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const photoUrl = disposalPhotos.length > 0 ? disposalPhotos.map((p) => p.url).join(',') : '';
      await onSubmitDisposal(complaint.id, {
        finance_manager_name: financeManagerName.trim() || 'Finance Manager',
        disposal_date: disposalDate,
        tax_officer_name: taxOfficerName.trim() || 'Tax Authority Representative',
        tax_count_status: taxCountStatus,
        disposed_quantity: Number(disposedQty),
        disposal_method: disposalMethod,
        notes: disposalNotes.trim(),
        photo_url: photoUrl,
      });
      onClose();
    } catch (err) {
      console.error('Disposal submission error:', err);
      setErrorMessage(err.message || 'Failed to submit disposal action.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    const uom = complaint.unit_of_measure || 'BTL';
    const qa = complaint.qa_review;
    const ceo = complaint.ceo_decision;
    const wh = complaint.warehouse_fulfillment;
    const sr = complaint.stock_return;
    const disp = complaint.disposal;
    const esc = (val) =>
      val === undefined || val === null || val === ''
        ? 'N/A'
        : String(val)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

    const printWin = window.open('', '_blank', 'width=920,height=860');
    if (!printWin) {
      window.print();
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Complaint Report - ${esc(complaint.id)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      font-size: 12px;
      line-height: 1.45;
      background: #ffffff;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: 0.02em;
      margin: 0 0 2px 0;
    }
    .doc-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .doc-sub {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      background: ${complaint.status === 'Closed' ? '#ede9fe' : '#e0f2fe'};
      color: ${complaint.status === 'Closed' ? '#5b21b6' : '#0369a1'};
      border: 1px solid ${complaint.status === 'Closed' ? '#c4b5fd' : '#bae6fd'};
    }
    .card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      background: #f8fafc;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
    }
    .card-title {
      font-weight: 800;
      font-size: 12.5px;
    }
    .tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 16px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      text-align: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      margin: 6px 0;
    }
    .span-2 { grid-column: span 2; }
    .sub-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 7px 10px;
    }
    .sig-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 18px;
      page-break-inside: avoid;
    }
    .sig-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
      background: #ffffff;
    }
    .sig-role {
      font-size: 10.5px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 28px;
    }
    .sig-line {
      border-top: 1px dashed #94a3b8;
      padding-top: 4px;
      font-size: 10.5px;
      font-weight: 600;
      color: #0f172a;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;">
    <button onclick="window.print()" style="background:#0f766e;color:#fff;border:none;padding:7px 16px;border-radius:6px;font-weight:700;cursor:pointer;">Print / Save PDF</button>
    <button onclick="window.close()" style="background:#e2e8f0;color:#334155;border:none;padding:7px 14px;border-radius:6px;font-weight:600;cursor:pointer;">Close</button>
  </div>

  <div class="report-header">
    <div>
      <div class="brand-title">SONAVITH — DEFECTIVE PRODUCT REPORT</div>
      <div class="doc-title">Complaint Record Details (${esc(complaint.id)})</div>
      <div class="doc-sub">Customer: <strong>${esc(complaint.customer_name)}</strong> • Printed: ${new Date().toLocaleString()}</div>
    </div>
    <div style="text-align:right;">
      <div class="status-badge">${esc(complaint.status)}</div>
      <div class="doc-sub" style="margin-top:4px;">Com. Date: <strong>${esc(complaint.complaint_date)}</strong></div>
    </div>
  </div>

  <!-- Summary Box -->
  <div class="card" style="background:#ffffff;border:1.5px solid #94a3b8;">
    <div class="grid-2">
      <div><strong>Product:</strong> ${esc(complaint.product_name)} ${complaint.product_short_code ? `(${esc(complaint.product_short_code)})` : ''}</div>
      <div><strong>Claimed Defect:</strong> ${esc(complaint.defect_type)} (QTY: ${esc(complaint.defect_quantity)} ${esc(uom)})</div>
      <div><strong>Product ID:</strong> ${esc(complaint.product_id || complaint.product_short_code || 'N/A')}</div>
      <div><strong>Status:</strong> <strong>${esc(complaint.status)}</strong></div>
      <div><strong>Code / EXP:</strong> ${esc(complaint.manufacturing_code)} · ${esc(complaint.product_expiry_date)}</div>
      <div><strong>Sales Order (SO):</strong> ${esc(complaint.so_number)}</div>
      <div><strong>Order QTY:</strong> ${complaint.order_quantity ? `${esc(complaint.order_quantity)} ${esc(uom)}` : 'N/A'}</div>
      <div><strong>Shipment Date:</strong> ${esc(complaint.shipment_date)}</div>
      <div><strong>Sales Storage Temp:</strong> ${esc(complaint.storage_temp)}</div>
      ${complaint.price_discount ? `<div><strong>Price Discount:</strong> ${esc(complaint.price_discount)}</div>` : ''}
    </div>
  </div>

  <!-- Stage 1 -->
  <div class="card">
    <div class="card-header">
      <span class="card-title" style="color:#0f766e;">Stage 1: Sales Intake & Defect Profile</span>
      <span class="tag" style="background:#ecfdf5;color:#065f46;">Sales Logged</span>
    </div>
    <div class="grid-2">
      <div><strong>Sales Rep:</strong> ${esc(complaint.sales_rep_name)}</div>
      <div><strong>Com.Date:</strong> ${esc(complaint.complaint_date)}</div>
      <div><strong>Customer:</strong> ${esc(complaint.customer_name)}</div>
      <div><strong>Contact:</strong> ${esc(complaint.customer_contact)}</div>
      <div class="span-2"><strong>Location:</strong> ${esc(complaint.customer_location)}</div>
      <div><strong>Product:</strong> ${esc(complaint.product_name)} ${complaint.product_short_code ? `(${esc(complaint.product_short_code)})` : ''}</div>
      <div><strong>Claimed Defect:</strong> ${esc(complaint.defect_type)} (QTY: ${esc(complaint.defect_quantity)} ${esc(uom)})</div>
      <div><strong>SO #:</strong> ${esc(complaint.so_number)}</div>
      <div><strong>Order QTY:</strong> ${complaint.order_quantity ? `${esc(complaint.order_quantity)} ${esc(uom)}` : 'N/A'}</div>
      <div><strong>Code / EXP:</strong> ${esc(complaint.manufacturing_code)} · ${esc(complaint.product_expiry_date)}</div>
      <div><strong>Pro.Time:</strong> ${esc(complaint.production_batch)}</div>
      <div><strong>Shipment Date:</strong> ${esc(complaint.shipment_date)}</div>
      <div><strong>Sales Storage Temp:</strong> ${esc(complaint.storage_temp)}</div>
    </div>
  </div>

  <!-- Stage 2 -->
  ${qa ? `
  <div class="card">
    <div class="card-header">
      <span class="card-title" style="color:#0369a1;">Stage 2: QA Inspection & Assessment</span>
      <span class="tag" style="background:#e0f2fe;color:#0369a1;">Verified</span>
    </div>
    <div class="grid-2">
      <div><strong>Inspector:</strong> ${esc(qa.inspector_name)}</div>
      <div><strong>QA Confirmed Defect Qty:</strong> <strong>${esc(qaConfirmedQty)} ${esc(uom)}</strong></div>
      <div><strong>Confirmed Defect Type:</strong> ${esc(qa.confirmed_defect_type || complaint.defect_type)}</div>
      <div><strong>Customer Storage Temp:</strong> ${esc(qa.customer_storage_temperature)}</div>
      <div><strong>Placement of Defect:</strong> ${esc(qa.defect_placement)}</div>
      <div><strong>Storage Hygiene:</strong> ${qa.storage_hygiene ? `${esc(qa.storage_hygiene)}/5 ★` : 'N/A'}</div>
      <div class="span-2"><strong>Point to Improvement:</strong> ${esc(qa.improvement_point)}</div>
      <div class="span-2"><strong>Lab Assessment:</strong> ${esc(qa.batch_status)}</div>
      <div class="span-2"><strong>Root Cause:</strong> ${esc(qa.root_cause_notes)}</div>
      <div class="span-2"><strong>Recommendation:</strong> <strong>${esc(qa.recommendation)}</strong></div>
    </div>
  </div>
  ` : ''}

  <!-- Stage 3 -->
  ${ceo ? `
  <div class="card">
    <div class="card-header">
      <span class="card-title" style="color:#b45309;">Stage 3: Executive CEO Decision</span>
      <span class="tag" style="background:#fef3c7;color:#92400e;">${esc(ceo.decision)}</span>
    </div>
    <div class="grid-2">
      <div><strong>Reviewer:</strong> ${esc(ceo.reviewer_name)}</div>
      <div><strong>Decision:</strong> <strong>${esc(ceo.decision)}</strong></div>
      <div><strong>Approved Qty:</strong> <strong>${ceo.approved_quantity !== undefined && ceo.approved_quantity !== null ? `${esc(ceo.approved_quantity)} ${esc(uom)}` : 'N/A'}</strong></div>
      <div><strong>Comments:</strong> ${esc(ceo.comments)}</div>
    </div>
  </div>
  ` : ''}

  <!-- Stage 4 -->
  ${wh ? `
  <div class="card" style="background:#f0fdf4;border-color:#bbf7d0;">
    <div class="card-header" style="border-color:#dcfce7;">
      <span class="card-title" style="color:#15803d;">Stage 4: Warehouse Fulfillment Details</span>
      <span class="tag" style="background:#dcfce7;color:#15803d;">Completed & Dispatched</span>
    </div>
    <div class="grid-2">
      <div><strong>Warehouse Officer:</strong> ${esc(wh.officer_name)}</div>
      <div><strong>Dispatch Date:</strong> ${esc(wh.dispatch_date)}</div>
      <div><strong>Dispatched Quantity:</strong> <strong>${esc(wh.dispatched_quantity)} ${esc(uom)}</strong></div>
      <div><strong>Replacement Batch Code:</strong> <code>${esc(wh.replacement_batch)}</code></div>
      ${wh.delivery_notes ? `<div class="span-2"><strong>Delivery & Route Notes:</strong> ${esc(wh.delivery_notes)}</div>` : ''}
    </div>
  </div>
  ` : ''}

  <!-- Stage 5 -->
  ${sr ? `
  <div class="card" style="background:#fefce8;border-color:#fde047;">
    <div class="card-header" style="border-color:#fef08a;">
      <span class="card-title" style="color:#854d0e;">Stage 5: Stock Return Control (${esc(sr.disposition_status || 'Write Off')})</span>
      <span class="tag" style="background:#fef08a;color:#854d0e;">Signed Off (QA): ${sr.qa_signed_off === 'Yes' ? 'Yes (Complete)' : esc(sr.qa_signed_off || 'Pending')}</span>
    </div>
    <div class="grid-3">
      <div>
        <div style="font-size:10px;color:#64748b;">Total Returned</div>
        <div style="font-weight:800;font-size:13px;">${esc(sr.returned_quantity)} ${esc(uom)}</div>
      </div>
      <div>
        <div style="font-size:10px;color:#b91c1c;">Confirmed Write-Off</div>
        <div style="font-weight:800;font-size:13px;color:#b91c1c;">${esc(sr.confirmed_write_off_quantity)} ${esc(uom)}</div>
      </div>
      <div>
        <div style="font-size:10px;color:#15803d;">Confirmed Rework</div>
        <div style="font-weight:800;font-size:13px;color:#15803d;">${esc(sr.confirmed_rework_quantity || 0)} ${esc(uom)}</div>
      </div>
    </div>
    <div class="grid-2" style="margin-bottom:6px;">
      <div class="sub-box">
        <div style="font-weight:700;color:#0284c7;margin-bottom:2px;">1. Physical Stock (Warehouse)</div>
        <div><strong>Quantity:</strong> ${esc(sr.physical_returned_quantity !== undefined ? sr.physical_returned_quantity : sr.returned_quantity)} ${esc(uom)}</div>
        <div><strong>Bin Location:</strong> ${esc(sr.bin_location)}</div>
      </div>
      <div class="sub-box">
        <div style="font-weight:700;color:#7c3aed;margin-bottom:2px;">2. Virtual Stock (On-site / Province)</div>
        <div><strong>Quantity:</strong> ${esc(sr.virtual_returned_quantity || 0)} ${esc(uom)} (Write-Off)</div>
        <div><strong>Location:</strong> ${esc(sr.virtual_location)}</div>
      </div>
    </div>
    <div class="grid-2">
      <div><strong>Write Off Batch Code:</strong> <code>${esc(sr.write_off_batch || disp?.write_off_batch_codes || 'N/A')}</code></div>
      <div><strong>Controller:</strong> ${esc(sr.controller_name)} (${esc(sr.recorded_date)})</div>
      ${sr.notes ? `<div class="span-2"><strong>Notes:</strong> ${esc(sr.notes)}</div>` : ''}
    </div>
  </div>
  ` : ''}

  <!-- Stage 6 -->
  ${disp ? `
  <div class="card" style="background:#f5f3ff;border-color:#c4b5fd;">
    <div class="card-header" style="border-color:#ddd6fe;">
      <span class="card-title" style="color:#5b21b6;">Stage 6: Disposal Action (Finance & Tax)</span>
      <span class="tag" style="background:#ede9fe;color:#5b21b6;">${esc(disp.status || complaint.status || 'Closed')}</span>
    </div>
    <div class="grid-2">
      ${disp.disposal_letter_issue_date ? `<div><strong>Disposal Letter Issue Date:</strong> ${esc(disp.disposal_letter_issue_date)}</div>` : ''}
      <div><strong>Disposal Date:</strong> <strong>${esc(disp.disposal_date)}</strong></div>
      <div><strong>Finance Manager:</strong> ${esc(disp.finance_manager_name || 'Finance Manager')}</div>
      <div><strong>Tax Officer:</strong> ${esc(disp.tax_officer_name || 'Tax Authority Representative')}</div>
      <div><strong>Tax Count Status:</strong> ${esc(disp.tax_count_status)}</div>
      <div><strong>Disposal Method:</strong> ${esc(disp.disposal_method)}</div>
      <div><strong>Cut / Disposed QTY:</strong> <strong style="color:#b91c1c;">${esc(disp.disposed_quantity)} ${esc(uom)}</strong></div>
      <div><strong>Write Off Batch Code:</strong> <code>${esc(disp.write_off_batch_codes || sr?.write_off_batch || 'N/A')}</code></div>
      ${disp.notes ? `<div class="span-2"><strong>Notes:</strong> ${esc(disp.notes)}</div>` : ''}
    </div>
  </div>
  ` : ''}

  <!-- Signatures -->
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-role">Sales Representative</div>
      <div class="sig-line">${esc(complaint.sales_rep_name)}</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">QA Inspector</div>
      <div class="sig-line">${esc(qa?.inspector_name || 'QA Team')}</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Executive CEO Approval</div>
      <div class="sig-line">${esc(ceo?.reviewer_name || 'CEO')}</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Finance & Tax Disposal</div>
      <div class="sig-line">${esc(disp?.finance_manager_name || 'Finance Manager')}</div>
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
              {mode === 'stock_return' && 'Stage 5: Stock Return Control'}
              {mode === 'disposal' && 'Stage 6: Disposal Action (Finance)'}
              {mode === 'view' && 'Complaint Record Details'}
            </h2>
            <div className="modal-subtitle">
              ID: <strong>{complaint.id}</strong> — Customer: {complaint.customer_name}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(mode === 'view' || complaint.status === 'Closed') && (
              <button
                type="button"
                onClick={handlePrintReport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #0f766e',
                  background: '#f0fdfa',
                  color: '#0f766e',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Print Complaint Report"
              >
                <Printer size={15} />
                <span>Print Report</span>
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
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
              {errorMessage && (
                <div style={{
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: '0.84rem',
                  marginBottom: 14,
                  fontWeight: 500
                }}>
                  {errorMessage}
                </div>
              )}
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

              {/* Stage 2 additions: Storage Temp (3 Locations) & Confirmed Defect Qty */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5, margin: 0 }}>
                    <Thermometer size={15} color="#0284c7" />
                    <strong>Customer Storage Temperature (3 Location Readings)</strong>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>
                    Standard: 2°C – 4°C
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 8,
                  padding: 12
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#0369a1', marginBottom: 4 }}>
                      • Bottom <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 2°C"
                      value={tempBottom}
                      onChange={(e) => setTempBottom(e.target.value)}
                      onBlur={() => setTempBottom((prev) => formatTempInput(prev))}
                      required
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#0369a1', marginBottom: 4 }}>
                      • Upper <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 3.5°C"
                      value={tempUpper}
                      onChange={(e) => setTempUpper(e.target.value)}
                      onBlur={() => setTempUpper((prev) => formatTempInput(prev))}
                      required
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#0369a1', marginBottom: 4 }}>
                      • Side <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 4°C"
                      value={tempSide}
                      onChange={(e) => setTempSide(e.target.value)}
                      onBlur={() => setTempSide((prev) => formatTempInput(prev))}
                      required
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                  All 3 storage location readings (Bottom, Upper, Side) are required for QA temperature audit.
                </div>
              </div>

              <div className="form-grid-2col" style={{ marginBottom: 14 }}>
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

                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={14} color="#0284c7" />
                    <span>Confirmed Defect Type</span>
                  </label>
                  <select
                    className="form-select"
                    value={confirmedDefectType}
                    onChange={(e) => setConfirmedDefectType(e.target.value)}
                    required
                  >
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
                        <option value="Foreign particle">Foreign particle</option>
                      </>
                    )}
                  </select>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 3 }}>
                    Sales claimed: <strong>{complaint.defect_type}</strong>
                  </div>
                </div>
              </div>

              {/* Placement of Defect, Storage Hygiene (1-5), & Point to Improvement */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div className="form-grid-2col">
                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                      <MapPin size={14} color="#0284c7" />
                      <span>Placement of Defect</span>
                    </label>
                    <select
                      className="form-select"
                      value={defectPlacement}
                      onChange={(e) => setDefectPlacement(e.target.value)}
                      required
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      <option value="At Store">At Store</option>
                      <option value="Customer Returned">Customer Returned</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Storage Hygiene (Rating 1–5)</span>
                      <span style={{ fontSize: '0.74rem', color: storageHygiene >= 4 ? '#15803d' : storageHygiene === 3 ? '#b45309' : '#b91c1c', fontWeight: 700 }}>
                        {storageHygiene}/5 {storageHygiene === 5 ? '(Excellent)' : storageHygiene === 4 ? '(Good)' : storageHygiene === 3 ? '(Fair)' : storageHygiene === 2 ? '(Poor)' : '(Critical)'}
                      </span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map((rating) => {
                        const isSelected = Number(storageHygiene) === rating;
                        return (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setStorageHygiene(rating)}
                            style={{
                              padding: '7px 0',
                              borderRadius: 6,
                              border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                              background: isSelected ? '#e0f2fe' : '#ffffff',
                              color: isSelected ? '#0369a1' : '#475569',
                              fontWeight: isSelected ? 700 : 600,
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title={`Rate storage hygiene ${rating} out of 5`}
                          >
                            {rating} ★
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                    <CheckCircle2 size={14} color="#0284c7" />
                    <span>Point to Improvement</span>
                  </label>
                  <select
                    className="form-select"
                    value={improvementPoint}
                    onChange={(e) => setImprovementPoint(e.target.value)}
                    required
                    style={{ backgroundColor: '#ffffff' }}
                  >
                    <option value="Improve storage temp">Improve storage temp</option>
                    <option value="Improve hygiene">Improve hygiene</option>
                    <option value="Keep space for airflow">Keep space for airflow</option>
                    <option value="Standard delivery">Standard delivery</option>
                    <option value="Keep going">Keep going</option>
                  </select>
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
                    accept="*/*"
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
                    {complaint.qa_review.confirmed_defect_type && (
                      <div><strong>Confirmed Defect Type:</strong> <span style={{ color: '#0369a1', fontWeight: 600 }}>{complaint.qa_review.confirmed_defect_type}</span></div>
                    )}
                    {complaint.qa_review.defect_placement && (
                      <div><strong>Placement of Defect:</strong> <span style={{ fontWeight: 600 }}>{complaint.qa_review.defect_placement}</span></div>
                    )}
                    {complaint.qa_review.storage_hygiene && (
                      <div><strong>Storage Hygiene Rating:</strong> <span style={{ color: '#0369a1', fontWeight: 600 }}>{complaint.qa_review.storage_hygiene}/5 ★</span></div>
                    )}
                    {complaint.qa_review.improvement_point && (
                      <div><strong>Point to Improvement:</strong> <span style={{ color: '#0f766e', fontWeight: 600 }}>{complaint.qa_review.improvement_point}</span></div>
                    )}
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

              <div className="form-grid-2col">
                <div>
                  <label className="form-label">Executive Decision</label>
                  <select
                    className="form-select"
                    value={ceoDecision}
                    onChange={(e) => {
                      const newDec = e.target.value;
                      setCeoDecision(newDec);
                      if (newDec === 'Approved') {
                        setCeoComments(`Approved replacement of ${ceoApprovedQty} ${complaint.unit_of_measure} based on executive approval.`);
                      } else {
                        setCeoComments(`Claim rejected by executive decision.`);
                      }
                    }}
                  >
                    <option value="Approved">Approve Exchange (Send to Warehouse)</option>
                    <option value="Rejected">Reject Claim</option>
                  </select>
                </div>

                {ceoDecision === 'Approved' ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Approved Quantity ({complaint.unit_of_measure})</label>
                      {Number(ceoApprovedQty) !== Number(qaConfirmedQty) && (
                        <span style={{ fontSize: '0.70rem', color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                          Adjusted from QA ({qaConfirmedQty})
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="form-input"
                        value={ceoApprovedQty}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCeoApprovedQty(val);
                          setCeoComments(`Approved replacement of ${val} ${complaint.unit_of_measure} based on executive review (QA verified: ${qaConfirmedQty} ${complaint.unit_of_measure}).`);
                        }}
                        style={{ fontWeight: 700, color: 'var(--color-brand)' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCeoApprovedQty(qaConfirmedQty);
                          setCeoComments(`Approved replacement of ${qaConfirmedQty} ${complaint.unit_of_measure} based on QA verified defect quantity.`);
                        }}
                        title={`Reset to QA confirmed defect quantity (${qaConfirmedQty} ${complaint.unit_of_measure})`}
                        style={{
                          fontSize: '0.70rem',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          padding: '6px 8px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          color: '#475569',
                          fontWeight: 500,
                        }}
                      >
                        Reset QA Qty
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="form-label">Decision Status</label>
                    <input
                      type="text"
                      className="form-input"
                      value="Claim Rejected"
                      readOnly
                      style={{ backgroundColor: '#fef2f2', color: '#991b1b', fontWeight: 600 }}
                    />
                  </div>
                )}
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
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {complaint.ceo_decision?.approved_quantity !== undefined ? 'CEO Approved Exchange Qty' : 'QA Confirmed Exchange Qty'}
                    </div>
                    <div style={{ fontWeight: 700, color: '#15803d', fontSize: '1.05rem', marginTop: 2 }}>
                      {(complaint.ceo_decision?.approved_quantity !== undefined && complaint.ceo_decision?.approved_quantity !== null)
                        ? complaint.ceo_decision.approved_quantity
                        : qaConfirmedQty}{' '}
                      {complaint.unit_of_measure}
                    </div>
                    {complaint.ceo_decision?.approved_quantity !== undefined && Number(complaint.ceo_decision.approved_quantity) !== Number(qaConfirmedQty) && (
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 2 }}>
                        QA verified: {qaConfirmedQty} {complaint.unit_of_measure}
                      </div>
                    )}
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

          {/* Stage 5: Stock Return Control Form (Physical & Virtual Breakdown) */}
          {mode === 'stock_return' && (
            <form onSubmit={handleStockReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', fontSize: '0.84rem', color: '#854d0e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={20} color="#ca8a04" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Two-Category Return Recording:</strong> Record both <strong>Physical stock</strong> (received at warehouse) and <strong>Virtual stock</strong> (written off directly at customer site/province with video reference). Both categories are automatically summed up.
                </div>
              </div>

              {/* CATEGORY 1: PHYSICAL STOCK (WAREHOUSE) */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0f172a', fontSize: '0.90rem' }}>
                    <Building2 size={16} color="#0284c7" />
                    <span>1. Physical Stock (Warehouse Received)</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                    Physical Warehouse
                  </span>
                </div>

                <div className="form-grid-2col">
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Physical Returned Quantity ({complaint.unit_of_measure})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input"
                      value={physicalReturnedQty}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setPhysicalReturnedQty(val);
                        if (physicalDisposition === 'Write Off') {
                          setPhysicalWriteOffQty(val);
                          setPhysicalReworkQty(0);
                        } else if (physicalDisposition === 'Rework') {
                          setPhysicalReworkQty(val);
                          setPhysicalWriteOffQty(0);
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Bin Location of Stock Return {Number(physicalReturnedQty) > 0 && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Room number or bin code (e.g. Room 2 - Bin A14)"
                      value={binLocation}
                      onChange={(e) => setBinLocation(e.target.value)}
                      required={Number(physicalReturnedQty) > 0}
                    />
                  </div>
                </div>

                {/* Physical Photo Upload */}
                <div className="form-group-full">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Physical Stock Photo Reference</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Warehouse receipt proof</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        cursor: uploadingReturnPhoto ? 'wait' : 'pointer',
                        fontSize: '0.80rem',
                        color: 'var(--color-text-main)',
                        fontWeight: 500,
                      }}
                    >
                      <Upload size={14} color="#0284c7" />
                      <span>{uploadingReturnPhoto ? 'Uploading photo...' : 'Upload Physical Photo'}</span>
                      <input
                        type="file"
                        accept="*/*"
                        multiple
                        onChange={handleReturnPhotoUpload}
                        disabled={uploadingReturnPhoto}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {returnPhotos.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 8px',
                          background: '#ffffff',
                          borderRadius: 6,
                          border: '1px solid #e2e8f0',
                          fontSize: '0.78rem',
                        }}
                      >
                        <img
                          src={p.url}
                          alt="return"
                          style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                          onClick={() => setLightboxState({ isOpen: true, photos: returnPhotos, startIndex: idx })}
                        />
                        <button
                          type="button"
                          onClick={() => setReturnPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}
                          title="Remove photo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Physical Stock Disposition Status */}
                <div className="form-grid-2col">
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Physical Stock Disposition</label>
                    <select
                      className="form-select"
                      value={physicalDisposition}
                      onChange={(e) => {
                        const st = e.target.value;
                        setPhysicalDisposition(st);
                        const pQty = Number(physicalReturnedQty) || 0;
                        if (st === 'Write Off') {
                          setPhysicalWriteOffQty(pQty);
                          setPhysicalReworkQty(0);
                        } else if (st === 'Rework') {
                          setPhysicalReworkQty(pQty);
                          setPhysicalWriteOffQty(0);
                        }
                      }}
                    >
                      <option value="Write Off">Write Off (Warehouse)</option>
                      <option value="Rework">Rework / Saleable</option>
                      <option value="Split">Split (Write Off & Rework)</option>
                    </select>
                  </div>

                  {physicalDisposition === 'Split' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.76rem', color: '#b91c1c', fontWeight: 600 }}>
                          Physical Write-Off
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-input"
                          value={physicalWriteOffQty}
                          onChange={(e) => setPhysicalWriteOffQty(Math.max(0, Number(e.target.value)))}
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 600 }}>
                          Physical Rework
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-input"
                          value={physicalReworkQty}
                          onChange={(e) => setPhysicalReworkQty(Math.max(0, Number(e.target.value)))}
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.80rem', color: '#64748b', paddingTop: 20 }}>
                      {physicalDisposition === 'Write Off' ? (
                        <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                          All {physicalReturnedQty} {complaint.unit_of_measure} will be classified as physical write-off
                        </span>
                      ) : (
                        <span style={{ color: '#15803d', fontWeight: 600 }}>
                          All {physicalReturnedQty} {complaint.unit_of_measure} will be classified as rework / saleable
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* CATEGORY 2: VIRTUAL STOCK (CUSTOMER PLACE / PROVINCE) */}
              <div style={{
                background: '#faf5ff',
                border: '1px solid #ddd6fe',
                borderRadius: 8,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ede9fe', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#5b21b6', fontSize: '0.90rem' }}>
                    <MapPin size={16} color="#7c3aed" />
                    <span>2. Virtual Stock (Write Off at Customer Site / Province)</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                    On-Site Destruction
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#6b21a8' }}>
                  For province customers where returning stock is impractical: destroy defective product directly at customer place and record destruction video as official proof.
                </div>

                <div className="form-grid-2col">
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, color: '#5b21b6' }}>
                      Virtual Stock Quantity ({complaint.unit_of_measure})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input"
                      value={virtualReturnedQty}
                      onChange={(e) => setVirtualReturnedQty(Math.max(0, Number(e.target.value)))}
                      placeholder="0 if all returned physically"
                    />
                    <span style={{ fontSize: '0.71rem', color: '#7c3aed' }}>
                      * Automatically counted as Write Off
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Write-Off Site / Customer Province Location
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Battambang Province Branch or Customer Place"
                      value={virtualLocation}
                      onChange={(e) => setVirtualLocation(e.target.value)}
                    />
                  </div>
                </div>

                {/* Virtual Stock Video Reference Upload */}
                <div className="form-group-full">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Video size={14} color="#7c3aed" />
                      <span>Record Video of Write Off at Place (Reference)</span>
                    </span>
                    <span style={{ fontSize: '0.73rem', color: '#7c3aed' }}>Video / Media reference</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: '#ffffff',
                        border: '1px solid #c4b5fd',
                        cursor: uploadingVirtualVideo ? 'wait' : 'pointer',
                        fontSize: '0.80rem',
                        color: '#6d28d9',
                        fontWeight: 600,
                      }}
                    >
                      <Video size={14} color="#7c3aed" />
                      <span>{uploadingVirtualVideo ? 'Uploading video...' : 'Upload Write-Off Video'}</span>
                      <input
                        type="file"
                        accept="*/*"
                        multiple
                        onChange={handleVirtualVideoUpload}
                        disabled={uploadingVirtualVideo}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {virtualVideos.map((v, idx) => {
                      const isVid = isVideoUrl(v.url);
                      return (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 8px',
                            background: '#ffffff',
                            borderRadius: 6,
                            border: '1px solid #ddd6fe',
                            fontSize: '0.78rem',
                            color: '#6d28d9',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setLightboxState({ isOpen: true, photos: virtualVideos.map((x) => x.url), startIndex: idx })}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#6d28d9',
                              fontWeight: 600,
                              fontSize: '0.76rem',
                              padding: 0,
                            }}
                            title="Click to play video reference"
                          >
                            <Play size={13} color="#7c3aed" />
                            <span>{v.name || `Video proof ${idx + 1}`}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeVirtualVideo(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}
                            title="Remove video reference"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group-full">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>On-Site Write-Off Notes / Witness</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Sales rep witnessed destruction at customer warehouse"
                    value={virtualNotes}
                    onChange={(e) => setVirtualNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* 3. TOTAL COMBINED RETURN STOCK SUMMARY (AUTO-SUMMED) */}
              <div style={{
                background: '#fefce8',
                border: '1px solid #fde047',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#854d0e', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={16} color="#ca8a04" />
                    <span>Total Stock Return Summary (Auto Sum)</span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: (Number(physicalWriteOffQty) + Number(virtualReturnedQty)) > 0 ? '#fee2e2' : '#dcfce7',
                      color: (Number(physicalWriteOffQty) + Number(virtualReturnedQty)) > 0 ? '#b91c1c' : '#15803d',
                      border: `1px solid ${(Number(physicalWriteOffQty) + Number(virtualReturnedQty)) > 0 ? '#fca5a5' : '#86efac'}`,
                    }}
                  >
                    {((Number(physicalWriteOffQty) + Number(virtualReturnedQty)) > 0 && Number(physicalReworkQty) > 0)
                      ? 'Write Off & Rework'
                      : (Number(physicalReworkQty) > 0 ? 'Rework' : 'Write Off')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
                  <div style={{ background: '#ffffff', padding: '8px', borderRadius: 6, border: '1px solid #fef08a' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Total Returned QTY</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {Number(physicalReturnedQty) + Number(virtualReturnedQty)} {complaint.unit_of_measure}
                    </div>
                    <div style={{ fontSize: '0.67rem', color: '#854d0e' }}>
                      ({Number(physicalReturnedQty)} Phys + {Number(virtualReturnedQty)} Virt)
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px', borderRadius: 6, border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>Total Confirmed Write Off</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#b91c1c' }}>
                      {Number(physicalWriteOffQty) + Number(virtualReturnedQty)} {complaint.unit_of_measure}
                    </div>
                    <div style={{ fontSize: '0.67rem', color: '#991b1b' }}>
                      ({Number(physicalWriteOffQty)} Phys + {Number(virtualReturnedQty)} Virt)
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#15803d' }}>Total Confirmed Rework</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d' }}>
                      {Number(physicalReworkQty)} {complaint.unit_of_measure}
                    </div>
                    <div style={{ fontSize: '0.67rem', color: '#166534' }}>
                      (Physical warehouse)
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Write Off Batch Code, Controller Name & Notes */}
              <div className="form-group-full">
                <label className="form-label" style={{ fontWeight: 600, color: '#b91c1c' }}>
                  Write Off Batch Code
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. MAC-12:00 or WO-20261106-B01"
                  value={writeOffBatch}
                  onChange={(e) => setWriteOffBatch(e.target.value)}
                />
              </div>

              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">Stock Controller Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={stockControllerName}
                    onChange={(e) => setStockControllerName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Return Notes / Comments</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Quarantine / batch inspection notes"
                    value={stockReturnNotes}
                    onChange={(e) => setStockReturnNotes(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-submit-modal"
                disabled={loading}
                style={{ backgroundColor: '#ca8a04', color: '#ffffff', fontWeight: 700 }}
              >
                {loading
                  ? 'Saving Return Control...'
                  : `Confirm Stage 05: Stock Return Control (${Number(physicalReturnedQty) + Number(virtualReturnedQty)} ${complaint.unit_of_measure})`}
              </button>
            </form>
          )}

          {/* Stage 6: Disposal Action Form (Finance Manager & Tax Stock Cut) */}
          {mode === 'disposal' && (
            <form onSubmit={handleDisposalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, padding: '10px 14px', fontSize: '0.84rem', color: '#5b21b6', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} color="#7c3aed" />
                <span>Finance Manager control: Call tax authority to count stock, cut write-off inventory, record disposal date, and finalize closure ("Closed").</span>
              </div>

              {/* Stage 5 Stock Return Reference Card */}
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: '10px 12px', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, color: '#854d0e', marginBottom: 4 }}>
                  📋 Stage 05 Return & Write-Off Summary Reference:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', color: '#713f12' }}>
                  <div><strong>Product ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{complaint.product_id || complaint.product_short_code || '—'}</span></div>
                  <div><strong>Confirmed Defect Type:</strong> <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{complaint.qa_review?.confirmed_defect_type || complaint.defect_type || '—'}</span></div>
                  <div style={{ color: '#b91c1c' }}><strong>Confirmed Write-Off:</strong> {complaint.stock_return?.confirmed_write_off_quantity || (complaint.stock_return?.disposition_status === 'Write Off' ? complaint.stock_return?.returned_quantity : 0) || complaint.defect_quantity} {complaint.unit_of_measure}</div>
                  <div style={{ color: '#15803d' }}><strong>Confirmed Rework:</strong> {complaint.stock_return?.confirmed_rework_quantity || 0} {complaint.unit_of_measure}</div>
                  <div style={{ color: '#b91c1c' }}><strong>Write Off Batch Code:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{complaint.stock_return?.write_off_batch || '—'}</span></div>
                </div>
              </div>

              {/* 1. Disposal Date (Key required field per user spec) & Finance Manager Name */}
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, color: '#5b21b6' }}>
                    Disposal Date *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={disposalDate}
                    onChange={(e) => setDisposalDate(e.target.value)}
                    required
                    style={{ borderColor: '#8b5cf6' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#6d28d9' }}>Date tax officially counted stock & cut to disposal</span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Finance Manager Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={financeManagerName}
                    onChange={(e) => setFinanceManagerName(e.target.value)}
                    placeholder="Finance Manager"
                    required
                  />
                </div>
              </div>

              {/* 2. Tax Authority Inspection & Tax Count Verification */}
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Tax Authority / Officer Representative
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={taxOfficerName}
                    onChange={(e) => setTaxOfficerName(e.target.value)}
                    placeholder="e.g. Tax Dept Officer / Customs"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Tax Stock Count Status
                  </label>
                  <select
                    className="form-select"
                    value={taxCountStatus}
                    onChange={(e) => setTaxCountStatus(e.target.value)}
                  >
                    <option value="Counted & Approved by Tax Authority">Counted & Approved by Tax Authority</option>
                    <option value="Tax Officer Present for Destruction">Tax Officer Present for Destruction</option>
                    <option value="Certified Tax Write-Off Form Issued">Certified Tax Write-Off Form Issued</option>
                    <option value="Counted under Finance & Tax Supervision">Counted under Finance & Tax Supervision</option>
                  </select>
                </div>
              </div>

              {/* 3. Disposed Quantity & Disposal Method */}
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, color: '#b91c1c' }}>
                    Cut / Disposed Quantity ({complaint.unit_of_measure})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-input"
                    value={disposedQty}
                    onChange={(e) => setDisposedQty(Number(e.target.value))}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    Write-off quantity deducted from inventory balance
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Disposal Method
                  </label>
                  <select
                    className="form-select"
                    value={disposalMethod}
                    onChange={(e) => setDisposalMethod(e.target.value)}
                  >
                    <option value="Physical Destruction / Dump">Physical Destruction / Dump</option>
                    <option value="Drain / Liquid Disposal (Dairy)">Drain / Liquid Disposal (Dairy)</option>
                    <option value="Crushed & Compacted">Crushed & Compacted</option>
                    <option value="Incineration / Certified Destruction">Incineration / Certified Destruction</option>
                    <option value="Organic Composting / Agricultural Feed">Organic Composting / Agricultural Feed</option>
                  </select>
                </div>
              </div>

              {/* 4. Tax Minutes & Disposal Photo References */}
              <div className="form-group-full">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Tax Count Minutes / Disposal Destruction Proof Photo
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label
                    style={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: 6,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: '#f8fafc',
                      fontSize: '0.84rem',
                      color: '#475569',
                    }}
                  >
                    <Camera size={16} color="#7c3aed" />
                    <span>{uploadingDisposalPhoto ? 'Uploading tax minutes...' : 'Upload tax inspection minutes or disposal destruction photo'}</span>
                    <input
                      type="file"
                      accept="*/*"
                      multiple
                      onChange={handleDisposalPhotoUpload}
                      style={{ display: 'none' }}
                      disabled={uploadingDisposalPhoto}
                    />
                  </label>

                  {disposalPhotos.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {disposalPhotos.map((p, idx) => (
                        <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            src={p.url}
                            alt={`Disposal proof ${idx + 1}`}
                            style={{
                              width: 60,
                              height: 60,
                              objectFit: 'cover',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer',
                            }}
                            onClick={() => openLightbox(disposalPhotos, idx)}
                          />
                          <button
                            type="button"
                            onClick={() => removeDisposalPhoto(idx)}
                            style={{
                              position: 'absolute',
                              top: -4,
                              right: -4,
                              background: '#ef4444',
                              color: '#fff',
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Disposal Notes & Tax Reference */}
              <div className="form-group-full">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Disposal Notes & Tax Write-Off Minutes
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={disposalNotes}
                  onChange={(e) => setDisposalNotes(e.target.value)}
                  placeholder="Record tax officer minutes, certificate ref number, or write-off ledger remarks..."
                />
              </div>

              <button
                type="submit"
                className="btn-submit-modal"
                disabled={loading}
                style={{ backgroundColor: '#5b21b6', color: '#ffffff', fontWeight: 700, padding: '10px 16px' }}
              >
                {loading ? 'Closing Complaint...' : 'Confirm Stage 06: Cut Write-Off Stock & Close Complaint (Closed)'}
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
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {complaint.qa_review.defect_placement && (
                        <div><strong>Placement of Defect:</strong> <span style={{ fontWeight: 600 }}>{complaint.qa_review.defect_placement}</span></div>
                      )}
                      {complaint.qa_review.storage_hygiene && (
                        <div><strong>Storage Hygiene:</strong> <span style={{ color: '#0369a1', fontWeight: 700 }}>{complaint.qa_review.storage_hygiene}/5 ★</span></div>
                      )}
                      {complaint.qa_review.improvement_point && (
                        <div><strong>Point to Improvement:</strong> <span style={{ color: '#0f766e', fontWeight: 600 }}>{complaint.qa_review.improvement_point}</span></div>
                      )}
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
                    {complaint.ceo_decision.approved_quantity !== undefined && complaint.ceo_decision.approved_quantity !== null && (
                      <div><strong>Approved Qty:</strong> <span style={{ fontWeight: 700, color: '#15803d' }}>{complaint.ceo_decision.approved_quantity} {complaint.unit_of_measure}</span></div>
                    )}
                    <div><strong>Comments:</strong> {complaint.ceo_decision.comments}</div>
                  </div>
                </div>
              )}

              {complaint.warehouse_fulfillment ? (
                <div style={{ padding: 14, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PackageCheck size={16} color="#15803d" />
                      <strong style={{ color: '#15803d', fontSize: '0.9rem' }}>Stage 4: Warehouse Fulfillment Details</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                      Completed & Dispatched
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                    <div><strong>Warehouse Officer:</strong> {complaint.warehouse_fulfillment.officer_name}</div>
                    <div><strong>Dispatch Date:</strong> <span style={{ fontWeight: 600 }}>{complaint.warehouse_fulfillment.dispatch_date}</span></div>
                    <div>
                      <strong>Dispatched Quantity:</strong>{' '}
                      <span style={{ color: '#15803d', fontWeight: 700 }}>
                        {complaint.warehouse_fulfillment.dispatched_quantity} {complaint.unit_of_measure}
                      </span>
                    </div>
                    <div>
                      <strong>Replacement Batch Code:</strong>{' '}
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, background: '#ffffff', padding: '2px 6px', borderRadius: 4, border: '1px solid #dcfce7' }}>
                        {complaint.warehouse_fulfillment.replacement_batch}
                      </span>
                    </div>
                    {complaint.warehouse_fulfillment.delivery_notes && (
                      <div style={{ gridColumn: 'span 2', background: '#ffffff', padding: '8px 10px', borderRadius: 6, border: '1px solid #dcfce7', marginTop: 4 }}>
                        <strong>Delivery & Route Notes:</strong> {complaint.warehouse_fulfillment.delivery_notes}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', fontSize: '0.84rem', color: '#64748b' }}>
                  <strong>Stage 4: Warehouse Fulfillment:</strong> <span style={{ fontStyle: 'italic' }}>Not Complete (Pending fulfillment)</span>
                </div>
              )}

              {complaint.stock_return && (
                <div style={{ padding: 14, background: '#fefce8', borderRadius: 8, border: '1px solid #fde047' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid #fef08a', paddingBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ color: '#854d0e', fontSize: '0.92rem' }}>Stage 5: Stock Return Control</strong>
                      <span style={{ fontSize: '0.73rem', background: '#fef08a', color: '#854d0e', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                        {complaint.stock_return.disposition_status || 'Write Off'}
                      </span>
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.80rem', color: '#475569' }}>Signed Off (QA): </strong>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.80rem',
                          color: complaint.stock_return.qa_signed_off === 'Yes' ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {complaint.stock_return.qa_signed_off === 'Yes' ? '✓ Yes (Complete)' : (complaint.stock_return.qa_signed_off === 'No' ? '✗ No (Open for Edit)' : 'Pending QA')}
                      </span>
                    </div>
                  </div>

                  {/* Summary Totals */}
                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px solid #fef08a', marginBottom: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: '0.82rem', textAlign: 'center' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Total Returned</span>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.98rem' }}>
                        {complaint.stock_return.returned_quantity} {complaint.unit_of_measure}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#b91c1c', fontSize: '0.72rem' }}>Confirmed Write-Off</span>
                      <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '0.98rem' }}>
                        {complaint.stock_return.confirmed_write_off_quantity} {complaint.unit_of_measure}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#15803d', fontSize: '0.72rem' }}>Confirmed Rework</span>
                      <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.98rem' }}>
                        {complaint.stock_return.confirmed_rework_quantity || 0} {complaint.unit_of_measure}
                      </div>
                    </div>
                  </div>

                  {/* Two Categories Breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                    {/* Category 1: Physical Warehouse */}
                    <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.80rem' }}>
                      <div style={{ fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <Building2 size={14} />
                        <span>1. Physical Stock (Warehouse)</span>
                      </div>
                      <div><strong>Quantity:</strong> {complaint.stock_return.physical_returned_quantity !== undefined ? complaint.stock_return.physical_returned_quantity : complaint.stock_return.returned_quantity} {complaint.unit_of_measure}</div>
                      <div><strong>Bin Location:</strong> <span style={{ fontWeight: 600, color: '#92400e' }}>{complaint.stock_return.bin_location || 'N/A'}</span></div>
                      {complaint.stock_return.photo_url && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Physical Photos:</span>
                          <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                            {complaint.stock_return.photo_url.split(',').filter(Boolean).map((url, i) => (
                              <img
                                key={i}
                                src={url.trim()}
                                alt="Return"
                                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                                onClick={() => setLightboxState({ isOpen: true, photos: complaint.stock_return.photo_url.split(',').filter(Boolean), startIndex: i })}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Category 2: Virtual On-Site / Province */}
                    <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd6fe', fontSize: '0.80rem' }}>
                      <div style={{ fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <MapPin size={14} />
                        <span>2. Virtual Stock (On-site / Province)</span>
                      </div>
                      <div><strong>Quantity:</strong> {complaint.stock_return.virtual_returned_quantity || 0} {complaint.unit_of_measure} (Write-Off)</div>
                      <div><strong>Location:</strong> {complaint.stock_return.virtual_location || 'N/A'}</div>
                      {complaint.stock_return.virtual_video_url && (
                        <div style={{ marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() => setLightboxState({
                              isOpen: true,
                              photos: complaint.stock_return.virtual_video_url.split(',').filter(Boolean),
                              startIndex: 0
                            })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 4,
                              background: '#ede9fe',
                              border: '1px solid #c4b5fd',
                              color: '#6d28d9',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Play size={12} />
                            <span>Play Destruction Video</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Write Off Batch, Controller & Notes */}
                  <div style={{ fontSize: '0.80rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, color: '#475569', marginTop: 4 }}>
                    {complaint.stock_return.write_off_batch && (
                      <div style={{ color: '#b91c1c' }}>
                        <strong>Write Off Batch Code:</strong>{' '}
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#fee2e2', padding: '1px 6px', borderRadius: 4 }}>
                          {complaint.stock_return.write_off_batch}
                        </span>
                      </div>
                    )}
                    <div><strong>Controller:</strong> {complaint.stock_return.controller_name || 'N/A'}</div>
                    {complaint.stock_return.recorded_date && (
                      <div><strong>Recorded Date:</strong> {complaint.stock_return.recorded_date}</div>
                    )}
                  </div>
                  {complaint.stock_return.notes && (
                    <div style={{ fontSize: '0.80rem', marginTop: 4, background: '#fff', padding: '6px 8px', borderRadius: 4, border: '1px solid #fef08a' }}>
                      <strong>Notes:</strong> {complaint.stock_return.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Stage 6: Disposal Action (Finance & Tax Cut) */}
              {complaint.disposal && (
                <div style={{ padding: 12, background: '#f5f3ff', borderRadius: 8, border: '1px solid #c4b5fd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ color: '#5b21b6' }}>Stage 6: Disposal Action (Finance & Tax)</strong>
                    <span style={{ fontSize: '0.75rem', background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                      {complaint.disposal.status || 'Closed'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                    {complaint.disposal.disposal_letter_issue_date && (
                      <div><strong>Disposal Letter Issue Date:</strong> {complaint.disposal.disposal_letter_issue_date}</div>
                    )}
                    <div><strong>Disposal Date:</strong> <span style={{ fontWeight: 700, color: '#5b21b6' }}>{complaint.disposal.disposal_date}</span></div>
                    <div><strong>Finance Manager:</strong> {complaint.disposal.finance_manager_name || 'Finance Manager'}</div>
                    <div><strong>Tax Count Status:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>{complaint.disposal.tax_count_status}</span></div>
                    <div><strong>Tax Officer:</strong> {complaint.disposal.tax_officer_name || 'Tax Authority Representative'}</div>
                    <div style={{ color: '#b91c1c' }}><strong>Cut / Disposed QTY:</strong> {complaint.disposal.disposed_quantity} {complaint.unit_of_measure}</div>
                    <div><strong>Disposal Method:</strong> {complaint.disposal.disposal_method}</div>
                    {(complaint.disposal.write_off_batch_codes || complaint.stock_return?.write_off_batch) && (
                      <div>
                        <strong>Write Off Batch Code:</strong>{' '}
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '1px 6px', borderRadius: 4 }}>
                          {complaint.disposal.write_off_batch_codes || complaint.stock_return?.write_off_batch}
                        </span>
                      </div>
                    )}
                    {complaint.disposal.notes && (
                      <div style={{ gridColumn: 'span 2' }}><strong>Notes:</strong> {complaint.disposal.notes}</div>
                    )}
                    {complaint.disposal.photo_url && (
                      <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
                        <strong>Tax Minutes / Destruction Proof:</strong>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          {complaint.disposal.photo_url.split(',').filter(Boolean).map((url, i) => (
                            <img
                              key={i}
                              src={url.trim()}
                              alt="Disposal proof"
                              style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                              onClick={() => setLightboxState({ isOpen: true, photos: complaint.disposal.photo_url.split(',').filter(Boolean), startIndex: i })}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Print & Close Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0f766e',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
                  }}
                >
                  <Printer size={16} />
                  <span>Print Closed Report / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
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

