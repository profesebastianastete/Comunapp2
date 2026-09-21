# Mercado Pago Integration

ComunApp collects payments through Mercado Pago using **Checkout Pro** (one-time payments) and **Preapproval** (automatic payment subscriptions). This guide explains configuration, commissions, and reconciliation flow.

---

## Commission model (5%)

A **5%** commission fee is added to **every** Mercado Pago collection. That total is what the payer is actually charged:

| Concept | % | Destination |
|---|---|---|
| Application commission (ComunApp) | **3%** | Platform |
| Mercado Pago commission | **2%** | Mercado Pago |
| **Total added** | **5%** | — |

**Example:** a monthly payment of `$55,000` is charged as:
```
base            $55,000
+ 3% ComunApp   $ 1,650
+ 2% MercadoPago $ 1,100
──────────────────────
total to charge $57,750
```

The calculation is centralized in the frontend (`calcularComision()` in `src/lib/store.ts`) and replicated in the backend (`backend/routers/mp.py`). **Never** charge only the base: always base + 5%.

---

## Two Mercado Pago accounts

There are two independent configuration levels:

### A) Each community's account (configured by their administrators)

From the community panel: **Online Collections → Configure Mercado Pago**. Saved:
- **Access Token** (server-side): used by backend to create collections and subscriptions.
- **Public Key** (client-side): used by the browser for the payment point.
- **Mode:** `sandbox` (testing, tokens starting with `TEST-`) or `production` (`APP_USR-`).

With this account the community:
- Generates **payment points** per collection (Checkout Pro).
- Creates **subscriptions** for automatic payments for owners and tenants.

### B) Platform account (configured by superadmin)

From `/adminapp` → platform configuration tab. This is **ComunApp's** account used for:
- Charging **monthly SaaS invoices** to each community (with 5% included).
- Creating **SaaS subscriptions** so communities pay their bill automatically with card.
- Acting as webhook fallback for payments.

> Get your credentials at the [Mercado Pago developers panel](https://www.mercadopago.cl/developers/panel) → *Your business → Settings → Production / Test credentials*.

---

## Flow 1: One-time payment (Checkout Pro)

1. Administrator generates a collection (amount, concept, unit, payer email).
2. Backend creates a **preference** in Mercado Pago with `external_reference = "comunidad_id|unit"`, applying the total with 5%.
3. Returns the **payment point** (`init_point`); in sandbox uses `sandbox_init_point`.
4. Neighbor opens the link and pays.
5. Mercado Pago notifies the **webhook**, which reconciles the payment.

## Flow 2: Automatic payment (Preapproval / subscription)

1. Administrator (or superadmin, for invoices) creates a subscription with monthly amount.
2. Backend creates a **preapproval** in Mercado Pago, restricted to **credit card** (`payment_methods_allowed.payment_types = [credit_card]`), with total monthly including 5%.
3. Returns the **authorization link**; neighbor opens it and authorizes the charge with their card.
4. Mercado Pago charges **automatically every month**.
5. Subscription can be **canceled** from the panel (becomes `CANCELED`).

> Recurring preapproval payments **only accept credit cards** per Mercado Pago policy — that's why the subscription is restricted to that method.

## Flow 3: Webhook and reconciliation

The public webhook is `POST /api/mp/webhook` (called by Mercado Pago; requires `BASE_URL` configured).

When a payment notification arrives:
1. Payment is verified against Mercado Pago API (with platform token or community's).
2. If `approved` and not processed before (idempotency by reference `MP-<payment_id>`):
   - `Pago` is registered.
   - Latest pending collection for that unit is marked `PAID`.
   - A reconciled income `Movimiento` is added (appears in Transparency).

---

## Railway configuration (backend)

| Variable | Description |
|---|---|
| `BASE_URL` | Backend public URL. Required for webhook `notification_url`/`back_url` and preapprovals |
| `MP_ACCESS_TOKEN` | *(optional)* platform token, used as webhook fallback |

Each community's and platform's credentials are saved in the database (not environment variables), configured from the interface.

---

## Testing in sandbox

Use test tokens (`TEST-...`) and Mercado Pago sandbox cards:

| Result | Card |
|---|---|
| Approved | `4509 9535 6623 3704` |
| Rejected | `4000 0000 0000 0002` |
| Pending | `5031 7557 3453 0604` |

- Expiration and CVV: any future value.
- In sandbox the payment point points to `sandbox.mercadopago.cl`.

---

## Checklist for going to production

1. [ ] Replace `TEST-` tokens with `APP_USR-` (production) in each community.
2. [ ] Configure platform account with production tokens.
3. [ ] Verify `BASE_URL` and `FRONTEND_URL` are public URLs (https).
4. [ ] Test a low-amount real payment and confirm reconciliation in Transparency.
5. [ ] Check in Mercado Pago panel that webhook is active.

## Common errors

| Error | Cause | Solution |
|---|---|---|
| "Mercado Pago rejected Access Token (HTTP 401)" | Invalid or expired token | Regenerate token in developers panel |
| "Configure credentials first..." | Community/platform hasn't saved credentials yet | Configure them from interface before collecting |
| Webhook doesn't reconcile | `BASE_URL` is not public or URL doesn't reach backend | Define `BASE_URL` with https and redeploy |
| Subscription doesn't accept debit | Preapprovals only accept credit | This is expected behavior |
