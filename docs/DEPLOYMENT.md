# Deployment on Railway

Complete guide to deploy ComunApp (frontend + backend + database) to [Railway](https://railway.com). The application runs in **real mode**: the frontend talks to the API and this one to PostgreSQL.

Two **services** are created in the same project:

| Service | Folder (root) | What it is |
|---|---|---|
| `backend` | `backend/` | FastAPI API |
| `frontend` | `/` (root) | Compiled React App |

Additionally, a **PostgreSQL plugin** is added that the backend consumes.

---

## 1) Prepare the repository

Make sure you have in the repo:
- The complete `backend/` folder.
- `railway.toml` at the root (configures the frontend).
- `backend/railway.toml` (configures the backend).
- A `.gitignore` that does **not** exclude `backend/`.

Push to GitHub (you can use `exportar-a-github.sh` / `.bat`).

---

## 2) Create the project and backend

1. In Railway: **New Project → Deploy from GitHub repo** and choose your repository.
2. Railway will detect a service. Rename it to **`backend`**.
3. In **Service → Settings → General → Root Directory** enter `backend`.
4. **Add PostgreSQL:**
   - Button **`+` → Database → PostgreSQL**.
   - Railway creates the `PostgreSQL` service with an internal `DATABASE_URL` variable.
5. **Connect the database to the backend:**
   - In the `backend` service → **Variables → New Variable → Add Reference**.
   - Reference: `PostgreSQL` → `DATABASE_URL`.
6. **Backend variables** (Service → Variables):

| Variable | Value |
|---|---|
| `DATABASE_URL` | *reference to PostgreSQL* |
| `SECRET_KEY` | a long, random string (e.g., 64 characters) |
| `BASE_URL` | the public URL of the **backend** (for Mercado Pago webhook) |
| `FRONTEND_URL` | the public URL of the **frontend** |
| `CORS_ORIGINS` | *(optional)* by default accepts any `*.up.railway.app` and `localhost`. Define exact origins (e.g., `https://comunapp.up.railway.app`) only if you want to restrict |
| `MP_ACCESS_TOKEN` | *(optional)* platform token for webhook fallback |

7. Railway will use `backend/railway.toml` (build with Nixpacks + `uvicorn`). Deploy.

> The **bootstrap** automatically seeds the superadmin and demo data the first time the database is empty. You don't need to run `seed.py` manually after the first deploy.

---

## 3) Create the frontend

1. **New Service → GitHub repo** (same repo). Rename it to **`frontend`**.
2. Root Directory: leave it **empty** (root).
3. **Variables** (Service → Variables):

| Variable | Value |
|---|---|
| `VITE_API_URL` | the public URL of the **backend** — in production: `https://backend-comunapp.up.railway.app` |

> ⚠️ `VITE_API_URL` is injected **at build time**. If you define or change it later, do a **Deploy → Redeploy** of the frontend.

4. Railway will use the `railway.toml` at the root (Node 22 + `npm install` + `npm run build` + static server). Deploy.

---

## 4) Get public URLs

Each service: **Settings → Networking → Generate Domain**. Note:
- Backend URL → goes to `VITE_API_URL` and `BASE_URL`.
- Frontend URL → goes to `FRONTEND_URL` (and `CORS_ORIGINS` only if you decide to restrict).

Example final `CORS_ORIGINS` (accepts multiple, comma-separated) — in production ComunApp uses the default `*`:
```
https://comunapp-comunap.up.railway.app
```

---

## 5) Verify it works

1. **Backend alive:** open `https://<backend>/health` → should return `{"status":"ok",...}`.
2. **Seeded data:** open `https://<backend>/api/diagnostico` → `"usuarios": 6` (or more) and `"base": "postgresql"`.
3. **Frontend:** open the frontend URL and log in with `equipo@comunapp.cl / admin123`. Should take you to `/adminapp`.

---

## Troubleshooting common issues

| Symptom | Cause | Solution |
|---|---|---|
| `EBUSY: rmdir node_modules/.cache` in build | Railway mounts a cache volume in `node_modules/.cache` that cannot be deleted | Already resolved in `railway.toml` (`rm -rf node_modules/*` + `npm install`). If persists, disable **Build Cache** once (Settings → Builds) |
| Warnings `EBADENGINE` (Tailwind requires Node ≥ 20) | Railway was compiling with Node 18 | Fixed with `NIXPACKS_NODE_VERSION = "22"` in `railway.toml` |
| "This installation needs its API" when opening frontend | `VITE_API_URL` not defined or build is prior to defining it | Define the variable and do a **Redeploy** of the frontend |
| "Could not connect to server" | Backend sleeps (free plan) or CORS | Wait a few seconds and retry (the app retries itself). The code already accepts `*.up.railway.app` by default; if persists after push, check you don't have a restrictive `CORS_ORIGINS` misspelled in the backend |
| "Password not recognized" | Database with old hashes or corrupt data | In backend **Shell**: `python3 seed.py --reset-passwords` |
| Mercado Pago webhook doesn't reconcile | `BASE_URL` doesn't point to public backend | Define `BASE_URL` with the backend's public URL and redeploy |
| `python: command not found` in Shell | The binary is called `python3` | Use `python3 seed.py ...` or `bash reset_passwords.sh` |

---

## Plans and costs

The free plan (Trial) gives $5 of credit and hardware limits far superior to what ComunApp consumes. For sustained production use the **Hobby** or **Pro** plan. Details and user/community limits in **[SCALABILITY.md](SCALABILITY.md)**.
