/* REPLACE: sbu-map-frontend/src/App.jsx */
import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet'; // Import L
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { AddResourceForm } from './AddResourceForm';
import { CommunitySubmissions } from './CommunitySubmissions';
import { RotatingUserMarker } from './components/RotatingUserMarker';
import { LocateMeOverlay } from './components/LocateMeButton';
import { useDeviceOrientation, requestOrientationPermission } from './hooks/useDeviceOrientation';

//
// 1. === FIX FOR LOGO PATH ===
//
// Removed /public/ from the path so it works on deployed sites
//
import wolfieLogoUrl from '/wolfie-mascot.png?url';

//
// 2. === FIX FOR WOLFIE LOGO ===
//
// Use your new wolfie-mascot.png file from the /public folder
//
const wolfieIcon = new L.Icon({
  iconUrl: wolfieLogoUrl,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});
// --- (END OF LOGO FIX) ---

//
// 3. === FIX FOR MISSING BLUE PIN (USER LOCATION) ===
//
// Create a new icon instance for the default blue pin using Base64
// This avoids build path issues on the deployed site.
//
// blueIcon removed (not used) to avoid unused variable lint warnings
// --- (END OF BLUE PIN FIX) ---


// API & Map Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const GRAPHHOPPER_KEY = import.meta.env.VITE_GRAPHHOPPER_API_KEY;
const GRAPHHOPPER_URL = 'https://graphhopper.com/api/1/route';
const STONY_BROOK_CENTER = [40.914, -73.123];

const CATEGORY_LIST = [
  {
    group: 'Indoor',
    items: [
      'printer', 'drinking_water_filler', 'toilets', 'computer_labs', 'pantry',
      'game_room', 'gender_neutral_bathrooms', 'parking_service_desk',
      'id_card_desk', 'charging_spots', 'vending_machine', 'study_room',
      'elevator', 'cafeteria', 'information_desk', 'book_return', 'quiet_study',
      'group_study_room', 'ballroom', 'food'
    ],
  },
  {
    group: 'Outdoor',
    items: [
      'bench', 'bus_stops', 'food_trucks', 'restaurants', 'gym',
      'photographic_spots', 'bike_rack', 'garden_area'
    ],
  },
];

// Map click component to get coordinates
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function App() {
  const {
    loginWithRedirect,
    logout,
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth0();
  const [myLocation, setMyLocation] = useState(null);
  // Compass orientation hook
  const { heading, accuracy } = useDeviceOrientation();
  const [closestResult, setClosestResult] = useState(null);
  const [routeLayer, setRouteLayer] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(STONY_BROOK_CENTER);
  const mapRef = useRef();
  const [submissionPin, setSubmissionPin] = useState(null);
  const [submissionCount, setSubmissionCount] = useState(0); // To refresh submissions list
  const [selectedCategory, setSelectedCategory] = useState('printer');
  const [orientationPermissionRequested, setOrientationPermissionRequested] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isAuthLoading, isAuthenticated, loginWithRedirect]);

  const clearRoute = () => {
    if (routeLayer && mapRef.current) {
      mapRef.current.removeLayer(routeLayer);
    }
    setRouteLayer(null);
    setRouteDetails(null);
  };

  function formatDuration(timeInMillis) {
    const totalMinutes = Math.round(timeInMillis / 60000);
    if (totalMinutes < 1) return '< 1 min';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  }

  const calculateRoute = async (start, end) => {
    const url = `${GRAPHHOPPER_URL}?point=${start.lat},${start.lon}&point=${end.lat},${end.lon}&profile=foot&locale=en&points_encoded=false&key=${GRAPHHOPPER_KEY}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
      const data = await response.json();

      if (data.paths && data.paths.length > 0) {
        processRoute(data.paths[0]);
      } else {
        throw new Error('No route found');
      }
    } catch (err) {
      console.error('Error calculating route:', err);
      setError(`Error: Could not calculate walking route.`);
    }
  };

  const processRoute = (path) => {
    const latLngs = path.points.coordinates.map(coord => [coord[1], coord[0]]);
    clearRoute();
    const routeLine = L.polyline(latLngs, {
      color: '#AE0000',
      weight: 6,
      opacity: 0.8,
      lineJoin: 'round',
    }).addTo(mapRef.current);
    mapRef.current.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

    const distanceKm = (path.distance / 1000).toFixed(2);
    const durationStr = formatDuration(path.time);
    setRouteDetails({ distance: distanceKm, duration: durationStr });
    setRouteLayer(routeLine);
  };

  const handleFindNearest = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported. Please enable it in your browser.');
      return;
    }
    // Request orientation permission on first find (iOS requires user gesture)
    if (!orientationPermissionRequested) {
      requestOrientationPermission().then((granted) => {
        setOrientationPermissionRequested(true);
        if (!granted) {
          setError('Compass orientation permission denied. Marker will not rotate.');
          setTimeout(() => setError(null), 3500);
        }
      });
    }
    setIsLoading(true);
    setError(null);
    setClosestResult(null);
    clearRoute();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userCoords = { lat: latitude, lon: longitude };
        setMyLocation(userCoords);
        const userLatLng = [latitude, longitude];
        setMapCenter(userLatLng);
        if (mapRef.current) {
          mapRef.current.flyTo(userLatLng, 16);
        }

        axios.get(`${API_BASE_URL}/api/find-closest`, {
          params: { category: selectedCategory, lat: latitude, lon: longitude },
        })
          .then(response => {
            const result = response.data;
            setClosestResult(result);
            const resourceLocation = result.location;

            if (resourceLocation && resourceLocation.lat && resourceLocation.lon) {
              if (mapRef.current) {
                mapRef.current.flyTo([resourceLocation.lat, resourceLocation.lon], 17);
              }
              calculateRoute(userCoords, resourceLocation);
            } else {
              console.error('Resource found but it has no location data.', result);
              setError(`Found ${selectedCategory} but it has no location data.`);
            }
            setIsLoading(false);
          })
          .catch(err => {
            console.error('Error finding resource:', err);
            const errorMsg = err.response ? err.response.data.error : 'Network error';
            if (err.response && err.response.status === 404) {
              setError(`No verified ${selectedCategory.replace(/_/g, ' ')}s found near you. Try submitting one!`);
            } else {
              setError(errorMsg);
            }
            setIsLoading(false);
          });
      },
      () => {
        setError('Unable to retrieve your location. Please allow location access.');
        setIsLoading(false);
      }
    );
  };

  const handleUseMyLocationForSubmission = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setError(null);
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSubmissionPin({ lat: latitude, lng: longitude });
        setMyLocation({ lat: latitude, lon: longitude }); // Also update myLocation
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 17);
        }
        setIsLoading(false);
      },
      () => {
        setError('Unable to retrieve your location. Please allow location access.');
        setIsLoading(false);
      }
    );
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMyLocation({ lat: latitude, lon: longitude });
        const latlng = [latitude, longitude];
        setMapCenter(latlng);
        if (mapRef.current) mapRef.current.flyTo(latlng, 16);
        setIsLocatingUser(false);
      },
      () => {
        setError('Unable to retrieve your location. Please allow location access.');
        setIsLocatingUser(false);
        setTimeout(() => setError(null), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Mobile-visible handler to request compass/orientation permission explicitly
  const handleEnableCompass = async () => {
    if (!orientationPermissionRequested) {
      try {
        const granted = await requestOrientationPermission();
        setOrientationPermissionRequested(true);
        if (granted) {
          setError('Compass enabled — marker will rotate when available.');
        } else {
          setError('Compass permission denied. Marker will not rotate.');
        }
      } catch (err) {
        console.error('Error requesting compass permission', err);
        setError('Could not request compass permission.');
      }
      setTimeout(() => setError(null), 3500);
    } else {
      setError('Compass permission already requested.');
      setTimeout(() => setError(null), 1800);
    }
  };

  if (isAuthLoading || !isAuthenticated) {
    return <div className="loading-app">Loading Application...</div>;
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1 className="app-title">
          <img src={wolfieLogoUrl} alt="WolfieFind Logo" />
          WolfieFind
        </h1>
        <div className="auth-controls">
          <span>Hello, {user.name}</span>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Log Out
          </button>
          {/* Mobile-only explicit compass permission button */}
          <button
            className="enable-compass-mobile button-primary"
            onClick={handleEnableCompass}
            aria-label="Enable compass orientation"
            type="button"
          >
            Enable Compass
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="map-column">
          <MapContainer
            ref={mapRef}
            center={mapCenter}
            zoom={15}
            className="map-container"
          >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapClickHandler onMapClick={setSubmissionPin} />
          
          {/* User location marker — now rotating if device provides heading */}
          {myLocation && (
            <RotatingUserMarker position={[myLocation.lat, myLocation.lon]} heading={heading} accuracy={accuracy} style="arrow" />
          )}

          {closestResult && closestResult.location && (
            <Marker
              position={[closestResult.location.lat, closestResult.location.lon]}
              icon={wolfieIcon} // This uses your PNG file
            >
              <Popup>
                <b style={{ textTransform: 'capitalize' }}>
                  {closestResult.resource.category.replace(/_/g, ' ')}
                </b>
                <br />
                {closestResult.resource.description || closestResult.resource.name}
                <br />
                <span style={{ fontSize: '0.9em', color: '#555' }}>
                  {closestResult.resource.building?.name || 'Outdoor Location'}
                  <br />
                  ~{closestResult.distance.toFixed(2)} km away
                </span>
              </Popup>
            </Marker>
          )}
          {submissionPin && (
            <Marker
              position={submissionPin}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  setSubmissionPin(e.target.getLatLng());
                },
              }}
            >
              <Popup>New Submission Location</Popup>
            </Marker>
          )}
          </MapContainer>

          {/* Floating locate button overlay (absolute inside .map-column) */}
          <LocateMeOverlay onClick={handleLocateMe} isActive={!!myLocation} isLoading={isLocatingUser} />
        </div>

        <div className="sidebar-column">
          {error && <p className="error-message">{error}</p>}

          <div className="card search-card">
            <div className="form-group">
              <label htmlFor="category-select">Find nearest:</label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {CATEGORY_LIST.map((group) => (
                  <optgroup label={group.group} key={group.group}>
                    {group.items.map((item) => (
                      <option key={item} value={item}>
                        {item.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <button
              onClick={handleFindNearest}
              disabled={isLoading}
              className="button-primary"
            >
              {isLoading ? 'Finding...' : 'Find & Show Path'}
            </button>
          </div>

          {closestResult && (
            <div className="card results-card">
              <h3>
                Closest {selectedCategory.replace(/_/g, ' ')} Found!
              </h3>
              <p>
                <b>Location:</b> {closestResult.resource.building?.name || closestResult.resource.name}
              </p>
              <p>
                <b>Description:</b> {closestResult.resource.description || 'N/A'}
              </p>
              <p>
                <b>Distance (as crow flies):</b> {closestResult.distance.toFixed(2)} km (to {closestResult.resource.building ? 'entrance' : 'location'})
              </p>
              {routeDetails && (
                <div className="route-details">
                  <p className="route-success">Route path is now shown on the map!</p>
                  <p>
                    <b>Walk Distance:</b> {routeDetails.distance} km
                  </p>
                  <p>
                    <b>Est. Walk Time:</b> {routeDetails.duration}
                  </p>
                </div>
              )}
            </div>
          )}

          <AddResourceForm
            location={submissionPin}
            onUseMyLocation={handleUseMyLocationForSubmission}
            onSubmissionSuccess={() => {
              setSubmissionPin(null);
              setSubmissionCount(c => c + 1); // Trigger refresh
            }}
          />

          <CommunitySubmissions key={submissionCount} />
        </div>
      </div>
    </div>
  );
}

export default App;