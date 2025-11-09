import React, { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

function createRotatingIcon(heading = 0) {
  const iconHtml = `
    <div style="
      position: relative;
      width: 40px;
      height: 40px;
      transform: rotate(${heading}deg);
      transition: transform 0.3s ease-out;
    ">
      <div style="position: absolute;width: 40px;height: 40px;border-radius: 50%;background: rgba(66,133,244,0.12);animation: pulse 2s infinite;top: 0;left: 0;"></div>
      <div style="position: absolute;width: 16px;height: 16px;border-radius: 50%;background: #4285f4;border: 3px solid white;box-shadow: 0 2px 6px rgba(0,0,0,0.3);top: 12px;left: 12px;z-index: 2;"></div>
      <div style="position: absolute;width: 0;height: 0;border-left: 8px solid transparent;border-right: 8px solid transparent;border-bottom: 24px solid rgba(66,133,244,0.6);top: -12px;left: 12px;z-index: 1;filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));"></div>
    </div>
    <style>@keyframes pulse {0%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.6}100%{transform:scale(1.5);opacity:0}}</style>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'rotating-user-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

function createArrowIcon(heading = 0) {
  const iconHtml = `
    <div style="width:40px;height:40px;position:relative">
      <svg width="40" height="40" viewBox="0 0 40 40" style="transform: rotate(${heading}deg); transition: transform 0.3s ease-out;">
        <circle cx="20" cy="20" r="18" fill="rgba(66,133,244,0.12)" />
        <circle cx="20" cy="20" r="12" fill="#4285f4" stroke="white" stroke-width="2" />
        <path d="M 20 8 L 15 18 L 25 18 Z" fill="white" />
      </svg>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'rotating-user-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

export function RotatingUserMarker({ position, heading, accuracy, style = 'arrow' }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current && heading !== null) {
      const icon = style === 'arrow' ? createArrowIcon(heading) : createRotatingIcon(heading);
      try {
        markerRef.current.setIcon(icon);
      } catch {
        // ignore if marker not ready
      }
    }
  }, [heading, style]);

  const initialIcon = style === 'arrow' ? createArrowIcon(heading || 0) : createRotatingIcon(heading || 0);

  if (!position) return null;

  return (
    <Marker position={position} icon={initialIcon} ref={markerRef}>
      <Popup>
        <div style={{ minWidth: 150 }}>
          <strong>📍 Your Location</strong>
          <br />
          {heading !== null && (
            <>
              <span style={{ fontSize: '0.9em', color: '#666' }}>Heading: <strong>{Math.round(heading)}°</strong></span>
              <br />
            </>
          )}
          {accuracy !== null && (
            <span style={{ fontSize: '0.85em', color: '#999' }}>Accuracy: ±{Math.round(accuracy)}°</span>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
