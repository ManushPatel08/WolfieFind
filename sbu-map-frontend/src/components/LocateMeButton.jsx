import React from 'react';

export function LocateMeOverlay({ onClick, isActive, isLoading }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={"locate-me-button" + (isActive ? ' active' : '')}
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-primary)',
        fontSize: 22,
        cursor: 'pointer',
        transition: 'all .25s',
        padding: 0,
      }}
      aria-label="Find my location"
    >
      {isLoading ? '🔄' : isActive ? '📍' : '🎯'}
    </button>
  );
}

export default LocateMeOverlay;
