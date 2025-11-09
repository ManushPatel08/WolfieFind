// REPLACE: sbu-map-frontend/src/Submissions.jsx

import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [votingId, setVotingId] = useState(null); // To show loading on specific buttons

  const { getAccessTokenSilently } = useAuth0();

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

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleVote = async (submissionId, voteType) => {
    setVotingId(submissionId); // Show loading
    setError(null);
    setMessage('');

    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${API_URL}/submissions/${submissionId}/vote`,
        { voteType: voteType },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setMessage('Vote submitted!');
      fetchSubmissions(); // Refresh list
      setTimeout(() => setMessage(''), 2000);

    } catch (e) {
      console.error("Error voting:", e);
      const errorMsg = e.response?.data?.error || "Failed to vote. You may have already voted.";
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    }
    setVotingId(null); // Hide loading
  };

  return (
    <div className="card">
      <h2>Community Submissions</h2>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      {submissions.length === 0 && !error && <p style={{color: 'var(--text-light)', textAlign: 'center'}}>No pending submissions.</p>}

      <div className="submissions-list">
        {submissions.map(sub => {
          const isLoadingVote = votingId === sub.id;
          return (
            <div key={sub.id} className="submission-card">
              <div>
                <h4>{sub.category.replace(/_/g, ' ')}</h4>

                {sub.building ? (
                  <p><b>Building:</b> {sub.building.name}</p>
                ) : (
                  <p><b>Location:</b> ({Number(sub.lat).toFixed(5)}, {Number(sub.lon).toFixed(5)})</p>
                )}

                <p><b>Description:</b> {sub.description || 'N/A'}</p>
                <p className="submitted-by">Submitted by: {sub.submitter_name || 'Anonymous'}</p>
                <p className="vote-total">
                  Total Votes: {sub.votes.reduce((acc, vote) => acc + vote.vote_type, 0)}
                </p>
              </div>
              
              <div className="vote-controls">
                <button 
                  onClick={() => handleVote(sub.id, 1)} 
                  className="btn-secondary vote-button"
                  disabled={isLoadingVote}
                >
                  {isLoadingVote ? '...' : 'Upvote'}
                </button>
                <button 
                  onClick={() => handleVote(sub.id, -1)} 
                  className="btn-secondary vote-button vote-button-down"
                  disabled={isLoadingVote}
                >
                  {isLoadingVote ? '...' : 'Downvote'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}