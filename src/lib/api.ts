/**
 * Cliente HTTP real de ComunApp.
 *
 * Habla con la API FastAPI desplegada (Railway). El store (store.ts) delega
 * en este módulo cuando VITE_API_URL está definida; si no, usa el modo demo
 * (localStorage). Así la misma app corre en ambos escenarios.
 */
import type { FilaCSV, Pago, Sesion } from "./store";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
export const apiMode = Boolean(API_URL);

const TOKEN_KEY = "comunapp_token";

export function guardarToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function leerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  /** true cuando el servidor no respondió (caído, en reposo, sin red o CORS). */
  sinRed: boolean;
  constructor(status: number, mensaje: string, sinRed = false) {
    super(mensaje);
    this.status = status;
    this.sinRed = sinRed;
  }
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = leerToken();
  // Reintentos: el plan gratuito de Railway duerme el servicio tras inactividad;
  // el primer intento lo despierta, los siguientes ya lo encuentran arriba.
  let ultimoError: unknown = null;
  for (let intento = 0; intento < 3; intento++) {
    if (intento > 0) await espera(700 * intento);
    try {
      const res = await fetch(API_URL + path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
          ...(init.headers ?? {}),
        },
      });
      if (!res.ok) {
        let mensaje = "Error del servidor (" + res.status + ")";
        try {
          const body = await res.json();
          if (body?.detail) mensaje = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        } catch { /* sin cuerpo */ }
        throw new ApiError(res.status, mensaje);
      }
      return (await res.json()) as T;
    } catch (e) {
      // Si el servidor respondió con un error HTTP, no reintentar: propagar.
      if (e instanceof ApiError) throw e;
      // Error de red (TypeError "Failed to fetch"): el servidor no respondió.
      ultimoError = e;
    }
  }
  void ultimoError;
  // Incluye la URL intentada para facilitar el diagnóstico (CORS, URL incorrecta,
  // servicio dormido o sin dominio público).
  throw new ApiError(
    0,
    "No se pudo conectar con el servidor en " + (API_URL ?? "(sin URL)") +
    ". Puede estar en reposo o sin conexión: espera unos segundos y vuelve a intentar.",
    true,
  );
}

const get = <T>(path: string) => http<T>(path);
const post = <T>(path: string, body?: unknown) =>
  http<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const del = <T>(path: string) => http<T>(path, { method: "DELETE" });

/* ─────────────── auth ─────────────── */
export const me = () => get<import("./store").Usuario>("/api/me");

export async function login(email: string, password: string): Promise<Sesion> {
  const r = await post<{ token: string; usuarioId: string; rol: Sesion["rol"]; comunidadId: string | null; unidad: string | null }>(
    "/api/auth/login", { email, password });
  guardarToken(r.token);
  return { token: r.token, usuarioId: r.usuarioId, rol: r.rol, comunidadId: r.comunidadId, unidad: r.unidad };
}

/* ─────────────── datos de comunidad ─────────────── */
export const datosComunidad = (cid: string) => get<import("./store").DatosComunidad>(`/api/comunidades/${cid}/datos`);

/* ─────────────── cobranza ─────────────── */
export const generarMes = (cid: string, periodo: string, monto: number, motivo = "Pagos del mes") =>
  post<{ creados: number; periodo: string }>(`/api/comunidades/${cid}/cobros/generar`, { periodo, monto, motivo });

export const pagarCobro = (cid: string, cobroId: string) =>
  post<Pago>(`/api/comunidades/${cid}/pagos/cobro/${cobroId}`);

export const registrarPagoVecino = (cid: string, cobroId: string, metodo: string) =>
  post<{ ok: boolean }>(`/api/comunidades/${cid}/pagos/registrar`, { cobro_id: cobroId, metodo });

/* ─────────────── transparencia ─────────────── */
export const crearMovimiento = (cid: string, data: { tipo: string; categoria: string; descripcion: string; monto: number; fecha: string }) =>
  post(`/api/comunidades/${cid}/movimientos`, data);

/* ─────────────── Mercado Pago (configuración real) ─────────────── */
export const configurarMP = (cid: string, cfg: { accessToken: string; publicKey: string; email: string; modo?: string }) =>
  post<{ ok: boolean; cuenta?: string; siteId?: string; mensaje: string }>(`/api/comunidades/${cid}/mp/configurar`, {
    access_token: cfg.accessToken, public_key: cfg.publicKey, email: cfg.email, modo: cfg.modo,
  });
export const probarMP = (cid: string) =>
  post<{ ok: boolean; cuenta?: string; siteId?: string; mensaje: string }>(`/api/comunidades/${cid}/mp/probar`);
export const desvincularMP = (cid: string) =>
  post<{ ok: boolean }>(`/api/comunidades/${cid}/mp/desvincular`);

/** Genera un cobro real vía API de Mercado Pago (Checkout Pro) y devuelve el punto de pago.
 *  El backend aplica la comisión total del 5% (3% app + 2% MP) sobre el monto. */
export const generarCobroMP = (cid: string, data: { monto: number; concepto: string; unidad?: string; emailPagador?: string }) =>
  post<{ id: string; puntoDePago: string; monto: number; total: number; comisionApp: number; comisionMP: number; concepto: string; unidad?: string; creado: string; modo?: "sandbox" | "produccion" }>(
    `/api/comunidades/${cid}/mp/cobros`,
    { monto: data.monto, concepto: data.concepto, unidad: data.unidad, email_pagador: data.emailPagador },
  );

/* ─────────────── importación CSV ─────────────── */
export const importarCSV = (cid: string, filas: FilaCSV[]) =>
  post<{ parcelas: number; vecinos: number; cargos: number }>(`/api/comunidades/${cid}/importar`, { filas });

/* ─────────────── comunicación / comunidad ─────────────── */
export const crearAviso = (cid: string, data: { titulo: string; cuerpo: string; tipo: string; autor: string }) =>
  post(`/api/comunidades/${cid}/avisos`, data);

export const crearReserva = (cid: string, data: { area: string; fecha: string; bloque: string; unidad: string; residente: string }) =>
  post(`/api/comunidades/${cid}/reservas`, data);
export const cancelarReserva = (cid: string, reservaId: string) =>
  del<{ ok: boolean }>(`/api/comunidades/${cid}/reservas/${reservaId}`);

export const crearVotacion = (cid: string, data: { titulo: string; pregunta: string; opciones: string[] }) =>
  post(`/api/comunidades/${cid}/votaciones`, data);
export const votar = (cid: string, votacionId: string, unidad: string, opcion: string) =>
  post<{ ok: boolean }>(`/api/comunidades/${cid}/votaciones/${votacionId}/votar`, { unidad, opcion });

/* ─────────────── control de acceso ─────────────── */
export const registrarAcceso = (cid: string, data: { visitante: string; tipo: string; unidad: string }) =>
  post(`/api/comunidades/${cid}/accesos`, data);
export const marcarSalida = (cid: string, registroId: string) =>
  post<{ ok: boolean }>(`/api/comunidades/${cid}/accesos/${registroId}/salida`);

/* ─────────────── vecinos ─────────────── */
export const crearVecino = (cid: string, data: { nombre: string; email: string; password: string; rol: string; unidad?: string }) =>
  post<{ ok: boolean }>(`/api/comunidades/${cid}/vecinos`, data);

/* ─────────────── cuenta ─────────────── */
export const cambiarPassword = (actual: string, nueva: string) =>
  post<{ ok: boolean }>("/api/auth/cambiar-password", { actual, nueva });

/* ─────────────── SaaS / superadmin ─────────────── */
export const listadoSaaS = () => get<unknown>("/api/saas/listado");
export const generarFacturasMes = (periodo: string) =>
  post<{ creadas: number; total: number }>("/api/saas/facturas/generar", { periodo });
export const marcarFacturaPagada = (facturaId: string) =>
  post<{ ok: boolean }>(`/api/saas/facturas/${facturaId}/pagar`);
export const crearComunidadSaaS = (data: { nombre: string; direccion: string; ciudad: string; unidades: number; plan: string; emailAdmin: string; nombreAdmin: string }) =>
  post("/api/saas/comunidades", {
    nombre: data.nombre, direccion: data.direccion, ciudad: data.ciudad,
    unidades: data.unidades, plan: data.plan, email_admin: data.emailAdmin, nombre_admin: data.nombreAdmin,
  });
export const toggleEstadoComunidad = (cid: string) =>
  post<{ estado: string }>(`/api/saas/comunidades/${cid}/toggle-estado`).then((r) => r.estado);

/* ─────────────── planes dinámicos ─────────────── */
export const crearPlan = (data: { nombre: string; precio: number }) =>
  post<import("./store").Plan>("/api/saas/planes", { nombre: data.nombre, precio: data.precio });
export const actualizarPlan = (planId: string, data: { nombre?: string; precio?: number; activa?: boolean }) =>
  post(`/api/saas/planes/${planId}`, { nombre: data.nombre, precio: data.precio, activa: data.activa });
export const eliminarPlan = (planId: string) =>
  del<{ ok: boolean }>(`/api/saas/planes/${planId}`);

/* ─────────────── cuenta Mercado Pago de la plataforma ─────────────── */
export const configurarMPPlataforma = (cfg: { accessToken: string; publicKey: string; email: string }) =>
  post<{ ok: boolean; cuenta?: string; mensaje: string }>("/api/saas/mp-plataforma/configurar", {
    access_token: cfg.accessToken, public_key: cfg.publicKey, email: cfg.email,
  });
export const probarMPPlataforma = () =>
  post<{ ok: boolean; cuenta?: string; siteId?: string; mensaje: string }>("/api/saas/mp-plataforma/probar");
export const desvincularMPPlataforma = () =>
  post<{ ok: boolean }>("/api/saas/mp-plataforma/desvincular");

/* ─────────────── suscripciones (pago automático) ─────────────── */
export const suscribirFacturaMP = (facturaId: string) =>
  post<import("./store").CobroMP>(`/api/saas/facturas/${facturaId}/suscribir-mp`);
export const crearSuscripcion = (cid: string, data: { unidad: string; email: string; monto: number }) =>
  post<import("./store").Suscripcion>(`/api/comunidades/${cid}/suscripciones`, data);
export const cancelarSuscripcion = (cid: string, suscripcionId: string) =>
  post<{ ok: boolean }>(`/api/comunidades/${cid}/suscripciones/${suscripcionId}/cancelar`);

/* ─────────────── gestión de usuarios (superadmin) ─────────────── */
export const crearUsuarioSaaS = (data: { nombre: string; email: string; password: string; rolGlobal: boolean; membresias: { comunidadId: string; rol: string; unidad?: string }[] }) =>
  post<{ id: string }>("/api/saas/usuarios", {
    nombre: data.nombre, email: data.email, password: data.password,
    rol_global: data.rolGlobal ? "SUPERADMIN" : null,
    membresias: data.rolGlobal ? [] : data.membresias,
  });

/** El superadmin define una nueva contraseña para cualquier usuario (sin pedir la actual). */
export const setPasswordUsuario = (usuarioId: string, nueva: string) =>
  post<{ ok: boolean }>(`/api/saas/usuarios/${usuarioId}/password`, { nueva });

export const toggleUsuarioActivo = (usuarioId: string) =>
  post<{ activo: boolean }>(`/api/saas/usuarios/${usuarioId}/toggle-activo`).then((r) => r.activo);

/* ─────────────── cobrar factura de comunidad vía Mercado Pago ─────────────── */
/** Crea un punto de pago de Mercado Pago por la factura, con la comisión del 5% incluida. */
export const cobrarFacturaMP = (facturaId: string) =>
  post<{ id: string; puntoDePago: string; monto: number; total: number; comisionApp: number; comisionMP: number; comunidad: string; creado: string; modo?: "sandbox" | "produccion" }>(
    `/api/saas/facturas/${facturaId}/cobrar-mp`,
  );

/* ─────────────── confirmación de correo ─────────────── */
export const confirmarEmail = (token: string) => post<{ ok: boolean }>("/api/auth/confirmar-email", { token });

/* ─────────────── validación por transferencia ─────────────── */
export const validarTransferencia = (cid: string, cobroId: string) =>
  post<import("./store").Pago>(`/api/comunidades/${cid}/pagos/validar-transferencia`, { cobro_id: cobroId });

/* ─────────────── informe mensual ─────────────── */
export const informe = (cid: string, periodo: string) =>
  get<import("./store").InformeAPI>(`/api/comunidades/${cid}/informe?periodo=${periodo}`);
export const enviarInforme = (cid: string, periodo: string, resumenHtml: string) =>
  post<{ ok: boolean; enviados: number }>(`/api/comunidades/${cid}/informe/enviar`, { periodo, resumen_html: resumenHtml });

/* ─────────────── recursos e informe automático ─────────────── */
export const setRecursos = (cid: string, recursos: { reservas?: boolean; bitacora?: boolean }) =>
  post<{ ok: boolean; recursos: { reservas: boolean; bitacora: boolean } }>(`/api/comunidades/${cid}/recursos`, recursos);
export const setInformeAuto = (cid: string, activo: boolean) =>
  post<{ ok: boolean; informe_auto: boolean }>(`/api/comunidades/${cid}/informe-auto`, { activo });

/* ─────────────── usuarios agrupados y contraseñas (superadmin) ─────────────── */
export const usuariosAgrupados = () =>
  get<{
    grupos: { comunidad: import("./store").Comunidad; usuarios: import("./store").Usuario[] }[];
    sin_comunidad: import("./store").Usuario[];
    superadmins: import("./store").Usuario[];
  }>("/api/saas/usuarios/agrupados");
export const restablecerPassword = (uid: string) =>
  post<{ ok: boolean; password_temporal: string }>(`/api/saas/usuarios/${uid}/restablecer-password`);
export const verPassword = (uid: string) =>
  get<{ disponible: boolean; password_temporal: string | null }>(`/api/saas/usuarios/${uid}/ver-password`);

/* ─────────────── eliminar comunidad y planes públicos ─────────────── */
export const eliminarComunidad = (cid: string) =>
  del<{ ok: boolean }>(`/api/saas/comunidades/${cid}`);
export const planesPublicos = () =>
  get<{ planes: import("./store").Plan[] }>("/api/planes-publicos");
