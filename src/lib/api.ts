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

class ApiError extends Error {
  status: number;
  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.status = status;
  }
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = leerToken();
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
export const generarMes = (cid: string, periodo: string, monto: number) =>
  post<{ creados: number; periodo: string }>(`/api/comunidades/${cid}/cobros/generar`, { periodo, monto });

export const pagarCobro = (cid: string, cobroId: string) =>
  post<Pago>(`/api/comunidades/${cid}/pagos/cobro/${cobroId}`);

export const registrarPagoVecino = (cid: string, cobroId: string, metodo: string) =>
  post<{ ok: boolean }>(`/api/comunidades/${cid}/pagos/registrar`, { cobro_id: cobroId, metodo });

/* ─────────────── transparencia ─────────────── */
export const crearMovimiento = (cid: string, data: { tipo: string; categoria: string; descripcion: string; monto: number; fecha: string }) =>
  post(`/api/comunidades/${cid}/movimientos`, data);

/* ─────────────── Mercado Pago ─────────────── */
export const vincularMP = (cid: string, email: string) =>
  post<{ ok: boolean }>(`/api/comunidades/${cid}/mp/vincular`, { email });
export const desvincularMP = (cid: string) =>
  post<{ ok: boolean }>(`/api/comunidades/${cid}/mp/desvincular`);

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

/* ─────────────── SaaS / superadmin ─────────────── */
export const listadoSaaS = () => get<unknown>("/api/saas/listado");
export const crearComunidadSaaS = (data: { nombre: string; direccion: string; ciudad: string; unidades: number; plan: string; emailAdmin: string; nombreAdmin: string }) =>
  post("/api/saas/comunidades", {
    nombre: data.nombre, direccion: data.direccion, ciudad: data.ciudad,
    unidades: data.unidades, plan: data.plan, email_admin: data.emailAdmin, nombre_admin: data.nombreAdmin,
  });
export const toggleEstadoComunidad = (cid: string) =>
  post<{ estado: string }>(`/api/saas/comunidades/${cid}/toggle-estado`).then((r) => r.estado);
