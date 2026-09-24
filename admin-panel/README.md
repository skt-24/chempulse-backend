# Chemsiq Admin Panel

This folder contains the editable React admin panel and its generated website build.

## Start here

- Read [PROJECT_FILE_MAP.md](./PROJECT_FILE_MAP.md) to find the file for each feature.
- Edit files in `src/`. Do not edit the generated files in `dist/`.
- Run `npm run dev` from this folder to open the local panel at `http://localhost:5173/`.
- `VITE_API_URL` in `.env` points the panel to the existing Render API. This frontend setting is public and contains no server secrets.

## Which backend is active?

The active backend is the separate project at `C:\Users\vanam\OneDrive\Desktop\backend`. Its `src/` files contain the Express API used by the Android app and this panel. Its `.env` contains private server credentials; keep that file private.

The folder `backend-scaffold-reference/` is a starter/reference copy included with the original panel draft. It is not the active backend and is not the folder connected to Render.

The active backend changes are local until they are pushed and deployed to Render. Updating this frontend folder alone does not update the live API.

## Build files

Run `npm run build` to regenerate `dist/`. The output uses stable names (`chemsiq-admin.js` and `chemsiq-admin.css`) so the files are easy to recognize. Vite creates these files from `src/`; make your edits in `src/`.
