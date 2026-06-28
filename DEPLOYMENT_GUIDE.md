# Deployment Guide

This guide explains how to deploy the Signal Clone into a production-like cloud environment using **Vercel** for the frontend and **Render** for the backend.

## ⚙️ Environment Variables

Before deploying, ensure you have your environment variables defined.

### Backend (`.env`)
```env
# The secret key for signing JWT tokens. Use `openssl rand -hex 32` to generate one.
SECRET_KEY=94c1a8e2b8f...
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
# Path to SQLite database file. On Render, this MUST point to a persistent disk volume.
DATABASE_URL=sqlite:////data/signal.db
# Allowed CORS origins
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

### Frontend (`.env.production`)
```env
# Point to your Render backend URL
NEXT_PUBLIC_API_URL=https://your-backend-domain.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.onrender.com
```

---

## 🐍 Backend Deployment (Render)

Because the application uses SQLite, the database file will be wiped every time Render deploys a new container **unless** you use a Persistent Disk.

1. Create a new **Web Service** on Render connected to your GitHub repository.
2. Set the Environment to `Python 3`.
3. Build Command:
   ```bash
   pip install -r requirements.txt
   ```
4. Start Command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. **CRITICAL: Persistent Disk Setup**
   - Go to the "Disks" section of your Web Service.
   - Add a disk with the Mount Path `/data`.
   - Ensure your `DATABASE_URL` in the environment variables is set to `sqlite:////data/signal.db`.
6. Add the rest of your backend Environment Variables.
7. Click **Deploy**.

*Initial Database Setup:*
Once deployed, open the Render Shell and run the database seed script to populate the initial tables and demo users:
```bash
python app/seed/seed_db.py
```

---

## ⚛️ Frontend Deployment (Vercel)

Next.js applications are best deployed on Vercel, the creators of Next.js.

1. Sign in to Vercel and click **Add New Project**.
2. Import your GitHub repository.
3. Vercel will automatically detect that it is a Next.js project.
4. Open the **Environment Variables** section and add:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_SOCKET_URL`
5. Click **Deploy**.
6. Wait 1-2 minutes for the Edge network to propagate.

---

## 🔧 Troubleshooting Common Errors

### 1. `WebSocket Connection Failed`
- **Cause:** Mixed Content restrictions or missing CORS origins.
- **Fix:** Ensure your frontend is connecting via `wss://` and `https://`. Make sure the `CORS_ORIGINS` environment variable in the backend exactly matches the Vercel URL (no trailing slash).

### 2. `Database is locked` (SQLite)
- **Cause:** High concurrent writes without WAL mode enabled, or the disk is extremely slow.
- **Fix:** SQLite is configured to use `PRAGMA journal_mode=WAL;`. Ensure your SQLAlchemy engine is correctly executing this PRAGMA on connect. Check the `app/db/session.py` file for the event listener.

### 3. Users disappear after backend restart
- **Cause:** The SQLite file is being saved to the ephemeral container file system instead of the persistent disk.
- **Fix:** Ensure the Render persistent disk is properly mounted and `DATABASE_URL` points directly inside the mounted directory.
