# Project File Map

Use this map when returning to the project later.

## Admin panel — this folder

| File or folder | What it is for |
| --- | --- |
| `src/App.jsx` | Login screen, navigation, article list, editor, and bulk import UI. |
| `src/api.js` | Backend URL, login, JWT access/refresh handling, and admin API calls. |
| `src/mediaUpload.js` | Hero image validation and upload to the authenticated backend media endpoint. |
| `src/styles.css` | Dashboard theme, layout, responsive styles, and dark mode. |
| `.env` | Frontend API URL only. Never put MongoDB, JWT, or Cloudinary secrets here. |
| `.env.example` | Safe frontend environment template. |
| `vite.config.js` | Local dev server settings and readable build asset names. |
| `dist/` | Generated site files. Recreated by the build; do not edit by hand. |
| `backend-scaffold-reference/` | Starter/reference backend from the initial draft; not connected to Render. |

## Existing backend — separate folder

The actual API project is `C:\Users\vanam\OneDrive\Desktop\backend`.

| File | What it is for |
| --- | --- |
| `src/app.js` | Express app, CORS allowlist, and API route mounting. |
| `src/routes/adminRoutes.js` | Protected article and topic admin endpoints. |
| `src/controllers/adminController.js` | HTTP request and response handlers. |
| `src/services/adminService.js` | Article database queries and operations. |
| `src/validators/adminValidator.js` | Joi validation for article requests and batch records. |
| `.env` | Private server credentials and CORS origins. Keep it out of Git and never share it. |

## Common edits

- Change a label, form, table, or navigation item: `src/App.jsx`.
- Change API addresses, login, or refresh behavior: `src/api.js`.
- Change image upload behavior: `src/mediaUpload.js`.
- Change colors or spacing: `src/styles.css`.
- Change admin endpoints or article rules: edit the matching file under the existing backend's `src/` folder.
