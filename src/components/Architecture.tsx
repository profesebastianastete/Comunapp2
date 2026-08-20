import { useMemo, useState } from "react";
import { Reveal, SectionHead } from "./ui";
import { CAPAS_AISLAMIENTO } from "../lib/data";

type Nodo = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  titulo: string;
  campos: string[];
  tenant?: boolean;
};

const NODOS: Nodo[] = [
  { id: "usuario", x: 40, y: 38, w: 172, h: 78, titulo: "Usuario", campos: ["email  @unique", "passwordHash", "nombre · telefono"] },
  { id: "miembro", x: 40, y: 150, w: 172, h: 74, titulo: "MiembroParcela", campos: ["rol: ADMIN|COMITE|…", "@@unique(user,parcela)", "@@index(parcela,rol)"] },
  { id: "parcela", x: 40, y: 258, w: 172, h: 112, titulo: "Parcela · TENANT", campos: ["slug @unique", "nombre · ruc · moneda", "estado · plan", "→ todo cuelga de aquí"], tenant: true },
  { id: "unidad", x: 252, y: 300, w: 138, h: 76, titulo: "Unidad", campos: ["nombre · torre · piso", "prorrata Decimal", "@@unique(parcela,nombre)"] },
  { id: "acceso", x: 252, y: 452, w: 138, h: 74, titulo: "RegistroAcceso", campos: ["visitante · tipo", "ingreso → salida", "@@index(parcela,ingreso)"] },
  { id: "cobro", x: 430, y: 122, w: 148, h: 84, titulo: "Cobro", campos: ["tipo · concepto · periodo", "monto · recargo", "estado · vencimiento", "@@unique(parcela,unidad,…)"] },
  { id: "pago", x: 430, y: 238, w: 148, h: 76, titulo: "Pago", campos: ["metodo · monto · fecha", "referencia (MP)", "comprobanteUrl"] },
  { id: "mov", x: 430, y: 346, w: 148, h: 84, titulo: "Movimiento", campos: ["INGRESO | EGRESO", "categoria · concepto", "conciliado Boolean", "@@index(parcela,fecha)"] },
  { id: "cuenta", x: 618, y: 238, w: 148, h: 64, titulo: "CuentaBancaria", campos: ["banco · numero", "conciliación básica"] },
  { id: "fondo", x: 618, y: 330, w: 148, h: 64, titulo: "FondoReserva", campos: ["nombre · objetivo", "movimientos propios"] },
  { id: "aviso", x: 618, y: 38, w: 148, h: 72, titulo: "Aviso", campos: ["titulo · cuerpo", "prioridad URGENTE", "publicado Boolean"] },
  { id: "notif", x: 806, y: 38, w: 142, h: 72, titulo: "Notificacion", campos: ["texto · leida", "@@index(usuario,leida)"] },
  { id: "area", x: 430, y: 462, w: 148, h: 64, titulo: "AreaComun", campos: ["nombre · capacidad", "tarifa · reglas"] },
  { id: "reserva", x: 618, y: 462, w: 148, h: 72, titulo: "Reserva", campos: ["inicio · fin · estado", "solapes validados", "@@index(area,inicio)"] },
  { id: "asamblea", x: 806, y: 330, w: 142, h: 60, titulo: "Asamblea", campos: ["fecha · estado", "CONVOCADA→CERRADA"] },
  { id: "opcion", x: 806, y: 412, w: 142, h: 50, titulo: "Opcion", campos: ["texto"] },
  { id: "voto", x: 806, y: 482, w: 142, h: 58, titulo: "Voto", campos: ["peso = prorrata", "@@unique(asamblea,unidad)"] },
];

const ARISTAS: [string, string][] = [
  ["usuario", "miembro"], ["miembro", "parcela"], ["parcela", "unidad"], ["unidad", "miembro"],
  ["parcela", "cobro"], ["cobro", "pago"], ["pago", "mov"], ["mov", "cuenta"], ["mov", "fondo"],
  ["parcela", "aviso"], ["aviso", "notif"], ["notif", "usuario"],
  ["parcela", "area"], ["area", "reserva"], ["reserva", "unidad"],
  ["parcela", "asamblea"], ["asamblea", "opcion"], ["opcion", "voto"], ["voto", "unidad"],
  ["parcela", "acceso"], ["acceso", "unidad"], ["parcela", "mov"],
];

const CLUSTERS = [
  { label: "TENANT + RBAC", x: 40, y: 24 },
  { label: "MÓDULO FINANCIERO", x: 430, y: 108 },
  { label: "COMUNICACIÓN", x: 618, y: 24 },
  { label: "RESERVAS", x: 430, y: 448 },
  { label: "ASAMBLEAS", x: 806, y: 316 },
  { label: "CONTROL DE ACCESO", x: 252, y: 438 },
];

function centro(n: Nodo) {
  return { cx: n.x + n.w / 2, cy: n.y + n.h / 2 };
}

export default function Architecture() {
  const [activo, setActivo] = useState<string | null>(null);

  const vecinos = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    ARISTAS.forEach(([a, b]) => {
      (map[a] ??= new Set()).add(b);
      (map[b] ??= new Set()).add(a);
    });
    return map;
  }, []);

  const resalta = (id: string) =>
    activo === null || activo === id || (vecinos[activo]?.has(id) ?? false);

  return (
    <section id="plano" className="relative bg-blueprint py-20 md:py-28 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHead
          dark
          index="SEC. A"
          kicker="Arquitectura del sistema"
          title="El plano multi-tenant"
          note="Una Parcela = un condominio = un tenant. Cada fila de datos nace atada a su parcelaId."
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
          {/* ── diagrama interactivo ── */}
          <Reveal className="relative border border-line-400/30 bg-ink-950/40 p-3 md:p-5">
            <div className="absolute -top-px -left-px h-4 w-4 border-t-2 border-l-2 border-amber-acc" />
            <div className="absolute -top-px -right-px h-4 w-4 border-t-2 border-r-2 border-amber-acc" />
            <div className="absolute -bottom-px -left-px h-4 w-4 border-b-2 border-l-2 border-amber-acc" />
            <div className="absolute -bottom-px -right-px h-4 w-4 border-b-2 border-r-2 border-amber-acc" />

            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-300">
              Fig. A-1 · Diagrama entidad–relación · pasa el cursor por entidad
            </p>

            <svg viewBox="0 0 988 566" className="w-full" role="img" aria-label="Diagrama del modelo de datos multi-tenant">
              {/* aristas */}
              {ARISTAS.map(([a, b], i) => {
                const na = NODOS.find((n) => n.id === a)!;
                const nb = NODOS.find((n) => n.id === b)!;
                const pa = centro(na);
                const pb = centro(nb);
                const encendida =
                  activo !== null && (a === activo || b === activo);
                const apagada = activo !== null && !encendida;
                return (
                  <line
                    key={a + b}
                    x1={pa.cx} y1={pa.cy} x2={pb.cx} y2={pb.cy}
                    pathLength={1}
                    className="draw-line"
                    style={{ ["--draw-delay" as never]: 200 + i * 55 + "ms" }}
                    stroke={encendida ? "#ffb020" : "#6fb1ff"}
                    strokeWidth={encendida ? 1.6 : 0.8}
                    opacity={apagada ? 0.1 : encendida ? 0.95 : 0.38}
                    strokeDasharray={undefined}
                  />
                );
              })}

              {/* rótulos de clúster */}
              {CLUSTERS.map((c, i) => (
                <text
                  key={c.label}
                  x={c.x} y={c.y}
                  className="fade-late"
                  style={{ ["--draw-delay" as never]: 1200 + i * 120 + "ms" }}
                  fill="#6f9cd4"
                  fontSize="9"
                  letterSpacing="2.5"
                  fontFamily="var(--font-mono)"
                >
                  {c.label}
                </text>
              ))}

              {/* nodos */}
              {NODOS.map((n) => {
                const on = resalta(n.id);
                const esParcela = n.tenant;
                return (
                  <g
                    key={n.id}
                    onMouseEnter={() => setActivo(n.id)}
                    onMouseLeave={() => setActivo(null)}
                    className="cursor-pointer transition-opacity duration-300"
                    opacity={on ? 1 : 0.28}
                  >
                    <rect
                      x={n.x} y={n.y} width={n.w} height={n.h}
                      fill={esParcela ? "rgba(255,176,32,0.10)" : "rgba(15,44,85,0.85)"}
                      stroke={activo === n.id ? "#ffb020" : esParcela ? "#ffb020" : "#6fb1ff"}
                      strokeWidth={activo === n.id || esParcela ? 1.6 : 0.9}
                    />
                    <rect x={n.x} y={n.y} width={n.w} height={16} fill={esParcela ? "#ffb020" : "#1f4a85"} opacity={esParcela ? 0.9 : 0.8} />
                    <text
                      x={n.x + 7} y={n.y + 11.5}
                      fill={esParcela ? "#0a1f3c" : "#f1f4f9"}
                      fontSize="9.5" fontWeight="700"
                      fontFamily="var(--font-mono)"
                    >
                      {n.titulo}
                    </text>
                    {n.campos.map((c, j) => (
                      <text
                        key={c}
                        x={n.x + 7} y={n.y + 30 + j * 13}
                        fill={c.startsWith("@@") || c.startsWith("→") ? "#ffb020" : "#a8c4e6"}
                        fontSize="8.3"
                        fontFamily="var(--font-mono)"
                      >
                        {c}
                      </text>
                    ))}
                    {esParcela && (
                      <circle cx={n.x + n.w - 10} cy={n.y + 8} r="3" fill="#0a1f3c" className="pulse-dot" />
                    )}
                  </g>
                );
              })}
            </svg>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line-400/20 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
              <span className="flex items-center gap-2"><span className="h-2 w-2 bg-amber-acc inline-block" /> Tenant raíz</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 bg-line-400 inline-block" /> FK hacia el tenant</span>
              <span className="hidden sm:inline text-ink-500">17 modelos · 11 enums · todo indexado por parcelaId</span>
            </div>
          </Reveal>

          {/* ── columnas de aislamiento ── */}
          <div className="flex flex-col gap-4">
            <Reveal delay={100}>
              <p className="font-body text-[15px] leading-relaxed text-paper-200">
                El aislamiento de datos no depende de una sola barrera: se aplica en{" "}
                <strong className="text-amber-acc font-semibold">tres capas independientes</strong>.
                Si una falla, las otras dos siguen protegiendo a cada condominio.
              </p>
            </Reveal>
            {CAPAS_AISLAMIENTO.map((c, i) => (
              <Reveal key={c.n} delay={160 + i * 120}>
                <div className="group border border-line-400/25 bg-ink-950/50 p-5 transition-colors hover:border-amber-acc/70 hover:bg-ink-800/60">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-3xl text-amber-acc leading-none">{c.n}</span>
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-paper-100">
                      {c.titulo}
                    </h3>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink-200">{c.detalle}</p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={560}>
              <div className="border border-dashed border-line-400/40 p-4 font-mono text-[11px] leading-relaxed text-ink-300">
                <span className="text-amber-acc">SET app.parcela_id = '…';</span>
                <br />— la sesión fija el tenant en la conexión y RLS filtra cada SELECT.
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
