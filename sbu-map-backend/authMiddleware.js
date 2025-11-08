import { auth } from 'express-oauth2-jwt-bearer';
import 'dotenv/config';

// --- Auth0 Configuration ---
const AUTH0_AUDIENCE = 'https://api.wolfiefind.com'; // This is the Identifier for your API
const AUTH0_ISSUER_URL = 'https://dev-ukm6j0dl4wc5piff.us.auth0.com/'; // Your Auth0 Domain
// ---

if (!AUTH0_AUDIENCE || !AUTH0_ISSUER_URL) {
  throw new Error(
    'Please make sure that AUTH0_AUDIENCE and AUTH0_ISSUER_URL are set correctly in authMiddleware.js',
  );
}

export const checkJwt = auth({
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: AUTH0_ISSUER_URL,
  tokenSigningAlg: 'RS256',
});