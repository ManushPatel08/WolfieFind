import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

//
// FIX: Changed API_URL to API_BASE_URL and adjusted fallback.
//
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function CommunitySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const { getAccessTokenSilently } = useAuth0();

  const fetchSubmissions = () => {
    //
    // FIX: Add /api prefix to the request URL
    //
    axios.get(`${API_BASE_URL}/api/submissions`)
      .then(res => {
        setSubmissions(res.data);
      })
      .catch(err => {
        console.error('Error fetching submissions:', err);
        setError('Could not load submissions.');
      });
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleVote = async (id, voteType) => {
    try {
      setError(null);
      setMessage('Submitting vote...');
      const token = await getAccessTokenSilently();
      
      //
      // FIX: Add /api prefix to the request URL
      //
      await axios.post(`${API_BASE_URL}/api/submissions/${id}/vote`, { voteType }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('Vote submitted! Refreshing list...');
      fetchSubmissions();
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Error voting:', err);
      setMessage('');
      const errorMsg = err.response?.data?.error || 'Failed to submit vote. You may have already voted.';
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="card">
      <h2>Community Submissions</h2>
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}
      {submissions.length === 0 && !error && <p>No pending submissions.</p>}
      <div className="submissions-list">
        {submissions.map((sub) => (
          <div key={sub.id} className="card submission-card">
            <div>
              <h4>{sub.category.replace(/_/g, ' ')}</h4>
              {sub.building ? (
                <p><b>Building:</b> {sub.building.name}</p>
              ) : (
                <p><b>Location:</b> ({Number(sub.lat).toFixed(5)}, {Number(sub.lon).toFixed(5)})</p>
              )}
              <p><b>Description:</b> {sub.description || 'N/A'}</p>
              <p className="submitted-by">
                Submitted by: {sub.submitter_name || 'Anonymous'}
              </p>
              <p className="vote-total">
                Total Votes: {sub.votes.reduce((acc, v) => acc + v.vote_type, 0)}
              </p>
            </div>
            <div className="vote-controls">
              <button onClick={() => handleVote(sub.id, 1)} className="vote-button">
                Upvote
              </button>
              <button onClick={() => handleVote(sub.id, -1)} className="vote-button vote-button-down">
                Downvote
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}