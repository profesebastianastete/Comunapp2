# Referencia de la API

Backend FastAPI de ComunApp. Base URL: la definida en `VITE_API_URL` (o `http://127.0.0.1:8000` en local). Documentación interactiva en `/docs` (Swagger).

**Autenticación:** todos los endpoints protegidos esperan el header `Authorization: Bearer <token>`, obtenido en `POST /api/auth/login`. Los roles se validan con guardas RBAC:

- `GESTION` = `ADMIN`, `COMITE`
- `RESIDENTES` = `PROPIETARIO`, `ARRENDATARIO`

El **multi-tenant** se garantiza porque cada consulta filtra por `comunidad_id` y los roles de comunidad solo pueden operar sobre la suya.

---

## Autenticación

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | público | Devuelve token JWT + sesión |
| GET | `/api/me` | autenticado | Perfil del usuario actual |
| POST | `/api/auth/cambiar-password` | autenticado | Cambia la contraseña propia (pide la actual) |

## Comunidad (requieren membresía)

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| GET | `/api/comunidades/{cid}/datos` | autenticado | Todo el estado de la comunidad (cobros, pagos, movimientos, avisos, reservas, votaciones, bitácora, suscripciones) |
| POST | `/api/comunidades/{cid}/cobros/generar` | GESTION | Genera los pagos del mes para todas las unidades |
| POST | `/api/comunidades/{cid}/pagos/cobro/{cobro_id}` | RESIDENTES | Un vecino paga su cobro (Mercado Pago) |
| POST | `/api/comunidades/{cid}/pagos/registrar` | GESTION | El admin registra un pago manual |
| POST | `/api/comunidades/{cid}/movimientos` | GESTION | Registra un gasto/ingreso (Transparencia) |
| POST | `/api/comunidades/{cid}/importar` | GESTION | Importa la comunidad desde CSV |
| POST | `/api/comunidades/{cid}/avisos` | GESTION | Publica un aviso |
| POST | `/api/comunidades/{cid}/reservas` | RESIDENTES, GESTION | Reserva un espacio común |
| DELETE | `/api/comunidades/{cid}/reservas/{rid}` | RESIDENTES, GESTION | Cancela una reserva |
| POST | `/api/comunidades/{cid}/votaciones` | GESTION | Crea una votación |
| POST | `/api/comunidades/{cid}/votaciones/{vid}/votar` | RESIDENTES | Emite un voto (1 por unidad) |
| POST | `/api/comunidades/{cid}/accesos` | GESTION | Registra una visita/proveedor |
| POST | `/api/comunidades/{cid}/accesos/{rid}/salida` | GESTION | Marca la salida |
| POST | `/api/comunidades/{cid}/vecinos` | ADMIN | Crea un vecino con acceso |

## Mercado Pago (comunidad)

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| POST | `/api/comunidades/{cid}/mp/configurar` | ADMIN | Guarda Access Token y Public Key de la comunidad |
| POST | `/api/comunidades/{cid}/mp/probar` | ADMIN, COMITE | Verifica la conexión contra `/users/me` |
| POST | `/api/comunidades/{cid}/mp/desvincular` | ADMIN | Borra las credenciales |
| POST | `/api/comunidades/{cid}/mp/cobros` | ADMIN | Crea un punto de pago (Checkout Pro) con el 5% de comisiones |
| POST | `/api/comunidades/{cid}/suscripciones` | GESTION | Crea una suscripción mensual (preapproval, solo tarjeta) |
| POST | `/api/comunidades/{cid}/suscripciones/{sid}/cancelar` | GESTION | Cancela una suscripción |

## Webhook

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| POST | `/api/mp/webhook` | público (verificado con MP) | Recibe notificaciones de pago y concilia |

## SaaS / Superadmin

Todos requieren rol `SUPERADMIN`.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/saas/listado` | Comunidades, usuarios, facturas, planes, métricas y configuración de plataforma |
| POST | `/api/saas/comunidades` | Crea una comunidad (tenant) + su admin |
| POST | `/api/saas/comunidades/{cid}/toggle-estado` | Activa/suspende una comunidad |
| POST | `/api/saas/usuarios` | Crea un usuario en cualquier rol |
| POST | `/api/saas/usuarios/{uid}/password` | Redefine la contraseña de un usuario |
| POST | `/api/saas/usuarios/{uid}/toggle-activo` | Activa/suspende un usuario |
| POST | `/api/saas/facturas/generar` | Genera la facturación mensual a las comunidades |
| POST | `/api/saas/facturas/{fid}/pagar` | Marca una factura como pagada |
| POST | `/api/saas/facturas/{fid}/cobrar-mp` | Punto de pago MP por la factura (con 5%) |
| POST | `/api/saas/facturas/{fid}/suscribir-mp` | Suscripción mensual de la comunidad (con 5%) |

## Planes (Superadmin)

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/saas/planes` | Crea un plan (nombre + precio) |
| POST | `/api/saas/planes/{pid}` | Edita nombre/precio/estado de un plan |
| DELETE | `/api/saas/planes/{pid}` | Elimina un plan (si no tiene comunidades asignadas) |

## Cuenta Mercado Pago de la plataforma (Superadmin)

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/saas/mp-plataforma/configurar` | Guarda las credenciales de la plataforma |
| POST | `/api/saas/mp-plataforma/probar` | Verifica la conexión |
| POST | `/api/saas/mp-plataforma/desvincular` | Borra las credenciales |

## Sistema

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio (lo usa Railway) |
| GET | `/api/diagnostico` | Conteo de usuarios/comunidades y tipo de base |
| GET | `/` | Información básica y enlaces |

---

## Códigos de respuesta

- `200/201` — éxito.
- `400` — datos inválidos (ej. monto ≤ 0, contraseña corta).
- `401` — sin token o credenciales incorrectas.
- `403` — rol sin permisos para la acción.
- `404` — recurso no encontrado.
- `409` — conflicto (ej. plan en uso, email duplicado).
- `502` — Mercado Pago rechazó la operación (se incluye el detalle).
