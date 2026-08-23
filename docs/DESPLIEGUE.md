# Guía de despliegue — ComunApp en Railway

Esta guía deja la aplicación **100% funcional** con base de datos **PostgreSQL** persistente.
Sigue los pasos en orden. Tiempo estimado: **15 minutos**.

---

## 🗺 Arquitectura del despliegue

ComunApp corre como **3 servicios** dentro de un mismo proyecto de Railway:

```
┌───────────────────────────────────────────────────────────┐
│  PROYECTO RAILWAY: ComunApp                               │
│                                                           │
│   ┌──────────────┐    ┌──────────────┐    ┌─────────────┐ │
│   │  FRONTEND    │───▶│   BACKEND    │───▶│ POSTGRESQL  │ │
│   │  (Vite/React)│    │  (FastAPI)   │    │  (base de   │ │
│   │              │    │              │    │   datos)    │ │
│   │  railway.toml│    │  railway.toml│    │             │ │
│   └──────────────┘    └──────────────┘    └─────────────┘ │
│         │                    │                            │
│   VITE_API_URL ─────▶ CORS_ORIGINS ◀────── DATABASE_URL   │
└───────────────────────────────────────────────────────────┘
```

| Servicio | Carpeta del repo | Qué hace |
|---|---|---|
| **Frontend** | raíz (`/`) | Sirve la app React compilada (`server.mjs` + `railway.toml`) |
| **Backend** | `/backend` | API FastAPI: auth, RBAC, cobros, Mercado Pago |
| **PostgreSQL** | (servicio gestionado) | Base de datos persistente. Railway inyecta `DATABASE_URL` |

---

## 🔑 Paso 0 — Variables de entorno (tabla maestra)

Ten a mano esta tabla. Reemplaza `TU-BACKEND` y `TU-FRONTEND` por los nombres
que Railway asigne a cada servicio (visibles en la URL pública de cada uno).

| # | Servicio | Variable | Valor | ¿Obligatoria? |
|---|---|---|---|---|
| 1 | **Frontend** | `VITE_API_URL` | `https://TU-BACKEND.up.railway.app` | ✅ SÍ — sin ella la app usa datos locales |
| 2 | **Backend** | `CORS_ORIGINS` | `https://TU-FRONTEND.up.railway.app` | ✅ SÍ — sin ella el navegador bloquea las llamadas |
| 3 | **Backend** | `SECRET_KEY` | texto largo y aleatorio (≥ 64 caracteres) | ✅ SÍ — firma las sesiones JWT |
| 4 | **Backend** | `BASE_URL` | `https://TU-BACKEND.up.railway.app` | ✅ SÍ — la usa Mercado Pago para el webhook |
| 5 | **Backend** | `FRONTEND_URL` | `https://TU-FRONTEND.up.railway.app` | ⚪ Recomendada — botón de vuelta del Checkout Pro |
| 6 | **Backend** | `DATABASE_URL` | (no la escribas: la inyecta el servicio PostgreSQL) | ✅ Automática |
| 7 | **Backend** | `MP_ACCESS_TOKEN` | token de tu cuenta MP de plataforma | ⚪ Opcional |

> **Reglas:** sin espacios, sin `/` al final, sin comillas.
> En Railway: cada servicio → **Variables → New Variable** (o *Raw Editor* para pegar varias).

---

## 🐘 Paso 1 — Activar PostgreSQL (la base de datos)

Esto es lo que hace que los datos **persistan**. Sin este paso el backend usa un
SQLite temporal que **se borra en cada redeploy**.

1. En Railway, abre tu proyecto.
2. Haz clic en **`+ New`** (junto a tus servicios) → **Database** → **Add PostgreSQL**.
3. Railway crea el servicio y **agrega automáticamente** la variable `DATABASE_URL`
   al servicio backend (con la referencia privada `${{Postgres.DATABASE_URL}}`).
   **No la escribas a mano.**
4. El backend se redeployará solo. El código detecta la variable automáticamente
   (ver `backend/config.py`: *"Railway inyecta DATABASE_URL (PostgreSQL). En local cae a SQLite"*).

### ✅ Verificación

Abre en el navegador:

```
https://TU-BACKEND.up.railway.app/api/diagnostico
```

Debe responder:

```json
{ "status": "ok", "usuarios": 6, "comunidades": 2, "base": "postgresql" }
```

- Si dice `"base": "postgresql"` → **correcto**.
- Si dice `"base": "sqlite"` → la variable `DATABASE_URL` no llegó al backend. Revisa el Paso 1.

> El backend crea las tablas automáticamente al arrancar (`Base.metadata.create_all`)
> y siembra los datos iniciales la primera vez (bootstrap en `backend/main.py`).

---

## 🚀 Paso 2 — Desplegar el Backend (FastAPI)

1. En Railway: **`+ New` → GitHub Repo** y selecciona el repositorio.
2. Railway detectará el monorepo. Configura el servicio para usar la carpeta **`backend`**:
   - **Service → Settings → Source → Root Directory** = `backend`
   - (o usa el `backend/railway.toml`, que ya define builder y comando de arranque)
3. Agrega las variables del Paso 0 que corresponden al backend:
   `CORS_ORIGINS`, `SECRET_KEY`, `BASE_URL`, `FRONTEND_URL` (y `MP_ACCESS_TOKEN` si lo tienes).
4. Railway despliega. Revisa los **Logs**: debe aparecer la línea

   ```
   [bootstrap] Base vacía → datos demo sembrados (superadmin: equipo@comunapp.cl / admin123)
   ```

   (o `[bootstrap] Base con datos → no se siembra.` si ya existía la base).

### ✅ Verificación

- `https://TU-BACKEND.up.railway.app/docs` → Swagger de la API.
- `https://TU-BACKEND.up.railway.app/health` → `{"status":"ok"}`.

---

## 🌐 Paso 3 — Desplegar el Frontend (React)

1. Crea un **segundo servicio** en el mismo proyecto, apuntando al **mismo repo**
   pero con **Root Directory = raíz** (`.`). Usa el `railway.toml` de la raíz,
   que ya define: build con Node 22 + `npm run build`, y arranque con `server.mjs`.
2. Agrega la variable del frontend:
   - `VITE_API_URL` = `https://TU-BACKEND.up.railway.app`

   > ⚠️ **Importante:** `VITE_API_URL` se inyecta **en el momento del build**, no en
   > ejecución. Si la agregas *después* de un deploy, fuerza un **Redeploy**
   > (Settings → Deploy → Redeploy) para que se "hornee" en el bundle.
3. Railway compila y despliega. Abre `https://TU-FRONTEND.up.railway.app`.

### ✅ Verificación

En tu sitio, abre la consola del navegador (F12 → pestaña **Network**) e intenta
entrar. Debes ver llamadas a `https://TU-BACKEND.up.railway.app/api/auth/login`
respondiendo **200**. Si las ves, estás en **modo real** (base PostgreSQL).

---

## 🔐 Paso 4 — Cuentas de acceso

Tras el bootstrap, estas cuentas existen en la base:

| Rol | Correo | Contraseña |
|---|---|---|
| **Superadmin** (Sebastián Astete) | `equipo@comunapp.cl` | `admin123` |
| Administrador · Los Álamos | `admin@losalamos.cl` | `admin123` |
| Comité · Los Álamos | `comite@losalamos.cl` | `comite123` |
| Propietaria · P-14 | `maria@demo.cl` | `demo123` |
| Arrendatario · P-07 | `jorge@demo.cl` | `demo123` |
| Administradora · Torres del Parque | `sofia@torresdelparque.cl` | `admin123` |

> 🔒 **Cambia la contraseña del superadmin** en producción desde el panel `/adminapp`
> (ícono de llave) o vía `PUT /api/saas/usuarios/{id}/password`.

---

## 🛠 Mantenimiento y resolución de problemas

### El login dice "Failed to fetch"
El backend está **dormido** (plan gratuito) o caído. El cliente reintenta 3 veces
para despertarlo. Si persiste, revisa los **Logs** del backend y que `VITE_API_URL`
apunte a la URL correcta (y hayas hecho Redeploy del frontend).

### La app entra pero muestra "copia local"
`VITE_API_URL` no está horneada en el bundle. Fuerza un **Redeploy** del frontend.

### Las credenciales dejan de funcionar tras un redeploy
Significa que la base es **SQLite temporal** (se borra). Activa PostgreSQL (Paso 1).
Mientras tanto, recupera el acceso con:

```bash
# En Railway → Backend → pestaña Shell
python3 seed.py --reset-passwords
```

### Quiero re-sembrar datos o reparar contraseñas
```bash
# Railway → Backend → Shell
python3 seed.py                      # siembra sin tocar contraseñas existentes
python3 seed.py --reset-passwords    # además restaura las contraseñas de las cuentas base
```

### Ver el estado de la base en cualquier momento
```
https://TU-BACKEND.up.railway.app/api/diagnostico
```

---

## 📁 Archivos de configuración clave

| Archivo | Propósito |
|---|---|
| `railway.toml` (raíz) | Build y arranque del **frontend** (Node 22 + `server.mjs`) |
| `server.mjs` | Servidor estático del frontend con fallback SPA (`/dashboard`, `/adminapp`) |
| `backend/railway.toml` | Build y arranque del **backend** (uvicorn) |
| `backend/Procfile` | Alternativa de arranque (`web: uvicorn main:app`) |
| `backend/config.py` | Lee todas las variables de entorno (con valores por defecto locales) |
| `backend/database.py` | Conexión SQLAlchemy: PostgreSQL si hay `DATABASE_URL`, si no SQLite |
| `backend/main.py` | Arranque: crea tablas + bootstrap de datos iniciales |
| `backend/seed.py` | Siembra/repara datos (`python3 seed.py [--reset-passwords]`) |
| `.env.example` | Plantilla de variables del **frontend** |
| `backend/.env.example` | Plantilla de variables del **backend** |

---

## 💻 Desarrollo local (opcional)

### Frontend
```bash
npm install
npm run dev          # http://localhost:3000 (usa datos locales si no hay VITE_API_URL)
```

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 seed.py                                     # siembra datos en SQLite local
uvicorn main:app --reload --port 8000               # http://localhost:8000/docs
```

### Conectar el frontend local al backend local
Crea un archivo `.env` en la raíz:
```
VITE_API_URL=http://localhost:8000
```
Y reinicia `npm run dev`.

---

Última actualización: despliegue con PostgreSQL persistente en Railway.
