// C:\Users\dell\Desktop\WolfieFind\sbu-map-frontend\src\App.jsx
// (Updated file)

import { Submissions } from './Submissions.jsx';
import { NewSubmissionForm } from './NewSubmissionForm.jsx';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;
// ---

// Stony Brook University coordinates
const SBU_CENTER = [40.914, -73.123];


// Map Click Handler Component
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng); // e.latlng is { lat, lng }
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
  const [closestPrinter, setClosestPrinter] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(SBU_CENTER);
  const mapRef = useRef();
  const [newSubmissionLocation, setNewSubmissionLocation] = useState(null);

  // Auth useEffect (no changes)
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isAuthLoading, isAuthenticated, loginWithRedirect]);

  // findNearestPrinter function (no changes)
  const findNearestPrinter = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    setError(null);
    setClosestPrinter(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lon: longitude };
        setUserLocation(location); // This now holds {lat, lon}

        const newCenter = [latitude, longitude];
        setMapCenter(newCenter);
        if (mapRef.current) {
          mapRef.current.flyTo(newCenter, 16);
        }
        
        console.log('User location:', location);

        axios.get('http://localhost:3001/api/find-closest', {
          params: {
            category: 'printer',
            lat: latitude,
            lon: longitude
          }
        })
        .then(response => {
          setClosestPrinter(response.data);
          console.log('Found closest printer:', response.data);
          setIsLoading(false);
          
          const printerLoc = response.data.location;
          if (mapRef.current) {
            mapRef.current.flyTo([printerLoc.lat, printerLoc.lon], 17);
          }
        })
        .catch(error => {
          console.error('Error finding printer:', error);
          setError(error.response ? error.response.data.error : 'Network error');
          setIsLoading(false);
        });
      },
      () => {
        setError("Unable to retrieve your location. Please allow location access.");
        setIsLoading(false);
      }
    );
  };

  // --- THIS IS THE FIX ---
  // This function will now get the location itself
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    
    setError(null);
    setIsLoading(true); // Show loading feedback

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Convert {lat, lon} from GPS to {lat, lng} for Leaflet
        const leafletLocation = { lat: latitude, lng: longitude };
        
        setNewSubmissionLocation(leafletLocation);
        
        // Also update the main userLocation state
        setUserLocation({ lat: latitude, lon: longitude }); 
        
        // Fly map to that location
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
  // --- END OF FIX ---


  if (isAuthLoading || !isAuthenticated) {
    return <div>Loading Application...</div>;
  }

  // --- Main App UI ---
  return (
    <div style={{ padding: '20px', textAlign: 'left' }}>

      {/* Auth Header (no changes) */}
      <div style={{ float: 'right' }}>
        <span>Hello, {user.name}</span>
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
          Log Out
        </button>
      </div>

      <h1>WolfieFind</h1>

      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={15}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Map Click Handler (no changes) */}
        <MapClickHandler onMapClick={setNewSubmissionLocation} />

        {/* User Marker (no changes) */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lon]}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {/* Printer Marker (no changes) */}
        {closestPrinter && (
          <Marker position={[closestPrinter.location.lat, closestPrinter.location.lon]}>
            <Popup>
              <b>{closestPrinter.resource.name}</b><br />
              {closestPrinter.resource.description}<br />
              ~{closestPrinter.distance.toFixed(2)} km away
            </Popup>
          </Marker>
        )}

        {/* New Submission Marker (no changes) */}
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

      {/* Find Printer Button (no changes) */}
      <button onClick={findNearestPrinter} disabled={isLoading} style={{ marginTop: '10px' }}>
        {isLoading ? 'Finding...' : 'Find Nearest Printer'}
      </button>

      {/* Error Display (no changes) */}
      {error && (
        <p style={{ color: 'red' }}>Error: {error}</p>
      )}

      {/* Printer Results (no changes) */}
      {closestPrinter && (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <h3>Closest Printer Found!</h3>
          <p><b>Name:</b> {closestPrinter.resource.name}</p>
          <p><b>Building:</b> {closestPrinter.resource.building?.name || 'Outdoors'}</p>
          <p><b>Distance:</b> {closestPrinter.distance.toFixed(2)} km away</p>
        </div>
      )}

      {/* New Submission Form (no changes, just passing the updated handler) */}
      <NewSubmissionForm
        location={newSubmissionLocation}
        onUseMyLocation={handleUseMyLocation} // Pass the new handler
        onSubmissionSuccess={() => {
          setNewSubmissionLocation(null); // Clear the pin from map on success
          // TODO: Refresh the submissions list
        }}
      />

      {/* Submissions List (no changes) */}
      <Submissions />

    </div>
  );
}

export default App;