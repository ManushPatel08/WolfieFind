import { useState, useEffect } from 'react';

/**
 * Minimal, robust device orientation hook.
 * Returns { heading, accuracy, isAvailable, error }
 * It listens to deviceorientation/deviceorientationabsolute and updates heading.
 */
export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState({
    heading: null,
    accuracy: null,
    isAvailable: false,
    error: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
      setOrientation(prev => ({ ...prev, isAvailable: false, error: 'Device orientation not supported' }));
      return;
    }

    let isIOS = typeof DeviceOrientationEvent.requestPermission === 'function';
    let permissionGranted = !isIOS;

    const requestPermission = async () => {
      if (!isIOS) return true;
      try {
        const p = await DeviceOrientationEvent.requestPermission();
        permissionGranted = p === 'granted';
        if (!permissionGranted) setOrientation(prev => ({ ...prev, isAvailable: false, error: 'Orientation permission denied' }));
        return permissionGranted;
      } catch {
        setOrientation(prev => ({ ...prev, isAvailable: false, error: 'Orientation permission error' }));
        return false;
      }
    };

    const handleOrientation = (event) => {
      let heading = null;
      if (event.webkitCompassHeading !== undefined) {
        heading = event.webkitCompassHeading;
      } else if (event.alpha !== null && event.alpha !== undefined) {
        const alpha = event.alpha;
        heading = 360 - alpha;
        if (typeof window.orientation !== 'undefined') heading = (heading + window.orientation) % 360;
      }

      const accuracy = event.webkitCompassAccuracy || (event.alpha !== null ? 15 : null);

      if (heading !== null && heading !== undefined) {
        setOrientation({ heading: Math.round(heading), accuracy, isAvailable: true, error: null });
      }
    };

    const handleAbsolute = (event) => {
      if (event.absolute && event.alpha !== null) handleOrientation(event);
    };

    const init = async () => {
      await requestPermission();
      if (permissionGranted) {
        window.addEventListener('deviceorientationabsolute', handleAbsolute, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
        setOrientation(prev => ({ ...prev, isAvailable: true }));
      }
    };

    init();

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleAbsolute, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  return orientation;
}

export async function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

export function isCompassSupported() {
  return typeof DeviceOrientationEvent !== 'undefined';
}

export function requiresPermission() {
  return typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
}
