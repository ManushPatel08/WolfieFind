/* REPLACE: sbu-map-frontend/src/NewSubmissionForm.jsx */
import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

// --- UPDATED & STANDARDIZED CATEGORIES ---
const INDOOR_CATEGORIES = [
  'printer', 'drinking_water_filler', 'toilets', 'computer_labs', 'pantry',
  'game_room', 'gender_neutral_bathrooms', 'parking_service_desk',
  'id_card_desk', 'charging_spots', 'vending_machine',
  'study_room', 'elevator', 'cafeteria', 'information_desk',
  'book_return', 'quiet_study', 'group_study_room', 'ballroom', 'food'
];
const OUTDOOR_CATEGORIES = [
  'bench', 'bus_stops', 'food_trucks', 'restaurants',
  'gym', 'photographic_spots', 'bike_rack', 'garden_area'
];
// --- END UPDATES ---

const ALL_CATEGORIES = [
  { group: "Indoor", items: INDOOR_CATEGORIES.sort() },
  { group: "Outdoor", items: OUTDOOR_CATEGORIES.sort() }
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
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setMessage('Submission successful! Thank you.');
      setDescription('');
      setBuildingId('');
      setIsSubmitting(false);
      if (onSubmissionSuccess) onSubmissionSuccess();

      setTimeout(() => setMessage(''), 3000);

    } catch (err) {
      console.error("Error creating submission:", err);
      const serverError = err.response && err.response.data && err.response.data.error;
      setError(serverError || "Failed to create submission.");
      setIsSubmitting(false);
    }
  };

  const canSubmit = isIndoor ? !!buildingId : (!!location || category === 'other');

  return (
    <div className="card form-card">
      <h2>Add a New Resource</h2>
      <p style={{ marginTop: '-1rem', color: 'var(--text-secondary)', fontSize: '0.9em'}}>
        {isIndoor
          ? "Select an indoor category and the building it's in."
          : "Select an outdoor category and pin its location on the map."}
      </p>

      <form onSubmit={handleSubmit}>
        
        {!isIndoor && (
          <div className="form-group location-group">
            <span className="location-text">
              {location ? <>Selected Location: <br/><strong>{`${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}</strong></> : 'Click map to set location'}
            </span>
            <button
              type="button"
              onClick={onUseMyLocation}
              className="btn-secondary"
            >
              Use My Current Location
            </button>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="submit-category">Category:</label>
          <select id="submit-category" value={category} onChange={e => setCategory(e.target.value)}>
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

        {isIndoor && (
          <div className="form-group">
            <label htmlFor="submit-building">Building (Required):</label>
            <select id="submit-building" value={buildingId} onChange={e => setBuildingId(e.target.value)} required>
              <option value="">-- Select a Building --</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="submit-description">Description (e.g., "2nd floor, by room 210"):</label>
          <input
            id="submit-description"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <button type="submit" disabled={isSubmitting || !canSubmit} className="btn-primary">
          {isSubmitting ? 'Submitting...' : 'Submit New Resource'}
        </button>
      </form>
    </div>
  );
}