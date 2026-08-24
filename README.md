# ComunApp

**Tu comunidad, administrada en orden.**

ComunApp es una plataforma SaaS para administrar comunidades de vecinos, parcelas y edificios: centraliza los pagos del mes, reservas, votaciones, avisos y control de accesos en un solo lugar, con total transparencia sobre en qué se gasta el dinero y cobros en línea vía Mercado Pago.

> 🚀 **Modo real único.** La aplicación opera exclusivamente contra su API (FastAPI + PostgreSQL). No existe un "modo demo" con datos en el navegador: todo lo que ves viene de la base de datos.

---

## Arquitectura

```
┌──────────────────────┐    HTTPS · JWT     ┌────────────────────┐    SQL     ┌─────────────┐
│   Frontend (React)   │ ─────────────────▶ │   API (FastAPI)    │ ────────▶  │ PostgreSQL  │
│   Vite · Tailwind    │   VITE_API_URL     │   Railway          │ DATABASE_URL│  (Railway)  │
└──────────────────────┘                    └─────────┬──────────┘            └─────────────┘
                                                      │ HTTPS (cobros, suscripciones, webhook)
                                                      ▼
                                              ┌───────────────┐
                                              │ Mercado Pago  │
                                              └───────────────┘
```

- **Multi-tenant:** cada comunidad está aislada por su `comunidad_id` (índices + guardas en cada consulta).
- **RBAC:** 5 roles — Superadmin (plataforma), Administrador, Comité, Propietario, Arrendatario.
- **Comisiones:** a cada cobro de Mercado Pago se le suma un **5%** (3% ComunApp + 2% Mercado Pago). Ese total es lo que se cobra.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 · Vite · Tailwind CSS v4 · Lucide Icons |
| Tipografías | Bricolage Grotesque · Instrument Sans · Spline Sans Mono |
| Backend | Python · FastAPI · SQLAlchemy 2.0 · Pydantic v2 |
| Auth | JWT (`python-jose`) · contraseñas PBKDF2-SHA256 (stdlib) |
| Base de datos | PostgreSQL (Railway) · SQLite como fallback local |
| Pagos | Mercado Pago (Checkout Pro + Preapproval + Webhook) |

## Rutas

| Ruta | Vista | Acceso |
|---|---|---|
| `/` | Landing comercial | Público |
| `/entrar` | Ingreso | Público |
| `/dashboard` | Panel de usuario final | Sesión requerida |
| `/adminapp` | Panel interno de la plataforma | **Oculta** · solo Superadmin |

## Inicio rápido (local)

**Backend** (necesita Python 3.10+):
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 seed.py                # siembra datos demo (idempotente)
python3 -m uvicorn main:app --port 8000
```
Sin `DATABASE_URL` usa SQLite (`comunapp.db`). API en `http://127.0.0.1:8000/docs`.

**Frontend** (necesita Node 20+):
```bash
npm install
echo "VITE_API_URL=http://127.0.0.1:8000" > .env.local
npm run dev
```

## Despliegue en Railway

Guía paso a paso en **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**. Resumen:

1. **Servicio backend:** carpeta `backend/`, agregar plugin PostgreSQL y definir `SECRET_KEY`, `CORS_ORIGINS`, `BASE_URL`, `FRONTEND_URL`.
2. **Servicio frontend:** raíz del repo, definir `VITE_API_URL` con la URL pública del backend.
3. El bootstrap siembra los datos automáticamente en el primer arranque.

## Credenciales de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| **Superadmin** (Sebastián Astete) | `equipo@comunapp.cl` | `admin123` |
| Administrador (Rodrigo Fuentes) | `admin@losalamos.cl` | `admin123` |
| Comité (Carla Méndez) | `comite@losalamos.cl` | `comite123` |
| Propietaria (María López · P-14) | `maria@demo.cl` | `demo123` |
| Arrendatario (Jorge Salas · P-07) | `jorge@demo.cl` | `demo123` |

Detalle y recuperación en **[docs/CREDENCIALES.md](docs/CREDENCIALES.md)**.

## Módulos

- **Cobranza inteligente:** pagos del mes, cuotas y multas, con recordatorios.
- **Cobros en línea:** Mercado Pago con comisiones del 5% desglosadas.
- **Pagos automáticos:** suscripciones mensuales (preapproval) solo con tarjeta de crédito.
- **Transparencia activa:** registro de gastos/ingresos con gráficos en tiempo real.
- **Importar comunidad:** carga masiva por CSV (parcela, propietario, arrendatario, contacto, correo, deuda).
- **Reservas, votaciones, muro de avisos y control de acceso.**

## Glosario de producto

En todas las vistas de usuario se habla de **«comunidad»** (nunca "condominio") y **«pagos del mes» / «tus pagos»** (nunca "gastos comunes"). El lenguaje es simple y directo, sin tecnicismos.

## Documentación completa

| Documento | Contenido |
|---|---|
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Despliegue en Railway (paso a paso + solución de problemas) |
| [docs/MERCADO_PAGO.md](docs/MERCADO_PAGO.md) | Integración de pagos, comisiones y suscripciones |
| [docs/API.md](docs/API.md) | Referencia de endpoints de la API |
| [docs/CREDENCIALES.md](docs/CREDENCIALES.md) | Cuentas, roles y recuperación de contraseñas |
| [docs/ESCALABILIDAD.md](docs/ESCALABILIDAD.md) | Planes de Railway y límites de usuarios/comunidades |

## Estructura del proyecto

```
comunapp/
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # Enrutador (/, /entrar, /dashboard, /adminapp)
│   ├── index.css               # Sistema de diseño (Tailwind v4)
│   ├── components/
│   │   ├── Landing.tsx         # Vista pública
│   │   ├── Entrar.tsx          # Ingreso
│   │   ├── Dashboard.tsx       # Panel de usuario final
│   │   ├── DashAdmin.tsx       # Módulos de admin/comité
│   │   ├── AdminApp.tsx        # Panel interno /adminapp
│   │   └── ui.tsx              # Componentes compartidos
│   └── lib/
│       ├── store.ts            # Capa de datos (delega en la API)
│       └── api.ts              # Cliente HTTP real
├── backend/                    # API FastAPI (Railway)
│   ├── main.py · auth.py · config.py · database.py · models.py · serializers.py · seed.py
│   └── routers/ (api.py · mp.py)
└── docs/                       # Documentación
```

---

Licencia [MIT](LICENSE) · ComunApp
