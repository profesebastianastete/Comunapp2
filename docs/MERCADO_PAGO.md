# Integración con Mercado Pago

ComunApp cobra a través de Mercado Pago usando **Checkout Pro** (pagos únicos) y **Preapproval** (suscripciones de pago automático). Esta guía explica la configuración, las comisiones y el flujo de conciliación.

---

## El modelo de comisiones (5%)

A **todo** cobro generado por Mercado Pago se le suma un **5%** de comisiones. Ese total es lo que efectivamente se le cobra al pagador:

| Concepto | % | Destino |
|---|---|---|
| Comisión de aplicación (ComunApp) | **3%** | La plataforma |
| Comisión de Mercado Pago | **2%** | Mercado Pago |
| **Total agregado** | **5%** | — |

**Ejemplo:** un pago del mes de `$55.000` se cobra como:
```
base            $55.000
+ 3% ComunApp   $ 1.650
+ 2% MercadoPago $ 1.100
──────────────────────
total a cobrar  $57.750
```

El cálculo está centralizado en el frontend (`calcularComision()` en `src/lib/store.ts`) y se replica en el backend (`backend/routers/mp.py`). **Nunca** se cobra solo la base: siempre base + 5%.

---

## Dos cuentas de Mercado Pago

Hay dos niveles de configuración, independientes entre sí:

### A) Cuenta de cada comunidad (la configuran sus administradores)

Desde el panel de la comunidad: **Cobros en línea → Configurar Mercado Pago**. Se guardan:
- **Access Token** (server-side): lo usa el backend para crear cobros y suscripciones.
- **Public Key** (client-side): la usa el navegador para el punto de pago.
- **Modo:** `sandbox` (pruebas, tokens que empiezan en `TEST-`) o `producción` (`APP_USR-`).

Con esta cuenta la comunidad:
- Genera **puntos de pago** por cobro (Checkout Pro).
- Crea **suscripciones** de pago automático para propietarios y arrendatarios.

### B) Cuenta de la plataforma (la configura el superadmin)

Desde `/adminapp` → pestaña de configuración de la plataforma. Es la cuenta **de ComunApp** y se usa para:
- Cobrar las **facturas mensuales del SaaS** a cada comunidad (con el 5% incluido).
- Crear **suscripciones SaaS** para que las comunidades paguen su cuenta automáticamente con tarjeta.
- Actuar como fallback del webhook de pagos.

> Obtén tus credenciales en el [panel de desarrolladores de Mercado Pago](https://www.mercadopago.cl/developers/panel) → *Tu negocio → Configuración → Credenciales de producción / de prueba*.

---

## Flujo 1: Pago único (Checkout Pro)

1. El administrador genera un cobro (monto, concepto, unidad, correo del pagador).
2. El backend crea una **preferencia** en Mercado Pago con `external_reference = "comunidad_id|unidad"`, aplicando el total con el 5%.
3. Se devuelve el **punto de pago** (`init_point`); en sandbox se usa `sandbox_init_point`.
4. El vecino abre el enlace y paga.
5. Mercado Pago notifica al **webhook**, que concilia el pago.

## Flujo 2: Pago automático (Preapproval / suscripción)

1. El administrador (o el superadmin, para facturas) crea una suscripción con monto mensual.
2. El backend crea un **preapproval** en Mercado Pago, restringido a **tarjeta de crédito** (`payment_methods_allowed.payment_types = [credit_card]`), con el total mensual incluido el 5%.
3. Se devuelve el **link de autorización**; el vecino lo abre y autoriza el cargo con su tarjeta.
4. Mercado Pago cobra **cada mes automáticamente**.
5. La suscripción puede **cancelarse** desde el panel (queda `CANCELADA`).

> Los preapproval de pago recurrente **solo aceptan tarjeta de crédito** por política de Mercado Pago — por eso la suscripción está restringida a ese medio.

## Flujo 3: Webhook y conciliación

El webhook público es `POST /api/mp/webhook` (lo llama Mercado Pago; requiere `BASE_URL` configurada).

Cuando llega una notificación de pago:
1. Se verifica el pago contra la API de Mercado Pago (con el token de plataforma o el de la comunidad).
2. Si está `approved` y no fue procesado antes (idempotencia por referencia `MP-<payment_id>`):
   - Se registra el `Pago`.
   - Se marca `PAGADO` el cobro pendiente más reciente de esa unidad.
   - Se agrega un `Movimiento` de ingreso ya conciliado (aparece en Transparencia).

---

## Configuración en Railway (backend)

| Variable | Descripción |
|---|---|
| `BASE_URL` | URL pública del backend. Necesaria para el `notification_url`/`back_url` del webhook y de los preapproval |
| `MP_ACCESS_TOKEN` | *(opcional)* token de la plataforma, usado como fallback por el webhook |

Las credenciales de cada comunidad y de la plataforma se guardan en la base (no en variables de entorno), configuradas desde la interfaz.

---

## Probar en sandbox

Usa tokens de prueba (`TEST-...`) y las tarjetas de sandbox de Mercado Pago:

| Resultado | Tarjeta |
|---|---|
| Aprobado | `4509 9535 6623 3704` |
| Rechazado | `4000 0000 0000 0002` |
| Pendiente | `5031 7557 3453 0604` |

- Vencimiento y CVV: cualquier valor futuro.
- En sandbox el punto de pago apunta a `sandbox.mercadopago.cl`.

---

## Checklist para pasar a producción

1. [ ] Reemplazar tokens `TEST-` por `APP_USR-` (producción) en cada comunidad.
2. [ ] Configurar la cuenta de plataforma con tokens de producción.
3. [ ] Verificar que `BASE_URL` y `FRONTEND_URL` sean las URLs públicas (https).
4. [ ] Probar un pago real de bajo monto y confirmar la conciliación en Transparencia.
5. [ ] Revisar en el panel de Mercado Pago que el webhook esté activo.

## Errores comunes

| Error | Causa | Solución |
|---|---|---|
| "Mercado Pago rechazó el Access Token (HTTP 401)" | Token inválido o vencido | Regenera el token en el panel de desarrolladores |
| "Configura primero las credenciales…" | La comunidad/plataforma aún no guarda credenciales | Configúralas desde la interfaz antes de cobrar |
| El webhook no concilia | `BASE_URL` no es pública o la URL no alcanza el backend | Define `BASE_URL` con https y redespliega |
| La suscripción no acepta débito | Los preapproval solo aceptan crédito | Es el comportamiento esperado |
