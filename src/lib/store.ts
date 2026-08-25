/* ============================================================
   ComunApp · capa de datos (MODO REAL)
   Glosario obligatorio: "comunidad" (nunca condominio),
   "pagos del mes" / "tus pagos" (nunca gastos comunes).

   La única fuente de verdad es la API (FastAPI/PostgreSQL en
   Railway). Este módulo conserva los tipos, las constantes de
   UI, los helpers de formato, la sesión y la caché local para
   lecturas síncronas; todas las operaciones de datos delegan
   en src/lib/api.ts. No existe modo demo.
   ============================================================ */

import * as api from "./api";

/** true cuando la app está configurada para hablar con el backend (VITE_API_URL). */
export const apiMode = api.apiMode;

/* Caché local para lecturas síncronas (usuarioActual, comunidadActual).
   Se llena con las respuestas reales del servidor; no es una fuente de datos. */
const UK = "comunapp_api_usuario";
const CK = "comunapp_api_comunidades";

/* Limpieza única: elimina la base del antiguo modo demo que pueda quedar en el navegador. */
try {
  localStorage.removeItem("comunapp_db_v4");
} catch { /* noop */ }

/* ── tipos ──────────────────────────────────────────────────── */
export type RolCondo = "ADMIN" | "COMITE" | "PROPIETARIO" | "ARRENDATARIO";
export type Rol = "SUPERADMIN" | RolCondo;
/** Los planes son dinámicos (los crea el superadmin). */
export type PlanId = string;

export interface Plan {
  id: string;
  nombre: string;
  precio: number;      // CLP mensual (0 = gratis)
  activa: boolean;
  creada: string;
}

/** Suscripción de pago automático vía Mercado Pago (preapproval, solo tarjeta de crédito). */
export interface Suscripcion {
  id: string;
  comunidadId: string;
  unidad: string;
  email: string;
  monto: number;
  frecuencia: "MENSUAL";
  estado: "PENDIENTE" | "AUTORIZADA" | "CANCELADA";
  mpId?: string;
  linkAutorizacion?: string;
  creada: string;
}

/** Cuenta Mercado Pago de la PLATAFORMA (la configura el superadmin; cobra las facturas SaaS). */
export interface MPPlataforma {
  conectada: boolean;
  accessToken?: string;
  publicKey?: string;
  email?: string;
  fecha?: string;
}

export interface Membresia { comunidadId: string; rol: RolCondo; unidad?: string }
export interface Usuario {
  id: string; nombre: string; email: string; password: string;
  activo: boolean; creado: string; rolGlobal: "SUPERADMIN" | null; membresias: Membresia[];
  telefono?: string;
}
export interface Vinculacion {
  conectada: boolean;
  email?: string;
  fecha?: string;
  accessToken?: string;   // Access Token (server-side: crea cobros y verifica pagos)
  publicKey?: string;     // Public Key (client-side: Checkout Pro / Bricks)
  modo?: "sandbox" | "produccion";
}
export interface ResultadoMP {
  ok: boolean;
  cuenta?: string;
  siteId?: string;
  mensaje: string;
}
/** Cobro generado vía API de Mercado Pago (Checkout Pro = "punto de pago"). */
export interface CobroMP {
  id: string;
  puntoDePago: string;
  monto: number;          // monto BASE (antes de comisiones)
  total: number;          // lo que realmente se cobra (base + 5%)
  comisionApp: number;    // 3% comisión ComunApp
  comisionMP: number;     // 2% comisión Mercado Pago
  concepto: string;
  unidad?: string;
  creado: string;
  modo?: "sandbox" | "produccion";
}
/** Punto de pago de una FACTURA SaaS (incluye la comunidad deudora y las comisiones). */
export interface CobroFacturaMP {
  id: string;
  puntoDePago: string;
  monto: number;
  total: number;
  comisionApp: number;
  comisionMP: number;
  comunidad: string;
  creado: string;
  modo?: "sandbox" | "produccion";
}

export interface Recursos { reservas: boolean; bitacora: boolean }
export interface Comunidad {
  id: string; nombre: string; direccion: string; ciudad: string;
  unidades: number; plan: PlanId; creada: string; estado: "ACTIVA" | "SUSPENDIDA";
  vinculacion: Vinculacion;
  recursos: Recursos;
  informe_auto: boolean;
}

/* Informe de finanzas y transparencia (para el PDF y el envío mensual) */
export interface InformeAPI {
  comunidad: string;
  periodo: string;
  movimientos: { fecha: string; tipo: "INGRESO" | "GASTO"; categoria: string; descripcion: string; monto: number; conciliado?: boolean }[];
  cobros: { unidad: string; concepto: string; monto: number; estado: string }[];
  resumen: { ingresos: number; gastos: number; saldo: number; cobrado: number };
}
export interface Cobro {
  id: string; comunidadId: string; unidad: string; periodo: string;
  concepto: string; monto: number; estado: "PENDIENTE" | "PAGADO" | "VENCIDO";
  vencimiento: string; creado: string;
}
export interface Pago {
  id: string; comunidadId: string; cobroId: string; unidad: string;
  monto: number; metodo: string; referencia: string; fecha: string;
}
export interface Movimiento {
  id: string; comunidadId: string; fecha: string; tipo: "INGRESO" | "GASTO";
  categoria: string; descripcion: string; monto: number; conciliado: boolean;
}
export interface Aviso {
  id: string; comunidadId: string; titulo: string; cuerpo: string;
  tipo: "INFORMATIVO" | "EMERGENCIA" | "MANTENCION"; autor: string; creado: string;
}
export interface Reserva {
  id: string; comunidadId: string; area: string; fecha: string;
  bloque: "MAÑANA" | "TARDE" | "DÍA COMPLETO"; unidad: string; residente: string;
}
export interface Voto { unidad: string; opcion: string }
export interface Votacion {
  id: string; comunidadId: string; titulo: string; pregunta: string;
  opciones: string[]; abierta: boolean; creado: string; votos: Voto[];
}
export interface RegistroAcceso {
  id: string; comunidadId: string; visitante: string; tipo: "VISITA" | "PROVEEDOR";
  unidad: string; entrada: string; salida: string | null;
}
export interface FacturaSaaS {
  id: string; comunidadId: string; periodo: string; plan: string;
  monto: number; estado: "PAGADA" | "PENDIENTE" | "VENCIDA"; fecha: string;
}
export interface Evento { id: string; fecha: string; texto: string }
export interface DiaPago { dia: string; monto: number; pagos: number }
export interface FilaCSV {
  parcela: string; propietario: string; arrendatario?: string;
  contacto?: string; correo: string; deuda: number;
}

export interface Sesion {
  token: string; usuarioId: string; rol: Rol;
  comunidadId: string | null; unidad: string | null;
}

/* ── comisiones de Mercado Pago ───────────────────────────────
   A cada cobro se le suma un 5% de comisiones:
     · 3% comisión de aplicación (ComunApp)
     · 2% comisión de Mercado Pago
   El total (base + 5%) es lo que se cobra al pagador. */
export const COMISION_APP = 0.03;
export const COMISION_MP = 0.02;
export function calcularComision(monto: number) {
  const comisionApp = Math.round(monto * COMISION_APP);
  const comisionMP = Math.round(monto * COMISION_MP);
  return {
    base: monto,
    comisionApp,
    comisionMP,
    comisionTotal: comisionApp + comisionMP,
    total: monto + comisionApp + comisionMP,
  };
}

/* ── constantes de UI ───────────────────────────────────────── */
export const ROL_LABEL: Record<Rol, string> = {
  SUPERADMIN: "Equipo ComunApp", ADMIN: "Administrador", COMITE: "Comité",
  PROPIETARIO: "Propietario", ARRENDATARIO: "Arrendatario",
};
export const ROL_COLOR: Record<Rol, string> = {
  SUPERADMIN: "#c9f24b", ADMIN: "#12523e", COMITE: "#1f7d72",
  PROPIETARIO: "#d9a036", ARRENDATARIO: "#b0793a",
};
/* Fallbacks históricos: la fuente de verdad son los planes del servidor. */
export const PLAN_LABEL: Record<string, string> = {
  COMITE: "Comité", PARCELAS: "Comunidades", CUSTOM: "Personalizado",
};
export const PLAN_PRECIO: Record<string, number> = { COMITE: 0, PARCELAS: 29900, CUSTOM: 89000 };

/* ── helpers de formato ─────────────────────────────────────── */
export const periodoActual = () => new Date().toISOString().slice(0, 7);
export const fmtCLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
export const fmtFecha = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
};
export const fmtFechaHora = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) + " · " +
    d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
};
export const fmtMes = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
};

/* ── sesión ─────────────────────────────────────────────────── */
const SK = "comunapp_sesion_v4";

export function getSesion(): Sesion | null {
  try {
    const raw = localStorage.getItem(SK);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch { return null; }
}
export function setSesion(s: Sesion | null) {
  if (s) localStorage.setItem(SK, JSON.stringify(s));
  else localStorage.removeItem(SK);
}
/** Cierra la sesión y limpia toda la caché local (token, usuario, comunidades). */
export function logout() {
  setSesion(null);
  api.guardarToken(null);
  localStorage.removeItem(UK);
  localStorage.removeItem(CK);
}

/* ── lecturas síncronas (desde la caché llenada por el servidor) ── */
export function usuarioActual(s: Sesion): Usuario | null {
  try {
    const u = JSON.parse(localStorage.getItem(UK) ?? "null") as Usuario | null;
    return u && u.id === s.usuarioId ? u : null;
  } catch { return null; }
}
export function comunidadActual(s: Sesion): Comunidad | null {
  if (!s.comunidadId) return null;
  try {
    const lista = JSON.parse(localStorage.getItem(CK) ?? "[]") as Comunidad[];
    return lista.find((c) => c.id === s.comunidadId) ?? null;
  } catch { return null; }
}
export function cambiarComunidadSesion(s: Sesion, comunidadId: string): Sesion | null {
  const u = usuarioActual(s);
  const m = u?.membresias.find((x) => x.comunidadId === comunidadId);
  if (!u || !m) return null;
  const nueva: Sesion = { ...s, comunidadId, rol: m.rol, unidad: m.unidad ?? null };
  setSesion(nueva);
  return nueva;
}
/** Últimos 3 periodos (para filtros y generadores de cobros). */
export function periodosDisponibles(_comunidadId: string): string[] {
  const d = new Date();
  const out = new Set<string>();
  for (let i = 0; i < 3; i++) { out.add(d.toISOString().slice(0, 7)); d.setMonth(d.getMonth() - 1); }
  return [...out].sort().reverse();
}

/* ── auth (API real) ────────────────────────────────────────── */
export async function login(email: string, password: string): Promise<Sesion> {
  const s = await api.login(email, password);
  const u = await api.me();
  localStorage.setItem(UK, JSON.stringify(u));
  setSesion(s);
  return s;
}
export const cambiarPassword = (actual: string, nueva: string) => api.cambiarPassword(actual, nueva);

/* ── datos de comunidad (API real) ──────────────────────────── */
export interface DatosComunidad {
  comunidad: Comunidad;
  miembros: { usuario: Usuario; rol: RolCondo; unidad?: string }[];
  cobros: Cobro[]; pagos: Pago[]; movimientos: Movimiento[];
  avisos: Aviso[]; reservas: Reserva[]; votaciones: Votacion[]; bitacora: RegistroAcceso[];
  suscripciones: Suscripcion[];
}

export async function datosComunidad(comunidadId: string): Promise<DatosComunidad> {
  const data = await api.datosComunidad(comunidadId);
  // Actualiza la caché local para las lecturas síncronas (nombre en la barra, etc.)
  try {
    const lista = JSON.parse(localStorage.getItem(CK) ?? "[]") as Comunidad[];
    const sinDup = lista.filter((c) => c.id !== data.comunidad.id);
    localStorage.setItem(CK, JSON.stringify([...sinDup, data.comunidad]));
  } catch { /* noop */ }
  return data;
}

/* ── cobranza y pagos ───────────────────────────────────────── */
export const generarMes = (comunidadId: string, periodo: string, monto: number, motivo = "Pagos del mes") =>
  api.generarMes(comunidadId, periodo, monto, motivo);
export const pagarCobro = (comunidadId: string, cobroId: string): Promise<Pago> =>
  api.pagarCobro(comunidadId, cobroId);
export const registrarPagoVecino = (comunidadId: string, cobroId: string, metodo: string) =>
  api.registrarPagoVecino(comunidadId, cobroId, metodo);

/* ── transparencia ──────────────────────────────────────────── */
export const crearMovimiento = (comunidadId: string, data: { tipo: "INGRESO" | "GASTO"; categoria: string; descripcion: string; monto: number; fecha: string }) =>
  api.crearMovimiento(comunidadId, data);

/* ── Mercado Pago · credenciales y cobros de la comunidad ───── */
export interface ConfigMP { accessToken: string; publicKey: string; email: string; modo?: "sandbox" | "produccion" }
export const configurarMP = (comunidadId: string, cfg: ConfigMP): Promise<ResultadoMP> => api.configurarMP(comunidadId, cfg);
export const probarMP = (comunidadId: string): Promise<ResultadoMP> => api.probarMP(comunidadId);
export const desvincularMP = (comunidadId: string) => api.desvincularMP(comunidadId);
export const generarCobroMP = (comunidadId: string, data: { monto: number; concepto: string; unidad?: string; emailPagador?: string }): Promise<CobroMP> =>
  api.generarCobroMP(comunidadId, data);

/* ── importación CSV ────────────────────────────────────────── */
export const importarCSV = (comunidadId: string, filas: FilaCSV[]) => api.importarCSV(comunidadId, filas);

/* ── comunidad: avisos, reservas, votaciones, bitácora ──────── */
export const crearAviso = (comunidadId: string, data: { titulo: string; cuerpo: string; tipo: Aviso["tipo"]; autor: string }) =>
  api.crearAviso(comunidadId, data);
export const crearReserva = (comunidadId: string, data: { area: string; fecha: string; bloque: Reserva["bloque"]; unidad: string; residente: string }) =>
  api.crearReserva(comunidadId, data);
export const cancelarReserva = (comunidadId: string, reservaId: string) => api.cancelarReserva(comunidadId, reservaId);
export const crearVotacion = (comunidadId: string, data: { titulo: string; pregunta: string; opciones: string[] }) =>
  api.crearVotacion(comunidadId, data);
export const votar = (comunidadId: string, votacionId: string, unidad: string, opcion: string) =>
  api.votar(comunidadId, votacionId, unidad, opcion);
export const registrarAcceso = (comunidadId: string, data: { visitante: string; tipo: RegistroAcceso["tipo"]; unidad: string }) =>
  api.registrarAcceso(comunidadId, data);
export const marcarSalida = (comunidadId: string, registroId: string) => api.marcarSalida(comunidadId, registroId);

/* ── gestión de vecinos (admin) ─────────────────────────────── */
export const crearVecino = (comunidadId: string, data: { nombre: string; email: string; password: string; rol: RolCondo; unidad?: string; telefono?: string }) =>
  api.crearVecino(comunidadId, data);

/* ── suscripciones de pago automático ───────────────────────── */
export const crearSuscripcion = (comunidadId: string, data: { unidad: string; email: string; monto: number }): Promise<Suscripcion> =>
  api.crearSuscripcion(comunidadId, data);
export const cancelarSuscripcion = (comunidadId: string, suscripcionId: string) =>
  api.cancelarSuscripcion(comunidadId, suscripcionId);
export const suscribirFacturaMP = (facturaId: string): Promise<CobroMP> => api.suscribirFacturaMP(facturaId);

/* ── súper admin · SaaS ─────────────────────────────────────── */
export interface ListadoSaaS {
  comunidades: (Comunidad & { usuarios: number; cobrosMes: number; recaudado: number })[];
  usuarios: Usuario[]; facturas: FacturaSaaS[]; seriePagos: DiaPago[]; eventos: Evento[];
  planes: Plan[];
  mpPlataforma: MPPlataforma;
}
export const listadoSaaS = (): Promise<ListadoSaaS> => api.listadoSaaS() as Promise<ListadoSaaS>;
export const crearComunidadSaaS = (data: { nombre: string; direccion: string; ciudad: string; unidades: number; plan: PlanId; emailAdmin: string; nombreAdmin: string }) =>
  api.crearComunidadSaaS(data);
export const toggleEstadoComunidad = (comunidadId: string): Promise<string> => api.toggleEstadoComunidad(comunidadId);
export const generarFacturasMes = (periodo: string): Promise<{ creadas: number; total: number }> =>
  api.generarFacturasMes(periodo);
export const marcarFacturaPagada = (facturaId: string) => api.marcarFacturaPagada(facturaId);
export const cobrarFacturaMP = (facturaId: string) => api.cobrarFacturaMP(facturaId);

/* planes dinámicos */
export const crearPlan = (data: { nombre: string; precio: number }): Promise<Plan> => api.crearPlan(data) as Promise<Plan>;
export const actualizarPlan = (planId: string, data: { nombre?: string; precio?: number; activa?: boolean }) =>
  api.actualizarPlan(planId, data);
export const eliminarPlan = (planId: string) => api.eliminarPlan(planId);

/* cuenta Mercado Pago de la plataforma */
export const configurarMPPlataforma = (cfg: { accessToken: string; publicKey: string; email: string }): Promise<ResultadoMP> =>
  api.configurarMPPlataforma(cfg);
export const probarMPPlataforma = (): Promise<ResultadoMP> => api.probarMPPlataforma();
export const desvincularMPPlataforma = () => api.desvincularMPPlataforma();

/* gestión de usuarios (superadmin) */
export const crearUsuarioSaaS = (data: { nombre: string; email: string; password: string; rolGlobal: boolean; membresias: Membresia[] }) =>
  api.crearUsuarioSaaS(data);
export const setPasswordUsuario = (usuarioId: string, nueva: string) => api.setPasswordUsuario(usuarioId, nueva);
export const toggleUsuarioActivo = (usuarioId: string): Promise<boolean> => api.toggleUsuarioActivo(usuarioId);

/* confirmación de correo */
export const confirmarEmail = (token: string) => api.confirmarEmail(token);

/* validación por transferencia */
export const validarTransferencia = (comunidadId: string, cobroId: string): Promise<Pago> =>
  api.validarTransferencia(comunidadId, cobroId);

/* informe mensual */
export const informe = (comunidadId: string, periodo: string): Promise<InformeAPI> =>
  api.informe(comunidadId, periodo);
export const enviarInforme = (comunidadId: string, periodo: string, resumenHtml: string) =>
  api.enviarInforme(comunidadId, periodo, resumenHtml);

/* recursos e informe automático */
export const setRecursos = (comunidadId: string, recursos: Partial<Recursos>) => api.setRecursos(comunidadId, recursos);
export const setInformeAuto = (comunidadId: string, activo: boolean) => api.setInformeAuto(comunidadId, activo);

/* usuarios agrupados y contraseñas (superadmin) */
export const usuariosAgrupados = () => api.usuariosAgrupados();
export const restablecerPassword = (usuarioId: string): Promise<{ ok: boolean; password_temporal: string }> =>
  api.restablecerPassword(usuarioId);
export const verPassword = (usuarioId: string): Promise<{ disponible: boolean; password_temporal: string | null }> =>
  api.verPassword(usuarioId);

/* eliminar comunidad y planes públicos */
export const eliminarComunidad = (comunidadId: string) => api.eliminarComunidad(comunidadId);
export const planesPublicos = (): Promise<{ planes: Plan[] }> => api.planesPublicos();
