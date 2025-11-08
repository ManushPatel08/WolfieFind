import { Submissions } from './Submissions.jsx';
import { NewSubmissionForm } from './NewSubmissionForm.jsx';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'; // GeoJSON removed
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;
// ---

// --- GraphHopper API Configuration ---
const GRAPHHOPPER_API_KEY = '937d08ae-17e2-4a0d-8360-e3a5e90321ff';
const GRAPHHOPPER_API_URL = 'https://graphhopper.com/api/1/route';
// ---

// Stony Brook University coordinates
const SBU_CENTER = [40.914, -73.123];

// --- Category Definitions ---
const INDOOR_CATEGORIES = [
  'printer', 'drinking_water_filler', 'toilets', 'computer_labs', 'pantry',
  'game_room', 'gender_neutral_bathrooms', 'parking_service_desk',
  'id_card_desk', 'charging_spots', 'vending_machine' // <-- ADDED
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

// --- REMOVED RoutePath Component ---

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
  
  // --- NEW GraphHopper State ---
  const [routeLine, setRouteLine] = useState(null); // This will hold the Leaflet polyline layer
  const [routeDetails, setRouteDetails] = useState(null); // { distance, duration }
  // ---
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(SBU_CENTER);
  const mapRef = useRef();
  const [newSubmissionLocation, setNewSubmissionLocation] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(0);
  const [searchCategory, setSearchCategory] = useState('printer');

  // Auth useEffect
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isAuthLoading, isAuthenticated, loginWithRedirect]);

  // --- NEW: Helper function to clear the route ---
  const clearRoute = () => {
    if (routeLine && mapRef.current) {
      mapRef.current.removeLayer(routeLine);
    }
    setRouteLine(null);
    setRouteDetails(null);
  };

  // --- NEW: Format duration (milliseconds to human-readable) ---
  function formatDuration(milliseconds) {
    const totalMinutes = Math.round(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // --- NEW: Calculate route using GraphHopper API ---
  const calculateGraphHopperRoute = async (start, end) => {
    // start and end are { lat, lon }
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
      setError('Error: Could not calculate route');
    }
  };

  // --- NEW: Display route on map ---
  const displayGraphHopperRoute = (route) => {
    // Extract coordinates (GraphHopper returns [lng, lat], Leaflet needs [lat, lng])
    const coordinates = route.points.coordinates.map(coord => [coord[1], coord[0]]);
    
    // Clear previous route
    clearRoute();
    
    const newRouteLine = L.polyline(coordinates, {
      color: '#0000FF', // Blue
      weight: 5,
      opacity: 0.7,
      lineJoin: 'round'
    }).addTo(mapRef.current);
    
    // Fit map to show entire route
    mapRef.current.fitBounds(newRouteLine.getBounds(), { padding: [50, 50] });
    
    // Update info panel
    const distance = (route.distance / 1000).toFixed(2); // Convert to km
    const duration = formatDuration(route.time);
    
    setRouteDetails({ distance, duration });
    setRouteLine(newRouteLine); // Save the layer to state
  };

  // findNearestResource function
  const findNearestResource = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    setError(null);
    setClosestResource(null);
    clearRoute(); // Clear old route

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

        console.log('User location:', location);

        // 1. Find the closest resource
        axios.get('http://localhost:3001/api/find-closest', {
          params: {
            category: searchCategory,
            lat: latitude,
            lon: longitude
          }
        })
          .then(response => {
            const closest = response.data;
            setClosestResource(closest);
            console.log(`Found closest ${searchCategory}:`, closest);

            const resourceLoc = closest.location; // This is the entrance or outdoor spot
            if (mapRef.current) {
              mapRef.current.flyTo([resourceLoc.lat, resourceLoc.lon], 17);
            }

            // --- THIS IS THE CHANGE ---
            // 2. Get the path using GraphHopper
            //    Pass user location (start) and resource location (end)
            calculateGraphHopperRoute(location, resourceLoc);
            setIsLoading(false);
            // --- END OF CHANGE ---
          })
          .catch(error => {
            // This catch block now only handles errors from find-closest
            console.error('Error finding resource:', error);
            const errorMsg = error.response ? error.response.data.error : 'Network error';
            
            if (error.response && error.response.status === 404) {
              setError(`No verified ${searchCategory}s found near you.`);
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

  // handleUseMyLocation function
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

  // --- Main App UI ---
  return (
    <div style={{ padding: '20px', textAlign: 'left' }}>

      {/* Auth Header */}
      <div style={{ float: 'right' }}>
        <span>Hello, {user.name}</span>
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
          Log Out
        </button>
      </div>

      <h1>WolfieFind</h1>

      {/* MapContainer */}
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={15}
        style={{ height: '600px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* --- REMOVED <RoutePath /> --- */}
        <MapClickHandler onMapClick={setNewSubmissionLocation} />
        
        {/* User Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lon]}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {/* Closest Resource Marker (Popup updated) */}
        {closestResource && (
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

        {/* New Submission Marker */}
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

      {/* Category Selector Dropdown */}
      <div style={{ marginTop: '10px' }}>
        <label htmlFor="category-select">Find nearest: </label>
        <select
          id="category-select"
          value={searchCategory}
          onChange={e => setSearchCategory(e.target.value)}
          style={{ marginRight: '10px' }}
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

        {/* Dynamic Button */}
        <button onClick={findNearestResource} disabled={isLoading}>
          {isLoading ? 'Finding...' : `Find Nearest ${searchCategory.replace(/_/g, ' ')} & Show Path`}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <p style={{ color: 'red' }}>Error: {error}</p>
      )}

      {/* --- MODIFIED RESULTS BOX (for GraphHopper) --- */}
      {closestResource && (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <h3>Closest {searchCategory.replace(/_/g, ' ')} Found!</h3>
          <p><b>{closestResource.resource.building?.name || closestResource.resource.name}</b></p>
          <p><b>Description:</b> {closestResource.resource.description || 'N/A'}</p>
          <p><b>Distance (as crow flies):</b> {closestResource.distance.toFixed(2)} km away (to {closestResource.resource.building ? 'entrance' : 'location'})</p>
          
          {/* New Route Details */}
          {routeDetails && (
            <>
              <p style={{ color: 'blue' }}>Route path is now shown on the map!</p>
              <p><b>Walk Distance:</b> {routeDetails.distance} km</p>
              <p><b>Est. Walk Time:</b> {routeDetails.duration}</p>
            </>
          )}
        </div>
      )}
      {/* --- END OF MODIFIED RESULTS BOX --- */}

      {/* Forms and Submissions */}
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