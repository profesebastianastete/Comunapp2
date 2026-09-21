# ComunApp

**Your community, managed in order.**

ComunApp is a SaaS platform for managing neighborhood communities, plots, and buildings: centralize monthly payments, reservations, voting, notices, and access control in one place, with total transparency on how money is spent and online collections via Mercado Pago.

> 🚀 **Single real mode.** The application operates exclusively against its API (FastAPI + PostgreSQL). There is no "demo mode" with data in the browser: everything you see comes from the database.

---

## Architecture

```
┌──────────────────────┐    HTTPS · JWT     ┌────────────────────┐    SQL     ┌─────────────┐
│   Frontend (React)   │ ─────────────────▶ │   API (FastAPI)    │ ────────▶  │ PostgreSQL  │
│   Vite · Tailwind    │   VITE_API_URL     │   Railway          │ DATABASE_URL│  (Railway)  │
└──────────────────────┘                    └─────────┬──────────┘            └─────────────┘
                                                      │ HTTPS (payments, subscriptions, webhook)
                                                      ▼
                                              ┌───────────────┐
                                              │ Mercado Pago  │
                                              └───────────────┘
```

- **Multi-tenant:** each community is isolated by its `comunidad_id` (indexes + guards on every query).
- **RBAC:** 5 roles — Superadmin (platform), Administrator, Committee, Owner, Tenant.
- **Commissions:** a **5%** fee is added to every Mercado Pago collection (3% ComunApp + 2% Mercado Pago). That total is what gets charged.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Vite · Tailwind CSS v4 · Lucide Icons |
| Typography | Bricolage Grotesque · Instrument Sans · Spline Sans Mono |
| Backend | Python · FastAPI · SQLAlchemy 2.0 · Pydantic v2 |
| Auth | JWT (`python-jose`) · PBKDF2-SHA256 passwords (stdlib) |
| Database | PostgreSQL (Railway) · SQLite as local fallback |
| Payments | Mercado Pago (Checkout Pro + Preapproval + Webhook) |

## Routes

| Route | View | Access |
|---|---|---|
| `/` | Public landing | Public |
| `/entrar` | Login | Public |
| `/dashboard` | End-user panel | Session required |
| `/adminapp` | Internal platform panel | **Hidden** · Superadmin only |

## Quick Start (local)

**Backend** (requires Python 3.10+):
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 seed.py                # seeds demo data (idempotent)
python3 -m uvicorn main:app --port 8000
```
Without `DATABASE_URL` it uses SQLite (`comunapp.db`). API at `http://127.0.0.1:8000/docs`.

**Frontend** (requires Node 20+):
```bash
npm install
echo "VITE_API_URL=http://127.0.0.1:8000" > .env.local
npm run dev
```

## Deployment on Railway

Step-by-step guide in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Summary:

1. **Backend service:** folder `backend/`, add PostgreSQL plugin and define `SECRET_KEY`, `CORS_ORIGINS`, `BASE_URL`, `FRONTEND_URL`.
2. **Frontend service:** repo root, define `VITE_API_URL` with the backend's public URL.
3. Bootstrap automatically seeds data on first startup.

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Superadmin** (Sebastián Astete) | `equipo@comunapp.cl` | `admin123` |
| Administrator (Rodrigo Fuentes) | `admin@losalamos.cl` | `admin123` |
| Committee (Carla Méndez) | `comite@losalamos.cl` | `comite123` |
| Owner (María López · P-14) | `maria@demo.cl` | `demo123` |
| Tenant (Jorge Salas · P-07) | `jorge@demo.cl` | `demo123` |

Details and recovery in **[docs/CREDENTIALS.md](docs/CREDENTIALS.md)**.

## Modules

- **Smart collections:** monthly payments, fees and fines, with reminders.
- **Online payments:** Mercado Pago with 5% commissions itemized.
- **Automatic payments:** monthly subscriptions (preapproval) with credit card only.
- **Active transparency:** income/expense log with real-time charts.
- **Import community:** bulk CSV upload (plot, owner, tenant, contact, email, debt).
- **Reservations, voting, notice board and access control.**

## Product Glossary

In all user views we use **«community»** (never "condominium") and **«monthly payments» / «your payments»** (never "common expenses"). The language is simple and direct, without technical jargon.

## Full Documentation

| Document | Content |
|---|---|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Railway deployment (step-by-step + troubleshooting) |
| [docs/MERCADO_PAGO.md](docs/MERCADO_PAGO.md) | Payment integration, commissions and subscriptions |
| [docs/API.md](docs/API.md) | API endpoints reference |
| [docs/CREDENTIALS.md](docs/CREDENTIALS.md) | Accounts, roles and password recovery |
| [docs/SCALABILITY.md](docs/SCALABILITY.md) | Railway plans and user/community limits |

## Project Structure

```
comunapp/
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # Router (/, /entrar, /dashboard, /adminapp)
│   ├── index.css               # Design system (Tailwind v4)
│   ├── components/
│   │   ├── Landing.tsx         # Public view
│   │   ├── Entrar.tsx          # Login
│   │   ├── Dashboard.tsx       # End-user panel
│   │   ├── DashAdmin.tsx       # Admin/committee modules
│   │   ├── AdminApp.tsx        # Internal panel /adminapp
│   │   └── ui.tsx              # Shared components
│   └── lib/
│       ├── store.ts            # Data layer (delegates to API)
│       └── api.ts              # Real HTTP client
├── backend/                    # FastAPI API (Railway)
│   ├── main.py · auth.py · config.py · database.py · models.py · serializers.py · seed.py
│   └── routers/ (api.py · mp.py)
└── docs/                       # Documentation
```

---

MIT License [LICENSE](LICENSE) · ComunApp
