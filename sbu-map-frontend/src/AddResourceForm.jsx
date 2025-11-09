import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

//
// FIX: Changed API_URL to API_BASE_URL and adjusted fallback.
//
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const INDOOR_CATEGORIES = [
  'printer', 'drinking_water_filler', 'toilets', 'computer_labs', 'pantry',
  'game_room', 'gender_neutral_bathrooms', 'parking_service_desk',
  'id_card_desk', 'charging_spots', 'vending_machine', 'study_room',
  'elevator', 'cafeteria', 'information_desk', 'book_return', 'quiet_study',
  'group_study_room', 'ballroom', 'food'
];

const CATEGORY_LIST = [
  {
    group: 'Indoor',
    items: INDOOR_CATEGORIES,
  },
  {
    group: 'Outdoor',
    items: [
      'bench', 'bus_stops', 'food_trucks', 'restaurants', 'gym',
      'photographic_spots', 'bike_rack', 'garden_area'
    ],
  },
];

export function AddResourceForm({ location, onUseMyLocation, onSubmissionSuccess }) {
  const { user, getAccessTokenSilently } = useAuth0();
  const [category, setCategory] = useState('printer');
  const [description, setDescription] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    //
    // FIX: Add /api prefix to the request URL
    //
    axios.get(`${API_BASE_URL}/api/buildings`)
      .then(res => {
        setBuildings(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch buildings', err);
        setError('Could not load building list.');
      });
  }, []);

  const isIndoor = INDOOR_CATEGORIES.includes(category);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isIndoor && !buildingId) {
      setError('Please select a building for this indoor category.');
      return;
    }
    if (!isIndoor && !location) {
      setError('Please click on the map or use your location to set a pin for this outdoor category.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess('');

    try {
      const token = await getAccessTokenSilently();
      const payload = {
        category: category,
        description: description,
        building_id: isIndoor ? parseInt(buildingId) : null,
        submitter_id: user.sub,
        submitter_name: user.name,
        lat: isIndoor ? null : location.lat,
        lon: isIndoor ? null : location.lng,
      };

      //
      // FIX: Add /api prefix to the request URL
      //
      await axios.post(`${API_BASE_URL}/api/submissions`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('Submission successful! Thank you for your contribution.');
      setDescription('');
      setBuildingId('');
      setIsSubmitting(false);
      if (onSubmissionSuccess) onSubmissionSuccess();

    } catch (err) {
      console.error('Error creating submission:', err);
      const errorMsg = err.response && err.response.data && err.response.data.error;
      setError(errorMsg || 'Failed to create submission.');
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || (isIndoor ? !buildingId : !location);

  return (
    <div className="card form-card">
      <h2>Add a New Resource</h2>
      <p style={{ marginTop: '-1rem', color: 'var(--text-color-light)' }}>
        {isIndoor
          ? "Select an indoor category and the building it's in."
          : "Select an outdoor category and pin its location on the map."
        }
      </p>

      <form onSubmit={handleSubmit}>
        {!isIndoor && (
          <div className="form-group location-group">
            <label>
              Selected Location:
              <span>
                {location ? (
                  <strong> {`${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}</strong>
                ) : (
                  ' (Click map to set)'
                )}
              </span>
            </label>
            <button type="button" onClick={onUseMyLocation}>
              Use My Current Location
            </button>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="submit-category">Category:</label>
          <select
            id="submit-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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

        {isIndoor && (
          <div className="form-group">
            <label htmlFor="submit-building">Building (Required):</label>
            <select
              id="submit-building"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              required
            >
              <option value="">-- Select a Building --</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="submit-description">
            Description (e.g., "2nd floor, by room 210"):
          </label>
          <input
            id="submit-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="button-primary"
        >
          {isSubmitting ? 'Submitting...' : 'Submit New Resource'}
        </button>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
      </form>
    </div>
  );
}