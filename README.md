# ComunApp

**Tu comunidad, administrada en orden.**

ComunApp es una plataforma web para la administración de comunidades de vecinos, parcelas y edificios: centraliza los pagos del mes, reservas, votaciones, avisos y el control de accesos en un solo lugar, con total transparencia sobre en qué se gasta el dinero.

---

## ✨ Qué incluye

| Vista | Ruta | Descripción |
|---|---|---|
| **Landing** | `/` | Sitio de venta: servicios, cómo funciona y planes |
| **Ingreso** | `/entrar` | Acceso para todos los roles (cuentas demo incluidas) |
| **Panel de usuario** | `/dashboard` | Tus Pagos, Pagos del mes, Transparencia, Reservas, Votaciones, Avisos y Bitácora |
| **Panel interno** | `/adminapp` | Ruta oculta para los dueños del software: tenants, facturación SaaS y métricas |

### Módulos destacados

- **Cobros en línea** — vinculación simple con Mercado Pago para que propietarios y arrendatarios paguen el mes desde el teléfono.
- **Importar Comunidad** — arrastra un CSV con columnas `Parcela, Propietario, Arrendatario (opcional), Contacto, Correo Electrónico, Deuda` y se crean vecinos, accesos y deudas iniciales.
- **Transparencia Activa** — el administrador registra gastos e ingresos y los gráficos de la comunidad se actualizan al instante.
- **Roles con permisos reales** — Superadmin, Administrador, Comité, Propietario y Arrendatario ven exactamente lo que les corresponde.

## 🚀 Inicio rápido

```bash
npm install
npm run dev        # abre http://localhost:3000
```

### Cuentas de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Superadmin (dueños del software) | `equipo@comunapp.cl` | `admin123` |
| Administrador | `admin@losalamos.cl` | `admin123` |
| Comité | `comite@losalamos.cl` | `comite123` |
| Propietaria | `maria@demo.cl` | `demo123` |
| Arrendatario | `jorge@demo.cl` | `demo123` |

> 💡 La ruta `/adminapp` no tiene enlaces públicos: escribe la URL directamente y entra con la cuenta de superadmin.

## 🏗 Compilar y ejecutar la versión final

```bash
npm run build      # genera la carpeta dist/
```

Luego usa los lanzadores incluidos (abren la app compilada en el navegador automáticamente):

- **Windows:** doble clic en `ejecutar-compilado.bat`
- **macOS / Linux:** `chmod +x ejecutar-compilado.sh && ./ejecutar-compilado.sh`

## 🐍 Backend en Python (FastAPI)

Los scripts `comunapp.bat` (Windows) y `comunapp.sh` (macOS/Linux) instalan el backend completo desde cero: crean la estructura, escriben el código (FastAPI + SQLAlchemy + JWT + webhook de Mercado Pago), instalan dependencias, siembran datos demo y levantan la API en `http://127.0.0.1:8000/docs`.

## 📤 Exportar a GitHub

Usa el asistente incluido:

- **Windows:** doble clic en `exportar-a-github.bat`
- **macOS / Linux:** `chmod +x exportar-a-github.sh && ./exportar-a-github.sh`

El asistente prepara el repositorio local y lo sube a GitHub (automático si tienes [GitHub CLI](https://cli.github.com), o conectándolo a un repo que ya hayas creado).

## 🗂 Estructura del proyecto

```
comunapp/
├── index.html                  # Entrada HTML
├── src/
│   ├── main.tsx                # Bootstrap de React
│   ├── App.tsx                 # Enrutador (/ · /dashboard · /adminapp)
│   ├── index.css               # Sistema de diseño (Tailwind v4)
│   ├── components/
│   │   ├── Landing.tsx         # Vista pública de venta
│   │   ├── Entrar.tsx          # Pantalla de ingreso
│   │   ├── Dashboard.tsx       # Panel de usuario final
│   │   ├── DashAdmin.tsx       # Módulos de administración y comité
│   │   ├── AdminApp.tsx        # Panel interno /adminapp
│   │   └── ui.tsx              # Componentes compartidos (Lucide)
│   └── lib/
│       └── store.ts            # Datos, roles, RBAC y acciones (simula la API)
├── comunapp.bat / comunapp.sh  # Instalador del backend Python
├── exportar-a-github.*         # Asistente de exportación a GitHub
├── ejecutar-compilado.*        # Lanzadores de la versión compilada
└── LEEME_PRIMERO.txt           # Guía de instalación paso a paso
```

## 🎨 Stack

- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** · **Lucide Icons**
- Tipografías: Bricolage Grotesque · Instrument Sans · Spline Sans Mono
- Backend de referencia: **Python · FastAPI · SQLAlchemy · JWT · PostgreSQL/SQLite**

## 📖 Glosario de producto

En todas las vistas de usuario se habla de **«comunidad»** y **«pagos del mes» / «tus pagos»**. El lenguaje es simple y directo, sin tecnicismos.

---

Licencia [MIT](LICENSE) · ComunApp
