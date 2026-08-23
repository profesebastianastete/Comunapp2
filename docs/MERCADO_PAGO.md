# Mercado Pago en ComunApp — Guía de configuración real

ComunApp integra **Checkout Pro** de Mercado Pago. Cada comunidad usa **su propia cuenta**
(sus credenciales), y el backend crea los cobros y concilia los pagos automáticamente.

---

## 1. Conceptos rápidos

| Credencial | Para qué sirve | Dónde se usa |
|---|---|---|
| **Access Token** | Crear cobros y verificar pagos (operaciones sensibles) | **Solo en el backend** (nunca en el navegador) |
| **Public Key** | Identificar tu cuenta en el navegador (punto de pago, Bricks) | Frontend |

| Modo | Token empieza por… | Dinero |
|---|---|---|
| **Sandbox** (pruebas) | `TEST-` | No. Pagos simulados con tarjetas de prueba |
| **Producción** | `APP_USR-` | Sí. Cobros reales |

> Recomendación: configura primero **Sandbox**, verifica que todo funcione y luego
> cambia a **Producción** con sus credenciales.

---

## 2. Obtener las credenciales

1. Entra al **panel de desarrolladores**: <https://www.mercadopago.cl/developers/panel>
   (cambia el dominio según tu país: `.com.ar`, `.com.mx`, `.com.br`…).
2. Ve a **Tu negocio → Configuración → Credenciales**.
3. Copia:
   - **Credenciales de prueba** → `Access Token (TEST-…)` y `Public Key (TEST-…)`.
   - **Credenciales de producción** → `Access Token (APP_USR-…)` y `Public Key (APP_USR-…)`.

---

## 3. Configurar una comunidad (panel del Administrador)

1. Entra como **Administrador** de la comunidad.
2. Menú lateral → **Cobros en línea** → botón **«Configurar Mercado Pago»**.
3. Completa:
   - **Access Token** (`TEST-…` o `APP_USR-…`)
   - **Public Key**
   - **Correo de la cuenta** de Mercado Pago
   - **Modo**: Sandbox o Producción
4. Guarda. Usa **«Probar conexión»**: el backend llama a `GET /users/me` de Mercado Pago
   y confirma la cuenta y el sitio (`MLC`, `MLA`, …).

Las credenciales quedan guardadas en la base de datos del tenant y **solo el backend las lee**.

---

## 4. Generar cobros

Hay dos formas (ambas usan la API oficial `POST /checkout/preferences`):

### A. Desde el panel del Super Admin (`/adminapp` → pestaña «Cobros MP»)
- Elige la comunidad, monto, concepto, unidad y (opcional) correo del pagador.
- Al generar, ComunApp crea la preferencia **con las credenciales de esa comunidad** y
  devuelve el **punto de pago** (`init_point`), con botones para copiarlo o abrirlo.
- Envíale ese enlace al vecino: al pagarlo, el webhook concilia solo.

### B. Desde el panel de la comunidad
- El administrador genera los «Pagos del mes» y los vecinos pagan desde «Tus Pagos».
- Con Mercado Pago vinculado, el pago abre el Checkout Pro de la comunidad.

---

## 5. El webhook (conciliación automática)

Cuando un pago se **aprueba**, Mercado Pago notifica a:

```
POST  https://TU-API.up.railway.app/api/mp/webhook
```

El backend:
1. Consulta `GET /v1/payments/{id}` para verificar el estado real del pago.
2. Si está `approved`, registra el **Pago**, marca el **cobro pendiente** de la unidad como
   `PAGADO` y crea un **Movimiento de ingreso conciliado** (Transparencia).
3. Ignora duplicados (misma referencia `MP-{payment_id}`) y eventos que no sean pagos.

### Configurar la URL del webhook

**Opción recomendada (automática):** define la variable de entorno del backend

```
BASE_URL = https://TU-API.up.railway.app
```

ComunApp envía `notification_url` en cada preferencia, así que no hay que configurar
nada en el panel de Mercado Pago.

**Opción alternativa (global):** en el panel de Mercado Pago →
*Tu negocio → Configuración → Webhooks* agrega la URL anterior y suscribe
el evento **Pagos**.

> ⚠️ El webhook es público pero **verifica cada pago contra la API de Mercado Pago**
> antes de conciliar: un atacante no puede marcar pagos falsos enviando JSON al endpoint.

---

## 6. Variables de entorno (Railway → Variables del servicio backend)

| Variable | Valor | Obligatoria |
|---|---|---|
| `DATABASE_URL` | la genera Railway al conectar PostgreSQL | sí |
| `SECRET_KEY` | clave larga aleatoria para los JWT | sí |
| `CORS_ORIGINS` | `https://TU-FRONTEND.up.railway.app` | sí |
| `BASE_URL` | `https://TU-API.up.railway.app` (para el webhook) | recomendada |
| `FRONTEND_URL` | `https://TU-FRONTEND.up.railway.app` (botones de vuelta) | opcional |
| `MP_ACCESS_TOKEN` | token de la **plataforma** (fallback del webhook) | opcional |

---

## 7. Probar sin dinero real (Sandbox)

1. Configura la comunidad con credenciales `TEST-` y modo **Sandbox**.
2. Genera un cobro → copia el punto de pago → ábrelo.
3. Inicia sesión con tu cuenta de prueba de Mercado Pago.
4. Paga con una **tarjeta de prueba**:

| Tarjeta | Número | Resultado |
|---|---|---|
| Visa | `4509 9535 6623 3704` | Aprobada |
| Mastercard | `5031 7557 3453 0604` | Rechazada |
| Visa | `4000 0000 0000 0002` | Pendiente |

   CVV cualquiera · vencimiento futuro · DNI cualquiera.
5. El webhook llega igual que en producción y verás el pago conciliado en Transparencia.

---

## 8. Pasar a Producción

1. Repite el paso 3 con las credenciales `APP_USR-…` y modo **Producción**.
2. Vuelve a probar conexión.
3. Los puntos de pago generados desde ese momento cobran dinero real en la cuenta
   de la comunidad.

---

## 9. Resolución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| «Mercado Pago rechazó el Access Token (HTTP 401)» | Token vencido o de otro sitio | Regenera credenciales en el panel MP |
| El cobro se crea pero no llega el webhook | `BASE_URL` sin definir o URL interna | Define `BASE_URL` con la URL pública de Railway |
| Pago aprobado no se concilia | `external_reference` sin comunidad | Genera el cobro desde ComunApp (no directo en MP) |
| Moneda incorrecta | Cuenta de otro país | MP usa la moneda de la cuenta; crea la cuenta en tu país |
| Error `currency_id` al crear preferencia | No se envía (ComunApp usa la de tu cuenta) | Verifica que el monto sea mayor a 0 |

---

## 10. Seguridad (resumen)

- El **Access Token nunca sale del backend**: el navegador solo ve la Public Key y el
  punto de pago (`init_point`).
- El webhook **re-verifica cada pago** contra `GET /v1/payments/{id}`.
- Las credenciales se leen solo con rol `ADMIN` de la propia comunidad (o `SUPERADMIN`).
- En producción, considera cifrar `mp_access_token` en reposo y rotarlo periódicamente
  desde el panel de Mercado Pago.
