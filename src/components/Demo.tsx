import { useMemo, useState } from "react";
import {
  DEMO_MODULES, DEMO_ROUTES, RBAC_LABEL, RBAC_MATRIX, ROLES,
  type Acceso, type Rol,
} from "../lib/data";
import { Icon, Reveal, SectionHead } from "./ui";

const ACCESS_BADGE: Record<Exclude<Acceso, "none">, { letra: string; tip: string }> = {
  full: { letra: "E", tip: "Escritura" },
  read: { letra: "L", tip: "Lectura" },
  own: { letra: "S", tip: "Solo lo suyo" },
};

type Veredicto = { path: string; ok: boolean; detalle: string } | null;

/* ── glifos de la matriz RBAC ────────────────────────────────── */
function Glyph({ a }: { a: Acceso }) {
  if (a === "full")
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3.5 w-3.5 bg-amber-acc" />
        <span className="hidden font-mono text-[10.5px] uppercase tracking-wide text-ink-600 lg:inline">{RBAC_LABEL.full}</span>
      </span>
    );
  if (a === "read")
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3.5 w-3.5 border-2 border-ink-600" />
        <span className="hidden font-mono text-[10.5px] uppercase tracking-wide text-ink-600 lg:inline">{RBAC_LABEL.read}</span>
      </span>
    );
  if (a === "own")
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3.5 w-3.5 border-2 border-ink-600 bg-[linear-gradient(90deg,#ffb020_50%,transparent_50%)]" />
        <span className="hidden font-mono text-[10.5px] uppercase tracking-wide text-ink-600 lg:inline">{RBAC_LABEL.own}</span>
      </span>
    );
  return <span className="font-mono text-sm text-ink-300/50">—</span>;
}

export default function Demo() {
  const [rol, setRol] = useState<Rol>("PROPIETARIO");
  const [veredicto, setVeredicto] = useState<Veredicto>(null);
  const [probando, setProbando] = useState<string | null>(null);

  const info = ROLES.find((r) => r.id === rol)!;

  const modulos = useMemo(
    () => DEMO_MODULES.filter((m) => m.acceso[rol] !== "none"),
    [rol],
  );

  const cambiarRol = (r: Rol) => {
    setRol(r);
    setVeredicto(null);
  };

  const probarRuta = (path: string, permitido: boolean, detalle: string) => {
    setProbando(path);
    setVeredicto(null);
    window.setTimeout(() => {
      setVeredicto({ path, ok: permitido, detalle });
      setProbando(null);
    }, 380);
  };

  return (
    <section id="prototipo" className="relative bg-blueprint py-20 md:py-28 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHead
          dark
          index="SEC. C"
          kicker="Prototipo interactivo"
          title="La plataforma en obra"
          note="Cambia de rol y observa cómo el middleware abre y cierra módulos, rutas y datos."
        />

        {/* ── selector de rol ── */}
        <Reveal className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ROLES.map((r) => {
            const activo = r.id === rol;
            return (
              <button
                key={r.id}
                onClick={() => cambiarRol(r.id)}
                className={
                  "border-2 p-4 text-left transition-all duration-200 " +
                  (activo
                    ? "hard-shadow-amber border-paper-100 bg-ink-800"
                    : "border-line-400/25 bg-ink-950/40 hover:border-line-400/60 hover:bg-ink-800/50")
                }
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5" style={{ background: r.color }} />
                  <span className={"font-mono text-[11px] font-bold uppercase tracking-[0.16em] " + (activo ? "text-paper-50" : "text-ink-200")}>
                    {r.nombre}
                  </span>
                  {activo && <Icon name="check" size={13} className="ml-auto text-amber-acc" />}
                </div>
                <p className={"mt-2 text-[12.5px] leading-snug " + (activo ? "text-paper-200" : "text-ink-300/80")}>
                  {r.alcance}
                </p>
              </button>
            );
          })}
        </Reveal>

        {/* ── ventana de la app ── */}
        <Reveal delay={120}>
          <div className="border-2 border-paper-100/80 bg-ink-950/70 hard-shadow-light">
            {/* barra superior */}
            <div className="flex flex-wrap items-center gap-3 border-b border-line-400/25 px-4 py-3">
              <span className="flex gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-signal-acc" />
                <i className="h-2.5 w-2.5 rounded-full bg-amber-acc" />
                <i className="h-2.5 w-2.5 rounded-full bg-jade-acc" />
              </span>
              <span className="flex min-w-0 items-center gap-2 border border-line-400/30 bg-ink-900 px-3 py-1 font-mono text-[11px] text-ink-200">
                <Icon name="lock" size={11} className="text-jade-acc shrink-0" />
                <span className="truncate">
                  condo-os.app/<span className="text-amber-acc">torres-del-parque</span>
                  /{rol === "ADMIN" ? "admin" : rol === "COMITE" ? "comite" : "residente"}
                </span>
              </span>
              <span className="ml-auto flex items-center gap-3">
                <span className="relative">
                  <Icon name="bell" size={16} className="text-ink-300" />
                  <i className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 bg-signal-acc pulse-dot" />
                </span>
                <span className="hidden items-center gap-2 sm:flex">
                  <span className="flex h-7 w-7 items-center justify-center border font-mono text-[11px] font-bold" style={{ borderColor: info.color, color: info.color }}>
                    {info.persona.split(" ").map((p) => p[0]).join("")}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[12px] font-semibold text-paper-100">{info.persona}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-wide" style={{ color: info.color }}>
                      {info.cargo} · {rol}
                    </span>
                  </span>
                </span>
              </span>
            </div>

            <div className="grid md:grid-cols-[220px_1fr]">
              {/* sidebar */}
              <div className="border-b border-line-400/25 p-3 md:border-b-0 md:border-r">
                <p className="px-2 pb-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-500">
                  Navegación según rol
                </p>
                <nav className="grid gap-0.5">
                  {DEMO_MODULES.map((m) => {
                    const acc = m.acceso[rol];
                    const bloqueado = acc === "none";
                    return (
                      <div
                        key={m.id}
                        className={
                          "flex items-center gap-2.5 px-2 py-[7px] font-mono text-[12px] transition-colors " +
                          (bloqueado
                            ? "text-ink-500 opacity-60"
                            : "cursor-pointer text-paper-200 hover:bg-ink-800 hover:text-amber-acc")
                        }
                      >
                        <Icon name={m.icon} size={15} className={bloqueado ? "" : "text-line-400"} />
                        <span className={bloqueado ? "line-through decoration-ink-500" : ""}>{m.nombre}</span>
                        {bloqueado ? (
                          <Icon name="lock" size={11} className="ml-auto text-ink-500" />
                        ) : (
                          <span
                            className="ml-auto border px-1 text-[9px] font-bold"
                            style={{ borderColor: info.color, color: info.color }}
                            title={ACCESS_BADGE[acc as Exclude<Acceso, "none">].tip}
                          >
                            {ACCESS_BADGE[acc as Exclude<Acceso, "none">].letra}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </nav>
                <p className="mt-3 border-t border-line-400/20 px-2 pt-3 font-mono text-[9.5px] uppercase tracking-[0.14em] leading-relaxed text-ink-500">
                  E escritura · L lectura · S solo lo suyo
                </p>
              </div>

              {/* área principal */}
              <div className="p-4 md:p-5">
                <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h3 className="font-display text-2xl uppercase text-paper-100">
                    {rol === "ADMIN" ? "Panel de administración" : rol === "COMITE" ? "Supervisión del comité" : "Mi condominio"}
                  </h3>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-300">
                    {modulos.length} módulos habilitados de {DEMO_MODULES.length}
                  </p>
                </div>

                <div key={rol} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {modulos.map((m, i) => (
                    <article
                      key={m.id}
                      className="card-in group border border-line-400/25 bg-ink-900/70 p-4 transition-all hover:-translate-y-0.5 hover:border-amber-acc/70"
                      style={{ ["--ci-delay" as never]: i * 60 + "ms" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="border border-line-400/40 p-1.5 text-line-300 transition-colors group-hover:border-amber-acc group-hover:text-amber-acc">
                          <Icon name={m.icon} size={16} />
                        </span>
                        <h4 className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-paper-100">{m.nombre}</h4>
                      </div>
                      <p className="mt-2 min-h-[34px] text-[12px] leading-snug text-ink-300">{m.desc}</p>
                      {m.kpis && (
                        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line-400/20 pt-3">
                          {m.kpis.map((k) => (
                            <div key={k.label}>
                              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-500">{k.label}</dt>
                              <dd
                                className={
                                  "font-mono text-[13px] font-semibold " +
                                  (k.tone === "jade" ? "text-jade-acc" : k.tone === "signal" ? "text-signal-acc" : k.tone === "amber" ? "text-amber-acc" : "text-line-300")
                                }
                              >
                                {k.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </article>
                  ))}
                </div>

                {rol === "ARRENDATARIO" && (
                  <p className="mt-4 border border-dashed border-signal-acc/50 p-3 font-mono text-[11px] leading-relaxed text-ink-300">
                    <span className="text-signal-acc">▲ REGLA DE NEGOCIO:</span> el arrendatario solo accede a estado de cuenta y pagos.
                    Reservas y votaciones quedan reservadas a propietarios — el middleware y requireRole() lo garantizan.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── simulador de rutas del middleware ── */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
          <Reveal>
            <div className="border border-line-400/25 bg-ink-950/60 p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-line-300">
                Simulador · middleware.ts en vivo
              </p>
              <h3 className="mt-2 font-display text-2xl uppercase text-paper-100">
                ¿Deja pasar la ruta?
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                Con el rol <strong style={{ color: info.color }}>{info.nombre}</strong> activo, pulsa una ruta y mira la decisión
                que tomaría el middleware antes de renderizar.
              </p>
              <div className="mt-4 grid gap-1.5">
                {DEMO_ROUTES.map((r) => {
                  const permitido = r.roles === "public" || (r.roles as Rol[]).includes(rol);
                  return (
                    <button
                      key={r.path}
                      disabled={probando !== null}
                      onClick={() =>
                        probarRuta(
                          r.path,
                          permitido,
                          r.roles === "public"
                            ? "Ruta pública: solo se valida la firma HMAC de Mercado Pago."
                            : permitido
                              ? "roles permitidos: [" + (r.roles as Rol[]).join(", ") + "] → token.roles[parcela] coincide."
                              : "roles permitidos: [" + (r.roles as Rol[]).join(", ") + "] → tu rol " + rol + " no está en la lista.",
                        )
                      }
                      className={
                        "group flex items-center gap-3 border px-3 py-2.5 text-left font-mono text-[12.5px] transition-all " +
                        (veredicto?.path === r.path
                          ? permitido
                            ? "border-jade-acc bg-jade-acc/10"
                            : "border-signal-acc bg-signal-acc/10"
                          : "border-line-400/20 hover:border-amber-acc/70 hover:bg-ink-800/60")
                      }
                    >
                      <span className="text-line-300 transition-transform group-hover:translate-x-1"><Icon name="route" size={15} /></span>
                      <span className="text-paper-100">{r.path}</span>
                      <span className="ml-auto hidden text-[10.5px] uppercase tracking-wide text-ink-500 sm:inline">{r.nota}</span>
                      <span className="text-amber-acc opacity-0 transition-opacity group-hover:opacity-100"><Icon name="arrow" size={14} /></span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Reveal>

          {/* veredicto */}
          <Reveal delay={140}>
            <div className="flex h-full min-h-[260px] flex-col border-2 border-dashed border-line-400/40 bg-ink-950/40 p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-500">Respuesta del edge</p>
              {probando && (
                <p className="mt-6 font-mono text-sm text-line-300">
                  consultando token JWT<span className="caret-blink">▊</span>
                </p>
              )}
              {!probando && !veredicto && (
                <p className="mt-6 font-mono text-[12.5px] leading-relaxed text-ink-500">
                  — esperando una ruta…<br />
                  <span className="text-ink-300/70">NextResponse decidirá en &lt;10 ms.</span>
                </p>
              )}
              {!probando && veredicto && (
                <div key={veredicto.path + String(veredicto.ok)} className="stamp-in mt-5">
                  <span
                    className={
                      "inline-block border-[3px] px-4 py-2 font-display text-3xl uppercase tracking-[0.08em] " +
                      (veredicto.ok ? "border-jade-acc text-jade-acc" : "border-signal-acc text-signal-acc")
                    }
                  >
                    {veredicto.ok ? "200 · Pasa" : "403 · Denegado"}
                  </span>
                  <p className="mt-4 font-mono text-[12px] leading-relaxed text-paper-200">
                    <span className="text-line-300">GET</span> {veredicto.path}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">{veredicto.detalle}</p>
                  {!veredicto.ok && (
                    <p className="mt-3 border border-signal-acc/40 bg-signal-acc/10 px-3 py-2 font-mono text-[11px] text-signal-acc">
                      → NextResponse.redirect("/403")
                    </p>
                  )}
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* ── matriz RBAC ── */}
        <div id="rbac" className="mt-16 scroll-mt-24">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line-400/30 pb-4">
              <h3 className="font-display text-3xl uppercase text-paper-100 md:text-4xl">
                Matriz RBAC · <span className="text-amber-acc">quién puede hacer qué</span>
              </h3>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-300">
                {RBAC_MATRIX.length} permisos × 4 roles
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="code-scroll mt-0 overflow-x-auto border border-line-400/25 bg-ink-950/60">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr>
                    <th className="border-b-2 border-line-400/40 px-4 py-3 text-left font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-300">
                      Área / permiso
                    </th>
                    {ROLES.map((r) => (
                      <th key={r.id} className="border-b-2 border-line-400/40 border-l border-line-400/20 px-4 py-3 text-center">
                        <span className="mx-auto mb-1 block h-2 w-8" style={{ background: r.color }} />
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-100">{r.nombre}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RBAC_MATRIX.map((row, i) => (
                    <tr key={row.area} className={"transition-colors hover:bg-ink-800/60 " + (i % 2 ? "bg-ink-900/40" : "")}>
                      <td className="border-l-2 border-l-transparent px-4 py-2.5 text-[13px] text-paper-200 transition-colors hover:border-amber-acc">
                        {row.area}
                      </td>
                      {ROLES.map((r) => (
                        <td key={r.id} className="border-l border-line-400/15 px-4 py-2.5 text-center">
                          <Glyph a={row.acceso[r.id]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-300">
              <Glyph a="full" /> <Glyph a="read" /> <Glyph a="own" />
              <span className="text-ink-500">— sin acceso (redirect /403)</span>
              <span className="ml-auto text-amber-acc">validado en middleware + requireRole() + RLS</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
