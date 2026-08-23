# ComunApp

**Tu comunidad, administrada en orden.**

ComunApp es una plataforma web para la administración de comunidades de vecinos,
parcelas y edificios: centraliza los pagos del mes, reservas, votaciones, avisos y
el control de accesos en un solo lugar, con total transparencia sobre en qué se
gasta el dinero.

> 🚀 **Para desplegar en Railway con base de datos PostgreSQL, sigue la
> [Guía de despliegue](docs/DESPLIEGUE.md).**

---

## ✨ Qué incluye

| Vista | Ruta | Descripción |
|---|---|---|
| **Landing** | `/` | Sitio de venta: servicios, cómo funciona y planes |
| **Ingreso** | `/entrar` | Acceso para todos los roles |
| **Panel de usuario** | `/dashboard` | Tus Pagos, Pagos del mes, Transparencia, Reservas, Votaciones, Avisos y Bitácora |
| **Panel interno** | `/adminapp` | Ruta oculta para los dueños del software: tenants, planes, suscripciones, facturación y métricas |

### Módulos destacados

- **Cobros en línea** — vinculación con Mercado Pago para que propietarios y arrendatarios paguen el mes desde el teléfono.
- **Pagos automáticos** — suscripciones de Mercado Pago (creadas por administradores o comité) para que el mes se cobre solo con tarjeta de crédito.
- **Cobro a comunidades** — el superadmin genera los cobros mensuales del SaaS vía Mercado Pago, con comisión de aplicación.
- **Importar Comunidad** — arrastra un CSV con columnas `Parcela, Propietario, Arrendatario (opcional), Contacto, Correo Electrónico, Deuda` y se crean vecinos, accesos y deudas iniciales.
- **Transparencia Activa** — el administrador registra gastos e ingresos y los gráficos de la comunidad se actualizan al instante.
- **Roles con permisos reales** — Superadmin, Administrador, Comité, Propietario y Arrendatario ven exactamente lo que les corresponde.

---

## 🗂 Estructura del proyecto

```
comunapp/
├── index.html                 # Entrada HTML
├── railway.toml               # Despliegue del FRONTEND en Railway (Node 22)
├── server.mjs                 # Servidor estático del frontend (fallback SPA)
├── src/                       # FRONTEND · React + TypeScript + Tailwind v4
│   ├── main.tsx               # Bootstrap de React
│   ├── App.tsx                # Enrutador (/ · /entrar · /dashboard · /adminapp)
│   ├── index.css              # Sistema de diseño (Tailwind v4)
│   ├── components/
│   │   ├── Landing.tsx        # Vista pública de venta
│   │   ├── Entrar.tsx         # Pantalla de ingreso
│   │   ├── Dashboard.tsx      # Panel de usuario final
│   │   ├── DashAdmin.tsx      # Módulos de administración y comité
│   │   ├── AdminApp.tsx       # Panel interno /adminapp
│   │   └── ui.tsx             # Componentes compartidos (Lucide)
│   └── lib/
│       ├── api.ts             # Cliente HTTP real (habla con la API FastAPI)
│       └── store.ts           # Datos, roles, RBAC y acciones (API o datos locales)
├── backend/                   # BACKEND · Python · FastAPI (se despliega en Railway)
│   ├── railway.toml           # Despliegue del backend (uvicorn)
│   ├── Procfile               # Alternativa de arranque
│   ├── requirements.txt       # Dependencias Python
│   ├── main.py                # Arranque: tablas + bootstrap de datos
│   ├── config.py              # Variables de entorno
│   ├── database.py            # SQLAlchemy: PostgreSQL o SQLite
│   ├── models.py              # Modelo relacional multi-tenant
│   ├── auth.py                # Hash de contraseñas + JWT + RBAC
│   ├── seed.py                # Siembra/repara datos (python3 seed.py)
│   ├── serializers.py         # Conversión ORM → JSON
│   └── routers/
│       ├── api.py             # Endpoints: auth, comunidad, SaaS, planes, suscripciones
│       └── mp.py              # Mercado Pago: credenciales, cobros, webhook, suscripciones
├── docs/
│   ├── DESPLIEGUE.md          # ⭐ Guía Railway + PostgreSQL (empieza aquí)
│   └── MERCADO_PAGO.md        # Configuración de credenciales y cobros MP
├── scripts/                   # Utilitarios (exportar a GitHub, servir el build)
├── .env.example               # Plantilla de variables del frontend
└── .gitignore                 # El backend SÍ se sube; se excluyen caches y secretos
```

---

## 🔑 Cuentas de acceso

Tras el primer arranque (bootstrap) estas cuentas existen en la base:

| Rol | Correo | Contraseña |
|---|---|---|
| **Superadmin** (Sebastián Astete) | `equipo@comunapp.cl` | `admin123` |
| Administrador · Los Álamos | `admin@losalamos.cl` | `admin123` |
| Comité · Los Álamos | `comite@losalamos.cl` | `comite123` |
| Propietaria · P-14 | `maria@demo.cl` | `demo123` |
| Arrendatario · P-07 | `jorge@demo.cl` | `demo123` |
| Administradora · Torres del Parque | `sofia@torresdelparque.cl` | `admin123` |

> 💡 La ruta `/adminapp` no tiene enlaces públicos: escribe la URL directamente y
> entra con la cuenta de superadmin.

---

## 💻 Desarrollo local

### Frontend
```bash
npm install
npm run dev          # http://localhost:3000
```
Sin `VITE_API_URL`, la app opera con datos locales en el navegador (útil para
diseño y pruebas). Para conectarla a un backend, crea un `.env` en la raíz con
`VITE_API_URL=http://localhost:8000` y reinicia.

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 seed.py                                     # siembra datos en SQLite local
uvicorn main:app --reload --port 8000               # http://localhost:8000/docs
```

> 📖 El despliegue completo en Railway (frontend + backend + PostgreSQL) está
> documentado paso a paso en [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

---

## 🎨 Stack

- **Frontend:** React 18 · Vite · TypeScript · Tailwind CSS v4 · Lucide Icons
- **Tipografías:** Bricolage Grotesque · Instrument Sans · Spline Sans Mono
- **Backend:** Python · FastAPI · SQLAlchemy 2.0 · JWT (python-jose) · PBKDF2
- **Base de datos:** PostgreSQL (Railway) con fallback a SQLite en local
- **Pagos:** Mercado Pago (Checkout Pro + suscripciones + webhook)
- **Infraestructura:** Railway (3 servicios: frontend, backend, PostgreSQL)

## 📖 Glosario de producto

En todas las vistas de usuario se habla de **«comunidad»** y **«pagos del mes» /
«tus pagos»**. El lenguaje es simple y directo, sin tecnicismos.

---

Licencia [MIT](LICENSE) · ComunApp
