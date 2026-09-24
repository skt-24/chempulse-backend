# Project File Map

Use this map when returning to the project later.

## Admin panel — this folder

| File or folder | What it is for |
| --- | --- |
| `src/App.jsx` | Login, grouped navigation, Articles, Vintage Archive, Review Queue, Molecules/MOTD, and Trending Topics screens. |
| `src/api.js` | Backend URL, login, JWT access/refresh handling, and shared Axios/API methods. |
| `src/services/` | Named API modules for articles, vintage, molecules, ingestion review, and media uploads. |
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
| `src/routes/adminRoutes.js` | Protected article, topic, vintage, molecule and MOTD admin endpoints. |
| `src/controllers/adminController.js` | Admin HTTP request and response handlers. |
| `src/services/adminService.js` | Admin database queries and operations. |
| `src/validators/adminValidator.js` | Joi validation for article, molecule, vintage, and batch requests. |
| `src/services/ingestionService.js` | Imported article queue and approve/draft/reject workflow. |
| `.env` | Private server credentials and CORS origins. Keep it out of Git and never share it. |

## Common edits

- Change a label, form, table, or navigation item: `src/App.jsx`.
- Change API addresses, login, or refresh behavior: `src/api.js`.
- Change image upload behavior: `src/mediaUpload.js`.
- Change colors or spacing: `src/styles.css`.
- Change admin endpoints or article rules: edit the matching file under the existing backend's `src/` folder.
