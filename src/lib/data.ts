/* ════════════════════════════════════════════════════════════════
   CONDO/OS · Contenido de los entregables (archivos agrupados)
   ════════════════════════════════════════════════════════════════ */

export type Rol = "ADMIN" | "COMITE" | "PROPIETARIO" | "ARRENDATARIO";
export type Acceso = "full" | "read" | "own" | "none";

/* ── GRUPO 02 · schema.prisma ─────────────────────────────────── */
export const SCHEMA_PRISMA = `// ══════════════════════════════════════════════════════════════
//  CONDO/OS · schema.prisma — PostgreSQL · Multi-tenant estricto
//  Regla de oro: todo modelo operativo lleva "parcelaId" + índice.
//  Capas de aislamiento: esquema → requireRole() → RLS en Postgres.
// ══════════════════════════════════════════════════════════════

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── ENUMS GLOBALES ────────────────────────────────────────────
enum Rol {
  ADMIN        // gestiona una o varias parcelas · acceso total
  COMITE       // supervisa: lectura de finanzas, cobros, reportes, avisos
  PROPIETARIO  // estado de cuenta, pagos, reservas y votos
  ARRENDATARIO // estado de cuenta y pagos
}

enum EstadoParcela  { ACTIVA SUSPENDIDA }
enum TipoCobro      { GASTO_COMUN MULTA EXTRAORDINARIO }
enum EstadoCobro    { PENDIENTE VENCIDO PAGADO ANULADO }
enum MetodoPago     { TRANSFERENCIA EFECTIVO TARJETA MERCADO_PAGO }
enum EstadoPago     { REGISTRADO ACREDITADO RECHAZADO }
enum TipoMovimiento { INGRESO EGRESO }
enum PrioridadAviso { NORMAL URGENTE }
enum EstadoAsamblea { CONVOCADA EN_CURSO CERRADA }
enum EstadoReserva  { PENDIENTE CONFIRMADA CANCELADA }
enum TipoVisitante  { VISITA PROVEEDOR DELIVERY }

// ── TENANT (la "Parcela" es el condominio) ─────────────────────
model Parcela {
  id        String        @id @default(cuid())
  slug      String        @unique          // rutas: /[slug]/residente/...
  nombre    String
  ruc       String?
  direccion String?
  moneda    String        @default("CLP")
  estado    EstadoParcela @default(ACTIVA)
  createdAt DateTime      @default(now())

  miembros    MiembroParcela[]
  unidades    Unidad[]
  cobros      Cobro[]
  pagos       Pago[]
  movimientos Movimiento[]
  cuentas     CuentaBancaria[]
  fondos      FondoReserva[]
  avisos      Aviso[]
  asambleas   Asamblea[]
  areas       AreaComun[]
  accesos     RegistroAcceso[]
}

// ── USUARIOS + MEMBRESÍA (RBAC multi-tenant) ───────────────────
model Usuario {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  nombre          String
  telefono        String?
  emailVerificado DateTime?
  createdAt       DateTime  @default(now())

  membresias     MiembroParcela[]
  notificaciones Notificacion[]
  votos          Voto[]
  reservas       Reserva[]
  avisosCreados  Aviso[]        @relation("AutorAviso")
}

/// Pivote central del multi-tenant: un usuario pertenece a N parcelas
/// con un rol distinto en cada una (dueño en una, comité en otra…).
model MiembroParcela {
  id        String   @id @default(cuid())
  usuarioId String
  parcelaId String
  rol       Rol
  unidadId  String?             // PROPIETARIO / ARRENDATARIO → su unidad
  activo    Boolean  @default(true)
  desde     DateTime @default(now())

  usuario   Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  parcela   Parcela  @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  unidad    Unidad?  @relation(fields: [unidadId], references: [id])

  @@unique([usuarioId, parcelaId])   // 1 membresía por usuario por parcela
  @@index([parcelaId, rol])          // consultas RBAC rápidas
}

model Unidad {
  id        String  @id @default(cuid())
  parcelaId String
  nombre    String              // "Depto 4-B" · "Casa 12"
  torre     String?
  piso      String?
  prorrata  Decimal @default(1.0) @db.Decimal(8, 4) // % de gastos comunes

  parcela  Parcela @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  miembros MiembroParcela[]
  cobros   Cobro[]
  reservas Reserva[]
  votos    Voto[]
  accesos  RegistroAcceso[]

  @@unique([parcelaId, nombre])
  @@index([parcelaId])
}

// ── MÓDULO FINANCIERO Y DE COBRANZA ────────────────────────────
model Cobro {                   // gastos comunes · multas · cobros extras
  id            String      @id @default(cuid())
  parcelaId     String
  unidadId      String
  tipo          TipoCobro
  concepto      String
  periodo       String          // "2026-02" en cobros mensuales
  monto         Decimal     @db.Decimal(12, 2)
  recargo       Decimal?    @db.Decimal(12, 2)  // multa / interés por mora
  vencimiento   DateTime
  estado        EstadoCobro @default(PENDIENTE)
  recordatorios Int         @default(0)         // avisos automáticos enviados
  creadoPor     String                          // usuarioId
  createdAt     DateTime    @default(now())

  parcela       Parcela     @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  unidad        Unidad      @relation(fields: [unidadId], references: [id], onDelete: Cascade)
  pagos         Pago[]

  @@unique([parcelaId, unidadId, tipo, periodo]) // imposible duplicar el mes
  @@index([parcelaId, estado])
  @@index([parcelaId, periodo])
}

model Pago {
  id             String     @id @default(cuid())
  parcelaId      String
  cobroId        String
  metodo         MetodoPago
  monto          Decimal    @db.Decimal(12, 2)
  fecha          DateTime   @default(now())
  referencia     String?    // payment id de Mercado Pago
  comprobanteUrl String?    // recibo PDF emitido
  estado         EstadoPago @default(REGISTRADO)
  registradoPor  String?    // usuarioId · null cuando acredita el webhook

  parcela        Parcela    @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  cobro          Cobro      @relation(fields: [cobroId], references: [id], onDelete: Cascade)

  @@index([parcelaId, fecha])
  @@index([referencia])
}

model CuentaBancaria {
  id        String  @id @default(cuid())
  parcelaId String
  banco     String
  numero    String
  moneda    String  @default("CLP")

  parcela     Parcela      @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  movimientos Movimiento[]

  @@unique([parcelaId, numero])
}

model FondoReserva {
  id        String   @id @default(cuid())
  parcelaId String
  nombre    String   // "Fondo legal" · "Proyecto pintura fachada"
  objetivo  Decimal? @db.Decimal(12, 2)

  parcela     Parcela      @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  movimientos Movimiento[]

  @@index([parcelaId])
}

model Movimiento {              // libro contable: ingresos y egresos
  id         String        @id @default(cuid())
  parcelaId  String
  tipo       TipoMovimiento
  categoria  String             // "Mantención" · "Sueldos" · "Servicios"…
  concepto   String
  monto      Decimal       @db.Decimal(12, 2)
  fecha      DateTime
  pagoId     String?            // nace de un Pago cuando aplica
  cuentaId   String?
  fondoId    String?
  conciliado Boolean       @default(false)  // conciliación bancaria básica

  parcela    Parcela         @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  cuenta     CuentaBancaria? @relation(fields: [cuentaId], references: [id])
  fondo      FondoReserva?   @relation(fields: [fondoId], references: [id])

  @@index([parcelaId, fecha])
  @@index([parcelaId, conciliado])
}

// ── COMUNICACIÓN: MURO DIGITAL + NOTIFICACIONES ────────────────
model Aviso {
  id         String         @id @default(cuid())
  parcelaId  String
  autorId    String
  titulo     String
  cuerpo     String
  prioridad  PrioridadAviso @default(NORMAL)
  publicado  Boolean        @default(false)
  createdAt  DateTime       @default(now())

  parcela        Parcela        @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  autor          Usuario        @relation("AutorAviso", fields: [autorId], references: [id])
  notificaciones Notificacion[]

  @@index([parcelaId, publicado])
}

model Notificacion {
  id        String   @id @default(cuid())
  usuarioId String
  avisoId   String?
  texto     String
  leida     Boolean  @default(false)
  createdAt DateTime @default(now())

  usuario   Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  aviso     Aviso?   @relation(fields: [avisoId], references: [id], onDelete: Cascade)

  @@index([usuarioId, leida])
}

// ── RESERVAS DE ÁREAS COMUNES ──────────────────────────────────
model AreaComun {
  id        String  @id @default(cuid())
  parcelaId String
  nombre    String            // "Quincho Norte" · "Sala Multiuso"
  capacidad Int
  tarifa    Decimal @default(0) @db.Decimal(12, 2)
  reglas    String?

  parcela  Parcela   @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  reservas Reserva[]

  @@unique([parcelaId, nombre])
}

model Reserva {
  id        String        @id @default(cuid())
  parcelaId String
  areaId    String
  unidadId  String
  usuarioId String
  inicio    DateTime
  fin       DateTime
  estado    EstadoReserva @default(PENDIENTE)

  parcela   Parcela   @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  area      AreaComun @relation(fields: [areaId], references: [id], onDelete: Cascade)
  unidad    Unidad    @relation(fields: [unidadId], references: [id])
  usuario   Usuario   @relation(fields: [usuarioId], references: [id])

  @@index([areaId, inicio])   // el servicio valida solapes antes de insertar
  @@index([parcelaId])
}

// ── ASAMBLEAS DIGITALES / VOTACIONES ───────────────────────────
model Asamblea {
  id          String         @id @default(cuid())
  parcelaId   String
  titulo      String
  descripcion String?
  fecha       DateTime
  estado      EstadoAsamblea @default(CONVOCADA)

  parcela  Parcela  @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  opciones Opcion[]
  votos    Voto[]

  @@index([parcelaId, estado])
}

model Opcion {
  id         String   @id @default(cuid())
  asambleaId String
  texto      String

  asamblea   Asamblea @relation(fields: [asambleaId], references: [id], onDelete: Cascade)
  votos      Voto[]

  @@index([asambleaId])
}

model Voto {
  id         String  @id @default(cuid())
  asambleaId String
  opcionId   String
  unidadId   String
  usuarioId  String
  peso       Decimal @default(1.0) @db.Decimal(8, 4) // ponderado por prorrata

  asamblea   Asamblea @relation(fields: [asambleaId], references: [id], onDelete: Cascade)
  opcion     Opcion  @relation(fields: [opcionId], references: [id], onDelete: Cascade)
  unidad     Unidad   @relation(fields: [unidadId], references: [id])
  usuario    Usuario  @relation(fields: [usuarioId], references: [id])

  @@unique([asambleaId, unidadId])  // 1 unidad = 1 voto por asamblea
}

// ── CONTROL DE ACCESO (bitácora de visitas y proveedores) ──────
model RegistroAcceso {
  id            String        @id @default(cuid())
  parcelaId     String
  visitante     String
  documento     String?
  tipo          TipoVisitante
  unidadId      String?
  ingreso       DateTime      @default(now())
  salida        DateTime?
  autorizadoPor String
  observaciones String?

  parcela       Parcela       @relation(fields: [parcelaId], references: [id], onDelete: Cascade)
  unidad        Unidad?       @relation(fields: [unidadId], references: [id])

  @@index([parcelaId, ingreso])
}`;

/* ── GRUPO 03 · Seguridad: middleware + guardias ─────────────── */
export const MIDDLEWARE_TS = `// src/middleware.ts
// Capa 1 de RBAC: corre en el edge ANTES de renderizar cualquier página.
// Resuelve sesión (NextAuth JWT) → rol del usuario en la parcela activa → decisión.

import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { Rol } from "@prisma/client";

// Matriz canónica de rutas: prefijo → roles permitidos
const RULES: Array<{ prefix: string; roles: Rol[] }> = [
  { prefix: "/admin",     roles: ["ADMIN"] },
  { prefix: "/comite",    roles: ["ADMIN", "COMITE"] },
  { prefix: "/residente", roles: ["ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO"] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) ¿La ruta pertenece a un área protegida?
  const rule = RULES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  // 2) Sesión: el JWT lleva el mapa de roles por parcela del usuario
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);          // no autenticado → login
  }

  // 3) Rol del usuario en la parcela activa (multi-tenant: 1 usuario → N roles)
  const parcelaActiva = token.parcelaActiva as string;
  const roles = (token.roles ?? {}) as Record<string, Rol>;
  const rol = roles[parcelaActiva];

  // 4) Decisión RBAC: un PROPIETARIO que pida /admin/finanzas cae aquí
  if (!rol || !rule.roles.includes(rol)) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  // 5) Propagar contexto tenant al origen (Server Components / Actions)
  const res = NextResponse.next();
  res.headers.set("x-parcela-id", parcelaActiva);
  res.headers.set("x-rol", rol);
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/comite/:path*", "/residente/:path*"],
};`;

export const TENANT_TS = `// src/lib/tenant.ts
// Capa 2 de RBAC (defensa en profundidad): el middleware puede bypassearse
// con una llamada directa a una Server Action, así que CADA acción y CADA
// consulta vuelve a validar tenant + rol contra la base de datos.

import "server-only";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Rol } from "@prisma/client";

export interface TenantContext {
  userId: string;
  parcelaId: string;
  rol: Rol;
  unidadId: string | null;
}

/** Lanza/redirect según el caso. Úsalo al inicio de toda ruta o acción. */
export async function requireRole(...permitidos: Rol[]): Promise<TenantContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.parcelaActiva) redirect("/login");

  const membresia = await prisma.miembroParcela.findUnique({
    where: {
      usuarioId_parcelaId: {
        usuarioId: session.user.id,
        parcelaId: session.user.parcelaActiva,
      },
    },
  });

  if (!membresia || !membresia.activo) redirect("/seleccionar-parcela");
  if (!permitidos.includes(membresia.rol)) redirect("/403");

  return {
    userId: session.user.id,
    parcelaId: membresia.parcelaId,
    rol: membresia.rol,
    unidadId: membresia.unidadId,
  };
}

/** Helper: toda query DEBE filtrar por parcelaId del contexto, nunca confiar solo en IDs. */
export async function scopedQuery<T>(
  permitido: Rol[],
  fn: (ctx: TenantContext) => Promise<T>,
): Promise<T> {
  const ctx = await requireRole(...permitido);
  return fn(ctx);
}`;

export const ACTIONS_TS = `// src/app/(portal)/[parcela]/admin/cobranza/actions.ts
// Server Actions del Módulo Financiero. Nota el patrón:
// requireRole() primero → contexto tenant → query SIEMPRE con parcelaId.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { generarCobrosDelPeriodo } from "@/server/services/cobranza.service";
import { notificarRecordatorio } from "@/server/services/notificaciones.service";

const PeriodoSchema = z.string().regex(/^\\d{4}-\\d{2}$/, "Formato AAAA-MM");

// Cobranza mensual: genera el gasto común de cada unidad según su prorrata,
// aplica recargos por mora y deja listos los recordatorios automáticos.
export async function emitirCobrosMensuales(periodo: string) {
  // ADMIN y COMITE pueden generar cobros (ver especificación del Comité)
  const { parcelaId, userId, rol } = await requireRole("ADMIN", "COMITE");
  PeriodoSchema.parse(periodo);

  const resultado = await generarCobrosDelPeriodo({
    prisma,
    parcelaId,          // ← el tenant queda acotado aquí, nunca a nivel global
    periodo,
    emitidoPor: userId,
  });

  revalidatePath("/admin/cobranza");
  revalidatePath("/residente/estado-cuenta");
  return { ...resultado, emitidoPorRol: rol };
}

// El residente paga con Mercado Pago y el webhook acredita;
// este action permite al ADMIN/COMITE registrar pagos manuales (caja/transferencia).
export async function registrarPagoManual(cobroId: string, monto: number, metodo: string) {
  const { parcelaId, userId } = await requireRole("ADMIN", "COMITE");

  const cobro = await prisma.cobro.findFirst({
    where: { id: cobroId, parcelaId },          // ← evita tocar otro tenant
    include: { unidad: true },
  });
  if (!cobro) throw new Error("Cobro no encontrado en esta parcela");

  const pago = await prisma.$transaction(async (tx) => {
    const p = await tx.pago.create({
      data: {
        parcelaId, cobroId,
        metodo: metodo as "TRANSFERENCIA" | "EFECTIVO",
        monto,
        registradoPor: userId,
        estado: "ACREDITADO",
      },
    });
    await tx.cobro.update({ where: { id: cobroId }, data: { estado: "PAGADO" } });
    await tx.movimiento.create({
      data: { parcelaId, tipo: "INGRESO", categoria: "Gastos comunes",
              concepto: "Pago " + cobro.concepto + " · " + cobro.unidad.nombre,
              monto, fecha: new Date(), pagoId: p.id },
    });
    return p;
  });

  revalidatePath("/admin/finanzas");
  return { ok: true, pagoId: pago.id };
}

// Recordatorios de pago: el cron llama a esta acción cada mañana.
export async function enviarRecordatoriosDePago() {
  const parcelas = await prisma.parcela.findMany({ where: { estado: "ACTIVA" } });
  for (const parcela of parcelas) {
    const vencidos = await prisma.cobro.findMany({
      where: { parcelaId: parcela.id, estado: { in: ["PENDIENTE", "VENCIDO"] },
               vencimiento: { lt: new Date() } },
      include: { unidad: { include: { miembros: true } } },
    });
    for (const cobro of vencidos) {
      await notificarRecordatorio({ prisma, cobro });
      await prisma.cobro.update({
        where: { id: cobro.id },
        data: { recordatorios: { increment: 1 }, estado: "VENCIDO" },
      });
    }
  }
  return { ok: true };
}`;

/* ── GRUPO 01 · estructura de carpetas ───────────────────────── */
export type TreeNode = {
  name: string;
  kind: "dir" | "file";
  note?: string;
  tag?: string;
  children?: TreeNode[];
};

export const FOLDER_TREE: TreeNode = {
  name: "condo-os/",
  kind: "dir",
  children: [
    {
      name: "prisma/",
      kind: "dir",
      children: [
        { name: "schema.prisma", kind: "file", note: "modelo relacional multi-tenant", tag: "DB" },
        { name: "seed.ts", kind: "file", note: "parcela demo + 1 usuario por rol" },
        { name: "migrations/", kind: "dir", note: "incluye políticas RLS por tenant" },
      ],
    },
    {
      name: "src/",
      kind: "dir",
      children: [
        {
          name: "app/",
          kind: "dir",
          children: [
            { name: "layout.tsx", kind: "file", note: "SessionProvider + QueryClientProvider" },
            {
              name: "(auth)/",
              kind: "dir",
              children: [
                { name: "login/page.tsx", kind: "file" },
                { name: "seleccionar-parcela/page.tsx", kind: "file", note: "1 usuario → N tenants" },
              ],
            },
            {
              name: "(portal)/[parcela]/",
              kind: "dir",
              note: "layout resuelve tenant + sesión + nav por rol",
              children: [
                {
                  name: "admin/",
                  kind: "dir",
                  tag: "ADMIN",
                  children: [
                    { name: "finanzas/page.tsx", kind: "file", note: "libro, conciliación, fondos" },
                    { name: "cobranza/page.tsx", kind: "file", note: "emisión mensual + multas" },
                    { name: "unidades/page.tsx", kind: "file" },
                    { name: "residentes/page.tsx", kind: "file", note: "invitar, roles, membresías" },
                    { name: "bitacora/page.tsx", kind: "file", note: "control de acceso CRUD" },
                    { name: "reportes/page.tsx", kind: "file" },
                  ],
                },
                {
                  name: "comite/",
                  kind: "dir",
                  tag: "COMITÉ",
                  children: [
                    { name: "finanzas/page.tsx", kind: "file", note: "solo lectura + reportes" },
                    { name: "cobros/page.tsx", kind: "file" },
                    { name: "avisos/page.tsx", kind: "file", note: "muro + emergencia" },
                  ],
                },
                {
                  name: "residente/",
                  kind: "dir",
                  tag: "RESIDENTES",
                  children: [
                    { name: "page.tsx", kind: "file", note: "dashboard del residente" },
                    { name: "estado-cuenta/page.tsx", kind: "file" },
                    { name: "pagos/page.tsx", kind: "file", note: "checkout Mercado Pago", tag: "MP" },
                    { name: "recibos/page.tsx", kind: "file" },
                    { name: "reservas/page.tsx", kind: "file", note: "calendario de áreas comunes" },
                    { name: "votaciones/page.tsx", kind: "file", note: "asambleas digitales" },
                    { name: "muro/page.tsx", kind: "file" },
                  ],
                },
              ],
            },
            {
              name: "api/",
              kind: "dir",
              children: [
                { name: "auth/[...nextauth]/route.ts", kind: "file", note: "Auth.js + JWT con roles" },
                { name: "webhooks/mercadopago/route.ts", kind: "file", note: "verifica firma → acredita pago", tag: "MP" },
              ],
            },
            { name: "middleware.ts", kind: "file", note: "RBAC en el edge", tag: "RBAC" },
            { name: "403.tsx", kind: "file" },
          ],
        },
        {
          name: "components/",
          kind: "dir",
          children: [
            { name: "ui/", kind: "dir", note: "shadcn/ui: button, dialog, table…" },
            {
              name: "modules/",
              kind: "dir",
              children: [
                { name: "finanzas/", kind: "dir", note: "CashflowChart, ConciliacionTabla" },
                { name: "cobranza/", kind: "dir", note: "EmitirCobrosWizard, MultasForm" },
                { name: "residentes/", kind: "dir", note: "EstadoCuenta, CheckoutMP, Calendario" },
                { name: "control/", kind: "dir", note: "BitacoraCRUD, MuroFeed" },
              ],
            },
          ],
        },
        {
          name: "lib/",
          kind: "dir",
          children: [
            { name: "prisma.ts", kind: "file", note: "singleton del cliente" },
            { name: "auth.ts", kind: "file", note: "NextAuth: JWT guarda roles por parcela" },
            { name: "tenant.ts", kind: "file", note: "requireRole() · guardia server", tag: "RBAC" },
            { name: "rbac.ts", kind: "file", note: "matriz canónica de permisos" },
            { name: "mercadopago.ts", kind: "file", note: "SDK + verificación de firma", tag: "MP" },
          ],
        },
        {
          name: "server/",
          kind: "dir",
          children: [
            { name: "actions/", kind: "dir", note: "server actions con requireRole()" },
            { name: "services/", kind: "dir", note: "cobranza · contabilidad · notificaciones" },
          ],
        },
      ],
    },
    { name: ".env.local", kind: "file", note: "DATABASE_URL · NEXTAUTH_SECRET · MP_ACCESS_TOKEN" },
    { name: "next.config.ts", kind: "file" },
    { name: "tailwind.config.ts", kind: "file" },
  ],
};

/* ── Matriz RBAC ──────────────────────────────────────────────── */
export type RbacRow = { area: string; acceso: Record<Rol, Acceso> };

export const RBAC_MATRIX: RbacRow[] = [
  { area: "Configuración de la parcela", acceso: { ADMIN: "full", COMITE: "none", PROPIETARIO: "none", ARRENDATARIO: "none" } },
  { area: "Unidades, prorrata y residentes", acceso: { ADMIN: "full", COMITE: "read", PROPIETARIO: "none", ARRENDATARIO: "none" } },
  { area: "Finanzas: ingresos y egresos", acceso: { ADMIN: "full", COMITE: "read", PROPIETARIO: "none", ARRENDATARIO: "none" } },
  { area: "Conciliación bancaria", acceso: { ADMIN: "full", COMITE: "read", PROPIETARIO: "none", ARRENDATARIO: "none" } },
  { area: "Fondos de reserva", acceso: { ADMIN: "full", COMITE: "read", PROPIETARIO: "none", ARRENDATARIO: "none" } },
  { area: "Generar cobros mensuales y multas", acceso: { ADMIN: "full", COMITE: "full", PROPIETARIO: "none", ARRENDATARIO: "none" } },
  { area: "Registrar pagos manuales / comprobantes", acceso: { ADMIN: "full", COMITE: "full", PROPIETARIO: "none", ARRENDATARIO: "none" } },
  { area: "Reportes financieros mensuales", acceso: { ADMIN: "full", COMITE: "full", PROPIETARIO: "read", ARRENDATARIO: "none" } },
  { area: "Estado de cuenta propio", acceso: { ADMIN: "read", COMITE: "read", PROPIETARIO: "own", ARRENDATARIO: "own" } },
  { area: "Pagos en línea (Mercado Pago)", acceso: { ADMIN: "none", COMITE: "none", PROPIETARIO: "full", ARRENDATARIO: "full" } },
  { area: "Reservas de áreas comunes", acceso: { ADMIN: "full", COMITE: "read", PROPIETARIO: "full", ARRENDATARIO: "none" } },
  { area: "Asambleas: convocar y cerrar", acceso: { ADMIN: "full", COMITE: "full", PROPIETARIO: "none", ARRENDATARIO: "none" } },
  { area: "Asambleas: votar (peso = prorrata)", acceso: { ADMIN: "none", COMITE: "none", PROPIETARIO: "full", ARRENDATARIO: "none" } },
  { area: "Muro digital: publicar avisos", acceso: { ADMIN: "full", COMITE: "full", PROPIETARIO: "none", ARRENDATARIO: "none" } },
  { area: "Muro digital: leer y recibir alertas", acceso: { ADMIN: "read", COMITE: "read", PROPIETARIO: "read", ARRENDATARIO: "read" } },
  { area: "Bitácora de acceso (visitas/proveedores)", acceso: { ADMIN: "full", COMITE: "full", PROPIETARIO: "own", ARRENDATARIO: "none" } },
];

export const RBAC_LABEL: Record<Acceso, string> = {
  full: "Escritura",
  read: "Lectura",
  own: "Solo lo suyo",
  none: "—",
};

/* ── Roles para el prototipo ──────────────────────────────────── */
export type RolInfo = {
  id: Rol;
  nombre: string;
  persona: string;
  cargo: string;
  color: string;
  alcance: string;
};

export const ROLES: RolInfo[] = [
  { id: "ADMIN", nombre: "Administrador", persona: "María Fuentes", cargo: "Administradora", color: "#ffb020", alcance: "Escritura total en sus parcelas asignadas. Gestiona 3 condominios." },
  { id: "COMITE", nombre: "Comité", persona: "Jorge Salas", cargo: "Presidente del Comité", color: "#6fb1ff", alcance: "Lectura de finanzas, genera cobros y reportes, envía avisos al muro." },
  { id: "PROPIETARIO", nombre: "Propietario", persona: "Carla Méndez", cargo: "Depto 4-B", color: "#1f9d6b", alcance: "Estado de cuenta, pagos con Mercado Pago, reservas y voto en asambleas." },
  { id: "ARRENDATARIO", nombre: "Arrendatario", persona: "Diego Peralta", cargo: "Depto 7-A", color: "#d9534a", alcance: "Solo estado de cuenta y pagos. Sin reservas ni votaciones." },
];

export type DemoModule = {
  id: string;
  icon: string;
  nombre: string;
  desc: string;
  acceso: Record<Rol, Acceso>;
  kpis?: { label: string; value: string; tone: "amber" | "jade" | "signal" | "line" }[];
};

export const DEMO_MODULES: DemoModule[] = [
  {
    id: "finanzas", icon: "chart", nombre: "Finanzas y contabilidad",
    desc: "Libro de ingresos/egresos, conciliación bancaria y fondo de reserva.",
    acceso: { ADMIN: "full", COMITE: "read", PROPIETARIO: "none", ARRENDATARIO: "none" },
    kpis: [
      { label: "Ingresos del mes", value: "$8.420.000", tone: "jade" },
      { label: "Egresos del mes", value: "$5.160.000", tone: "signal" },
      { label: "Fondo de reserva", value: "$12.900.000", tone: "amber" },
    ],
  },
  {
    id: "cobranza", icon: "coin", nombre: "Cobranza",
    desc: "Emisión de gastos comunes por prorrata, multas y recordatorios automáticos.",
    acceso: { ADMIN: "full", COMITE: "full", PROPIETARIO: "none", ARRENDATARIO: "none" },
    kpis: [
      { label: "Cobros emitidos (feb)", value: "96 / 96", tone: "jade" },
      { label: "Morosidad", value: "8,3%", tone: "signal" },
      { label: "Recordatorios hoy", value: "14", tone: "line" },
    ],
  },
  {
    id: "cuenta", icon: "file", nombre: "Estado de cuenta",
    desc: "Historial de cobros y pagos de la unidad, con descarga de recibos.",
    acceso: { ADMIN: "read", COMITE: "read", PROPIETARIO: "own", ARRENDATARIO: "own" },
    kpis: [
      { label: "Saldo pendiente", value: "$148.500", tone: "signal" },
      { label: "Próximo vencimiento", value: "10 MAR", tone: "amber" },
      { label: "Recibos disponibles", value: "23", tone: "line" },
    ],
  },
  {
    id: "pagos", icon: "wallet", nombre: "Pagos en línea",
    desc: "Checkout Mercado Pago para gastos comunes; el webhook acredita y emite recibo.",
    acceso: { ADMIN: "none", COMITE: "none", PROPIETARIO: "full", ARRENDATARIO: "full" },
    kpis: [
      { label: "Medios habilitados", value: "WebPay · MP", tone: "line" },
      { label: "Último pago", value: "$74.250", tone: "jade" },
    ],
  },
  {
    id: "reservas", icon: "calendar", nombre: "Reservas",
    desc: "Calendario interactivo de quinchos y salas con control de solapes.",
    acceso: { ADMIN: "full", COMITE: "read", PROPIETARIO: "full", ARRENDATARIO: "none" },
    kpis: [
      { label: "Quincho Norte", value: "Libre 20:00", tone: "jade" },
      { label: "Sala Multiuso", value: "Reservada sáb", tone: "amber" },
    ],
  },
  {
    id: "votaciones", icon: "vote", nombre: "Asambleas digitales",
    desc: "Votaciones con quórum y voto ponderado por prorrata de cada unidad.",
    acceso: { ADMIN: "full", COMITE: "full", PROPIETARIO: "full", ARRENDATARIO: "none" },
    kpis: [
      { label: "Asamblea activa", value: "Pintura fachada", tone: "amber" },
      { label: "Participación", value: "61%", tone: "jade" },
    ],
  },
  {
    id: "muro", icon: "bell", nombre: "Muro digital",
    desc: "Noticias y avisos de emergencia con notificaciones push/email.",
    acceso: { ADMIN: "full", COMITE: "full", PROPIETARIO: "read", ARRENDATARIO: "read" },
    kpis: [
      { label: "Avisos activos", value: "3", tone: "line" },
      { label: "Urgentes", value: "1 · corte de agua", tone: "signal" },
    ],
  },
  {
    id: "bitacora", icon: "door", nombre: "Control de acceso",
    desc: "Bitácora digital de visitas, proveedores y delivery (entrada/salida).",
    acceso: { ADMIN: "full", COMITE: "full", PROPIETARIO: "own", ARRENDATARIO: "none" },
    kpis: [
      { label: "Ingresos hoy", value: "17", tone: "line" },
      { label: "Sin salida registrada", value: "2", tone: "amber" },
    ],
  },
];

/* rutas para el simulador de middleware */
export type DemoRoute = { path: string; roles: Rol[] | "public"; nota: string };

export const DEMO_ROUTES: DemoRoute[] = [
  { path: "/admin/finanzas", roles: ["ADMIN"], nota: "Módulo financiero completo" },
  { path: "/admin/residentes", roles: ["ADMIN"], nota: "Gestión de membresías" },
  { path: "/comite/cobros", roles: ["ADMIN", "COMITE"], nota: "Generación de cobros" },
  { path: "/comite/avisos", roles: ["ADMIN", "COMITE"], nota: "Publicar en el muro" },
  { path: "/residente/pagos", roles: ["ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO"], nota: "Checkout Mercado Pago" },
  { path: "/residente/votaciones", roles: ["ADMIN", "COMITE", "PROPIETARIO"], nota: "Asambleas digitales" },
  { path: "/api/webhooks/mercadopago", roles: "public", nota: "Firma HMAC, sin sesión" },
];

/* ── GRUPO 04 · plan de desarrollo ───────────────────────────── */
export type Fase = {
  id: string;
  nombre: string;
  semanas: string;
  objetivo: string;
  entregables: string[];
};

export const FASES: Fase[] = [
  {
    id: "F0", nombre: "Cimientos", semanas: "S1 – S2",
    objetivo: "Multi-tenant + autenticación + RBAC funcionando de punta a punta.",
    entregables: [
      "Repo Next.js (App Router) + Tailwind + shadcn/ui",
      "PostgreSQL + Prisma: Parcela, Usuario, MiembroParcela migrados",
      "NextAuth con JWT que guarda roles por parcela",
      "middleware.ts + requireRole() (capas 1 y 2)",
      "Seed: 1 parcela demo, 9 unidades, 1 usuario por rol",
    ],
  },
  {
    id: "F1", nombre: "Cobranza", semanas: "S3 – S5",
    objetivo: "El corazón financiero: cobrar el mes completo en un clic.",
    entregables: [
      "CRUD de unidades con prorrata",
      "Emisión masiva de gastos comunes por periodo",
      "Multas y recargos por mora configurables",
      "Recordatorios automáticos (cron + email vía Resend)",
      "Comprobantes de pago en PDF",
    ],
  },
  {
    id: "F2", nombre: "Contabilidad", semanas: "S6 – S7",
    objetivo: "Transparencia contable para el comité y la asamblea.",
    entregables: [
      "Libro de ingresos y egresos por categoría",
      "Conciliación bancaria básica (marcar/contrastar)",
      "Fondos de reserva con objetivos",
      "Reporte mensual exportable (PDF/CSV)",
    ],
  },
  {
    id: "F3", nombre: "Comunidad", semanas: "S8 – S9",
    objetivo: "Comunicación directa y control de acceso en portería.",
    entregables: [
      "Muro digital con avisos normales y de emergencia",
      "Notificaciones in-app + email",
      "Bitácora de acceso CRUD (visitas, proveedores, delivery)",
      "Panel del conserje para registrar entrada/salida",
    ],
  },
  {
    id: "F4", nombre: "Experiencia residente", semanas: "S10 – S11",
    objetivo: "Que el residente pague, reserve y vote sin llamar a nadie.",
    entregables: [
      "Checkout Mercado Pago + webhook con verificación de firma",
      "Calendario de reservas con control de solapes y tarifas",
      "Asambleas digitales con voto ponderado por prorrata",
      "Dashboard del residente con estado de cuenta",
    ],
  },
  {
    id: "F5", nombre: "Endurecimiento", semanas: "S12",
    objetivo: "Seguridad, pruebas y despliegue a producción.",
    entregables: [
      "Row Level Security en PostgreSQL (capa 3 del aislamiento)",
      "Tests e2e de rutas RBAC con Playwright",
      "Auditoría de acciones sensibles",
      "Deploy: Vercel + Neon/Supabase + monitoreo de errores",
    ],
  },
];

export const STACK = [
  "Next.js 14 · App Router", "PostgreSQL", "Prisma ORM", "Auth.js (NextAuth)",
  "Tailwind CSS", "shadcn/ui", "Server Actions + React Query", "Mercado Pago SDK",
  "Resend (emails)", "Zod (validación)", "Playwright (e2e)", "Vercel + Neon",
];

/* notas de aislamiento multi-tenant */
export const CAPAS_AISLAMIENTO = [
  {
    n: "01",
    titulo: "Esquema relacional",
    detalle: "Todo modelo operativo lleva parcelaId con índice compuesto y onDelete: Cascade. Los @@unique incluyen el tenant: es físicamente imposible duplicar un cobro del mismo periodo en otra parcela.",
  },
  {
    n: "02",
    titulo: "Aplicación (RBAC en 2 capas)",
    detalle: "middleware.ts bloquea la ruta en el edge según el rol del JWT; requireRole() re-valida contra la BD en cada Server Component y Server Action, y toda query filtra por parcelaId del contexto.",
  },
  {
    n: "03",
    titulo: "Base de datos (RLS)",
    detalle: "Políticas de Row Level Security en Postgres: cada conexión fija el tenant de la sesión (SET app.parcela_id) y las tablas solo devuelven filas de esa parcela, incluso ante un bug en el código.",
  },
];

export const TICKER_ITEMS = [
  "GASTOS COMUNES POR PRORRATA", "CONCILIACIÓN BANCARIA", "FONDO DE RESERVA",
  "CHECKOUT MERCADO PAGO", "ASAMBLEAS DIGITALES", "RESERVA DE QUINCHOS",
  "BITÁCORA DE ACCESO", "MURO DE AVISOS", "MULTI-TENANT ESTRICTO",
  "RBAC · 4 ROLES", "PRISMA + POSTGRESQL", "NOTIFICACIONES AUTOMÁTICAS",
];
