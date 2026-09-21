# Scalability and Railway plans

ComunApp is a **management** application, not compute-intensive: operations (payments, collections, notices, reservations) are lightweight database queries. That's why CPU and RAM **are not the limit** in any plan; the real limit is billable consumption and, later, the database.

## Real per-user consumption

| Resource | Typical consumption |
|---|---|
| CPU | ~0.1–0.5 vCPU with hundreds of simultaneous active users |
| RAM | ~300–500 MB for backend with thousands of sessions |
| Disk per community/month | ~2–5 KB (payments, notices and votes are tiny rows) |

## Free Plan (Trial — $5 credit)

The hardware limit (48 vCPU / 48 GB) is a **cap**, not guaranteed resources: you pay for what you use and the $5 runs out.

- Keeping a small deployment running (2 services at minimum size 24/7), the $5 lasts **between 3 and 10 days**.
- In that time the hardware would support without problem **~500–2,000 users** and **~20–100 communities**.
- Storage (5 GB) will **not** be the limit: equivalent to ~1,000,000 community-months.

> The free plan is a trial. To keep it over time use **Hobby ($5/month)**, with the same caps and stable deployment limited by consumption, not hardware.

## Pro Plan

Caps stop mattering entirely:

| Metric | Realistic capacity |
|---|---|
| Communities | Tens of thousands (10,000–50,000+) |
| Users | Millions of records |
| Storage | 1 TB ≈ hundreds of millions of rows |

The real limit becomes:
1. **Consumption bill** (grows very gradually for this type of app).
2. **Single-node database:** comfortable up to ~1–5 million active rows; beyond that, add read replicas or partitioning.

## Recommendation by stage

| Stage | Plan | Supports |
|---|---|---|
| Demo / first clients (1–5 communities) | Free / Hobby | More than enough capacity |
| Growth (10–100 communities) | Hobby | Stable; watch consumption |
| Real traction (>100 communities, MP payments in production) | Pro | Scales without touching architecture |

## Architecture is ready for Pro

The multi-tenant design (isolation by `comunidad_id`, async FastAPI, PostgreSQL indexes) **scales to Pro without rewriting anything**. The only changes when growing:

- Add Railway's PostgreSQL plugin with **read replicas**.
- When reaching thousands of communities, consider **separating the database** into a dedicated service.
- Put a **CDN** in front of the frontend (the build is static, so it's trivial).

No code changes needed to go from Hobby to Pro: just infrastructure configuration.
