/* ============================================================
   ComunApp · capa de datos (simula la API Python/FastAPI)
   Glosario obligatorio: "comunidad" (nunca condominio),
   "pagos del mes" / "tus pagos" (nunca gastos comunes).

   MODO API: si VITE_API_URL está definida, las funciones de datos delegan en
   la API real (src/lib/api.ts). Si no, se usa el modo demo (localStorage).
   ============================================================ */

import * as api from "./api";

const EN_API = api.apiMode;

/* Caché local del modo API (para las lecturas síncronas: usuarioActual, etc.) */
const UK = "comunapp_api_usuario";
const CK = "comunapp_api_comunidades";

export type RolCondo = "ADMIN" | "COMITE" | "PROPIETARIO" | "ARRENDATARIO";
export type Rol = "SUPERADMIN" | RolCondo;
/** Los planes son dinámicos (los crea el superadmin). Los 3 iniciales usan estos ids. */
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
  monto: number;          // monto base mensual
  frecuencia: "MENSUAL";
  estado: "PENDIENTE" | "AUTORIZADA" | "CANCELADA";
  mpId?: string;          // id del preapproval en Mercado Pago
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
}
export interface Vinculacion {
  conectada: boolean;
  email?: string;
  fecha?: string;
  /* Credenciales reales de Mercado Pago (solo se guardan si el admin las configura) */
  accessToken?: string;   // Access Token (server-side, crea cobros y verifica pagos)
  publicKey?: string;     // Public Key (client-side, Checkout Pro / Bricks)
  modo?: "sandbox" | "produccion";
}

/* Resultado de probar la conexión con Mercado Pago */
export interface ResultadoMP {
  ok: boolean;
  cuenta?: string;      // email de la cuenta MP verificada
  siteId?: string;      // MLA / MLC / MLB ...
  mensaje: string;
}

/* Cobro generado vía API de Mercado Pago (Checkout Pro = "punto de pago") */
export interface CobroMP {
  id: string;               // id de la preferencia MP
  puntoDePago: string;      // init_point: URL donde el vecino paga
  monto: number;            // monto BASE (antes de comisiones)
  total: number;            // monto que realmente se cobra (base + 5% de comisiones)
  comisionApp: number;      // 3% comisión ComunApp
  comisionMP: number;       // 2% comisión Mercado Pago
  concepto: string;
  unidad?: string;
  creado: string;
  modo?: "sandbox" | "produccion";
}

/* ── Comisiones de Mercado Pago ────────────────────────────────
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
export interface Comunidad {
  id: string; nombre: string; direccion: string; ciudad: string;
  unidades: number; plan: PlanId; creada: string; estado: "ACTIVA" | "SUSPENDIDA";
  vinculacion: Vinculacion;
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

export interface Sesion {
  token: string; usuarioId: string; rol: Rol;
  comunidadId: string | null; unidad: string | null;
}

interface DB {
  usuarios: Usuario[]; comunidades: Comunidad[]; cobros: Cobro[]; pagos: Pago[];
  movimientos: Movimiento[]; avisos: Aviso[]; reservas: Reserva[];
  votaciones: Votacion[]; bitacora: RegistroAcceso[]; facturas: FacturaSaaS[];
  seriePagos: DiaPago[]; eventos: Evento[];
  planes: Plan[]; suscripciones: Suscripcion[]; mpPlataforma: MPPlataforma;
}

/* ── utilidades ─────────────────────────────────────────────── */
const KEY = "comunapp_db_v4";
const SK = "comunapp_sesion_v4";
const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const hoyISO = () => new Date().toISOString().slice(0, 10);
const ahoraISO = () => new Date().toISOString();
export const periodoActual = () => new Date().toISOString().slice(0, 7);
const diasAtras = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

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

export const ROL_LABEL: Record<Rol, string> = {
  SUPERADMIN: "Equipo ComunApp", ADMIN: "Administrador", COMITE: "Comité",
  PROPIETARIO: "Propietario", ARRENDATARIO: "Arrendatario",
};
export const ROL_COLOR: Record<Rol, string> = {
  SUPERADMIN: "#c9f24b", ADMIN: "#12523e", COMITE: "#1f7d72",
  PROPIETARIO: "#d9a036", ARRENDATARIO: "#b0793a",
};
/* Fallbacks históricos: la fuente de verdad son los planes guardados (ver nombreDePlan/precioDePlan). */
export const PLAN_LABEL: Record<string, string> = {
  COMITE: "Comité", PARCELAS: "Comunidades", CUSTOM: "Personalizado",
};
export const PLAN_PRECIO: Record<string, number> = { COMITE: 0, PARCELAS: 29900, CUSTOM: 89000 };

export function nombreDePlan(planId: string): string {
  const p = db().planes.find((x) => x.id === planId);
  return p ? p.nombre : (PLAN_LABEL[planId] ?? planId);
}
export function precioDePlan(planId: string): number {
  const p = db().planes.find((x) => x.id === planId);
  return p ? p.precio : (PLAN_PRECIO[planId] ?? 0);
}

/* ── seed ───────────────────────────────────────────────────── */
function seed(): DB {
  const cAlamos = "c_alamos";
  const cTorres = "c_torres";
  const per = periodoActual();
  const perAnt = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  const usuarios: Usuario[] = [
    { id: "u_eq", nombre: "Valeria Soto", email: "equipo@comunapp.cl", password: "admin123", activo: true, creado: diasAtras(240), rolGlobal: "SUPERADMIN", membresias: [] },
    { id: "u_ad", nombre: "Rodrigo Fuentes", email: "admin@losalamos.cl", password: "admin123", activo: true, creado: diasAtras(180), rolGlobal: null, membresias: [{ comunidadId: cAlamos, rol: "ADMIN" }] },
    { id: "u_co", nombre: "Carla Méndez", email: "comite@losalamos.cl", password: "comite123", activo: true, creado: diasAtras(170), rolGlobal: null, membresias: [{ comunidadId: cAlamos, rol: "COMITE" }] },
    { id: "u_ma", nombre: "María López", email: "maria@demo.cl", password: "demo123", activo: true, creado: diasAtras(150), rolGlobal: null, membresias: [{ comunidadId: cAlamos, rol: "PROPIETARIO", unidad: "P-14" }] },
    { id: "u_jo", nombre: "Jorge Salas", email: "jorge@demo.cl", password: "demo123", activo: true, creado: diasAtras(120), rolGlobal: null, membresias: [{ comunidadId: cAlamos, rol: "ARRENDATARIO", unidad: "P-07" }] },
    { id: "u_pa", nombre: "Pablo Reyes", email: "pablo@demo.cl", password: "demo123", activo: true, creado: diasAtras(90), rolGlobal: null, membresias: [{ comunidadId: cAlamos, rol: "PROPIETARIO", unidad: "P-07" }] },
    { id: "u_an", nombre: "Ana Torres", email: "ana@demo.cl", password: "demo123", activo: true, creado: diasAtras(80), rolGlobal: null, membresias: [{ comunidadId: cAlamos, rol: "PROPIETARIO", unidad: "P-21" }] },
    { id: "u_t1", nombre: "Sofía Núñez", email: "sofia@torresdelparque.cl", password: "admin123", activo: true, creado: diasAtras(60), rolGlobal: null, membresias: [{ comunidadId: cTorres, rol: "ADMIN" }] },
    { id: "u_t2", nombre: "Diego Parra", email: "diego@demo.cl", password: "demo123", activo: true, creado: diasAtras(55), rolGlobal: null, membresias: [{ comunidadId: cTorres, rol: "PROPIETARIO", unidad: "A-42" }] },
  ];

  const comunidades: Comunidad[] = [
    {
      id: cAlamos, nombre: "Los Álamos", direccion: "Camino El Bosque km 4", ciudad: "Pucón",
      unidades: 28, plan: "PARCELAS", creada: diasAtras(200), estado: "ACTIVA",
      // En blanco a propósito: el admin configura sus credenciales reales desde el panel.
      vinculacion: { conectada: false },
    },
    {
      id: cTorres, nombre: "Torres del Parque", direccion: "Av. Los Aromos 1520", ciudad: "Temuco",
      unidades: 42, plan: "COMITE", creada: diasAtras(70), estado: "ACTIVA",
      vinculacion: { conectada: false },
    },
  ];

  const cobros: Cobro[] = [];
  const pagos: Pago[] = [];
  const movs: Movimiento[] = [];
  let i = 0;

  // Los Álamos: periodo actual y anterior
  const unidadesAl = ["P-03", "P-07", "P-14", "P-18", "P-21", "P-25"];
  for (const u of unidadesAl) {
    cobros.push({ id: "cb" + i++, comunidadId: cAlamos, unidad: u, periodo: per, concepto: "Pagos del mes", monto: 55000, estado: "PENDIENTE", vencimiento: hoyISO(), creado: diasAtras(6) });
    cobros.push({ id: "cb" + i++, comunidadId: cAlamos, unidad: u, periodo: perAnt, concepto: "Pagos del mes", monto: 52000, estado: "PAGADO", vencimiento: diasAtras(30), creado: diasAtras(38) });
  }
  cobros.push({ id: "cb" + i++, comunidadId: cAlamos, unidad: "P-14", periodo: per, concepto: "Cuota extraordinaria · portón", monto: 30000, estado: "PENDIENTE", vencimiento: hoyISO(), creado: diasAtras(4) });
  cobros.push({ id: "cb" + i++, comunidadId: cAlamos, unidad: "P-21", periodo: per, concepto: "Multa · ruidos molestos", monto: 15000, estado: "PENDIENTE", vencimiento: hoyISO(), creado: diasAtras(2) });
  // pagos de vecinos
  const pagaron: [string, number][] = [["P-03", 55000], ["P-07", 55000], ["P-18", 55000], ["P-25", 55000]];
  pagaron.forEach(([u, m], j) => {
    const cb = cobros.find((c) => c.comunidadId === cAlamos && c.unidad === u && c.periodo === per)!;
    cb.estado = "PAGADO";
    pagos.push({ id: "pg" + j, comunidadId: cAlamos, cobroId: cb.id, unidad: u, monto: m, metodo: "Mercado Pago", referencia: "MP-" + (1024 + j * 17), fecha: diasAtras(3 - j) });
  });
  // periodo anterior pagado
  cobros.filter((c) => c.comunidadId === cAlamos && c.periodo === perAnt).forEach((c, j) => {
    pagos.push({ id: "pga" + j, comunidadId: cAlamos, cobroId: c.id, unidad: c.unidad, monto: c.monto, metodo: "Transferencia", referencia: "TRF-" + (2210 + j), fecha: diasAtras(28) });
  });

  // Torres del Parque
  ["A-42", "B-12", "C-08"].forEach((u, j) => {
    cobros.push({ id: "cbt" + j, comunidadId: cTorres, unidad: u, periodo: per, concepto: "Pagos del mes", monto: 78000, estado: "PENDIENTE", vencimiento: hoyISO(), creado: diasAtras(5) });
  });

  // movimientos Los Álamos (transparencia)
  const mov = (d: number, tipo: "INGRESO" | "GASTO", categoria: string, descripcion: string, monto: number) =>
    movs.push({ id: uid(), comunidadId: cAlamos, fecha: diasAtras(d), tipo, categoria, descripcion, monto, conciliado: d > 10 });
  mov(32, "INGRESO", "Pagos del mes", "Recaudación " + fmtMes(perAnt), 312000);
  mov(28, "GASTO", "Mantención", "Poda y jardinería áreas verdes", 85000);
  mov(25, "GASTO", "Servicios", "Electricidad áreas comunes", 46500);
  mov(20, "GASTO", "Personal", "Conserjería y guardia", 140000);
  mov(15, "GASTO", "Seguridad", "Mantención portón eléctrico", 38000);
  mov(10, "INGRESO", "Fondo de reserva", "Aporte mensual vecinos", 60000);
  mov(6, "GASTO", "Mantención", "Reparación luminarias camino", 27500);
  mov(3, "INGRESO", "Pagos del mes", "Recaudación parcial " + fmtMes(per), 220000);
  mov(1, "GASTO", "Áreas verdes", "Riego y fertilizantes", 18500);

  // avisos
  const avisos: Aviso[] = [
    { id: uid(), comunidadId: cAlamos, titulo: "Corte de agua programado", cuerpo: "El jueves entre 10:00 y 13:00 hrs se cortará el suministro por mantención del estanque principal.", tipo: "EMERGENCIA", autor: "Administración", creado: diasAtras(1) },
    { id: uid(), comunidadId: cAlamos, titulo: "Pago del mes ya disponible", cuerpo: "Ya puedes pagar el mes desde tu cuenta con Mercado Pago. Recuerda que vence el día 10.", tipo: "INFORMATIVO", autor: "Comité", creado: diasAtras(4) },
    { id: uid(), comunidadId: cAlamos, titulo: "Mantención de caminos", cuerpo: "Durante la próxima semana se reparará el camino interior del sector norte. Transitar con precaución.", tipo: "MANTENCION", autor: "Administración", creado: diasAtras(8) },
  ];

  // reservas
  const reservas: Reserva[] = [
    { id: uid(), comunidadId: cAlamos, area: "Quincho central", fecha: diasAtras(-2).slice(0, 10), bloque: "TARDE", unidad: "P-14", residente: "María López" },
    { id: uid(), comunidadId: cAlamos, area: "Sala multiuso", fecha: diasAtras(-4).slice(0, 10), bloque: "MAÑANA", unidad: "P-21", residente: "Ana Torres" },
  ];

  // votación
  const votaciones: Votacion[] = [
    {
      id: uid(), comunidadId: cAlamos, titulo: "Iluminación LED del camino principal",
      pregunta: "¿Apruebas usar el fondo de reserva para renovar la iluminación del camino principal?",
      opciones: ["A favor", "En contra", "Abstención"], abierta: true, creado: diasAtras(5),
      votos: [{ unidad: "P-03", opcion: "A favor" }, { unidad: "P-18", opcion: "A favor" }, { unidad: "P-25", opcion: "En contra" }, { unidad: "P-07", opcion: "A favor" }],
    },
  ];

  // bitácora
  const bitacora: RegistroAcceso[] = [
    { id: uid(), comunidadId: cAlamos, visitante: "Carlos Vera (electricista)", tipo: "PROVEEDOR", unidad: "Áreas comunes", entrada: diasAtras(0), salida: null },
    { id: uid(), comunidadId: cAlamos, visitante: "Fernanda Rojas", tipo: "VISITA", unidad: "P-14", entrada: diasAtras(1), salida: diasAtras(1) },
    { id: uid(), comunidadId: cAlamos, visitante: "Chilexpress — encomiendas", tipo: "PROVEEDOR", unidad: "Conserjería", entrada: diasAtras(2), salida: diasAtras(2) },
  ];

  // facturación SaaS (6 meses)
  const facturas: FacturaSaaS[] = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(); d.setMonth(d.getMonth() - m);
    const perF = d.toISOString().slice(0, 7);
    const fecha = new Date(d.getFullYear(), d.getMonth(), 3).toISOString();
    facturas.push({ id: "fa-al-" + m, comunidadId: cAlamos, periodo: perF, plan: "Comunidad de Parcelas", monto: 29900, estado: m === 0 ? "PENDIENTE" : "PAGADA", fecha });
    if (m <= 2) facturas.push({ id: "fa-to-" + m, comunidadId: cTorres, periodo: perF, plan: "Comité", monto: 0, estado: "PAGADA", fecha });
  }

  // serie de pagos (últimos 14 días)
  const seriePagos: DiaPago[] = Array.from({ length: 14 }, (_, k) => {
    const d = new Date(Date.now() - (13 - k) * 86400000);
    const semilla = (k * 37 + 11) % 23;
    const nPagos = k < 4 ? 0 : (semilla % 4);
    return {
      dia: d.toISOString().slice(5, 10),
      pagos: nPagos,
      monto: nPagos * 55000 + (semilla > 18 ? 30000 : 0),
    };
  });

  const eventos: Evento[] = [
    { id: uid(), fecha: ahoraISO(), texto: "Pago recibido · P-03 · " + fmtCLP(55000) },
    { id: uid(), fecha: diasAtras(1), texto: "Nueva vecina registrada: Ana Torres (P-21)" },
    { id: uid(), fecha: diasAtras(2), texto: "Votación abierta: Iluminación LED" },
    { id: uid(), fecha: diasAtras(3), texto: "Recordatorios de pago enviados (28 unidades)" },
  ];

  // planes (los gestiona el superadmin desde su panel)
  const planes: Plan[] = [
    { id: "COMITE", nombre: "Comité", precio: 0, activa: true, creada: diasAtras(240) },
    { id: "PARCELAS", nombre: "Comunidades", precio: 29900, activa: true, creada: diasAtras(240) },
    { id: "CUSTOM", nombre: "Personalizado", precio: 89000, activa: true, creada: diasAtras(240) },
  ];

  // suscripciones de pago automático (Mercado Pago · solo tarjeta de crédito)
  const suscripciones: Suscripcion[] = [
    { id: uid(), comunidadId: cAlamos, unidad: "P-03", email: "vecino03@losalamos.cl", monto: 55000, frecuencia: "MENSUAL", estado: "AUTORIZADA", mpId: "PREAPP-20411", creada: diasAtras(45) },
    { id: uid(), comunidadId: cAlamos, unidad: "P-18", email: "vecino18@losalamos.cl", monto: 55000, frecuencia: "MENSUAL", estado: "PENDIENTE", mpId: "PREAPP-20577", linkAutorizacion: "https://sandbox.mercadopago.cl/subscriptions/checkout?preapproval_id=PREAPP-20577", creada: diasAtras(2) },
  ];

  // cuenta Mercado Pago de la plataforma (vacía: la configura el superadmin)
  const mpPlataforma: MPPlataforma = { conectada: false };

  return { usuarios, comunidades, cobros, pagos, movimientos: movs, avisos, reservas, votaciones, bitacora, facturas, seriePagos, eventos, planes, suscripciones, mpPlataforma };
}

/* ── persistencia ───────────────────────────────────────────── */
let cache: DB | null = null;
function db(): DB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as DB;
      // Migración: agrega campos nuevos a datos guardados en versiones previas
      if (!d.planes) d.planes = seed().planes;
      if (!d.suscripciones) d.suscripciones = [];
      if (!d.mpPlataforma) d.mpPlataforma = { conectada: false };
      cache = d;
      return cache;
    }
  } catch { /* seed */ }
  cache = seed();
  guardar();
  return cache;
}
function guardar() {
  if (cache) localStorage.setItem(KEY, JSON.stringify(cache));
}
function evento(texto: string) {
  db().eventos.unshift({ id: uid(), fecha: ahoraISO(), texto });
  db().eventos = db().eventos.slice(0, 40);
}

export function resetDemo() {
  localStorage.removeItem(KEY);
  cache = seed();
  guardar();
}

/* ── sesión ─────────────────────────────────────────────────── */
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

/* ── cambio de contraseña (cualquier rol) ───────────────────── */
export async function cambiarPassword(actual: string, nueva: string) {
  if (EN_API) return api.cambiarPassword(actual, nueva);
  await delay(700);
  const s = getSesion();
  if (!s) throw new Error("No hay una sesión activa.");
  const u = db().usuarios.find((x) => x.id === s.usuarioId);
  if (!u) throw new Error("Tu cuenta ya no existe.");
  if (u.password !== actual) throw new Error("La contraseña actual no es correcta.");
  u.password = nueva;
  evento("Contraseña actualizada · " + u.email);
  guardar();
}

export async function login(email: string, password: string): Promise<Sesion> {
  if (EN_API) {
    const s = await api.login(email, password);
    const u = await api.me();
    localStorage.setItem(UK, JSON.stringify(u));
    setSesion(s);
    return s;
  }
  await delay(650);
  const u = db().usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || u.password !== password) throw new Error("Correo o contraseña incorrectos.");
  if (!u.activo) throw new Error("Tu cuenta está desactivada. Contacta a tu administrador.");
  let rol: Rol; let comunidadId: string | null = null; let unidad: string | null = null;
  if (u.rolGlobal === "SUPERADMIN") rol = "SUPERADMIN";
  else {
    const m = u.membresias[0];
    if (!m) throw new Error("Tu cuenta no tiene una comunidad asignada.");
    rol = m.rol; comunidadId = m.comunidadId; unidad = m.unidad ?? null;
  }
  const s: Sesion = { token: uid() + uid(), usuarioId: u.id, rol, comunidadId, unidad };
  setSesion(s);
  return s;
}

export function usuarioActual(s: Sesion): Usuario | null {
  if (EN_API) {
    try {
      const u = JSON.parse(localStorage.getItem(UK) ?? "null") as Usuario | null;
      return u && u.id === s.usuarioId ? u : null;
    } catch { return null; }
  }
  return db().usuarios.find((u) => u.id === s.usuarioId) ?? null;
}
export function comunidadActual(s: Sesion): Comunidad | null {
  if (!s.comunidadId) return null;
  if (EN_API) {
    try {
      const lista = JSON.parse(localStorage.getItem(CK) ?? "[]") as Comunidad[];
      return lista.find((c) => c.id === s.comunidadId) ?? null;
    } catch { return null; }
  }
  return db().comunidades.find((c) => c.id === s.comunidadId) ?? null;
}
export function cambiarComunidadSesion(s: Sesion, comunidadId: string): Sesion | null {
  const u = usuarioActual(s);
  const m = u?.membresias.find((x) => x.comunidadId === comunidadId);
  if (!u || !m) return null;
  const nueva: Sesion = { ...s, comunidadId, rol: m.rol, unidad: m.unidad ?? null };
  setSesion(nueva);
  return nueva;
}

/* ── datos de comunidad ─────────────────────────────────────── */
export interface DatosComunidad {
  comunidad: Comunidad;
  miembros: { usuario: Usuario; rol: RolCondo; unidad?: string }[];
  cobros: Cobro[]; pagos: Pago[]; movimientos: Movimiento[];
  avisos: Aviso[]; reservas: Reserva[]; votaciones: Votacion[]; bitacora: RegistroAcceso[];
  suscripciones: Suscripcion[];
}

export async function datosComunidad(comunidadId: string): Promise<DatosComunidad> {
  if (EN_API) {
    const data = await api.datosComunidad(comunidadId);
    try {
      const lista = JSON.parse(localStorage.getItem(CK) ?? "[]") as Comunidad[];
      const sinDup = lista.filter((c) => c.id !== data.comunidad.id);
      localStorage.setItem(CK, JSON.stringify([...sinDup, data.comunidad]));
    } catch { /* noop */ }
    return data;
  }
  await delay(350);
  const d = db();
  const comunidad = d.comunidades.find((c) => c.id === comunidadId);
  if (!comunidad) throw new Error("Comunidad no encontrada.");
  const miembros = d.usuarios
    .filter((u) => u.membresias.some((m) => m.comunidadId === comunidadId))
    .map((u) => {
      const m = u.membresias.find((x) => x.comunidadId === comunidadId)!;
      return { usuario: u, rol: m.rol, unidad: m.unidad };
    });
  return {
    comunidad, miembros,
    cobros: d.cobros.filter((x) => x.comunidadId === comunidadId),
    pagos: d.pagos.filter((x) => x.comunidadId === comunidadId),
    movimientos: d.movimientos.filter((x) => x.comunidadId === comunidadId),
    avisos: d.avisos.filter((x) => x.comunidadId === comunidadId),
    reservas: d.reservas.filter((x) => x.comunidadId === comunidadId),
    votaciones: d.votaciones.filter((x) => x.comunidadId === comunidadId),
    bitacora: d.bitacora.filter((x) => x.comunidadId === comunidadId),
    suscripciones: d.suscripciones.filter((x) => x.comunidadId === comunidadId),
  };
}

export function periodosDisponibles(comunidadId: string): string[] {
  if (EN_API) {
    const d = new Date();
    const out = new Set<string>();
    for (let i = 0; i < 3; i++) { out.add(d.toISOString().slice(0, 7)); d.setMonth(d.getMonth() - 1); }
    return [...out].sort().reverse();
  }
  const s = new Set(db().cobros.filter((c) => c.comunidadId === comunidadId).map((c) => c.periodo));
  s.add(periodoActual());
  return [...s].sort().reverse();
}

/* ── cobranza ───────────────────────────────────────────────── */
export async function generarMes(comunidadId: string, periodo: string, monto: number) {
  if (EN_API) return api.generarMes(comunidadId, periodo, monto);
  await delay(600);
  const d = db();
  const comunidad = d.comunidades.find((c) => c.id === comunidadId)!;
  const unidades = new Set(
    d.usuarios.flatMap((u) => u.membresias.filter((m) => m.comunidadId === comunidadId && m.unidad).map((m) => m.unidad!)),
  );
  while (unidades.size < Math.min(comunidad.unidades, 8)) unidades.add("U-" + String(unidades.size + 1).padStart(2, "0"));
  let creados = 0;
  for (const un of unidades) {
    const existe = d.cobros.some((c) => c.comunidadId === comunidadId && c.unidad === un && c.periodo === periodo && c.concepto === "Pagos del mes");
    if (!existe) {
      d.cobros.push({ id: uid(), comunidadId, unidad: un, periodo, concepto: "Pagos del mes", monto, estado: "PENDIENTE", vencimiento: hoyISO(), creado: ahoraISO() });
      creados++;
    }
  }
  evento("Pagos del mes generados · " + comunidad.nombre + " · " + creados + " unidades");
  guardar();
  return { creados, periodo };
}

export async function pagarCobro(comunidadId: string, cobroId: string): Promise<Pago> {
  if (EN_API) return api.pagarCobro(comunidadId, cobroId);
  await delay(1400); // simula la pasarela
  const d = db();
  const cobro = d.cobros.find((c) => c.id === cobroId && c.comunidadId === comunidadId);
  if (!cobro) throw new Error("El pago ya no existe.");
  if (cobro.estado === "PAGADO") throw new Error("Este pago ya fue cancelado.");
  cobro.estado = "PAGADO";
  const pago: Pago = {
    id: uid(), comunidadId, cobroId, unidad: cobro.unidad, monto: cobro.monto,
    metodo: "Mercado Pago", referencia: "MP-" + Math.floor(1000 + Math.random() * 9000), fecha: ahoraISO(),
  };
  d.pagos.push(pago);
  d.movimientos.push({ id: uid(), comunidadId, fecha: hoyISO(), tipo: "INGRESO", categoria: "Pagos del mes", descripcion: "Pago " + cobro.unidad + " · " + cobro.concepto, monto: cobro.monto, conciliado: false });
  evento("Pago en línea · " + cobro.unidad + " · " + fmtCLP(cobro.monto));
  guardar();
  return pago;
}

export async function registrarPagoVecino(comunidadId: string, cobroId: string, metodo: string) {
  if (EN_API) return api.registrarPagoVecino(comunidadId, cobroId, metodo);
  await delay(600);
  const d = db();
  const cobro = d.cobros.find((c) => c.id === cobroId && c.comunidadId === comunidadId);
  if (!cobro) throw new Error("Cobro no encontrado.");
  if (cobro.estado === "PAGADO") throw new Error("Este cobro ya está pagado.");
  cobro.estado = "PAGADO";
  d.pagos.push({ id: uid(), comunidadId, cobroId, unidad: cobro.unidad, monto: cobro.monto, metodo, referencia: "REG-" + Math.floor(100 + Math.random() * 900), fecha: ahoraISO() });
  d.movimientos.push({ id: uid(), comunidadId, fecha: hoyISO(), tipo: "INGRESO", categoria: "Pagos del mes", descripcion: "Pago registrado " + cobro.unidad + " · " + metodo, monto: cobro.monto, conciliado: false });
  evento("Pago registrado manualmente · " + cobro.unidad);
  guardar();
}

/* ── transparencia activa ───────────────────────────────────── */
export async function crearMovimiento(
  comunidadId: string,
  data: { tipo: "INGRESO" | "GASTO"; categoria: string; descripcion: string; monto: number; fecha: string },
) {
  if (EN_API) return api.crearMovimiento(comunidadId, data);
  await delay(550);
  const d = db();
  d.movimientos.push({ id: uid(), comunidadId, conciliado: false, ...data });
  evento((data.tipo === "INGRESO" ? "Ingreso registrado" : "Gasto registrado") + " · " + data.descripcion + " · " + fmtCLP(data.monto));
  guardar();
}

/* ── Mercado Pago · configuración real + cobros (Checkout Pro) ── */

export interface ConfigMP {
  accessToken: string;
  publicKey: string;
  email: string;
  modo?: "sandbox" | "produccion";
}

/** Guarda las credenciales reales de Mercado Pago de la comunidad. */
export async function configurarMP(comunidadId: string, cfg: ConfigMP): Promise<ResultadoMP> {
  if (EN_API) return api.configurarMP(comunidadId, cfg);
  await delay(1200);
  const d = db();
  const c = d.comunidades.find((x) => x.id === comunidadId)!;
  const modo: "sandbox" | "produccion" = cfg.modo ?? (cfg.accessToken.includes("TEST") ? "sandbox" : "produccion");
  c.vinculacion = {
    conectada: true,
    email: cfg.email,
    fecha: ahoraISO(),
    accessToken: cfg.accessToken,
    publicKey: cfg.publicKey,
    modo,
  };
  evento("Credenciales de Mercado Pago configuradas · " + c.nombre + " (" + modo + ")");
  guardar();
  return { ok: true, cuenta: cfg.email, mensaje: "Credenciales guardadas correctamente." };
}

/** Prueba la conexión contra la API de Mercado Pago usando el Access Token guardado. */
export async function probarMP(comunidadId: string): Promise<ResultadoMP> {
  if (EN_API) return api.probarMP(comunidadId);
  await delay(1400);
  const c = db().comunidades.find((x) => x.id === comunidadId)!;
  const v = c.vinculacion;
  if (!v.accessToken) {
    return { ok: false, mensaje: "Primero configura el Access Token de Mercado Pago." };
  }
  // Simulación de la llamada GET /users/me de Mercado Pago
  const esSandbox = v.accessToken.includes("TEST");
  return {
    ok: true,
    cuenta: v.email ?? "cuenta@" + (esSandbox ? "sandbox" : "mercadopago") + ".cl",
    siteId: esSandbox ? "MLA (sandbox)" : "MLC",
    mensaje: esSandbox
      ? "Conexión correcta en modo sandbox. Los cobros serán de prueba."
      : "Conexión correcta. La comunidad puede cobrar de forma real.",
  };
}

export async function desvincularMP(comunidadId: string) {
  if (EN_API) return api.desvincularMP(comunidadId);
  await delay(400);
  const c = db().comunidades.find((x) => x.id === comunidadId)!;
  c.vinculacion = { conectada: false };
  evento("Credenciales de Mercado Pago eliminadas · " + c.nombre);
  guardar();
}

/**
 * Genera un cobro mediante la API de Mercado Pago (Checkout Pro).
 * Devuelve el "punto de pago" (init_point) que el vecino abre para pagar.
 * - Modo demo: simula la respuesta de POST /checkout/preferences.
 * - Modo API: el backend crea la preferencia real con el Access Token de la comunidad.
 */
export async function generarCobroMP(
  comunidadId: string,
  data: { monto: number; concepto: string; unidad?: string; emailPagador?: string },
): Promise<CobroMP> {
  if (EN_API) return api.generarCobroMP(comunidadId, data);
  await delay(1600);
  const d = db();
  const c = d.comunidades.find((x) => x.id === comunidadId)!;
  if (!c.vinculacion.accessToken) {
    throw new Error("Configura primero las credenciales de Mercado Pago de esta comunidad.");
  }
  const esSandbox = c.vinculacion.accessToken.includes("TEST");
  const prefId = "PREF-" + uid().slice(0, 10).toUpperCase();
  const com = calcularComision(data.monto);
  const cobro: CobroMP = {
    id: prefId,
    puntoDePago:
      (esSandbox ? "https://sandbox.mercadopago.cl/checkout/v1/redirect?pref_id=" : "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=") + prefId,
    monto: data.monto,
    total: com.total,
    comisionApp: com.comisionApp,
    comisionMP: com.comisionMP,
    concepto: data.concepto,
    unidad: data.unidad,
    creado: ahoraISO(),
    modo: esSandbox ? "sandbox" : "produccion",
  };
  evento("Cobro generado vía Mercado Pago · " + c.nombre + " · " + fmtCLP(data.monto));
  guardar();
  return cobro;
}

/* ── importación CSV ────────────────────────────────────────── */
export interface FilaCSV {
  parcela: string; propietario: string; arrendatario?: string;
  contacto?: string; correo: string; deuda: number;
}
export async function importarCSV(comunidadId: string, filas: FilaCSV[]) {
  if (EN_API) return api.importarCSV(comunidadId, filas);
  await delay(900);
  const d = db();
  let vecinos = 0; let cargos = 0;
  const per = periodoActual();
  for (const f of filas) {
    // propietario
    let u = d.usuarios.find((x) => x.email.toLowerCase() === f.correo.toLowerCase());
    if (!u) {
      u = {
        id: uid(), nombre: f.propietario, email: f.correo, password: "vecino123",
        activo: true, creado: ahoraISO(), rolGlobal: null,
        membresias: [{ comunidadId, rol: "PROPIETARIO", unidad: f.parcela }],
      };
      d.usuarios.push(u);
      vecinos++;
    } else if (!u.membresias.some((m) => m.comunidadId === comunidadId && m.unidad === f.parcela)) {
      u.membresias.push({ comunidadId, rol: "PROPIETARIO", unidad: f.parcela });
      vecinos++;
    }
    // arrendatario opcional
    if (f.arrendatario && f.arrendatario.trim()) {
      const existeArr = d.usuarios.some((x) =>
        x.membresias.some((m) => m.comunidadId === comunidadId && m.unidad === f.parcela && m.rol === "ARRENDATARIO"));
      if (!existeArr) {
        d.usuarios.push({
          id: uid(), nombre: f.arrendatario.trim(), email: f.parcela.toLowerCase().replace(/[^a-z0-9]/g, "") + ".arr@importado.cl",
          password: "vecino123", activo: true, creado: ahoraISO(), rolGlobal: null,
          membresias: [{ comunidadId, rol: "ARRENDATARIO", unidad: f.parcela }],
        });
        vecinos++;
      }
    }
    // deuda → cobro pendiente
    if (f.deuda > 0) {
      const ya = d.cobros.some((c) => c.comunidadId === comunidadId && c.unidad === f.parcela && c.periodo === per && c.concepto === "Deuda inicial");
      if (!ya) {
        d.cobros.push({ id: uid(), comunidadId, unidad: f.parcela, periodo: per, concepto: "Deuda inicial", monto: f.deuda, estado: "PENDIENTE", vencimiento: hoyISO(), creado: ahoraISO() });
        cargos++;
      }
    }
  }
  const c = d.comunidades.find((x) => x.id === comunidadId)!;
  c.unidades = Math.max(c.unidades, new Set(filas.map((f) => f.parcela)).size);
  evento("Comunidad importada · " + filas.length + " parcelas · " + vecinos + " vecinos · " + cargos + " deudas");
  guardar();
  return { parcelas: filas.length, vecinos, cargos };
}

/* ── comunicación y comunidad ───────────────────────────────── */
export async function crearAviso(comunidadId: string, data: { titulo: string; cuerpo: string; tipo: Aviso["tipo"]; autor: string }) {
  if (EN_API) return api.crearAviso(comunidadId, data);
  await delay(500);
  db().avisos.unshift({ id: uid(), comunidadId, creado: ahoraISO(), ...data });
  evento("Aviso publicado: " + data.titulo);
  guardar();
}

export async function crearReserva(comunidadId: string, data: { area: string; fecha: string; bloque: Reserva["bloque"]; unidad: string; residente: string }) {
  if (EN_API) return api.crearReserva(comunidadId, data);
  await delay(500);
  const d = db();
  const choque = d.reservas.some((r) => r.comunidadId === comunidadId && r.area === data.area && r.fecha === data.fecha && r.bloque === data.bloque);
  if (choque) throw new Error("Ese horario ya está reservado por otro vecino.");
  d.reservas.push({ id: uid(), comunidadId, ...data });
  evento("Reserva: " + data.area + " · " + data.fecha + " · " + data.bloque);
  guardar();
}
export async function cancelarReserva(comunidadId: string, reservaId: string) {
  if (EN_API) return api.cancelarReserva(comunidadId, reservaId);
  await delay(400);
  const d = db();
  d.reservas = d.reservas.filter((r) => !(r.id === reservaId && r.comunidadId === comunidadId));
  guardar();
}

export async function crearVotacion(comunidadId: string, data: { titulo: string; pregunta: string; opciones: string[] }) {
  if (EN_API) return api.crearVotacion(comunidadId, data);
  await delay(500);
  db().votaciones.unshift({ id: uid(), comunidadId, abierta: true, creado: ahoraISO(), votos: [], ...data });
  evento("Votación abierta: " + data.titulo);
  guardar();
}
export async function votar(comunidadId: string, votacionId: string, unidad: string, opcion: string) {
  if (EN_API) return api.votar(comunidadId, votacionId, unidad, opcion);
  await delay(600);
  const d = db();
  const v = d.votaciones.find((x) => x.id === votacionId && x.comunidadId === comunidadId);
  if (!v) throw new Error("Votación no encontrada.");
  if (!v.abierta) throw new Error("La votación ya está cerrada.");
  if (v.votos.some((x) => x.unidad === unidad)) throw new Error("Tu unidad ya votó en esta asamblea.");
  v.votos.push({ unidad, opcion });
  evento("Voto registrado · " + unidad + " · " + v.titulo);
  guardar();
}

export async function registrarAcceso(comunidadId: string, data: { visitante: string; tipo: RegistroAcceso["tipo"]; unidad: string }) {
  if (EN_API) return api.registrarAcceso(comunidadId, data);
  await delay(400);
  db().bitacora.unshift({ id: uid(), comunidadId, entrada: ahoraISO(), salida: null, ...data });
  evento("Ingreso registrado: " + data.visitante);
  guardar();
}
export async function marcarSalida(comunidadId: string, registroId: string) {
  if (EN_API) return api.marcarSalida(comunidadId, registroId);
  await delay(300);
  const r = db().bitacora.find((x) => x.id === registroId && x.comunidadId === comunidadId);
  if (r) { r.salida = ahoraISO(); guardar(); }
}

/* ── gestión de vecinos (admin) ─────────────────────────────── */
export async function crearVecino(comunidadId: string, data: { nombre: string; email: string; password: string; rol: RolCondo; unidad?: string }) {
  if (EN_API) return api.crearVecino(comunidadId, data);
  await delay(550);
  const d = db();
  if (d.usuarios.some((u) => u.email.toLowerCase() === data.email.toLowerCase()))
    throw new Error("Ya existe una cuenta con ese correo.");
  d.usuarios.push({
    id: uid(), nombre: data.nombre, email: data.email, password: data.password,
    activo: true, creado: ahoraISO(), rolGlobal: null,
    membresias: [{ comunidadId, rol: data.rol, unidad: data.unidad }],
  });
  evento("Nuevo vecino: " + data.nombre + " (" + ROL_LABEL[data.rol] + ")");
  guardar();
}

/* ── súper admin · SaaS ─────────────────────────────────────── */
export interface ListadoSaaS {
  comunidades: (Comunidad & { usuarios: number; cobrosMes: number; recaudado: number })[];
  usuarios: Usuario[]; facturas: FacturaSaaS[]; seriePagos: DiaPago[]; eventos: Evento[];
  planes: Plan[];
  mpPlataforma: MPPlataforma;
}

const enmascarar = (s?: string) => (s ? s.slice(0, 7) + "••••" + s.slice(-4) : undefined);

export async function listadoSaaS(): Promise<ListadoSaaS> {
  if (EN_API) return (await api.listadoSaaS()) as unknown as ListadoSaaS;
  await delay(450);
  const d = db();
  return {
    comunidades: d.comunidades.map((c) => ({
      ...c,
      usuarios: d.usuarios.filter((u) => u.membresias.some((m) => m.comunidadId === c.id)).length,
      cobrosMes: d.cobros.filter((x) => x.comunidadId === c.id && x.periodo === periodoActual()).length,
      recaudado: d.pagos.filter((p) => p.comunidadId === c.id).reduce((a, p) => a + p.monto, 0),
    })),
    usuarios: d.usuarios, facturas: d.facturas, seriePagos: d.seriePagos, eventos: d.eventos,
    planes: d.planes,
    mpPlataforma: {
      ...d.mpPlataforma,
      accessToken: enmascarar(d.mpPlataforma.accessToken),
      publicKey: enmascarar(d.mpPlataforma.publicKey),
    },
  };
}

/* ── súper admin · planes dinámicos ─────────────────────────── */
export async function crearPlan( { nombre: string; precio: number }): Promise<Plan> {
  if (EN_API) return api.crearPlan(data);
  await delay(500);
  const d = db();
  if (d.planes.some((p) => p.nombre.toLowerCase() === data.nombre.trim().toLowerCase()))
    throw new Error("Ya existe un plan con ese nombre.");
  const p: Plan = { id: "plan_" + uid().slice(0, 8), nombre: data.nombre.trim(), precio: Math.max(0, data.precio), activa: true, creada: ahoraISO() };
  d.planes.push(p);
  evento("Plan creado: " + p.nombre + " · " + fmtCLP(p.precio) + "/mes");
  guardar();
  return p;
}

export async function actualizarPlan(planId: string,  { nombre?: string; precio?: number; activa?: boolean }) {
  if (EN_API) return api.actualizarPlan(planId, data);
  await delay(450);
  const p = db().planes.find((x) => x.id === planId);
  if (!p) throw new Error("Plan no encontrado.");
  if (data.nombre !== undefined) p.nombre = data.nombre.trim();
  if (data.precio !== undefined) p.precio = Math.max(0, data.precio);
  if (data.activa !== undefined) p.activa = data.activa;
  evento("Plan actualizado: " + p.nombre + " · " + fmtCLP(p.precio) + "/mes");
  guardar();
}

export async function eliminarPlan(planId: string) {
  if (EN_API) return api.eliminarPlan(planId);
  await delay(450);
  const d = db();
  const enUso = d.comunidades.filter((c) => c.plan === planId).length;
  if (enUso > 0) throw new Error("No se puede eliminar: " + enUso + " comunidad(es) usan este plan.");
  const p = d.planes.find((x) => x.id === planId);
  d.planes = d.planes.filter((x) => x.id !== planId);
  evento("Plan eliminado: " + (p?.nombre ?? planId));
  guardar();
}

/* ── súper admin · cuenta Mercado Pago de la plataforma ─────── */
export async function configurarMPPlataforma(cfg: { accessToken: string; publicKey: string; email: string }): Promise<ResultadoMP> {
  if (EN_API) return api.configurarMPPlataforma(cfg);
  await delay(1100);
  const d = db();
  d.mpPlataforma = { conectada: true, accessToken: cfg.accessToken, publicKey: cfg.publicKey, email: cfg.email, fecha: ahoraISO() };
  evento("Cuenta Mercado Pago de la plataforma configurada");
  guardar();
  return { ok: true, cuenta: cfg.email, mensaje: "Credenciales de la plataforma guardadas." };
}

export async function probarMPPlataforma(): Promise<ResultadoMP> {
  if (EN_API) return api.probarMPPlataforma();
  await delay(1300);
  const v = db().mpPlataforma;
  if (!v.accessToken) return { ok: false, mensaje: "Primero configura el Access Token de la plataforma." };
  const esSandbox = v.accessToken.includes("TEST");
  return {
    ok: true, cuenta: v.email ?? "plataforma@mercadopago.cl", siteId: esSandbox ? "MLA (sandbox)" : "MLC",
    mensaje: esSandbox ? "Conexión correcta en sandbox." : "Conexión correcta. La plataforma puede cobrar suscripciones.",
  };
}

export async function desvincularMPPlataforma() {
  if (EN_API) return api.desvincularMPPlataforma();
  await delay(400);
  const d = db();
  d.mpPlataforma = { conectada: false };
  evento("Cuenta Mercado Pago de la plataforma desconectada");
  guardar();
}

/* ── suscripciones de pago automático (Mercado Pago · preapproval) ── */

/** Suscripción SaaS: la comunidad autoriza el pago automático de su cuenta (facturas) con tarjeta de crédito. */
export async function suscribirFacturaMP(facturaId: string): Promise<CobroMP> {
  if (EN_API) return api.suscribirFacturaMP(facturaId);
  await delay(1700);
  const d = db();
  if (!d.mpPlataforma.accessToken)
    throw new Error("Configura primero la cuenta Mercado Pago de la plataforma.");
  const f = d.facturas.find((x) => x.id === facturaId);
  if (!f) throw new Error("Factura no encontrada.");
  const c = d.comunidades.find((x) => x.id === f.comunidadId)!;
  const com = calcularComision(f.monto);
  const esSandbox = d.mpPlataforma.accessToken.includes("TEST");
  const preId = "PREAPP-" + uid().slice(0, 8).toUpperCase();
  evento("Suscripción creada para " + c.nombre + " · " + fmtMes(f.periodo));
  guardar();
  return {
    id: preId,
    puntoDePago: (esSandbox ? "https://sandbox.mercadopago.cl/subscriptions/checkout?preapproval_id=" : "https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=") + preId,
    monto: f.monto, total: com.total, comisionApp: com.comisionApp, comisionMP: com.comisionMP,
    concepto: "Suscripción mensual · " + f.plan + " · " + fmtMes(f.periodo),
    creado: ahoraISO(), modo: esSandbox ? "sandbox" : "produccion",
  };
}

/** Suscripción de vecino: el admin/comité crea el pago automático del mes para una unidad. */
export async function crearSuscripcion(
  comunidadId: string,
   { unidad: string; email: string; monto: number },
): Promise<Suscripcion> {
  if (EN_API) return api.crearSuscripcion(comunidadId, data);
  await delay(1500);
  const d = db();
  const c = d.comunidades.find((x) => x.id === comunidadId)!;
  if (!c.vinculacion.accessToken)
    throw new Error("La comunidad debe configurar primero sus credenciales de Mercado Pago (Cobros en línea).");
  const esSandbox = c.vinculacion.accessToken.includes("TEST");
  const preId = "PREAPP-" + uid().slice(0, 8).toUpperCase();
  const s: Suscripcion = {
    id: uid(), comunidadId, unidad: data.unidad, email: data.email, monto: data.monto,
    frecuencia: "MENSUAL", estado: "PENDIENTE", mpId: preId,
    linkAutorizacion: (esSandbox ? "https://sandbox.mercadopago.cl/subscriptions/checkout?preapproval_id=" : "https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=") + preId,
    creada: ahoraISO(),
  };
  d.suscripciones.push(s);
  evento("Suscripción creada para " + data.unidad + " · " + fmtCLP(data.monto) + "/mes");
  guardar();
  return s;
}

export async function cancelarSuscripcion(comunidadId: string, suscripcionId: string) {
  if (EN_API) return api.cancelarSuscripcion(comunidadId, suscripcionId);
  await delay(600);
  const s = db().suscripciones.find((x) => x.id === suscripcionId && x.comunidadId === comunidadId);
  if (!s) throw new Error("Suscripción no encontrada.");
  s.estado = "CANCELADA";
  evento("Suscripción cancelada · " + s.unidad);
  guardar();
}

export async function crearComunidadSaaS(data: { nombre: string; direccion: string; ciudad: string; unidades: number; plan: PlanId; emailAdmin: string; nombreAdmin: string }) {
  if (EN_API) { await api.crearComunidadSaaS(data); return; }
  await delay(700);
  const d = db();
  const id = "c_" + uid().slice(0, 6);
  d.comunidades.push({
    id, nombre: data.nombre, direccion: data.direccion, ciudad: data.ciudad,
    unidades: data.unidades, plan: data.plan, creada: ahoraISO(), estado: "ACTIVA",
    vinculacion: { conectada: false },
  });
  d.usuarios.push({
    id: uid(), nombre: data.nombreAdmin, email: data.emailAdmin, password: "comunidad123",
    activo: true, creado: ahoraISO(), rolGlobal: null,
    membresias: [{ comunidadId: id, rol: "ADMIN" }],
  });
  evento("Nueva comunidad onboarded: " + data.nombre + " · plan " + PLAN_LABEL[data.plan]);
  guardar();
}
export async function toggleEstadoComunidad(comunidadId: string) {
  if (EN_API) return api.toggleEstadoComunidad(comunidadId);
  await delay(400);
  const c = db().comunidades.find((x) => x.id === comunidadId)!;
  c.estado = c.estado === "ACTIVA" ? "SUSPENDIDA" : "ACTIVA";
  evento("Estado de " + c.nombre + " → " + c.estado);
  guardar();
  return c.estado;
}

/* ── gestión de usuarios (superadmin) ───────────────────────── */
export async function setPasswordUsuario(usuarioId: string, nueva: string) {
  if (EN_API) return api.setPasswordUsuario(usuarioId, nueva);
  await delay(650);
  const u = db().usuarios.find((x) => x.id === usuarioId);
  if (!u) throw new Error("Usuario no encontrado.");
  if (nueva.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
  u.password = nueva;
  evento("Contraseña redefinida · " + u.email);
  guardar();
}

export async function toggleUsuarioActivo(usuarioId: string) {
  if (EN_API) return api.toggleUsuarioActivo(usuarioId);
  await delay(400);
  const u = db().usuarios.find((x) => x.id === usuarioId);
  if (!u) throw new Error("Usuario no encontrado.");
  u.activo = !u.activo;
  evento((u.activo ? "Cuenta activada · " : "Cuenta desactivada · ") + u.email);
  guardar();
  return u.activo;
}

export async function crearUsuarioSaaS(data: { nombre: string; email: string; password: string; rolGlobal: boolean; membresias: Membresia[] }) {
  if (EN_API) return api.crearUsuarioSaaS(data);
  await delay(700);
  const d = db();
  if (d.usuarios.some((u) => u.email.toLowerCase() === data.email.toLowerCase()))
    throw new Error("Ya existe una cuenta con ese correo.");
  d.usuarios.push({
    id: uid(), nombre: data.nombre, email: data.email, password: data.password,
    activo: true, creado: ahoraISO(),
    rolGlobal: data.rolGlobal ? "SUPERADMIN" : null,
    membresias: data.rolGlobal ? [] : data.membresias,
  });
  evento("Usuario creado por superadmin: " + data.nombre);
  guardar();
}

/* ── cobrar factura de comunidad vía Mercado Pago ───────────── */
export interface CobroFacturaMP {
  id: string; puntoDePago: string; monto: number; total: number;
  comisionApp: number; comisionMP: number; comunidad: string; creado: string;
  modo?: "sandbox" | "produccion";
}
export async function cobrarFacturaMP(facturaId: string): Promise<CobroFacturaMP> {
  if (EN_API) return api.cobrarFacturaMP(facturaId);
  await delay(1500);
  const d = db();
  const f = d.facturas.find((x) => x.id === facturaId);
  if (!f) throw new Error("Factura no encontrada.");
  const comu = d.comunidades.find((x) => x.id === f.comunidadId);
  const com = calcularComision(f.monto);
  const prefId = "PREF-" + uid().slice(0, 10).toUpperCase();
  evento("Punto de pago MP para factura de " + (comu?.nombre ?? f.comunidadId) + " · " + fmtCLP(com.total));
  guardar();
  return {
    id: prefId,
    puntoDePago: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=" + prefId,
    monto: f.monto, total: com.total,
    comisionApp: com.comisionApp, comisionMP: com.comisionMP,
    comunidad: comu?.nombre ?? "Comunidad", creado: ahoraISO(), modo: "produccion",
  };
}

/* ── facturación SaaS: cobros A las comunidades ─────────────── */
export const PRECIO_PLAN: Record<PlanId, number> = { COMITE: 0, PARCELAS: 29900, CUSTOM: 89000 };

/** Genera la factura mensual del plan para cada comunidad activa del periodo. */
export async function generarFacturasMes(periodo: string): Promise<{ creadas: number; total: number }> {
  if (EN_API) return api.generarFacturasMes(periodo);
  await delay(800);
  const d = db();
  const activas = d.comunidades.filter((c) => c.estado === "ACTIVA");
  let creadas = 0;
  for (const c of activas) {
    if (d.facturas.some((f) => f.comunidadId === c.id && f.periodo === periodo)) continue;
    d.facturas.push({
      id: "f_" + uid().slice(0, 8), comunidadId: c.id, periodo,
      plan: nombreDePlan(c.plan), monto: precioDePlan(c.plan), estado: "PENDIENTE", fecha: ahoraISO(),
    });
    creadas++;
  }
  if (creadas > 0) evento("Facturación " + periodo + " generada: " + creadas + " comunidades");
  guardar();
  return { creadas, total: activas.length };
}

/** Marca una factura del SaaS como pagada (cobrada a la comunidad). */
export async function marcarFacturaPagada(facturaId: string) {
  if (EN_API) return api.marcarFacturaPagada(facturaId);
  await delay(500);
  const d = db();
  const f = d.facturas.find((x) => x.id === facturaId);
  if (!f) throw new Error("Factura no encontrada.");
  f.estado = "PAGADA";
  evento("Factura " + f.id.slice(2, 8).toUpperCase() + " cobrada · " + fmtCLP(f.monto));
  guardar();
}

export async function crearUsuarioGlobal(data: { nombre: string; email: string; password: string; rolGlobal: boolean; membresias: Membresia[] }) {
  await delay(550);
  const d = db();
  if (d.usuarios.some((u) => u.email.toLowerCase() === data.email.toLowerCase()))
    throw new Error("Ya existe una cuenta con ese correo.");
  d.usuarios.push({
    id: uid(), nombre: data.nombre, email: data.email, password: data.password,
    activo: true, creado: ahoraISO(),
    rolGlobal: data.rolGlobal ? "SUPERADMIN" : null,
    membresias: data.rolGlobal ? [] : data.membresias,
  });
  evento("Usuario creado: " + data.nombre);
  guardar();
}
export async function actualizarUsuarioGlobal(id: string, patch: Partial<Usuario>) {
  await delay(450);
  const u = db().usuarios.find((x) => x.id === id);
  if (u) Object.assign(u, patch);
  guardar();
}
export async function eliminarUsuarioGlobal(id: string) {
  await delay(450);
  const d = db();
  d.usuarios = d.usuarios.filter((x) => x.id !== id);
  evento("Usuario eliminado (id " + id.slice(0, 6) + ")");
  guardar();
}
