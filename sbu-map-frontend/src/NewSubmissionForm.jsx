import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// --- THIS IS THE FIX ---
// We now accept 'onUseMyLocation' as a prop
export function NewSubmissionForm({ location, onUseMyLocation, onSubmissionSuccess }) {
  const { user, getAccessTokenSilently } = useAuth0();
  
  // Form state
  const [category, setCategory] = useState('printer'); // Default to printer
  const [description, setDescription] = useState('');
  const [building, setBuilding] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      setError("Please click on the map or use your location to set a pin first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage('');

    try {
      const token = await getAccessTokenSilently();
      
      const submissionData = {
        // From user
        category: category,
        description: description,
        buildingNameSuggestion: building,
        // From Auth0
        submitter_id: user.sub,
        submitter_name: user.name, // This can be null, our backend fix handles it
        // From map click
        lat: location.lat,
        lon: location.lng, // Leaflet click event uses 'lng', backend expects 'lon'
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
      
      setMessage('Submission successful! Thank you.');
      // Clear the form
      setDescription('');
      setBuilding('');
      setIsSubmitting(false);
      
      // Tell the parent (App.jsx) to clear the map pin
      if (onSubmissionSuccess) {
        onSubmissionSuccess();
      }

    } catch (err) {
      console.error("Error creating submission:", err);
      setError("Failed to create submission.");
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: '20px', borderTop: '2px solid #555', paddingTop: '20px' }}>
      <h2>Add a New Resource</h2>
      <p>Know a spot we're missing? Click on the map to pin the location, or use your current location.</p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Selected Location: 
            <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>
              {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : ' (Click map to set)'}
            </span>
          </label>
          
          {/* --- THIS IS THE NEW BUTTON --- */}
          <button 
            type="button" 
            onClick={onUseMyLocation} 
            style={{ marginLeft: '15px' }}
          >
            Use My Current Location
          </button>
          {/* --- END OF NEW BUTTON --- */}

        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            Category: 
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ marginLeft: '10px' }}>
              <option value="printer">Printer</option>
              <option value="vending_machine">Vending Machine</option>
              <option value="bench">Bench</option>
              <option value="water_fountain">Water Fountain</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

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
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            Building (if any):
            <br />
            <input 
              type="text" 
              value={building} 
              onChange={e => setBuilding(e.target.value)}
              style={{ width: '300px' }}
            />
          </label>
        </div>

        <button type="submit" disabled={isSubmitting || !location}>
          {isSubmitting ? 'Submitting...' : 'Submit New Resource'}
        </button>
        
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
      </form>
    </div>
  );
}