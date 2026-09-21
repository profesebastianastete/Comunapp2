# Credentials and roles

ComunApp **no longer seeds demo communities or neighbors**: only the superadmin account exists. Real communities are created by the administrator from the panel, and each neighbor receives a **confirmation email** when added.

## Initial account

| Role | Name | Email | Password | Access |
|---|---|---|---|---|
| **Superadmin** | Sebastián Astete | `equipo@comunapp.cl` | `admin123` | Internal panel `/adminapp` |

## Cleaning old demo data

If your database comes from an old deployment (with "Los Álamos" / "Torres del Parque" and `@demo.cl` accounts), remove them with:

```bash
python3 seed.py --clean-demo
```

You can also delete any community from the superadmin panel (**Tenants** tab → **Delete** button).

## What each role can do

| Capability | Superadmin | Admin | Committee | Owner | Tenant |
|---|---|---|---|---|---|
| Access `/adminapp` (internal panel) | ✅ | — | — | — | — |
| Manage communities/users/plans | ✅ | — | — | — | — |
| Configure community Mercado Pago | — | ✅ | — | — | — |
| Generate charges, register payments | — | ✅ | ✅ | — | — |
| Register expenses/income (Transparency) | — | ✅ | ✅ | — | — |
| Import community (CSV) | — | ✅ | ✅ | — | — |
| Create notices, voting, reservations | — | ✅ | ✅ | — | — |
| View Transparency (read-only) | — | ✅ | ✅ | ✅ | ✅ |
| Pay monthly payments | — | — | — | ✅ | ✅ |
| Reserve spaces and vote | — | — | — | ✅ | — |

## Where each role logs in

- Everyone starts at `/entrar`.
- **Superadmin** is redirected to `/adminapp`; the rest to `/dashboard`.
- `/adminapp` has no public links: type it directly in the URL and requires Superadmin role.

## Changing and recovering passwords

- **Any role** changes their own password from the key icon in the top bar (asks for current password).
- **The superadmin** can redefine any user's password from `/adminapp` → Users.
- **Emergency recovery** (if no one can log in), in the backend Shell:
  ```bash
  python3 seed.py --reset-passwords
  ```
  Restores demo passwords of original accounts without touching other data.

> Passwords are saved with **PBKDF2-SHA256**. Login still accepts old bcrypt hashes and migrates them automatically.
