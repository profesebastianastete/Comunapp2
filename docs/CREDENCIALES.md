# Credenciales y roles

Cuentas de demostración que siembra `backend/seed.py` (y el bootstrap en el primer arranque). Son idempotentes: repetir el seed no las duplica.

## Cuentas demo

| Rol | Nombre | Correo | Contraseña | Comunidad / Unidad |
|---|---|---|---|---|
| **Superadmin** | Sebastián Astete | `equipo@comunapp.cl` | `admin123` | — (toda la plataforma) |
| Administrador | Rodrigo Fuentes | `admin@losalamos.cl` | `admin123` | Los Álamos |
| Comité | Carla Méndez | `comite@losalamos.cl` | `comite123` | Los Álamos |
| Propietaria | María López | `maria@demo.cl` | `demo123` | Los Álamos · P-14 |
| Arrendatario | Jorge Salas | `jorge@demo.cl` | `demo123` | Los Álamos · P-07 |
| Administradora | Sofía Núñez | `sofia@torresdelparque.cl` | `admin123` | Torres del Parque |

## Comunidades demo

| Comunidad | Ciudad | Unidades | Plan |
|---|---|---|---|
| Los Álamos | Pucón | 28 | Comunidad de Parcelas |
| Torres del Parque | Temuco | 42 | Comité |

## Qué puede hacer cada rol

| Capacidad | Superadmin | Admin | Comité | Propietario | Arrendatario |
|---|---|---|---|---|---|
| Entrar a `/adminapp` (panel interno) | ✅ | — | — | — | — |
| Gestionar comunidades/usuarios/planes | ✅ | — | — | — | — |
| Configurar Mercado Pago de la comunidad | — | ✅ | — | — | — |
| Generar cobros, registrar pagos | — | ✅ | ✅ | — | — |
| Registrar gastos/ingresos (Transparencia) | — | ✅ | ✅ | — | — |
| Importar comunidad (CSV) | — | ✅ | ✅ | — | — |
| Crear avisos, votaciones, reservas | — | ✅ | ✅ | — | — |
| Ver Transparencia (lectura) | — | ✅ | ✅ | ✅ | ✅ |
| Pagar sus pagos del mes | — | — | — | ✅ | ✅ |
| Reservar espacios y votar | — | — | — | ✅ | — |

## Dónde entra cada rol

- Todos parten en `/entrar`.
- **Superadmin** es redirigido a `/adminapp`; el resto a `/dashboard`.
- `/adminapp` no tiene enlaces públicos: se escribe directo en la URL y exige rol Superadmin.

## Cambiar y recuperar contraseñas

- **Cualquier rol** cambia su propia contraseña desde el ícono de llave en la barra superior (pide la actual).
- **El superadmin** puede redefinir la contraseña de cualquier usuario desde `/adminapp` → Usuarios.
- **Recuperación de emergencia** (si nadie puede entrar), en la Shell del backend:
  ```bash
  python3 seed.py --reset-passwords
  ```
  Restaura las contraseñas demo de las cuentas originales sin tocar el resto de los datos.

> Las contraseñas se guardan con **PBKDF2-SHA256**. El login sigue aceptando hashes bcrypt antiguos y los migra automáticamente.
