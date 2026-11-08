import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Video } from 'lucide-react';

function isVideoUrl(url) {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') || clean.endsWith('.avi') || clean.endsWith('.mkv') || url.includes('/video/');
}

export default function PhotoPreviewModal({ photoUrl, complaintId, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  
  useEffect(() => {
    if (photoUrl) {
      setCurrentIdx(0);
    }
  }, [photoUrl]);

  if (!photoUrl) return null;

  const mediaList = photoUrl.split(',').map((u) => u.trim()).filter(Boolean);
  if (mediaList.length === 0) return null;

  const currentMedia = mediaList[currentIdx] || mediaList[0];
  const isCurrentVideo = isVideoUrl(currentMedia);

  const goNext = (e) => {
    e.stopPropagation();
    setCurrentIdx((i) => (i + 1) % mediaList.length);
  };
  
  const goPrev = (e) => {
    e.stopPropagation();
    setCurrentIdx((i) => (i - 1 + mediaList.length) % mediaList.length);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: 700, textAlign: 'center', padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isCurrentVideo ? <Video size={18} color="#7c3aed" /> : null}
            <span>
              {isCurrentVideo ? 'Video Reference' : 'Media Proof'}: {complaintId}{' '}
              {mediaList.length > 1 ? `(${currentIdx + 1}/${mediaList.length})` : ''}
            </span>
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div
          style={{
            background: '#0f172a',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 12,
            position: 'relative',
            minHeight: 280,
          }}
        >
          {mediaList.length > 1 && (
            <button
              onClick={goPrev}
              style={{
                position: 'absolute', left: 8,
                background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff',
                borderRadius: '50%', width: 34, height: 34, display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                zIndex: 10
              }}
              title="Previous"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          
          {isCurrentVideo ? (
            <video
              key={currentMedia}
              src={currentMedia}
              controls
              autoPlay
              style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 4 }}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              key={currentMedia}
              src={currentMedia}
              alt={`Proof ${currentIdx + 1}`}
              style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 4 }}
            />
          )}

          {mediaList.length > 1 && (
            <button
              onClick={goNext}
              style={{
                position: 'absolute', right: 8,
                background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff',
                borderRadius: '50%', width: 34, height: 34, display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                zIndex: 10
              }}
              title="Next"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        
        {/* Thumbnail strip */}
        {mediaList.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
            {mediaList.map((url, idx) => {
              const isVid = isVideoUrl(url);
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  style={{
                    border: idx === currentIdx ? '2px solid #7c3aed' : '2px solid transparent',
                    borderRadius: 6, padding: 0, cursor: 'pointer', background: '#1e293b',
                    transition: 'border-color 0.15s',
                    position: 'relative',
                    width: 48,
                    height: 48,
                    overflow: 'hidden',
                  }}
                >
                  {isVid ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', fontSize: '0.62rem' }}>
                      <Video size={18} />
                      <span>Video</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`Thumb ${idx + 1}`}
                      style={{
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        opacity: idx === currentIdx ? 1 : 0.65,
                        transition: 'opacity 0.15s',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
