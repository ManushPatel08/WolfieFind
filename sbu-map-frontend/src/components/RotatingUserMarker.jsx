import React, { useEffect, useRef, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

function createRotatingIcon(heading = 0, userId = 'default') {
  const rotation = heading || 0;
  const uniqueId = `compass-${userId}-${Date.now()}`;

  const iconHtml = `
    <div class="${uniqueId}" style="
      position: relative;
      width: 40px;
      height: 40px;
      transform: rotate(${rotation}deg);
      transition: transform 0.3s ease-out;
    ">
      <div style="
        position: absolute;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(66, 133, 244, 0.12);
        animation: pulse-${uniqueId} 2s infinite;
        top: 0;
        left: 0;
      "></div>
      <div style="
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4285f4;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        top: 12px;
        left: 12px;
        z-index: 2;
      "></div>
      <svg style="
        position: absolute;
        top: -12px;
        left: 12px;
        z-index: 1;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
      " width="16" height="24" viewBox="0 0 16 24">
        <path d="M 8 0 L 0 24 L 8 18 L 16 24 Z" fill="rgba(66, 133, 244, 0.85)"/>
      </svg>
    </div>
    <style>
      @keyframes pulse-${uniqueId} {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.6; }
        100% { transform: scale(1.5); opacity: 0; }
      }
    </style>
  `;

  return L.divIcon({
    html: iconHtml,
    className: `rotating-user-marker user-${userId}`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

export function RotatingUserMarker({ position, heading, accuracy, userId = 'default', showAccuracy = false }) {
  const markerRef = useRef(null);
  const lastHeadingRef = useRef(null);
  const animationFrameRef = useRef(null);

  const icon = useMemo(() => createRotatingIcon(heading || 0, userId), [heading, userId]);

  useEffect(() => {
    if (!markerRef.current || heading === null || heading === lastHeadingRef.current) return;

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    animationFrameRef.current = requestAnimationFrame(() => {
      const markerEl = markerRef.current?.getElement?.();
      if (markerEl) {
        const innerDiv = markerEl.querySelector('div');
        if (innerDiv) innerDiv.style.transform = `rotate(${heading}deg)`;
        lastHeadingRef.current = heading;
      }
    });

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [heading]);

  useEffect(() => () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); }, []);

  if (!position) return null;

  return (
    <Marker position={position} icon={icon} ref={markerRef}>
      <Popup>
        <div style={{ minWidth: 150 }}>
          <strong>📍 Your Location</strong>
          <br />
          {heading !== null && <><span style={{ fontSize: '0.9em', color: '#666' }}>Heading: <strong>{Math.round(heading)}°</strong></span><br /></>}
          {accuracy !== null && <span style={{ fontSize: '0.85em', color: '#999' }}>Accuracy: ±{Math.round(accuracy)}°</span>}
          {showAccuracy && accuracy && (
            <>
              <br />
              <span style={{ fontSize: '0.8em', color: '#aaa' }}>{accuracy < 20 ? '✓ Good signal' : '⚠ Calibrate compass'}</span>
            </>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export function CompassDebug({ heading, accuracy, isAvailable }) {
  if (!isAvailable) return null;
  return (
    <div style={{ position: 'fixed', top: 80, left: 10, background: 'rgba(0,0,0,0.85)', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', zIndex: 9999, fontFamily: 'monospace' }}>
      <div>🧭 Compass Active</div>
      {heading !== null && <div>Heading: {Math.round(heading)}°</div>}
      {accuracy !== null && <div>±{Math.round(accuracy)}°</div>}
    </div>
  );
}
