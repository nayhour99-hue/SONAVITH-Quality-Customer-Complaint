import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PhotoPreviewModal({ photoUrl, complaintId, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  
  useEffect(() => {
    if (photoUrl) {
      setCurrentIdx(0);
    }
  }, [photoUrl]);

  if (!photoUrl) return null;

  const photos = photoUrl.split(',');

  const goNext = (e) => {
    e.stopPropagation();
    setCurrentIdx((i) => (i + 1) % photos.length);
  };
  
  const goPrev = (e) => {
    e.stopPropagation();
    setCurrentIdx((i) => (i - 1 + photos.length) % photos.length);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: 640, textAlign: 'center', padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
            Photo Proof: {complaintId} {photos.length > 1 ? `(${currentIdx + 1}/${photos.length})` : ''}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
            position: 'relative'
          }}
        >
          {photos.length > 1 && (
            <button
              onClick={goPrev}
              style={{
                position: 'absolute', left: 8,
                background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                borderRadius: '50%', width: 32, height: 32, display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                zIndex: 10
              }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          
          <img
            src={photos[currentIdx]}
            alt={`Defect proof ${currentIdx + 1}`}
            style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 4 }}
          />

          {photos.length > 1 && (
            <button
              onClick={goNext}
              style={{
                position: 'absolute', right: 8,
                background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                borderRadius: '50%', width: 32, height: 32, display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                zIndex: 10
              }}
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        
        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
            {photos.map((url, idx) => (
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
                  src={url}
                  alt={`Thumb ${idx + 1}`}
                  style={{
                    width: 48, height: 48,
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
    </div>
  );
}
