// C:\Users\dell\Desktop\WolfieFind\sbu-map-frontend\src\Submissions.jsx

import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// API base URL
const API_URL = 'http://localhost:3001/api';

export function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  // Get the hook to fetch a token
  const { getAccessTokenSilently } = useAuth0();

  // Function to fetch submissions
  const fetchSubmissions = () => {
    axios.get(`${API_URL}/submissions`)
      .then(response => {
        setSubmissions(response.data);
      })
      .catch(err => {
        console.error("Error fetching submissions:", err);
        setError("Could not load submissions.");
      });
  };

  // 1. Fetch all public submissions on component load
  useEffect(() => {
    fetchSubmissions();
  }, []); // Empty dependency array means this runs once on mount

  // 2. Function to handle voting (a protected action)
  const handleVote = async (submissionId, voteType) => {
    try {
      // Clear any previous messages
      setError(null);
      setMessage('Submitting vote...');

      // Get the token from Auth0
      const token = await getAccessTokenSilently();

      // Make the protected API call with the token
      await axios.post(
        `${API_URL}/submissions/${submissionId}/vote`,
        { voteType: voteType }, // request body
        {
          headers: {
            // Add the token to the Authorization header
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setMessage('Vote submitted! Refreshing list...');
      
      // Refresh submissions list after voting
      fetchSubmissions();

    } catch (e) {
      console.error("Error voting:", e);
      setMessage('');
      const errorMsg = e.response?.data?.error || "Failed to submit vote. You may have already voted.";
      setError(errorMsg);
    }
  };

  return (
    <div style={{ marginTop: '30px', borderTop: '2px solid #555', paddingTop: '20px' }}>
      <h2>Community Submissions</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      {submissions.length === 0 && !error && <p>No pending submissions.</p>}

      {submissions.map(sub => (
        <div key={sub.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
          <h4 style={{ textTransform: 'capitalize' }}>{sub.category.replace(/_/g, ' ')} Submission</h4>
          
          {/* --- THIS IS THE FIXED LOGIC --- */}
          {sub.building ? (
            <p><b>Building:</b> {sub.building.name}</p>
          ) : (
            <p><b>Location:</b> ({Number(sub.lat).toFixed(5)}, {Number(sub.lon).toFixed(5)})</p>
          )}
          {/* --- END OF FIXED LOGIC --- */}
          
          <p><b>Description:</b> {sub.description || 'N/A'}</p>
          <p><i>Submitted by: {sub.submitter_name || 'Anonymous'}</i></p>
          <p><b>Total Votes:</b> {sub.votes.reduce((acc, vote) => acc + vote.vote_type, 0)}</p>

          {/* Vote Buttons */}
          <button onClick={() => handleVote(sub.id, 1)}>Upvote</button>
          <button onClick={() => handleVote(sub.id, -1)} style={{ marginLeft: '10px' }}>Downvote</button>
        </div>
      ))}
    </div>
  );
}