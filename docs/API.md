# API Reference

ComunApp FastAPI Backend. Base URL: defined in `VITE_API_URL` (or `http://127.0.0.1:8000` locally). Interactive documentation at `/docs` (Swagger).

**Authentication:** all protected endpoints expect header `Authorization: Bearer <token>`, obtained from `POST /api/auth/login`. Roles validated with RBAC guards:

- `GESTION` = `ADMIN`, `COMITE`
- `RESIDENTES` = `PROPIETARIO`, `ARRENDATARIO`

**Multi-tenant** is guaranteed because every query filters by `comunidad_id` and community roles can only operate on their own.

---

## Authentication

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | Returns JWT token + session |
| GET | `/api/me` | authenticated | Current user profile |
| POST | `/api/auth/cambiar-password` | authenticated | Changes own password (requires current) |

## Community (requires membership)

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/api/comunidades/{cid}/datos` | authenticated | Entire community state (collections, payments, movements, notices, reservations, voting, log, subscriptions) |
| POST | `/api/comunidades/{cid}/cobros/generar` | GESTION | Generates monthly payments for all units |
| POST | `/api/comunidades/{cid}/pagos/cobro/{cobro_id}` | RESIDENTES | Neighbor pays their collection (Mercado Pago) |
| POST | `/api/comunidades/{cid}/pagos/registrar` | GESTION | Admin registers manual payment |
| POST | `/api/comunidades/{cid}/movimientos` | GESTION | Registers expense/income (Transparency) |
| POST | `/api/comunidades/{cid}/importar` | GESTION | Imports community from CSV |
| POST | `/api/comunidades/{cid}/avisos` | GESTION | Publishes a notice |
| POST | `/api/comunidades/{cid}/reservas` | RESIDENTES, GESTION | Reserves a common space |
| DELETE | `/api/comunidades/{cid}/reservas/{rid}` | RESIDENTES, GESTION | Cancels a reservation |
| POST | `/api/comunidades/{cid}/votaciones` | GESTION | Creates a vote |
| POST | `/api/comunidades/{cid}/votaciones/{vid}/votar` | RESIDENTES | Casts a vote (1 per unit) |
| POST | `/api/comunidades/{cid}/accesos` | GESTION | Registers a visitor/provider |
| POST | `/api/comunidades/{cid}/accesos/{rid}/salida` | GESTION | Marks departure |
| POST | `/api/comunidades/{cid}/vecinos` | ADMIN | Creates a neighbor with access |

## Mercado Pago (community)

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| POST | `/api/comunidades/{cid}/mp/configurar` | ADMIN | Saves community Access Token and Public Key |
| POST | `/api/comunidades/{cid}/mp/probar` | ADMIN, COMITE | Verifies connection against `/users/me` |
| POST | `/api/comunidades/{cid}/mp/desvincular` | ADMIN | Deletes credentials |
| POST | `/api/comunidades/{cid}/mp/cobros` | ADMIN | Creates payment point (Checkout Pro) with 5% commissions |
| POST | `/api/comunidades/{cid}/suscripciones` | GESTION | Creates monthly subscription (preapproval, credit card only) |
| POST | `/api/comunidades/{cid}/suscripciones/{sid}/cancelar` | GESTION | Cancels a subscription |

## Webhook

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| POST | `/api/mp/webhook` | public (verified with MP) | Receives payment notifications and reconciles |

## SaaS / Superadmin

All require `SUPERADMIN` role.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/saas/listado` | Communities, users, invoices, plans, metrics and platform configuration |
| POST | `/api/saas/comunidades` | Creates a community (tenant) + its admin |
| POST | `/api/saas/comunidades/{cid}/toggle-estado` | Activates/suspends a community |
| POST | `/api/saas/usuarios` | Creates a user in any role |
| POST | `/api/saas/usuarios/{uid}/password` | Redefines a user's password |
| POST | `/api/saas/usuarios/{uid}/toggle-activo` | Activates/suspends a user |
| POST | `/api/saas/facturas/generar` | Generates monthly billing to communities |
| POST | `/api/saas/facturas/{fid}/pagar` | Marks an invoice as paid |
| POST | `/api/saas/facturas/{fid}/cobrar-mp` | MP payment point for invoice (with 5%) |
| POST | `/api/saas/facturas/{fid}/suscribir-mp` | Monthly community subscription (with 5%) |

## Plans (Superadmin)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/saas/planes` | Creates a plan (name + price) |
| POST | `/api/saas/planes/{pid}` | Edits name/price/status of a plan |
| DELETE | `/api/saas/planes/{pid}` | Deletes a plan (if no communities assigned) |

## Platform Mercado Pago account (Superadmin)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/saas/mp-plataforma/configurar` | Saves platform credentials |
| POST | `/api/saas/mp-plataforma/probar` | Verifies connection |
| POST | `/api/saas/mp-plataforma/desvincular` | Deletes credentials |

## System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service status (used by Railway) |
| GET | `/api/diagnostico` | User/community count and database type |
| GET | `/` | Basic info and links |

---

## Response codes

- `200/201` — success.
- `400` — invalid data (e.g., amount ≤ 0, short password).
- `401` — no token or incorrect credentials.
- `403` — role without permissions for action.
- `404` — resource not found.
- `409` — conflict (e.g., plan in use, duplicate email).
- `502` — Mercado Pago rejected operation (details included).
