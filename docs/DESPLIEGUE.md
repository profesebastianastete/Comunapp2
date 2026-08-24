# Despliegue en Railway

Guía completa para subir ComunApp (frontend + backend + base de datos) a [Railway](https://railway.com). La aplicación corre en **modo real**: el frontend habla con la API y esta con PostgreSQL.

Se crean **dos servicios** en el mismo proyecto:

| Servicio | Carpeta (root) | Qué es |
|---|---|---|
| `backend` | `backend/` | API FastAPI |
| `frontend` | `/` (raíz) | App React compilada |

Además se agrega un **plugin PostgreSQL** que el backend consume.

---

## 1) Preparar el repositorio

Asegúrate de tener en el repo:
- La carpeta `backend/` completa.
- `railway.toml` en la raíz (configura el frontend).
- `backend/railway.toml` (configura el backend).
- Un `.gitignore` que **no** excluya `backend/`.

Haz push a GitHub (puedes usar `exportar-a-github.sh` / `.bat`).

---

## 2) Crear el proyecto y el backend

1. En Railway: **New Project → Deploy from GitHub repo** y elige tu repositorio.
2. Railway detectará un servicio. Renómbralo a **`backend`**.
3. En **Service → Settings → General → Root Directory** escribe `backend`.
4. **Agregar PostgreSQL:**
   - Botón **`+` → Database → PostgreSQL**.
   - Railway crea el servicio `PostgreSQL` con una variable `DATABASE_URL` interna.
5. **Conectar la base al backend:**
   - En el servicio `backend` → **Variables → New Variable → Add Reference**.
   - Referencia: `PostgreSQL` → `DATABASE_URL`.
6. **Variables del backend** (Service → Variables):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | *referencia a PostgreSQL* |
| `SECRET_KEY` | una cadena larga y aleatoria (ej. 64 caracteres) |
| `CORS_ORIGINS` | la URL pública del frontend (ver paso 4) |
| `BASE_URL` | la URL pública del **backend** (para el webhook de Mercado Pago) |
| `FRONTEND_URL` | la URL pública del **frontend** |
| `MP_ACCESS_TOKEN` | *(opcional)* token de plataforma para el fallback del webhook |

7. Railway usará `backend/railway.toml` (build con Nixpacks + `uvicorn`). Despliega.

> El **bootstrap** siembra automáticamente el superadmin y los datos demo la primera vez que la base está vacía. No necesitas correr `seed.py` manualmente tras el primer deploy.

---

## 3) Crear el frontend

1. **New Service → GitHub repo** (mismo repo). Renómbralo a **`frontend`**.
2. Root Directory: déjalo **vacío** (raíz).
3. **Variables** (Service → Variables):

| Variable | Valor |
|---|---|
| `VITE_API_URL` | la URL pública del **backend** (ej. `https://comunapp-backend.up.railway.app`) |

> ⚠️ `VITE_API_URL` se inyecta **en el build**. Si la defines o cambias después, haz **Deploy → Redeploy** del frontend.

4. Railway usará el `railway.toml` de la raíz (Node 22 + `npm install` + `npm run build` + servidor estático). Despliega.

---

## 4) Obtener las URLs públicas

Cada servicio: **Settings → Networking → Generate Domain**. Anota:
- URL del backend → va en `VITE_API_URL`, `BASE_URL` y `CORS_ORIGINS`.
- URL del frontend → va en `CORS_ORIGINS` y `FRONTEND_URL`.

Ejemplo final de `CORS_ORIGINS` (admite varias, separadas por coma):
```
https://comunapp-frontend.up.railway.app
```

---

## 5) Verificar que funciona

1. **Backend vivo:** abre `https://<backend>/health` → debe devolver `{"status":"ok",...}`.
2. **Datos sembrados:** abre `https://<backend>/api/diagnostico` → `"usuarios": 6` (o más) y `"base": "postgresql"`.
3. **Frontend:** abre la URL del frontend y entra con `equipo@comunapp.cl / admin123`. Debe llevarte a `/adminapp`.

---

## Solución de problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `EBUSY: rmdir node_modules/.cache` en el build | Railway monta un volumen de caché en `node_modules/.cache` que no se puede borrar | Ya resuelto en `railway.toml` (`rm -rf node_modules/*` + `npm install`). Si persiste, desactiva **Build Cache** una vez (Settings → Builds) |
| Warnings `EBADENGINE` (Tailwind exige Node ≥ 20) | Railway compilaba con Node 18 | Fijado con `NIXPACKS_NODE_VERSION = "22"` en `railway.toml` |
| "Esta instalación necesita su API" al abrir el frontend | `VITE_API_URL` no está definida o el build es anterior a definirla | Define la variable y haz **Redeploy** del frontend |
| "No se pudo conectar con el servidor" | El backend duerme (plan gratuito) o CORS mal configurado | Espera unos segundos y reintenta (la app reintenta sola). Revisa que `CORS_ORIGINS` incluya la URL del frontend |
| "Contraseña no reconocida" | Base con hashes antiguos o datos corruptos | En **Shell** del backend: `python3 seed.py --reset-passwords` |
| El webhook de Mercado Pago no concilia | `BASE_URL` no apunta al backend público | Define `BASE_URL` con la URL pública del backend y redespliega |
| `python: command not found` en la Shell | El binario se llama `python3` | Usa `python3 seed.py ...` o `bash reset_passwords.sh` |

---

## Planes y costos

El plan gratuito (Trial) da $5 de crédito y topes de hardware muy superiores a lo que ComunApp consume. Para producción sostenida usa el plan **Hobby** o **Pro**. Detalle y límites de usuarios/comunidades en **[ESCALABILIDAD.md](ESCALABILIDAD.md)**.
