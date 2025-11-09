import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for continuous real-time location tracking
 * Updates position as user moves (like Google Maps)
 */
export function useContinuousLocation(options = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    distanceFilter = 5, // Minimum meters to trigger update
    autoStart = false,
  } = options;

  const [location, setLocation] = useState({
    position: null,
    accuracy: null,
    speed: null,
    heading: null,
    timestamp: null,
    isTracking: false,
    error: null,
  });

  const watchIdRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastPositionRef = useRef(null);

  // Haversine distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const toRad = (d) => d * Math.PI / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handlePositionUpdate = useCallback((position) => {
    if (!isMountedRef.current) return;

    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const newPosition = { lat: latitude, lon: longitude };

    if (lastPositionRef.current && distanceFilter > 0) {
      const distance = calculateDistance(
        lastPositionRef.current.lat,
        lastPositionRef.current.lon,
        latitude,
        longitude
      );

      if (distance < distanceFilter) {
        console.log(`[Location] Skipped update: ${distance.toFixed(1)}m < ${distanceFilter}m`);
        return;
      }
      console.log(`[Location] Update: moved ${distance.toFixed(1)}m`);
    }

    lastPositionRef.current = newPosition;

    setLocation({
      position: newPosition,
      accuracy: accuracy,
      speed: speed,
      heading: heading,
      timestamp: new Date(position.timestamp),
      isTracking: true,
      error: null,
    });
  }, [distanceFilter]);

  const handleError = useCallback((error) => {
    if (!isMountedRef.current) return;
    console.error('[Location] Error:', error.message);
    let errorMessage = 'Location error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timeout';
        break;
      default:
        break;
    }

    setLocation(prev => ({ ...prev, error: errorMessage, isTracking: false }));
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation not supported', isTracking: false }));
      return false;
    }

    if (watchIdRef.current !== null) {
      console.log('[Location] Already tracking, ignoring start request');
      return true;
    }

    console.log('[Location] Starting continuous tracking...');

    const geoOptions = { enableHighAccuracy, timeout, maximumAge };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handleError,
      geoOptions
    );

    setLocation(prev => ({ ...prev, isTracking: true, error: null }));
    console.log('[Location] Tracking started with watchId:', watchIdRef.current);
    return true;
  }, [enableHighAccuracy, timeout, maximumAge, handlePositionUpdate, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log('[Location] Stopping tracking, watchId:', watchIdRef.current);
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      lastPositionRef.current = null;
      setLocation(prev => ({ ...prev, isTracking: false }));
    }
  }, []);

  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const newPosition = { lat: latitude, lon: longitude };
          setLocation(prev => ({ ...prev, position: newPosition, accuracy, timestamp: new Date(position.timestamp), error: null }));
          resolve(newPosition);
        },
        (error) => {
          handleError(error);
          reject(error);
        },
        { enableHighAccuracy, timeout, maximumAge }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, handleError]);

  useEffect(() => {
    if (autoStart) startTracking();
    return () => {
      isMountedRef.current = false;
      stopTracking();
    };
  }, [autoStart, startTracking, stopTracking]);

  return {
    ...location,
    startTracking,
    stopTracking,
    getCurrentPosition,
  };
}

export function useCurrentLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return Promise.reject(new Error('Not supported'));
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy };
          setLocation(pos);
          setIsLoading(false);
          resolve(pos);
        },
        (err) => {
          setError(err.message);
          setIsLoading(false);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  return { location, error, isLoading, getLocation };
}
