/* REPLACE: sbu-map-frontend/src/App.jsx */
import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet'; // Import L
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { AddResourceForm } from './AddResourceForm';
import { CommunitySubmissions } from './CommunitySubmissions';

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
const blueIcon = new L.Icon({
  iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=',
  shadowUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAApCAQAAAACach9AAACMUlEQVR4Ae3ShY7jQBAE0Aoz/f9/HTMzhg1zrdKUrJbdx+Kd2nD8VNudfsL/Th///dyQN2TH6f3y/BGpC379rV+S+qqetBOxImNQXL8JCAr2V4iMQXHGNJxeCfZXhSRBcQMfvkOWUdtfzlLgAENmZDcmo2TVmt8OSM2eXxBp3DjHSMFutqS7SbmemzBiR+xpKCNUIRkdkkYxhAkyGoBvyQFEJEefwSmmvBfJuJ6aKqKWnAkvGZOaZXTUgFqYULWNSHUckZuR1HIIimUExutRxwzOLROIG4vKmCKQt364mIlhSyzAf1m9lHZHJZrlAOMMztRRiKimp/rpdJDc9Awry5xTZCte7FHtuS8wJgeYGrex28xNTd086Dik7vUMscQOa8y4DoGtCCSkAKlNwpgNtphjrC6MIHUkR6YWxxs6Sc5xqn222mmCRFzIt8lEdKx+ikCtg91qS2WpwVfBelJCiQJwvzixfI9cxZQWgiSJelKnwBElKYtDOb2MFbhmUigbReQBV0Cg4+qMXSxXSyGUn4UbF8l+7qdSGnTC0XLCmahIgUHLhLOhpVCtw4CzYXvLQWQbJNmxoCsOKAxSgBJno75avolkRw8iIAFcsdc02e9iyCd8tHwmeSSoKTowIgvscSGZUOA7PuCN5b2BX9mQM7S0wYhMNU74zgsPBj3HU7wguAfnxxjFQGBE6pwN+GjME9zHY7zGp8wVxMShYX9NXvEWD3HbwJf4giO4CFIQxXScH1/TM+04kkBiAAAAAElFTkSuQmCC',
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
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

  if (isAuthLoading || !isAuthenticated) {
    return <div className="loading-app">Loading Application...</div>;
  }

  return (
    <div className="app-container">
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
        </div>
      </header>

      <div className="main-content">
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
          
          {/* THIS IS THE FIX: 
            Added icon={blueIcon} to the user's location marker 
          */}
          {myLocation && (
            <Marker position={[myLocation.lat, myLocation.lon]} icon={blueIcon}>
              <Popup>Your Location</Popup>
            </Marker>
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

        <div className="sidebar">
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