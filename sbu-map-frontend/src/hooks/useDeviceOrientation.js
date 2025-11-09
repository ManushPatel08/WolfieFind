import { useState, useEffect } from 'react';
import { useRef } from 'react';

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

  const startedRef = useRef(false);
  const handleRef = useRef({});

  const isSupported = typeof window !== 'undefined' && typeof DeviceOrientationEvent !== 'undefined';

  const attachListeners = () => {
    if (!isSupported) return false;

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

    const handleAbsolute = (event) => { if (event.absolute && event.alpha !== null) handleOrientation(event); };

    handleRef.current = { handleOrientation, handleAbsolute };
    window.addEventListener('deviceorientationabsolute', handleAbsolute, true);
    window.addEventListener('deviceorientation', handleOrientation, true);
    setOrientation(prev => ({ ...prev, isAvailable: true }));
    startedRef.current = true;
    return true;
  };

  const detachListeners = () => {
    const h = handleRef.current;
    if (h.handleAbsolute) window.removeEventListener('deviceorientationabsolute', h.handleAbsolute, true);
    if (h.handleOrientation) window.removeEventListener('deviceorientation', h.handleOrientation, true);
    startedRef.current = false;
    setOrientation(prev => ({ ...prev, isAvailable: false }));
  };

  const startCompass = async () => {
    if (!isSupported) {
      setOrientation(prev => ({ ...prev, error: 'Device orientation not supported' }));
      return false;
    }

    const needsPermission = typeof DeviceOrientationEvent.requestPermission === 'function';
    if (needsPermission) {
      try {
        const p = await DeviceOrientationEvent.requestPermission();
        if (p !== 'granted') {
          setOrientation(prev => ({ ...prev, error: 'Orientation permission denied' }));
          return false;
        }
      } catch {
        setOrientation(prev => ({ ...prev, error: 'Orientation permission error' }));
        return false;
      }
    }

    return attachListeners();
  };

  const stopCompass = () => {
    if (startedRef.current) detachListeners();
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (startedRef.current) detachListeners();
    };
  }, []);

  return { ...orientation, startCompass, stopCompass };
}

