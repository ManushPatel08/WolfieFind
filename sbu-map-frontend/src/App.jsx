import { Submissions } from './Submissions.jsx';
import { NewSubmissionForm } from './NewSubmissionForm.jsx'; // 1. IMPORT
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
// 2. IMPORT useMapEvents
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


// 3. CREATE MAP CLICK HANDLER COMPONENT
// This is a small helper component that uses the useMapEvents hook
// We'll render it *inside* the MapContainer
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      // e.latlng contains the lat and long (as { lat, lng })
      onMapClick(e.latlng);
    },
  });
  return null; // It doesn't render anything visible
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

  // 4. ADD NEW STATE for the submission pin
  const [newSubmissionLocation, setNewSubmissionLocation] = useState(null);

  // ... (Your existing useEffect for auth is perfect) ...
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isAuthLoading, isAuthenticated, loginWithRedirect]);

  // ... (Your existing findNearestPrinter function is perfect) ...
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

  // --- 5. ADD HANDLER for "Use My Location" button ---
  const handleUseMyLocation = () => {
    if (userLocation) {
      // Convert {lat, lon} from GPS to {lat, lng} for Leaflet
      setNewSubmissionLocation({ lat: userLocation.lat, lng: userLocation.lon });
      // Fly map to that location
      if (mapRef.current) {
        mapRef.current.flyTo([userLocation.lat, userLocation.lon], 17);
      }
    } else {
      // Ask user to get their location first
      setError("Please click 'Find Nearest Printer' first to get your location.");
    }
  };
  // --- END OF NEW HANDLER ---


  if (isAuthLoading || !isAuthenticated) {
    return <div>Loading Application...</div>;
  }

  // --- 6. UPDATE THE UI ---
  return (
    <div style={{ padding: '20px', textAlign: 'left' }}>
      
      {/* ... (Your existing auth header is perfect) ... */}
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
        
        {/* 7. ADD THE CLICK HANDLER to the map */}
        <MapClickHandler onMapClick={setNewSubmissionLocation} />

        {/* Marker for User */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lon]}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {/* Marker for Printer */}
        {closestPrinter && (
          <Marker position={[closestPrinter.location.lat, closestPrinter.location.lon]}>
            <Popup>
              <b>{closestPrinter.resource.name}</b><br />
              {closestPrinter.resource.description}<br />
              ~{closestPrinter.distance.toFixed(2)} km away
            </Popup>
          </Marker>
        )}

        {/* 8. ADD MARKER for new submission */}
        {newSubmissionLocation && (
          <Marker 
            position={newSubmissionLocation}
            draggable={true} // You can let them move it
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

      {/* ... (Your existing "Find Printer" button and results) ... */}
      <button onClick={findNearestPrinter} disabled={isLoading} style={{ marginTop: '10px' }}>
        {isLoading ? 'Finding...' : 'Find Nearest Printer'}
      </button>

      {error && (
        <p style={{ color: 'red' }}>Error: {error}</p>
      )}

      {closestPrinter && (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <h3>Closest Printer Found!</h3>
          <p><b>Name:</b> {closestPrinter.resource.name}</p>
          <p><b>Building:</b> {closestPrinter.resource.building?.name || 'Outdoors'}</p>
          <p><b>Distance:</b> {closestPrinter.distance.toFixed(2)} km away</p>
        </div>
      )}

      {/* 9. RENDER THE NEW FORM */}
      <NewSubmissionForm 
        location={newSubmissionLocation}
        onUseMyLocation={handleUseMyLocation} // Pass the handler
        onSubmissionSuccess={() => {
          setNewSubmissionLocation(null); // Clear the pin from map on success
          // TODO: Refresh the submissions list
        }}
      />
      
      {/* 10. RENDER THE SUBMISSIONS LIST (already done) */}
      <Submissions />

    </div>
  );
}

export default App;