// REPLACE: sbu-map-frontend/src/App.jsx

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css'; // <-- Import our new CSS

// Import the new logo
import logoSvg from './assets/logo.svg'; 

// Components
import { Submissions } from './Submissions.jsx';
import { NewSubmissionForm } from './NewSubmissionForm.jsx';

// Fix for default Leaflet icon
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- GraphHopper API Configuration ---
const GRAPHHOPPER_API_KEY = import.meta.env.VITE_GRAPHHOPPER_API_KEY;
const GRAPHHOPPER_API_URL = 'https://graphhopper.com/api/1/route';

// Stony Brook University coordinates
const SBU_CENTER = [40.914, -73.123];

// --- Category Definitions ---
const INDOOR_CATEGORIES = [
  'printer', 'drinking_water_filler', 'toilets', 'computer_labs', 'pantry',
  'game_room', 'gender_neutral_bathrooms', 'parking_service_desk',
  'id_card_desk', 'charging_spots', 'vending_machine'
];
const OUTDOOR_CATEGORIES = [
  'bench', 'bus_stops', 'foodtruck_locations', 'restaurants',
  'gym', 'photographic_spots'
];
const ALL_CATEGORIES = [
  { group: "Indoor", items: INDOOR_CATEGORIES },
  { group: "Outdoor", items: OUTDOOR_CATEGORIES }
];
// ---

// Map Click Handler Component
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

  const [userLocation, setUserLocation] = useState(null);
  const [closestResource, setClosestResource] = useState(null);
  const [routeLine, setRouteLine] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(SBU_CENTER);
  const mapRef = useRef();
  const [newSubmissionLocation, setNewSubmissionLocation] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(0);
  const [searchCategory, setSearchCategory] = useState('vending_machine'); // Default to vending machine

  // Auth useEffect
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isAuthLoading, isAuthenticated, loginWithRedirect]);

  const clearRoute = () => {
    if (routeLine && mapRef.current) {
      mapRef.current.removeLayer(routeLine);
    }
    setRouteLine(null);
    setRouteDetails(null);
  };

  function formatDuration(milliseconds) {
    const totalMinutes = Math.round(milliseconds / 60000);
    if (totalMinutes < 1) return "< 1 min";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} min`;
    }
  }

  const calculateGraphHopperRoute = async (start, end) => {
    const url = `${GRAPHHOPPER_API_URL}?point=${start.lat},${start.lon}&point=${end.lat},${end.lon}&profile=foot&locale=en&points_encoded=false&key=${GRAPHHOPPER_API_KEY}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.paths && data.paths.length > 0) {
        displayGraphHopperRoute(data.paths[0]);
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setError('Error: Could not calculate walking route.');
    }
  };

  const displayGraphHopperRoute = (route) => {
    const coordinates = route.points.coordinates.map(coord => [coord[1], coord[0]]);
    clearRoute();

    const newRouteLine = L.polyline(coordinates, {
      color: '#AE0000', // SBU Red
      weight: 6,
      opacity: 0.8,
      lineJoin: 'round'
    }).addTo(mapRef.current);

    mapRef.current.fitBounds(newRouteLine.getBounds(), { padding: [50, 50] });

    const distance = (route.distance / 1000).toFixed(2); // Convert to km
    const duration = formatDuration(route.time);

    setRouteDetails({ distance, duration });
    setRouteLine(newRouteLine);
  };

  const findNearestResource = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported. Please enable it in your browser.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setClosestResource(null);
    clearRoute();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lon: longitude };
        setUserLocation(location);

        const newCenter = [latitude, longitude];
        setMapCenter(newCenter);
        if (mapRef.current) {
          mapRef.current.flyTo(newCenter, 16);
        }

        axios.get(`${import.meta.env.VITE_API_URL}/api/find-closest`, {
          params: {
            category: searchCategory,
            lat: latitude,
            lon: longitude
          }
        })
          .then(response => {
            const closest = response.data;
            setClosestResource(closest);
            
            const resourceLoc = closest.location;
            if (resourceLoc && resourceLoc.lat && resourceLoc.lon) {
              if (mapRef.current) {
                mapRef.current.flyTo([resourceLoc.lat, resourceLoc.lon], 17);
              }
              calculateGraphHopperRoute(location, resourceLoc);
            } else {
              console.error("Resource found but it has no location data.", closest);
              setError(`Found ${searchCategory} but it has no location data.`);
            }
            setIsLoading(false);
          })
          .catch(error => {
            console.error('Error finding resource:', error);
            const errorMsg = error.response ? error.response.data.error : 'Network error';
            if (error.response && error.response.status === 404) {
              setError(`No verified ${searchCategory}s found near you. Try submitting one!`);
            } else {
              setError(errorMsg);
            }
            setIsLoading(false);
          });
      },
      () => {
        setError("Unable to retrieve your location. Please allow location access.");
        setIsLoading(false);
      }
    );
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setError(null);
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const leafletLocation = { lat: latitude, lng: longitude };
        setNewSubmissionLocation(leafletLocation);
        setUserLocation({ lat: latitude, lon: longitude });
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 17);
        }
        setIsLoading(false);
      },
      () => {
        setError("Unable to retrieve your location. Please allow location access.");
        setIsLoading(false);
      }
    );
  };

  if (isAuthLoading || !isAuthenticated) {
    return <div>Loading Application...</div>;
  }

  return (
    <div className="app-container">
      
      <header className="app-header">
        <h1 className="app-title">
          <img src={logoSvg} alt="WolfieFind Logo" />
          WolfieFind
        </h1>
        <div className="auth-controls">
          <span>Hello, {user.name}</span>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Log Out
          </button>
        </div>
      </header>

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
        <MapClickHandler onMapClick={setNewSubmissionLocation} />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lon]}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {closestResource && closestResource.location && (
          <Marker position={[closestResource.location.lat, closestResource.location.lon]}>
            <Popup>
              <b style={{ textTransform: 'capitalize' }}>
                {closestResource.resource.category.replace(/_/g, ' ')}
              </b>
              <br />
              {closestResource.resource.description || closestResource.resource.name}
              <br />
              <span style={{ fontSize: '0.9em', color: '#555' }}>
                {closestResource.resource.building?.name || 'Outdoor Location'}
                <br />
                ~{closestResource.distance.toFixed(2)} km away
              </span>
            </Popup>
          </Marker>
        )}

        {newSubmissionLocation && (
          <Marker
            position={newSubmissionLocation}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                setNewSubmissionLocation(e.target.getLatLng());
              },
            }}
          >
            <Popup>New Submission Location</Popup>
          </Marker>
        )}
      </MapContainer>

      {error && (
        <p className="error-message">{error}</p>
      )}

      <div className="card search-card">
        <div className="form-group">
          <label htmlFor="category-select">Find nearest:</label>
          <select
            id="category-select"
            value={searchCategory}
            onChange={e => setSearchCategory(e.target.value)}
          >
            {ALL_CATEGORIES.map(group => (
              <optgroup label={group.group} key={group.group}>
                {group.items.map(item => (
                  <option key={item} value={item}>
                    {item.replace(/_/g, ' ')}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="other">Other</option>
          </select>
        </div>

        <button onClick={findNearestResource} disabled={isLoading} className="button-primary">
          {isLoading ? 'Finding...' : `Find & Show Path`}
        </button>
      </div>

      {closestResource && (
        <div className="card results-card">
          <h3>Closest {searchCategory.replace(/_/g, ' ')} Found!</h3>
          <p><b>Location:</b> {closestResource.resource.building?.name || closestResource.resource.name}</p>
          <p><b>Description:</b> {closestResource.resource.description || 'N/A'}</p>
          <p><b>Distance (as crow flies):</b> {closestResource.distance.toFixed(2)} km (to {closestResource.resource.building ? 'entrance' : 'location'})</p>

          {routeDetails && (
            <div className="route-details">
              <p className="route-success">Route path is now shown on the map!</p>
              <p><b>Walk Distance:</b> {routeDetails.distance} km</p>
              <p><b>Est. Walk Time:</b> {routeDetails.duration}</p>
            </div>
          )}
        </div>
      )}

      <NewSubmissionForm
        location={newSubmissionLocation}
        onUseMyLocation={handleUseMyLocation}
        onSubmissionSuccess={() => {
          setNewSubmissionLocation(null);
          setSubmissionSuccess(c => c + 1);
        }}
      />
      <Submissions key={submissionSuccess} />
    </div>
  );
}

export default App;