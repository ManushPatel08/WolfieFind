import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.jsx';
import 'leaflet/dist/leaflet.css';

// --- Auth0 Configuration ---
const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE;
// ---

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: AUTH0_AUDIENCE, // This tells Auth0 you want a token for your backend API
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>,
);