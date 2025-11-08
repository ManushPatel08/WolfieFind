import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

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

export function NewSubmissionForm({ location, onUseMyLocation, onSubmissionSuccess }) {
  const { user, getAccessTokenSilently } = useAuth0();

  // Form state
  const [category, setCategory] = useState('printer');
  const [description, setDescription] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [buildings, setBuildings] = useState([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  // Fetch buildings
  useEffect(() => {
    axios.get(`${API_URL}/buildings`)
      .then(res => {
        setBuildings(res.data);
      })
      .catch(err => {
        console.error("Failed to fetch buildings", err);
        setError("Could not load building list.");
      });
  }, []);

  const isIndoor = INDOOR_CATEGORIES.includes(category);

  // handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // New validation logic
    if (isIndoor && !buildingId) {
      setError("Please select a building for this indoor category.");
      return;
    }
    if (!isIndoor && !location) {
      setError("Please click on the map or use your location to set a pin for this outdoor category.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage('');

    try {
      const token = await getAccessTokenSilently();

      // Send null for coordinates if indoor, and null for building if outdoor
      const submissionData = {
        category: category,
        description: description,
        building_id: isIndoor ? parseInt(buildingId) : null,
        submitter_id: user.sub,
        submitter_name: user.name,
        lat: isIndoor ? null : location.lat,
        lon: isIndoor ? null : location.lng,
      };

      await axios.post(
        `${API_URL}/submissions`,
        submissionData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setMessage('Submission successful! Thank you for your contribution.');
      // Clear the form
      setDescription('');
      setBuildingId('');
      setIsSubmitting(false);

      if (onSubmissionSuccess) {
        onSubmissionSuccess();
      }

    } catch (err) {
      console.error("Error creating submission:", err);
      const serverError = err.response && err.response.data && err.response.data.error;
      setError(serverError || "Failed to create submission.");
      setIsSubmitting(false);
    }
  };

  // Dynamic validation for submit button
  const canSubmit = isIndoor ? !!buildingId : (!!location || category === 'other');

  return (
    <div style={{ marginTop: '20px', borderTop: '2px solid #555', paddingTop: '20px' }}>
      <h2>Add a New Resource</h2>
      <p>
        {isIndoor
          ? "Select an indoor category and the building it's in."
          : "Select an outdoor category and pin its location on the map."}
      </p>

      <form onSubmit={handleSubmit}>

        {/* Location section (for outdoor) */}
        {!isIndoor && (
          <div style={{ marginBottom: '10px' }}>
            <label>
              Selected Location:
              <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>
                {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : ' (Click map to set)'}
              </span>
            </label>
            <button
              type="button"
              onClick={onUseMyLocation}
              style={{ marginLeft: '15px' }}
            >
              Use My Current Location
            </button>
          </div>
        )}

        {/* Category Dropdown */}
        <div style={{ marginBottom: '10px' }}>
          <label>
            Category:
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ marginLeft: '10px' }}>
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
          </label>
        </div>

        {/* Building Dropdown (for indoor) */}
        {isIndoor && (
          <div style={{ marginBottom: '10px' }}>
            <label>
              Building (Required):
              <select value={buildingId} onChange={e => setBuildingId(e.target.value)} required style={{ marginLeft: '10px' }}>
                <option value="">-- Select a Building --</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: '10px' }}>
          <label>
            Description (e.g., "2nd floor, by room 210"):
            <br />
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: '300px' }}
            />
          </label>
        </div>

        {/* Submit Button */}
        <button type="submit" disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? 'Submitting...' : 'Submit New Resource'}
        </button>

        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
      </form>
    </div>
  );
}