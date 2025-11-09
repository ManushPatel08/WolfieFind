
# WolfieFind — SBU Map (Frontend)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)

This repository contains the frontend for WolfieFind's SBU Map — an interactive React + Vite app that displays campus buildings, resources, and community submissions.

Live demo:
- https://wolfiefind.pages.dev

GitHub (this project):
- https://github.com/ManushPatel08/WolfieFind

Backend API (local):
- The backend lives in `../sbu-map-backend` and by default listens on http://localhost:3001

Tech stack
- React 19 + Vite
- react-leaflet + leaflet for mapping
- Auth0 for authentication (via `@auth0/auth0-react`)
- Axios for HTTP requests

Quick start (frontend)

1. Install dependencies

```sh
cd sbu-map-frontend
npm install
```

2. Set environment variables

- Create a `.env` file in the `sbu-map-frontend` folder (Vite uses `VITE_`-prefixed vars). Example:

```
VITE_API_URL=http://localhost:3001
VITE_AUTH0_DOMAIN=your-auth0-domain
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
```

3. Run locally

```sh
npm run dev
```

The app starts with Vite (default port 5173). Open http://localhost:5173 in your browser.

Build for production

```sh
npm run build
npm run preview   # preview the production build locally
```

Backend quick start

1. Open a separate shell and start the backend:

```sh
cd ../sbu-map-backend
npm install
npm run start
```

2. The backend default port is 3001. You can change it by setting `PORT` in the backend `.env`.

Useful links
- Repository (monorepo): https://github.com/ManushPatel08/WolfieFind
- Frontend folder: https://github.com/ManushPatel08/WolfieFind/tree/main/sbu-map-frontend
- Backend folder: https://github.com/ManushPatel08/WolfieFind/tree/main/sbu-map-backend
- Live site: replace with your deployed URL above

Environment & configuration notes
- Vite exposes env vars prefixed with `VITE_`. Use `import.meta.env.VITE_API_URL` in the app code to reference the backend base URL.
- Auth0 keys should be stored as Vite env vars (do not commit secrets).

Contributing
- Open issues or PRs against the GitHub repo. For local development, run frontend and backend concurrently in separate terminals.

License

- This project is licensed under the MIT License — see the `LICENSE` file in the repository root for details.

Contact
- For questions, open an issue in the GitHub repo or contact the maintainer.
