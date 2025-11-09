import { useState, useEffect } from 'react';

/**
 * Custom hook to get device compass heading and orientation
 * Returns heading in degrees (0-360) where 0 is North
 */
export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState({
    heading: null, // Compass direction (0-360)
    accuracy: null, // Accuracy in degrees
    isAvailable: false, // Whether device supports orientation
    error: null, // Error message if any
  });

  useEffect(() => {
    // Check if device supports orientation
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
      setOrientation(prev => ({
        ...prev,
        isAvailable: false,
        error: 'Device orientation not supported',
      }));
      return;
    }

    let isIOS = false;
    let permissionGranted = false;

    // Detect iOS devices
    if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
      isIOS = true;
    }

    // Request permission for iOS 13+
    const requestPermission = async () => {
      if (isIOS) {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          permissionGranted = permission === 'granted';

          if (!permissionGranted) {
            setOrientation(prev => ({
              ...prev,
              isAvailable: false,
              error: 'Orientation permission denied',
            }));
          }
        } catch (err) {
          console.error('Failed to request orientation permission', err);
          setOrientation(prev => ({
            ...prev,
            isAvailable: false,
            error: 'Failed to request orientation permission',
          }));
        }
      } else {
        permissionGranted = true;
      }
    };

    // Handle device orientation event
    const handleOrientation = (event) => {
      let heading = null;

      // For devices with compass (webkitCompassHeading for iOS)
      if (event.webkitCompassHeading !== undefined) {
        // iOS devices
        heading = event.webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Android and other devices
        // Alpha gives rotation around Z-axis (0-360)
        // We need to adjust based on screen orientation
        const alpha = event.alpha;

        // Calculate compass heading from alpha
        // Note: alpha gives clockwise rotation, we want compass bearing
        heading = 360 - alpha;

        // Adjust for device orientation (portrait vs landscape)
        if (typeof window.orientation !== 'undefined') {
          heading = (heading + window.orientation) % 360;
        }
      }

      // Accuracy estimation (lower is better)
      const accuracy = event.webkitCompassAccuracy || (event.alpha !== null ? 15 : null);

      if (heading !== null) {
        setOrientation({
          heading: Math.round(heading),
          accuracy: accuracy,
          isAvailable: true,
          error: null,
        });
      }
    };

    // Handle absolute orientation (more accurate on some devices)
    const handleAbsoluteOrientation = (event) => {
      if (event.absolute && event.alpha !== null) {
        handleOrientation(event);
      }
    };

    // Initialize
    const init = async () => {
      await requestPermission();

      if (permissionGranted || !isIOS) {
        // Listen to both events for maximum compatibility
        window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);

        setOrientation(prev => ({
          ...prev,
          isAvailable: true,
        }));
      }
    };

    init();

    // Cleanup
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  return orientation;
}

/**
 * Function to request orientation permission (call on user interaction)
 * Required for iOS 13+ devices
 */
export async function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting orientation permission:', error);
      return false;
    }
  }
  // Non-iOS devices don't need permission
  return true;
}
