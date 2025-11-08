import { auth } from 'express-oauth2-jwt-bearer';
import 'dotenv/config';

// --- Auth0 Configuration ---
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const AUTH0_ISSUER_URL = process.env.AUTH0_ISSUER_URL;
// ---

if (!AUTH0_AUDIENCE || !AUTH0_ISSUER_URL) {
  throw new Error(
    'Please make sure that AUTH0_AUDIENCE and AUTH0_ISSUER_URL are set as environment variables',
  );
}

export const checkJwt = auth({
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: AUTH0_ISSUER_URL,
  tokenSigningAlg: 'RS256',
});