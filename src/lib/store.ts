/* ────────────────────────────────────────────────────────────────
   ComunApp · capa de datos (simula el backend FastAPI + PostgreSQL)
   Multi-tenant: cada consulta de condominio filtra por parcelaId.
   ──────────────────────────────────────────────────────────────── */

export type Rol = "SUPERADMIN" | "ADMIN" | "COMITE" | "PROPIETARIO" | "ARRENDATARIO";
export type RolCondo = Exclude<Rol, "SUPERADMIN">;

export interface Membresia {
  parcelaId: string;
  rol: RolCondo;
  unidad?: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rolGlobal: Rol | null; // SUPERADMIN vive aquí
  membresias: Membresia[];
  activo: boolean;
  creado: string;
}

export interface Parcela {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  unidades: number;
  creado: string;
}

export type EstadoCobro = "pendiente" | "pagado" | "vencido";
export type TipoCobro = "gasto_comun" | "multa" | "extra";

export interface Cobro {
  id: string;
  parcelaId: string;
  unidad: string;
  concepto: string;
  periodo: string; // "2026-02"
  monto: number;
  vencimiento: string;
  estado: EstadoCobro;
  tipo: TipoCobro;
  recordatorio?: string;
  pagadoEl?: string;
  pagoId?: string;
}

export interface Pago {
  id: string;
  parcelaId: string;
  cobroId: string;
  usuarioId: string;
  unidad: string;
  monto: number;
  metodo: string;
  fecha: string;
  comprobante: string;
}

export interface Movimiento {
  id: string;
  parcelaId: string;
  tipo: "ingreso" | "egreso";
  concepto: string;
  categoria: string;
  monto: number;
  fecha: string;
  conciliado: boolean;
}

export type TipoAviso = "noticia" | "emergencia" | "mantencion";

export interface Aviso {
  id: string;
  parcelaId: string;
  titulo: string;
  cuerpo: string;
  tipo: TipoAviso;
  autor: string;
  fecha: string;
}

export interface AreaComun {
  id: string;
  parcelaId: string;
  nombre: string;
  capacidad: number;
}

export interface Reserva {
  id: string;
  parcelaId: string;
  areaId: string;
  fecha: string; // yyyy-mm-dd
  bloque: "Mañana" | "Tarde" | "Noche";
  usuarioId: string;
  solicitante: string;
}

export interface Votacion {
  id: string;
  parcelaId: string;
  titulo: string;
  descripcion: string;
  opciones: { id: string; texto: string }[];
  votos: Record<string, string>; // usuarioId → opcionId
  vence: string;
  estado: "abierta" | "cerrada";
}

export interface RegistroAcceso {
  id: string;
  parcelaId: string;
  tipo: "visita" | "proveedor";
  nombre: string;
  documento: string;
  destino: string;
  entrada: string;
  salida?: string;
}

export interface Evento {
  id: string;
  fecha: string;
  texto: string;
}

export interface Sesion {
  usuarioId: string;
  parcelaId: string | null;
  rol: Rol;
}

interface DB {
  version: number;
  usuarios: Usuario[];
  parcelas: Parcela[];
  cobros: Cobro[];
  pagos: Pago[];
  movimientos: Movimiento[];
  avisos: Aviso[];
  areas: AreaComun[];
  reservas: Reserva[];
  votaciones: Votacion[];
  accesos: RegistroAcceso[];
  eventos: Evento[];
}

/* ── utilidades ─────────────────────────────────────────────── */

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export const fmtCLP = (n: number) =>
  "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const fmtFecha = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
};

export const fmtFechaLarga = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
};

const dias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};
const diaStr = (n: number) => dias(n).slice(0, 10);

export const mesActual = () => new Date().toISOString().slice(0, 7);
export const mesAnterior = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};
export const mesLabel = (periodo: string) => {
  const [y, m] = periodo.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
};

function descargar(nombre: string, contenido: string, mime = "text/plain") {
  const blob = new Blob([contenido], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── seed ───────────────────────────────────────────────────── */

const P1 = "p_torres";
const P2 = "p_alamos";

function seed(): DB {
  const usuarios: Usuario[] = [
    { id: "u_super", nombre: "Valeria Soto", email: "plataforma@comunapp.cl", password: "admin123", rolGlobal: "SUPERADMIN", membresias: [], activo: true, creado: dias(-220) },
    { id: "u_admin", nombre: "Rodrigo Muñoz", email: "admin@torresdelparque.cl", password: "admin123", rolGlobal: null, membresias: [{ parcelaId: P1, rol: "ADMIN" }], activo: true, creado: dias(-180) },
    { id: "u_comite", nombre: "Paola Iglesias", email: "comite@torresdelparque.cl", password: "comite123", rolGlobal: null, membresias: [{ parcelaId: P1, rol: "COMITE" }], activo: true, creado: dias(-160) },
    { id: "u_prop1", nombre: "María Fernández", email: "maria@demo.cl", password: "demo123", rolGlobal: null, membresias: [{ parcelaId: P1, rol: "PROPIETARIO", unidad: "A-42" }], activo: true, creado: dias(-150) },
    { id: "u_prop2", nombre: "Cristóbal Rojas", email: "cristobal@demo.cl", password: "demo123", rolGlobal: null, membresias: [{ parcelaId: P1, rol: "PROPIETARIO", unidad: "B-17" }], activo: true, creado: dias(-140) },
    { id: "u_prop3", nombre: "Ana Baeza", email: "ana@demo.cl", password: "demo123", rolGlobal: null, membresias: [{ parcelaId: P1, rol: "PROPIETARIO", unidad: "A-11" }], activo: true, creado: dias(-120) },
    { id: "u_prop4", nombre: "Pedro Salinas", email: "pedro@demo.cl", password: "demo123", rolGlobal: null, membresias: [{ parcelaId: P1, rol: "PROPIETARIO", unidad: "C-03" }], activo: true, creado: dias(-110) },
    { id: "u_arr", nombre: "Jorge Tapia", email: "jorge@demo.cl", password: "demo123", rolGlobal: null, membresias: [{ parcelaId: P1, rol: "ARRENDATARIO", unidad: "B-22" }], activo: true, creado: dias(-90) },
    { id: "u_admin2", nombre: "Lucía Herrera", email: "admin@losalamos.cl", password: "admin123", rolGlobal: null, membresias: [{ parcelaId: P2, rol: "ADMIN" }], activo: true, creado: dias(-80) },
    { id: "u_prop5", nombre: "Diego Lara", email: "diego@demo.cl", password: "demo123", rolGlobal: null, membresias: [{ parcelaId: P2, rol: "PROPIETARIO", unidad: "D-08" }], activo: false, creado: dias(-60) },
  ];

  const parcelas: Parcela[] = [
    { id: P1, nombre: "Torres del Parque", direccion: "Av. Providencia 2301", ciudad: "Santiago", unidades: 96, creado: dias(-180) },
    { id: P2, nombre: "Condominio Los Álamos", direccion: "Camino El Alto 850", ciudad: "Concepción", unidades: 48, creado: dias(-80) },
  ];

  const mk = (parcelaId: string, unidad: string, periodo: string, estado: EstadoCobro, tipo: TipoCobro = "gasto_comun", concepto?: string, monto = 86400): Cobro => ({
    id: uid(), parcelaId, unidad, periodo, estado, tipo,
    concepto: concepto ?? (tipo === "multa" ? "Multa · estacionamiento de visitas" : "Gastos comunes"),
    monto: tipo === "multa" ? 22000 : monto,
    vencimiento: periodo + "-10",
    pagadoEl: estado === "pagado" ? periodo + "-08" : undefined,
  });

  const ma = mesAnterior();
  const cobros: Cobro[] = [
    mk(P1, "A-42", ma, "pagado"), mk(P1, "B-17", ma, "pagado"), mk(P1, "A-11", ma, "pagado"),
    mk(P1, "C-03", ma, "pagado"), mk(P1, "B-22", ma, "pagado"),
    mk(P1, "A-42", mesActual(), "pendiente"),
    mk(P1, "B-17", mesActual(), "vencido"),
    mk(P1, "A-11", mesActual(), "pendiente"),
    mk(P1, "C-03", mesActual(), "pagado"),
    mk(P1, "B-22", mesActual(), "pendiente"),
    { ...mk(P1, "B-17", mesActual(), "pendiente", "multa"), vencimiento: diaStr(4) },
    { ...mk(P2, "D-08", mesActual(), "pendiente"), monto: 64000 },
  ];
  cobros.forEach((c) => {
    if (c.estado === "pagado") {
      c.pagoId = "pg_" + c.id;
    }
  });

  const pagos: Pago[] = cobros
    .filter((c) => c.estado === "pagado" && c.parcelaId === P1)
    .map((c, i) => ({
      id: "pg_" + c.id, parcelaId: P1, cobroId: c.id,
      usuarioId: i % 2 ? "u_prop2" : "u_prop1",
      unidad: c.unidad, monto: c.monto, metodo: "Mercado Pago",
      fecha: c.pagadoEl!, comprobante: "CA-" + new Date().getFullYear() + "-" + (1042 + i),
    }));

  const movimientos: Movimiento[] = [
    { id: uid(), parcelaId: P1, tipo: "ingreso", concepto: "Gastos comunes · " + mesLabel(ma), categoria: "Gastos comunes", monto: 8294400, fecha: dias(-34), conciliado: true },
    { id: uid(), parcelaId: P1, tipo: "egreso", concepto: "Conserjería y aseo (externalizado)", categoria: "Personal", monto: 3150000, fecha: dias(-31), conciliado: true },
    { id: uid(), parcelaId: P1, tipo: "egreso", concepto: "Electricidad áreas comunes", categoria: "Servicios", monto: 612000, fecha: dias(-28), conciliado: true },
    { id: uid(), parcelaId: P1, tipo: "egreso", concepto: "Mantención ascensores — Schindler", categoria: "Mantención", monto: 480000, fecha: dias(-24), conciliado: true },
    { id: uid(), parcelaId: P1, tipo: "egreso", concepto: "Aporte fondo de reserva (5%)", categoria: "Fondo de reserva", monto: 415000, fecha: dias(-22), conciliado: true },
    { id: uid(), parcelaId: P1, tipo: "ingreso", concepto: "Multas de estacionamiento", categoria: "Multas", monto: 132000, fecha: dias(-15), conciliado: true },
    { id: uid(), parcelaId: P1, tipo: "egreso", concepto: "Seguro de espacios comunes", categoria: "Seguros", monto: 342000, fecha: dias(-12), conciliado: false },
    { id: uid(), parcelaId: P1, tipo: "ingreso", concepto: "Gastos comunes · " + mesLabel(mesActual()), categoria: "Gastos comunes", monto: 5184000, fecha: dias(-6), conciliado: false },
    { id: uid(), parcelaId: P1, tipo: "egreso", concepto: "Jardinería y riego", categoria: "Mantención", monto: 195000, fecha: dias(-3), conciliado: false },
    { id: uid(), parcelaId: P2, tipo: "ingreso", concepto: "Gastos comunes · " + mesLabel(mesActual()), categoria: "Gastos comunes", monto: 2944000, fecha: dias(-9), conciliado: true },
  ];

  const avisos: Aviso[] = [
    { id: uid(), parcelaId: P1, titulo: "Corte de agua programado", cuerpo: "Este sábado entre 10:00 y 14:00 se realizará el cambio de la bomba del estanque superior. Recomendamos almacenar agua con anticipación.", tipo: "emergencia", autor: "Administración", fecha: dias(-1) },
    { id: uid(), parcelaId: P1, titulo: "Asamblea ordinaria de copropietarios", cuerpo: "Se cita a asamblea el próximo jueves a las 19:30 en la sala multiuso. Tabla: presupuesto 2026, fondo de reserva y renovación de seguros. La votación digital ya está disponible.", tipo: "noticia", autor: "Comité", fecha: dias(-4) },
    { id: uid(), parcelaId: P1, titulo: "Mantención de piscina", cuerpo: "La piscina permanecerá cerrada por limpieza y tratamiento químico desde el lunes al miércoles. El quincho funciona con normalidad.", tipo: "mantencion", autor: "Administración", fecha: dias(-8) },
  ];

  const areas: AreaComun[] = [
    { id: "a_quincho", parcelaId: P1, nombre: "Quincho terraza", capacidad: 20 },
    { id: "a_sala", parcelaId: P1, nombre: "Sala multiuso", capacidad: 40 },
    { id: "a_piscina", parcelaId: P1, nombre: "Sector piscina", capacidad: 30 },
  ];

  const reservas: Reserva[] = [
    { id: uid(), parcelaId: P1, areaId: "a_quincho", fecha: diaStr(2), bloque: "Noche", usuarioId: "u_prop2", solicitante: "Cristóbal Rojas" },
    { id: uid(), parcelaId: P1, areaId: "a_sala", fecha: diaStr(4), bloque: "Tarde", usuarioId: "u_admin", solicitante: "Administración" },
  ];

  const votaciones: Votacion[] = [
    {
      id: uid(), parcelaId: P1, titulo: "Renovación de pintura de fachada",
      descripcion: "Se aprobó cotizar con 3 proveedores. ¿Qué gama de color prefiere la comunidad para la fachada poniente?",
      opciones: [
        { id: "o1", texto: "Gris piedra (propuesta A)" },
        { id: "o2", texto: "Verde salvia (propuesta B)" },
        { id: "o3", texto: "Blanco hueso (propuesta C)" },
      ],
      votos: { u_prop2: "o2", u_prop3: "o1" },
      vence: diaStr(6), estado: "abierta",
    },
    {
      id: uid(), parcelaId: P1, titulo: "Nuevo reglamento de estacionamientos",
      descripcion: "Actualización de multas, horarios de visitas y uso de bicicletero. Resultado de la asamblea de diciembre.",
      opciones: [{ id: "o1", texto: "A favor" }, { id: "o2", texto: "En contra" }, { id: "o3", texto: "Abstención" }],
      votos: { u_prop1: "o1", u_prop2: "o1", u_prop3: "o3", u_prop4: "o2" },
      vence: diaStr(-20), estado: "cerrada",
    },
  ];

  const accesos: RegistroAcceso[] = [
    { id: uid(), parcelaId: P1, tipo: "visita", nombre: "Camila Órdenes", documento: "15.433.902-1", destino: "Depto. A-42", entrada: dias(0).replace("T", "T") , salida: undefined },
    { id: uid(), parcelaId: P1, tipo: "proveedor", nombre: "TecnoAscensores SpA", documento: "76.554.210-K", destino: "Torres A y B", entrada: dias(-1), salida: dias(-1) },
    { id: uid(), parcelaId: P1, tipo: "visita", nombre: "Héctor Pizarro", documento: "12.876.111-5", destino: "Depto. C-03", entrada: dias(-1), salida: dias(-1) },
  ];

  const eventos: Evento[] = [
    { id: uid(), fecha: dias(-0.2), texto: "Pago recibido — B-22 · " + fmtCLP(86400) + " (Mercado Pago)" },
    { id: uid(), fecha: dias(-1), texto: "Aviso de emergencia publicado en Torres del Parque" },
    { id: uid(), fecha: dias(-2), texto: "Cobros del mes generados — Torres del Parque (5 unidades)" },
    { id: uid(), fecha: dias(-3), texto: "Nuevo usuario registrado: Diego Lara (Los Álamos)" },
    { id: uid(), fecha: dias(-6), texto: "Conciliación bancaria parcial — 5 movimientos" },
  ];

  return { version: 3, usuarios, parcelas, cobros, pagos, movimientos, avisos, areas, reservas, votaciones, accesos, eventos };
}

/* ── persistencia ───────────────────────────────────────────── */

const DB_KEY = "comunapp_db_v3";
const SES_KEY = "comunapp_sesion";

let db: DB = cargar();

function cargar(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === 3) return parsed;
    }
  } catch {
    /* seed */
  }
  return seed();
}

function guardar() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function resetDemo() {
  db = seed();
  guardar();
  localStorage.removeItem(SES_KEY);
}

export function reiniciarPeriodo() {
  db = seed();
  guardar();
}

const delay = (ms = 320) => new Promise<void>((r) => setTimeout(r, ms));

function evento(texto: string) {
  db.eventos.unshift({ id: uid(), fecha: new Date().toISOString(), texto });
  db.eventos = db.eventos.slice(0, 30);
}

/* ── autenticación y sesión ─────────────────────────────────── */

export function getSesion(): Sesion | null {
  try {
    const raw = localStorage.getItem(SES_KEY);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

export function setSesion(s: Sesion | null) {
  if (s) localStorage.setItem(SES_KEY, JSON.stringify(s));
  else localStorage.removeItem(SES_KEY);
}

export async function login(email: string, password: string): Promise<Sesion> {
  await delay(600);
  const u = db.usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || u.password !== password) throw new Error("Credenciales incorrectas. Verifica tu correo y contraseña.");
  if (!u.activo) throw new Error("Esta cuenta está desactivada. Contacta al administrador de la plataforma.");
  const rol: Rol = u.rolGlobal ?? u.membresias[0]?.rol ?? "PROPIETARIO";
  const s: Sesion = { usuarioId: u.id, parcelaId: u.membresias[0]?.parcelaId ?? null, rol };
  setSesion(s);
  return s;
}

export function usuarioActual(s: Sesion): Usuario | null {
  return db.usuarios.find((u) => u.id === s.usuarioId) ?? null;
}

export function cambiarParcelaSesion(s: Sesion, parcelaId: string): Sesion | null {
  const u = usuarioActual(s);
  const m = u?.membresias.find((x) => x.parcelaId === parcelaId);
  if (!u || !m) return null;
  const nueva: Sesion = { usuarioId: u.id, parcelaId, rol: m.rol };
  setSesion(nueva);
  return nueva;
}

/* ── permisos (RBAC) ────────────────────────────────────────── */

export type Capacidad =
  | "panel" | "cobranza" | "finanzas" | "finanzas_escribir" | "conciliar"
  | "avisos" | "residentes" | "bitacora_escribir" | "reportes";

export const PERMISOS: Record<RolCondo, Record<Capacidad, boolean>> = {
  ADMIN: { panel: true, cobranza: true, finanzas: true, finanzas_escribir: true, conciliar: true, avisos: true, residentes: true, bitacora_escribir: true, reportes: true },
  COMITE: { panel: true, cobranza: true, finanzas: true, finanzas_escribir: false, conciliar: false, avisos: true, residentes: false, bitacora_escribir: false, reportes: true },
  PROPIETARIO: { panel: false, cobranza: false, finanzas: false, finanzas_escribir: false, conciliar: false, avisos: false, residentes: false, bitacora_escribir: false, reportes: false },
  ARRENDATARIO: { panel: false, cobranza: false, finanzas: false, finanzas_escribir: false, conciliar: false, avisos: false, residentes: false, bitacora_escribir: false, reportes: false },
};

export const ROL_LABEL: Record<Rol, string> = {
  SUPERADMIN: "Plataforma",
  ADMIN: "Administrador",
  COMITE: "Comité",
  PROPIETARIO: "Propietario",
  ARRENDATARIO: "Arrendatario",
};

export const ROL_COLOR: Record<Rol, string> = {
  SUPERADMIN: "#c9f04d",
  ADMIN: "#2f9e68",
  COMITE: "#237386",
  PROPIETARIO: "#e09a31",
  ARRENDATARIO: "#b0793a",
};

/* ── API pública (equivalente a los routers de FastAPI) ─────── */

export const api = {
  /* plataforma */
  parcelas: async () => (await delay(200), [...db.parcelas]),
  usuarios: async () => (await delay(200), [...db.usuarios]),

  crearUsuario: async (data: { nombre: string; email: string; password: string; rolGlobal: Rol | null; membresias: Membresia[] }) => {
    await delay(450);
    if (db.usuarios.some((u) => u.email.toLowerCase() === data.email.toLowerCase()))
      throw new Error("Ya existe un usuario con ese correo.");
    const u: Usuario = { id: "u_" + uid(), ...data, activo: true, creado: new Date().toISOString() };
    db.usuarios.push(u);
    evento("Nuevo usuario registrado: " + u.nombre + (u.rolGlobal ? " (Plataforma)" : ""));
    guardar();
    return u;
  },

  actualizarUsuario: async (id: string, patch: Partial<Usuario>) => {
    await delay(350);
    const u = db.usuarios.find((x) => x.id === id);
    if (!u) throw new Error("Usuario no encontrado.");
    Object.assign(u, patch);
    evento("Usuario actualizado: " + u.nombre);
    guardar();
    return u;
  },

  eliminarUsuario: async (id: string) => {
    await delay(350);
    const u = db.usuarios.find((x) => x.id === id);
    db.usuarios = db.usuarios.filter((x) => x.id !== id);
    if (u) evento("Usuario eliminado: " + u.nombre);
    guardar();
  },

  crearParcela: async (data: { nombre: string; direccion: string; ciudad: string; unidades: number }) => {
    await delay(450);
    const p: Parcela = { id: "p_" + uid(), ...data, creado: new Date().toISOString() };
    db.parcelas.push(p);
    evento("Nuevo condominio creado: " + p.nombre);
    guardar();
    return p;
  },

  actualizarParcela: async (id: string, patch: Partial<Parcela>) => {
    await delay(300);
    const p = db.parcelas.find((x) => x.id === id);
    if (!p) throw new Error("Condominio no encontrado.");
    Object.assign(p, patch);
    guardar();
    return p;
  },

  eliminarParcela: async (id: string) => {
    await delay(400);
    const p = db.parcelas.find((x) => x.id === id);
    db.parcelas = db.parcelas.filter((x) => x.id !== id);
    db.usuarios.forEach((u) => (u.membresias = u.membresias.filter((m) => m.parcelaId !== id)));
    db.cobros = db.cobros.filter((c) => c.parcelaId !== id);
    db.movimientos = db.movimientos.filter((m) => m.parcelaId !== id);
    if (p) evento("Condominio eliminado: " + p.nombre);
    guardar();
  },

  /* scope de condominio — siempre por parcelaId */
  datosCondo: async (parcelaId: string) => {
    await delay(260);
    return {
      parcela: db.parcelas.find((p) => p.id === parcelaId)!,
      cobros: db.cobros.filter((c) => c.parcelaId === parcelaId),
      pagos: db.pagos.filter((p) => p.parcelaId === parcelaId),
      movimientos: db.movimientos.filter((m) => m.parcelaId === parcelaId),
      avisos: db.avisos.filter((a) => a.parcelaId === parcelaId),
      areas: db.areas.filter((a) => a.parcelaId === parcelaId),
      reservas: db.reservas.filter((r) => r.parcelaId === parcelaId),
      votaciones: db.votaciones.filter((v) => v.parcelaId === parcelaId),
      accesos: db.accesos.filter((a) => a.parcelaId === parcelaId),
      miembros: db.usuarios.filter((u) => u.membresias.some((m) => m.parcelaId === parcelaId)),
      todosUsuarios: db.usuarios,
    };
  },

  datosResidente: async (parcelaId: string, usuarioId: string) => {
    await delay(260);
    const u = db.usuarios.find((x) => x.id === usuarioId)!;
    const m = u.membresias.find((x) => x.parcelaId === parcelaId)!;
    return {
      parcela: db.parcelas.find((p) => p.id === parcelaId)!,
      membresia: m,
      cobros: db.cobros.filter((c) => c.parcelaId === parcelaId && c.unidad === m.unidad),
      pagos: db.pagos.filter((p) => p.parcelaId === parcelaId && p.usuarioId === usuarioId),
      avisos: db.avisos.filter((a) => a.parcelaId === parcelaId),
      areas: db.areas.filter((a) => a.parcelaId === parcelaId),
      reservas: db.reservas.filter((r) => r.parcelaId === parcelaId),
      votaciones: db.votaciones.filter((v) => v.parcelaId === parcelaId),
    };
  },

  /* cobranza */
  generarCobros: async (parcelaId: string, periodo: string, monto: number) => {
    await delay(700);
    const unidades = db.usuarios
      .flatMap((u) => u.membresias.filter((m) => m.parcelaId === parcelaId && m.rol === "PROPIETARIO").map((m) => m.unidad!))
      .filter(Boolean);
    let creados = 0;
    unidades.forEach((unidad) => {
      if (db.cobros.some((c) => c.parcelaId === parcelaId && c.unidad === unidad && c.periodo === periodo && c.tipo === "gasto_comun")) return;
      db.cobros.push({
        id: uid(), parcelaId, unidad, periodo, monto, tipo: "gasto_comun",
        concepto: "Gastos comunes", estado: "pendiente", vencimiento: periodo + "-10",
      });
      creados++;
    });
    const p = db.parcelas.find((x) => x.id === parcelaId);
    evento("Cobros " + mesLabel(periodo) + " generados — " + p?.nombre + " (" + creados + " unidades)");
    guardar();
    return creados;
  },

  crearMulta: async (parcelaId: string, unidad: string, concepto: string, monto: number) => {
    await delay(450);
    db.cobros.push({
      id: uid(), parcelaId, unidad, periodo: mesActual(), monto, tipo: "multa",
      concepto, estado: "pendiente", vencimiento: diaStr(10),
    });
    evento("Multa aplicada a unidad " + unidad + " · " + fmtCLP(monto));
    guardar();
  },

  enviarRecordatorios: async (parcelaId: string) => {
    await delay(650);
    const morosos = db.cobros.filter((c) => c.parcelaId === parcelaId && c.estado !== "pagado");
    const hoy = new Date().toISOString();
    morosos.forEach((c) => (c.recordatorio = hoy));
    evento("Recordatorios de pago enviados a " + morosos.length + " unidades morosas");
    guardar();
    return morosos.length;
  },

  pagarCobro: async (cobroId: string, usuarioId: string) => {
    await delay(900);
    const c = db.cobros.find((x) => x.id === cobroId);
    if (!c || c.estado === "pagado") throw new Error("Este cobro ya no está pendiente.");
    const pago: Pago = {
      id: "pg_" + uid(), parcelaId: c.parcelaId, cobroId: c.id, usuarioId,
      unidad: c.unidad, monto: c.monto, metodo: "Mercado Pago",
      fecha: new Date().toISOString(),
      comprobante: "CA-" + new Date().getFullYear() + "-" + Math.floor(2000 + Math.random() * 7999),
    };
    c.estado = "pagado";
    c.pagadoEl = pago.fecha;
    c.pagoId = pago.id;
    db.pagos.push(pago);
    db.movimientos.push({
      id: uid(), parcelaId: c.parcelaId, tipo: "ingreso",
      concepto: c.concepto + " · " + c.unidad + " (" + mesLabel(c.periodo) + ")",
      categoria: c.tipo === "multa" ? "Multas" : "Gastos comunes",
      monto: c.monto, fecha: pago.fecha, conciliado: false,
    });
    evento("Pago recibido — " + c.unidad + " · " + fmtCLP(c.monto) + " (Mercado Pago)");
    guardar();
    return pago;
  },

  registrarPagoManual: async (cobroId: string) => {
    await delay(600);
    const c = db.cobros.find((x) => x.id === cobroId);
    if (!c) throw new Error("Cobro no encontrado.");
    return api.pagarCobro(cobroId, "manual:" + c.unidad);
  },

  /* finanzas */
  crearMovimiento: async (data: { parcelaId: string; tipo: "ingreso" | "egreso"; concepto: string; categoria: string; monto: number }) => {
    await delay(450);
    db.movimientos.push({ id: uid(), ...data, fecha: new Date().toISOString(), conciliado: false });
    evento((data.tipo === "ingreso" ? "Ingreso" : "Egreso") + " registrado: " + data.concepto + " · " + fmtCLP(data.monto));
    guardar();
  },

  toggleConciliado: async (movId: string) => {
    await delay(200);
    const m = db.movimientos.find((x) => x.id === movId);
    if (m) m.conciliado = !m.conciliado;
    guardar();
  },

  exportarReporte: (parcelaId: string) => {
    const p = db.parcelas.find((x) => x.id === parcelaId);
    const rows = db.movimientos
      .filter((m) => m.parcelaId === parcelaId)
      .map((m) => [m.fecha.slice(0, 10), m.tipo, m.categoria, '"' + m.concepto + '"', m.monto].join(","));
    descargar(
      "reporte_" + (p?.nombre ?? "condominio").toLowerCase().replace(/\s+/g, "_") + ".csv",
      "fecha,tipo,categoria,concepto,monto\n" + rows.join("\n"),
      "text/csv",
    );
  },

  descargarComprobante: (pago: Pago) => {
    descargar(
      "comprobante_" + pago.comprobante + ".txt",
      [
        "COMUNAPP — COMPROBANTE DE PAGO",
        "────────────────────────────────",
        "Comprobante : " + pago.comprobante,
        "Fecha       : " + fmtFechaLarga(pago.fecha),
        "Unidad      : " + pago.unidad,
        "Monto       : " + fmtCLP(pago.monto),
        "Método      : " + pago.metodo,
        "Estado      : Aprobado",
        "────────────────────────────────",
        "Documento emitido por ComunApp SpA.",
      ].join("\n"),
    );
  },

  /* comunicación */
  crearAviso: async (data: { parcelaId: string; titulo: string; cuerpo: string; tipo: TipoAviso; autor: string }) => {
    await delay(500);
    db.avisos.unshift({ id: uid(), fecha: new Date().toISOString(), ...data });
    evento((data.tipo === "emergencia" ? "Aviso de emergencia" : "Aviso") + " publicado: " + data.titulo);
    guardar();
  },

  eliminarAviso: async (id: string) => {
    await delay(300);
    db.avisos = db.avisos.filter((a) => a.id !== id);
    guardar();
  },

  /* reservas */
  crearReserva: async (data: { parcelaId: string; areaId: string; fecha: string; bloque: Reserva["bloque"]; usuarioId: string; solicitante: string }) => {
    await delay(450);
    const choque = db.reservas.some((r) => r.areaId === data.areaId && r.fecha === data.fecha && r.bloque === data.bloque);
    if (choque) throw new Error("Ese bloque acaba de ser reservado por otro vecino.");
    db.reservas.push({ id: uid(), ...data });
    evento("Reserva confirmada: " + (db.areas.find((a) => a.id === data.areaId)?.nombre ?? "área") + " · " + data.fecha + " " + data.bloque);
    guardar();
  },

  cancelarReserva: async (id: string) => {
    await delay(350);
    db.reservas = db.reservas.filter((r) => r.id !== id);
    guardar();
  },

  /* votaciones */
  votar: async (votacionId: string, usuarioId: string, opcionId: string) => {
    await delay(500);
    const v = db.votaciones.find((x) => x.id === votacionId);
    if (!v || v.estado !== "abierta") throw new Error("La votación no está disponible.");
    if (v.votos[usuarioId]) throw new Error("Ya registraste tu voto en esta asamblea.");
    v.votos[usuarioId] = opcionId;
    evento("Voto registrado en asamblea: " + v.titulo);
    guardar();
  },

  /* control de acceso */
  registrarAcceso: async (data: { parcelaId: string; tipo: "visita" | "proveedor"; nombre: string; documento: string; destino: string }) => {
    await delay(450);
    db.accesos.unshift({ id: uid(), entrada: new Date().toISOString(), ...data });
    guardar();
  },

  registrarSalida: async (id: string) => {
    await delay(300);
    const a = db.accesos.find((x) => x.id === id);
    if (a) a.salida = new Date().toISOString();
    guardar();
  },

  /* miembros */
  cambiarRolMiembro: async (usuarioId: string, parcelaId: string, rol: RolCondo) => {
    await delay(350);
    const u = db.usuarios.find((x) => x.id === usuarioId);
    const m = u?.membresias.find((x) => x.parcelaId === parcelaId);
    if (m) {
      m.rol = rol;
      if (rol === "ADMIN" || rol === "COMITE") delete m.unidad;
      evento("Rol actualizado: " + (u?.nombre ?? "usuario") + " → " + ROL_LABEL[rol]);
      guardar();
    }
  },

  agregarMiembro: async (usuarioId: string, parcelaId: string, rol: RolCondo, unidad?: string) => {
    await delay(400);
    const u = db.usuarios.find((x) => x.id === usuarioId);
    if (!u) throw new Error("Usuario no encontrado.");
    if (u.membresias.some((m) => m.parcelaId === parcelaId)) throw new Error("Este usuario ya pertenece al condominio.");
    u.membresias.push({ parcelaId, rol, unidad });
    evento("Miembro agregado: " + u.nombre + " (" + ROL_LABEL[rol] + ")");
    guardar();
  },
};
