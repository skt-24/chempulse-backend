# opium

## Chemsiq article admin panel integration

The admin panel uses the existing `/api/auth/login` flow and the existing JWT admin middleware. Its article operations are served from `/api/admin/articles`; media is uploaded through the authenticated `/api/media/upload` route, so Cloudinary credentials remain on the backend.

This integration adds authenticated `GET /api/admin/articles`, `GET /api/admin/topics`, and `POST /api/admin/articles/bulk` routes. Existing article, auth, category, media, and public API routes are retained.

### CORS for the local panel

`CORS_ORIGIN` accepts a comma-separated allowlist. Preserve every current site origin and add `http://localhost:5173` while developing locally. In Render, update the backend service's Environment setting to include the local origin and the deployed admin site's exact origin, then redeploy. Do not use `*` in production.

### Frontend

The Vite frontend's `.env` should set `VITE_API_URL` to the deployed backend API base, for example `https://chemsiq-backend.onrender.com/api`. Deploy the frontend static site separately. The admin panel does not need MongoDB, JWT, or Cloudinary secrets in its environment.
