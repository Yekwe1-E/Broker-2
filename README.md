# Broker

This repository contains the Broker application (frontend + backend).

Contents:
- `backend/` - Express API, database init scripts, Dockerfile, and configuration.
- `frontend/` - Static frontend pages and JS/CSS.

Quick start (development):

1. Copy `backend/.env.example` to `backend/.env` and fill values.
2. From the backend folder install dependencies:

```powershell
cd backend
npm ci
```

3. Initialize the database:

```powershell
node init_db.js
```

4. Seed admin (Optional):

```powershell
node insert_admin.js
```

5. Start server (dev):

```powershell
npm start
```

---

## Files to Upload to GitHub

When uploading to GitHub, ensure you include these files (already configured in `.gitignore` to exclude sensitive data):

### Root
- `database/schema.sql`
- `.gitignore`
- `.dockerignore`
- `docker-compose.yml`
- `README.md`

### Backend (`/backend`)
- `config/`, `controllers/`, `middleware/`, `routes/`
- `Dockerfile`
- `ecosystem.config.js`
- `init_db.js`
- `insert_admin.js`
- `package.json`
- `package-lock.json`
- `server.js`
- `.env.example`

### Frontend (`/frontend`)
- `css/`, `js/`
- `admin.html`, `dashboard.html`, `index.html`, `login.html`, `register.html`

---

## Deployment to Render
- Create a GitHub repo and push the project.
- For the **Backend**: Create a Render Web Service pointed to `backend/Dockerfile`.
- For the **Frontend**: Create a Render Static Site pointed to the `frontend/` directory. Update `frontend/js/app.js` API URL to your Render backend URL.

Docker (build & run):

```powershell
docker-compose up --build -d
```

CI (optional)
- There's a sample GitHub Actions workflow in `.github/workflows` to build the backend image and (optionally) push to a registry.

Security
- Do not commit `backend/.env` or other secret files to GitHub. Use Render's environment variable settings or a secrets manager.
