# Credenciales y roles

ComunApp **ya no siembra comunidades ni vecinos demo**: solo existe la cuenta del superadmin. Las comunidades reales las crea el administrador desde el panel, y cada vecino recibe un **correo de confirmación** al ser dado de alta.

## Cuenta inicial

| Rol | Nombre | Correo | Contraseña | Acceso |
|---|---|---|---|---|
| **Superadmin** | Sebastián Astete | `equipo@comunapp.cl` | `admin123` | Panel interno `/adminapp` |

## Limpieza de datos demo antiguos

Si tu base viene de un despliegue antiguo (con "Los Álamos" / "Torres del Parque" y cuentas `@demo.cl`), elimínalos con:

```bash
python3 seed.py --clean-demo
```

También puedes eliminar cualquier comunidad desde el panel del superadmin (pestaña **Tenants** → botón **Eliminar**).

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
