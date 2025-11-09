import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export function LocateMeButton({ onLocate, isActive }) {
  const map = useMap();

  useEffect(() => {
    const LocateControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const button = L.DomUtil.create('a', 'locate-me-button', container);
        button.innerHTML = isActive ? '📍' : '🎯';
        button.href = '#';
        button.title = 'Find my location';
        button.setAttribute('role', 'button');
        button.setAttribute('aria-label', 'Find my location');

        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.on(button, 'click', function (e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          if (onLocate) onLocate();
        });

        return container;
      },
    });

    const locateControl = new LocateControl();
    map.addControl(locateControl);

    return () => {
      map.removeControl(locateControl);
    };
  }, [map, onLocate, isActive]);

  return null;
}

// Alternative: Simple React overlay button
export function LocateMeOverlay({ onClick, isActive, isLoading }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`locate-me-button ${isActive ? 'active' : ''}`}
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: isActive ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: isActive ? '1px solid #22c55e' : '1px solid var(--glass-border)',
        boxShadow: isActive ? '0 4px 20px rgba(34, 197, 94, 0.4)' : 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isActive ? 'white' : 'var(--text-primary)',
        fontSize: '24px',
        cursor: 'pointer',
        transition: 'all var(--transition-base)',
        padding: 0,
      }}
      aria-label={isActive ? 'Stop tracking' : 'Start tracking'}
      title={isActive ? 'Stop live tracking' : 'Start live tracking'}
    >
      {isLoading ? '🔄' : isActive ? '📍' : '🎯'}
    </button>
  );
}

export default LocateMeOverlay;
