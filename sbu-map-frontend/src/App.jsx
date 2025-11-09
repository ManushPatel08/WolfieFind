import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { AddResourceForm } from './AddResourceForm';
import { CommunitySubmissions } from './CommunitySubmissions';
import { RotatingUserMarker } from './components/RotatingUserMarker';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import { useContinuousLocation } from './hooks/useContinuousLocation';
import { LocateMeOverlay, LocateMeButton } from './components/LocateMeButton';
import './index.css';

const wolfieLogoBase64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8cGF0aCBkPSJNNTAgMEMyNi44NiAwIDggMTguODYgOCA0MkM4IDY0LjkyIDQxLjg2IDk0LjkgNDYuMTYgOTguODRDNDguMTIgMTAwLjYgNTAuODggMTAwLjYgNTIuODQgOTguODRDNTcuMTQgOTQuOSA5MiA2NC45MiA5MiA0MkM5MiAxOC44NiA3My4xNCAwIDUwIDBaTTUwIDYwQzM4Ljk2IDYwIDMwIDUxLjA0IDMwIDQwQzMwIDI4Ljk2IDM4Ljk2IDIwIDUwIDIwQzYxLjA0IDIwIDcwIDI4Ljk2IDcwIDQwQzcwIDUxLjA0IDYxLjA0IDYwIDUwIDYwWiIgZmlsbD0iI0FFMDAwMCIvPg0KICA8dGV4dCB4PSI1MCIgeT0iNDgiIGZvbnQtZmFtaWx5PSJWZXJkYW5hLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPlc8L3RleHQ+DQo8L3N2Zz4=";

const wolfieIcon = new L.Icon({
  iconUrl: wolfieLogoBase64,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const GRAPHHOPPER_KEY = import.meta.env.VITE_GRAPHHOPPER_API_KEY;
const GRAPHHOPPER_URL = 'https://graphhopper.com/api/1/route';
const STONY_BROOK_CENTER = [40.914, -73.123];

const CATEGORY_LIST = [
  { group: 'Indoor', items: ['printer', 'drinking_water_filler', 'toilets', 'computer_labs', 'pantry', 'game_room', 'gender_neutral_bathrooms', 'parking_service_desk', 'id_card_desk', 'charging_spots', 'vending_machine', 'study_room', 'elevator', 'cafeteria', 'information_desk', 'book_return', 'quiet_study', 'group_study_room', 'ballroom', 'food'] },
  { group: 'Outdoor', items: ['bench', 'bus_stops', 'food_trucks', 'restaurants', 'gym', 'photographic_spots', 'bike_rack', 'garden_area'] },
];

function MapClickHandler({ onMapClick }) { useMapEvents({ click(e) { onMapClick(e.latlng); } }); return null; }

function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center && zoom) map.setView(center, zoom, { animate: true, duration: 1 }); }, [center, zoom, map]);
  return null;
}

function App() {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading: isAuthLoading } = useAuth0();

  // Continuous location tracking
  const {
    position: myLocation,
    accuracy: locationAccuracy,
    speed,
    isTracking,
    startTracking,
    stopTracking,
    error: locationError
  } = useContinuousLocation({ enableHighAccuracy: true, distanceFilter: 3, autoStart: false });

  // Compass orientation
  const { heading, accuracy: compassAccuracy, startCompass, stopCompass } = useDeviceOrientation();

  const [closestResult, setClosestResult] = useState(null);
  const [routeLayer, setRouteLayer] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(STONY_BROOK_CENTER);
  const [mapZoom, setMapZoom] = useState(15);
  const [followUser, setFollowUser] = useState(true);
  const mapRef = useRef();
  const [submissionPin, setSubmissionPin] = useState(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('printer');
  const [compassEnabled, setCompassEnabled] = useState(false);
  const userSessionId = useRef(user?.sub || `user-${Date.now()}`);

  useEffect(() => { if (!isAuthLoading && !isAuthenticated) loginWithRedirect(); }, [isAuthLoading, isAuthenticated, loginWithRedirect]);

  useEffect(() => {
    if (myLocation && followUser && isTracking) {
      setMapCenter([myLocation.lat, myLocation.lon]);
      console.log('[App] Location updated:', myLocation);
    }
  }, [myLocation, followUser, isTracking]);

  useEffect(() => {
    return () => { stopTracking(); stopCompass(); };
  }, [stopTracking, stopCompass]);

  const clearRoute = () => {
    if (routeLayer && mapRef.current) mapRef.current.removeLayer(routeLayer);
    setRouteLayer(null); setRouteDetails(null);
  };

  const formatDuration = (timeInMillis) => {
    const totalMinutes = Math.round(timeInMillis / 60000);
    if (totalMinutes < 1) return '< 1 min';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  };

  const calculateRoute = async (start, end) => {
    const url = `${GRAPHHOPPER_URL}?point=${start.lat},${start.lon}&point=${end.lat},${end.lon}&profile=foot&locale=en&points_encoded=false&key=${GRAPHHOPPER_KEY}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Route API error');
      const data = await response.json();
      if (data.paths && data.paths.length > 0) processRoute(data.paths[0]);
    } catch (err) {
      console.error('Route error:', err); setError('Could not calculate route.'); setTimeout(() => setError(null), 3000);
    }
  };

  const processRoute = (path) => {
    const latLngs = path.points.coordinates.map(coord => [coord[1], coord[0]]);
    clearRoute();
    const routeLine = L.polyline(latLngs, { color: '#AE0000', weight: 6, opacity: 0.85, lineJoin: 'round', lineCap: 'round' }).addTo(mapRef.current);
    if (!followUser) mapRef.current.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    setRouteDetails({ distance: (path.distance / 1000).toFixed(2), duration: formatDuration(path.time) });
    setRouteLayer(routeLine);
  };

  const handleToggleTracking = async () => {
    if (isTracking) {
      stopTracking(); stopCompass(); setCompassEnabled(false); setFollowUser(false); console.log('[App] Tracking stopped');
    } else {
      setError(null);
      const trackingStarted = startTracking();
      if (trackingStarted) {
        setFollowUser(true); console.log('[App] Tracking started');
        const compassStarted = await startCompass();
        if (compassStarted) { setCompassEnabled(true); console.log('[App] Compass enabled'); }
      } else { setError('Could not start location tracking.'); setTimeout(() => setError(null), 3000); }
    }
  };

  const handleFindNearest = async () => {
    if (!myLocation) {
      if (!isTracking) { await handleToggleTracking(); setTimeout(() => performSearch(), 1000); }
      return;
    }
    performSearch();
  };

  const performSearch = () => {
    if (!myLocation) { setError('Waiting for location...'); return; }
    setIsLoading(true); setError(null); setClosestResult(null); clearRoute();
    const userCoords = { lat: myLocation.lat, lon: myLocation.lon };

    axios.get(`${API_URL}/find-closest`, { params: { category: selectedCategory, lat: myLocation.lat, lon: myLocation.lon } })
      .then(response => {
        const result = response.data; setClosestResult(result); const resourceLocation = result.location;
        if (resourceLocation?.lat && resourceLocation?.lon) { setFollowUser(false); setMapCenter([resourceLocation.lat, resourceLocation.lon]); setMapZoom(17); calculateRoute(userCoords, resourceLocation); }
        setIsLoading(false);
      })
      .catch(err => { setError(err.response?.data?.error || 'Error finding resource'); setTimeout(() => setError(null), 5000); setIsLoading(false); });
  };

  if (isAuthLoading || !isAuthenticated) return <div className="loading-app">Loading WolfieFind</div>;

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1 className="app-title"><img src={wolfieLogoBase64} alt="WolfieFind" /><span>WolfieFind</span></h1>
        <div className="auth-controls">
          {isTracking && (<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', background: 'var(--accent-success)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: '600', animation: 'pulse 2s infinite' }}><span>📍</span><span>Live</span></div>)}
          {compassEnabled && heading !== null && (<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}><span>🧭</span><span>{Math.round(heading)}°</span></div>)}
          <span title={user.name}>👋 {user.name?.split(' ')[0] || user.name}</span>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} className="btn-secondary">Sign Out</button>
        </div>
      </header>

      <div className="main-content">
        <div className="map-column" style={{ position: 'relative' }}>
          <MapContainer ref={mapRef} center={mapCenter} zoom={mapZoom} className="map-container" zoomControl={true} scrollWheelZoom touchZoom dragging tap minZoom={13} maxZoom={18}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            {followUser && <RecenterMap center={mapCenter} zoom={mapZoom} />}
            <MapClickHandler onMapClick={setSubmissionPin} />

            {myLocation && (
              <>
                {compassEnabled ? (
                  <RotatingUserMarker position={[myLocation.lat, myLocation.lon]} heading={heading} accuracy={compassAccuracy} userId={userSessionId.current} showAccuracy={true} />
                ) : (
                  <Marker position={[myLocation.lat, myLocation.lon]}>
                    <Popup>
                      <strong>📍 You</strong>
                      {locationAccuracy && (<><br /><small>±{Math.round(locationAccuracy)}m</small></>)}
                      {speed && speed > 0.5 && (<><br /><small>🚶 {(speed * 3.6).toFixed(1)} km/h</small></>)}
                    </Popup>
                  </Marker>
                )}
                {locationAccuracy && locationAccuracy < 100 && (<Circle center={[myLocation.lat, myLocation.lon]} radius={locationAccuracy} pathOptions={{ fillColor: '#4285f4', fillOpacity: 0.1, color: '#4285f4', weight: 1, opacity: 0.3 }} />)}
              </>
            )}

            {closestResult?.location && (<Marker position={[closestResult.location.lat, closestResult.location.lon]} icon={wolfieIcon}><Popup><strong style={{ color: '#AE0000', textTransform: 'capitalize' }}>{closestResult.resource.category.replace(/_/g, ' ')}</strong><br />{closestResult.resource.building?.name || 'Outdoor'}<br /><small>~{closestResult.distance.toFixed(2)} km</small></Popup></Marker>)}

            {submissionPin && (<Marker position={submissionPin} draggable={true} eventHandlers={{ dragend: (e) => setSubmissionPin(e.target.getLatLng()) }}><Popup><strong>📌 New</strong></Popup></Marker>)}
          </MapContainer>

          <LocateMeOverlay onClick={handleToggleTracking} isActive={isTracking} isLoading={false} />
          <LocateMeButton onLocate={handleToggleTracking} isActive={isTracking} />

          {myLocation && !followUser && (<button onClick={() => { setFollowUser(true); setMapCenter([myLocation.lat, myLocation.lon]); setMapZoom(17); }} style={{ position: 'absolute', bottom: '80px', right: '20px', zIndex: 1000, width: '48px', height: '48px', borderRadius: '50%', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-md)', fontSize: '24px', padding: 0, cursor: 'pointer' }} title="Re-center on my location">🎯</button>)}
        </div>

        <div className="sidebar-column">
          {error && <p className="error-message">{error}</p>}
          {locationError && <p className="error-message">{locationError}</p>}

          {isTracking && (<div style={{ padding: '0.875rem', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="pulse-dot" style={{ width: '8px', height: '8px', background: 'var(--accent-success)', borderRadius: '50%', animation: 'pulse 2s infinite' }}></span><span><strong>Live Tracking Active</strong>{locationAccuracy && ` • ±${Math.round(locationAccuracy)}m`}{speed && speed > 0.5 && ` • ${(speed * 3.6).toFixed(1)} km/h`}</span></div>)}

          <div className="card">
            <h2>🔍 Find</h2>
            <div className="form-group">
              <label htmlFor="category-select">Looking for:</label>
              <select id="category-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                {CATEGORY_LIST.map(g => (<optgroup label={g.group} key={g.group}>{g.items.map(i => <option key={i} value={i}>{i.replace(/_/g, ' ')}</option>)}</optgroup>))}
              </select>
            </div>
            <button onClick={handleFindNearest} disabled={isLoading} className="button-primary" style={{ width: '100%' }}>{isLoading ? '🔄 Finding...' : isTracking ? '🎯 Find Nearest' : '🎯 Enable & Find'}</button>
            {!isTracking && (<p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', fontStyle: 'italic', textAlign: 'center' }}>💡 Tip: Click the 📍 button to enable live tracking</p>)}
          </div>

          {closestResult && (<div className="card results-card"><h3>Found!</h3><p><b>📍</b> {closestResult.resource.building?.name || closestResult.resource.name}</p>{closestResult.resource.description && <p><b>ℹ</b> {closestResult.resource.description}</p>}<p><b>📏</b> {closestResult.distance.toFixed(2)} km</p>{routeDetails && (<div className="route-details"><p className="route-success">Route shown!</p><p><b>🚶</b> {routeDetails.distance} km</p><p><b>⏱</b> {routeDetails.duration}</p></div>)}</div>)}

          <AddResourceForm location={submissionPin} onUseMyLocation={() => { if (myLocation && isTracking) { setSubmissionPin({ lat: myLocation.lat, lng: myLocation.lon }); setMapCenter([myLocation.lat, myLocation.lon]); setMapZoom(17); } else { if (!navigator.geolocation) return; navigator.geolocation.getCurrentPosition((pos) => { setSubmissionPin({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setMapCenter([pos.coords.latitude, pos.coords.longitude]); setMapZoom(17); }); } }} onSubmissionSuccess={() => { setSubmissionPin(null); setSubmissionCount(c => c + 1); }} />

          <CommunitySubmissions key={submissionCount} />
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } }`}</style>
    </div>
  );
}

export default App;
