import { useMemo, useState } from "react";
import {
  ACTIONS_TS, FASES, FOLDER_TREE, MIDDLEWARE_TS, SCHEMA_PRISMA, STACK,
  TENANT_TS, type TreeNode,
} from "../lib/data";
import { highlight } from "../lib/highlight";
import { CopyButton, Icon, Reveal, SectionHead } from "./ui";

/* ── definición de los grupos de archivos ────────────────────── */
type FileDef = { id: string; nombre: string; lang: string; code?: string };
type Grupo = { id: string; num: string; nombre: string; desc: string; files: FileDef[] };

const GRUPOS: Grupo[] = [
  {
    id: "g1", num: "01", nombre: "Estructura del proyecto",
    desc: "Next.js App Router con rutas separadas por rol: /admin, /comite y /residente bajo el segmento dinámico [parcela].",
    files: [{ id: "tree", nombre: "condo-os/ · árbol completo", lang: "DIRECTORIOS" }],
  },
  {
    id: "g2", num: "02", nombre: "Base de datos relacional",
    desc: "schema.prisma estricto: Parcela (tenant), Usuario con membresías por rol, y las relaciones de gastos, pagos, avisos, reservas, votos y bitácora.",
    files: [{ id: "schema", nombre: "prisma/schema.prisma", lang: "PRISMA", code: SCHEMA_PRISMA }],
  },
  {
    id: "g3", num: "03", nombre: "Seguridad y rutas",
    desc: "Protección por rol en dos capas: middleware en el edge + requireRole() en cada server action. Un residente jamás entra a /admin/finanzas.",
    files: [
      { id: "mw", nombre: "src/middleware.ts", lang: "TYPESCRIPT", code: MIDDLEWARE_TS },
      { id: "tenant", nombre: "src/lib/tenant.ts", lang: "TYPESCRIPT", code: TENANT_TS },
      { id: "actions", nombre: "…/admin/cobranza/actions.ts", lang: "SERVER ACTION", code: ACTIONS_TS },
    ],
  },
  {
    id: "g4", num: "04", nombre: "Plan de desarrollo",
    desc: "Seis fases en doce semanas: al terminar F0 ya hay multi-tenant + RBAC funcionando; la demo existe desde el día uno.",
    files: [{ id: "plan", nombre: "PLAN.md · hoja de ruta", lang: "ROADMAP" }],
  },
];

/* ── árbol de carpetas interactivo ───────────────────────────── */
function TreeRow({ node, depth, expanded, toggle, path }: {
  node: TreeNode; depth: number; expanded: Set<string>;
  toggle: (p: string) => void; path: string;
}) {
  const isDir = node.kind === "dir";
  const open = expanded.has(path);
  return (
    <div>
      <button
        onClick={() => isDir && toggle(path)}
        className={
          "group flex w-full items-baseline gap-2 px-2 py-[3px] text-left font-mono text-[12.5px] leading-relaxed transition-colors " +
          (isDir ? "cursor-pointer hover:bg-ink-700/50" : "cursor-default")
        }
        style={{ paddingLeft: depth * 18 + 8 }}
      >
        {isDir ? (
          <span className={"text-amber-acc transition-transform duration-200 " + (open ? "rotate-90" : "")}>▸</span>
        ) : (
          <span className="text-ink-500">·</span>
        )}
        <span className={isDir ? "font-semibold text-paper-100" : "text-ink-200"}>{node.name}</span>
        {node.tag && (
          <span className="border border-amber-acc/60 px-1.5 py-px text-[9px] uppercase tracking-[0.12em] text-amber-acc">
            {node.tag}
          </span>
        )}
        {node.note && (
          <span className="ml-auto hidden truncate pl-4 text-[11px] italic text-ink-300/70 sm:inline">
            {node.note}
          </span>
        )}
      </button>
      {isDir && open && node.children && (
        <div className="border-l border-dashed border-ink-500/40" style={{ marginLeft: depth * 18 + 15 }}>
          {node.children.map((c) => (
            <TreeRow key={path + c.name} node={c} depth={depth + 1} expanded={expanded} toggle={toggle} path={path + c.name} />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderTree() {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>(["condo-os/", "condo-os/src/", "condo-os/prisma/"]);
    const walk = (n: TreeNode, p: string, d: number) => {
      if (n.kind !== "dir" || d > 2) return;
      s.add(p);
      n.children?.forEach((c) => walk(c, p + c.name, d + 1));
    };
    walk(FOLDER_TREE, "condo-os/", 0);
    return s;
  });
  const toggle = (p: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  const count = useMemo(() => {
    let dirs = 0, files = 0;
    const walk = (n: TreeNode) => {
      if (n.kind === "dir") dirs++; else files++;
      n.children?.forEach(walk);
    };
    walk(FOLDER_TREE);
    return { dirs, files };
  }, []);

  return (
    <div className="p-2">
      <TreeRow node={FOLDER_TREE} depth={0} expanded={expanded} toggle={toggle} path="condo-os/" />
      <p className="mt-4 border-t border-ink-500/30 px-2 pt-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-400">
        {count.dirs} directorios · {count.files} archivos · click en carpetas para plegar
      </p>
    </div>
  );
}

/* ── plan de desarrollo ──────────────────────────────────────── */
function PlanBoard() {
  return (
    <div className="p-4 md:p-6">
      <ol className="relative border-l border-dashed border-ink-500/50">
        {FASES.map((f, i) => (
          <li key={f.id} className="relative mb-7 pl-6 last:mb-2">
            <span className="absolute -left-[9px] top-1 h-4 w-4 border-2 border-amber-acc bg-ink-950" />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-2xl leading-none text-amber-acc">{f.id}</span>
              <h4 className="font-mono text-sm font-bold uppercase tracking-[0.14em] text-paper-100">{f.nombre}</h4>
              <span className="ml-auto border border-line-400/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-line-300">
                {f.semanas}
              </span>
            </div>
            <p className="mt-2 text-[13.5px] italic text-ink-300">“{f.objetivo}”</p>
            <ul className="mt-2 grid gap-1">
              {f.entregables.map((e) => (
                <li key={e} className="flex items-start gap-2 text-[13px] text-paper-200">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-jade-acc" />{e}
                </li>
              ))}
            </ul>
            {i === FASES.length - 1 && (
              <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-amber-acc">
                ▲ Lanzamiento · v1.0 en producción
              </p>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-6 border-t border-ink-500/30 pt-4">
        <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-400">Stack confirmado</p>
        <div className="flex flex-wrap gap-2">
          {STACK.map((s) => (
            <span key={s} className="border border-line-400/40 bg-ink-800/60 px-2.5 py-1 font-mono text-[11px] text-line-300 transition-colors hover:border-amber-acc hover:text-amber-acc">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── panel de código ─────────────────────────────────────────── */
function CodeView({ code, lang }: { code: string; lang: string }) {
  const lines = useMemo(() => code.split("\n").map((l) => highlight(l)), [code]);
  return (
    <div className="code-scroll max-h-[68vh] overflow-auto">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((html, i) => (
            <tr key={i} className="hover:bg-ink-800/50">
              <td className="w-10 select-none border-r border-ink-700/60 pr-3 text-right align-top font-mono text-[11px] leading-[1.55] text-ink-500">
                {i + 1}
              </td>
              <td
                className="whitespace-pre pl-4 pr-6 font-mono text-[12.5px] leading-[1.55] text-paper-200"
                dangerouslySetInnerHTML={{ __html: html || " " }}
              />
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
        fin del archivo · {lang}
      </p>
    </div>
  );
}

/* ── sección principal ───────────────────────────────────────── */
export default function Deliverables() {
  const [grupoId, setGrupoId] = useState("g2");
  const [fileId, setFileId] = useState("schema");

  const grupo = GRUPOS.find((g) => g.id === grupoId)!;
  const file = grupo.files.find((f) => f.id === fileId) ?? grupo.files[0];

  const selectGrupo = (g: Grupo) => {
    setGrupoId(g.id);
    setFileId(g.files[0].id);
  };

  const copyGrupo = () =>
    grupo.files.map((f) => (f.code ? "// ── " + f.nombre + " ──\n" + f.code : "")).filter(Boolean).join("\n\n");

  return (
    <section id="entregables" className="relative bg-drafting py-20 text-ink-900 md:py-28 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHead
          index="SEC. B"
          kicker="Entregables para comenzar"
          title="Los archivos, agrupados"
          note="Cuatro paquetes listos para llevar al repositorio: estructura, esquema, seguridad y plan."
        />

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* ── navegación de grupos (sticky) ── */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
              {GRUPOS.map((g) => {
                const activo = g.id === grupoId;
                return (
                  <button
                    key={g.id}
                    onClick={() => selectGrupo(g)}
                    className={
                      "group min-w-[240px] shrink-0 border-2 p-4 text-left transition-all duration-200 lg:min-w-0 " +
                      (activo
                        ? "hard-shadow border-ink-900 bg-amber-acc"
                        : "border-ink-900/25 bg-paper-50 hover:border-ink-900 hover:bg-paper-200")
                    }
                  >
                    <div className="flex items-baseline gap-3">
                      <span className={"font-display text-2xl leading-none " + (activo ? "text-ink-900" : "text-amber-deep")}>
                        {g.num}
                      </span>
                      <span className="font-mono text-[13px] font-bold uppercase tracking-[0.1em]">
                        {g.nombre}
                      </span>
                    </div>
                    <p className={"mt-2 text-[12.5px] leading-snug " + (activo ? "text-ink-800" : "text-ink-500")}>
                      {g.desc}
                    </p>
                    <p className={"mt-2 font-mono text-[10px] uppercase tracking-[0.16em] " + (activo ? "text-ink-900/70" : "text-ink-400")}>
                      {g.files.length} {g.files.length === 1 ? "archivo" : "archivos"} ·{" "}
                      {activo ? "viendo ahora" : "abrir →"}
                    </p>
                  </button>
                );
              })}
            </div>

            <Reveal delay={150} className="mt-5 hidden lg:block">
              <div className="border-2 border-dashed border-ink-900/30 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">Convención de ruteo</p>
                <p className="mt-2 font-mono text-[12px] leading-relaxed text-ink-700">
                  /<span className="text-amber-deep">[parcela]</span>/admin/… → ADMIN
                  <br />/<span className="text-amber-deep">[parcela]</span>/comite/… → COMITÉ
                  <br />/<span className="text-amber-deep">[parcela]</span>/residente/… → TODOS
                </p>
                <p className="mt-3 text-[12px] leading-snug text-ink-500">
                  El segmento dinámico resuelve el tenant; el prefijo decide el rol mínimo.
                </p>
              </div>
            </Reveal>
          </div>

          {/* ── panel de archivos ── */}
          <div>
            <div className="border-2 border-ink-900 bg-ink-950 text-paper-100 hard-shadow">
              {/* pestañas de archivos del grupo */}
              <div className="flex flex-wrap items-center gap-0 border-b-2 border-ink-900 bg-ink-900">
                {grupo.files.map((f) => {
                  const activo = f.id === file.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFileId(f.id)}
                      className={
                        "border-r border-ink-700/70 px-4 py-3 font-mono text-[11.5px] tracking-wide transition-colors " +
                        (activo
                          ? "bg-ink-950 text-amber-acc shadow-[inset_0_3px_0_#ffb020]"
                          : "text-ink-300 hover:text-paper-100")
                      }
                    >
                      {f.nombre}
                    </button>
                  );
                })}
                <div className="ml-auto flex items-center gap-3 px-4">
                  <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 sm:inline">
                    {file.lang}
                  </span>
                  {file.code && <CopyButton text={file.code} light />}
                  {grupo.files.some((f) => f.code) && grupo.files.length > 1 && (
                    <CopyButton text={copyGrupo()} light label="Copiar grupo" />
                  )}
                </div>
              </div>

              <div key={file.id} className="card-in">
                {file.id === "tree" && <FolderTree />}
                {file.id === "plan" && <PlanBoard />}
                {file.code && <CodeView code={file.code} lang={file.lang} />}
              </div>
            </div>

            <p className="mt-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">
              <Icon name="copy" size={13} /> “Copiar archivo” lleva el contenido exacto; cada grupo se copia completo con un clic.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
