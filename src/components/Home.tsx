import { useState } from "react";
import { Code } from "../lib/highlight";
import { Btn, CountUp, Icon, Logo, Reveal, toast } from "./ui";

/* ════════════════════════════════════════════════════════════
   HOME · landing de venta de ComunApp
   ════════════════════════════════════════════════════════════ */

export default function Home({ nav, sesion, panel }: { nav: (v: "login" | "api") => void; sesion: boolean; panel: () => void }) {
  return (
    <div className="min-h-screen bg-paper">
      <HomeNav nav={nav} sesion={sesion} panel={panel} />
      <Hero nav={nav} sesion={sesion} panel={panel} />
      <Marquee />
      <Servicios />
      <ComoFunciona />
      <MultiTenant />
      <Planes nav={nav} />
      <ApiTeaser nav={nav} />
      <CtaFinal nav={nav} sesion={sesion} panel={panel} />
      <Footer nav={nav} />
    </div>
  );
}

function HomeNav({ nav, sesion, panel }: { nav: (v: "login" | "api") => void; sesion: boolean; panel: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-[1.5px] border-ink bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <a href="#top" aria-label="ComunApp — inicio"><Logo /></a>
        <nav className="hidden items-center gap-7 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-ink2 md:flex">
          <a className="transition-colors hover:text-pine" href="#servicios">Servicios</a>
          <a className="transition-colors hover:text-pine" href="#como">Cómo funciona</a>
          <a className="transition-colors hover:text-pine" href="#planes">Planes</a>
          <button className="transition-colors hover:text-pine" onClick={() => nav("api")}>API</button>
        </nav>
        {sesion ? (
          <Btn size="sm" variant="lime" onClick={panel}>Mi panel <Icon name="arrow" size={14} /></Btn>
        ) : (
          <Btn size="sm" onClick={() => nav("login")}>Ingresar <Icon name="arrow" size={14} /></Btn>
        )}
      </div>
    </header>
  );
}

/* ── apertura: titular editorial + ticket en vivo ── */
function Hero({ nav, sesion, panel }: { nav: (v: "login" | "api") => void; sesion: boolean; panel: () => void }) {
  const [pagando, setPagando] = useState(false);
  const pagarDemo = () => {
    if (pagando) return;
    setPagando(true);
    setTimeout(() => {
      setPagando(false);
      toast("Demo: el pago se procesa dentro del portal del residente.", "warn");
    }, 900);
  };

  return (
    <section id="top" className="dotgrid relative overflow-hidden border-b-[1.5px] border-ink pt-16">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-14 md:px-8 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-20">
        {/* editorial */}
        <div className="lg:col-span-7">
          <Reveal>
            <p className="inline-flex items-center gap-2 border border-ink bg-card px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">
              <span className="pulse-dot h-2 w-2 rounded-full bg-lime2" />
              Plataforma multi-tenant · edificios y condominios
            </p>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="mt-6 font-display text-[44px] font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[76px]">
              Tu condominio,<br />
              administrado<br />
              <span className="marker">en orden.</span>
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-ink2">
              ComunApp reúne <strong className="text-ink">cobranza</strong>, <strong className="text-ink">transparencia financiera</strong>,{" "}
              <strong className="text-ink">reservas</strong> y <strong className="text-ink">votaciones</strong> en un solo lugar.
              Cada condominio es un universo de datos aislado; cada vecino, un portal a su medida.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-8 flex flex-wrap gap-3.5">
              {sesion ? (
                <Btn variant="lime" size="lg" onClick={panel}>Ir a mi panel <Icon name="arrow" size={16} /></Btn>
              ) : (
                <Btn size="lg" onClick={() => nav("login")}>Ingresar a mi condominio <Icon name="arrow" size={16} /></Btn>
              )}
              <Btn variant="ghost" size="lg" onClick={() => nav("api")}>Ver la API en Python <Icon name="python" size={17} /></Btn>
            </div>
          </Reveal>
          <Reveal delay={340}>
            <dl className="mt-12 grid max-w-lg grid-cols-3 divide-x-[1.5px] divide-ink border-y-[1.5px] border-ink">
              {[
                { v: 12, s: "", l: "condominios activos" },
                { v: 3480, s: "", l: "unidades conectadas" },
                { v: 98.2, s: "%", l: "cobranza al día", d: 1 },
              ].map((x) => (
                <div key={x.l} className="flex flex-col px-4 py-4 first:pl-0">
                  <dt className="order-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">{x.l}</dt>
                  <dd className="font-display text-[26px] font-bold leading-none text-pine">
                    <CountUp to={x.v} suffix={x.s} decimals={x.d ?? 0} />
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* ticket en vivo */}
        <div className="relative lg:col-span-5">
          <svg className="pointer-events-none absolute -right-8 -top-10 hidden h-72 w-72 text-pine/20 lg:block" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
            <path className="draw-path" style={{ ["--dash" as never]: 900 }} d="M40 180V70l45-28 45 28v110M130 180V96l30-18v102M20 180h170M55 90h12m16 0h12M55 115h12m16 0h12M55 140h12m16 0h12M70 180v-24h20v24" />
          </svg>

          <div className="relative mx-auto max-w-[400px]">
            <div className="floaty absolute -left-4 -top-5 z-10 hidden items-center gap-2 border-[1.5px] border-ink bg-pine px-3 py-2 shadow-[4px_4px_0_0_#1a2521] sm:flex" style={{ ["--fl-rot" as never]: "-3deg" }}>
              <Icon name="check" size={14} className="text-lime" />
              <span className="font-mono text-[11px] font-semibold text-paper">Pago recibido · $86.400</span>
            </div>
            <div className="floaty absolute -bottom-5 -right-3 z-10 hidden items-center gap-2 border-[1.5px] border-ink bg-lime px-3 py-2 shadow-[4px_4px_0_0_#1a2521] sm:flex" style={{ ["--fl-rot" as never]: "2deg", animationDelay: "1.2s" }}>
              <Icon name="send" size={13} className="text-pine3" />
              <span className="font-mono text-[11px] font-semibold text-pine3">Recordatorios → 3 unidades</span>
            </div>

            <Reveal delay={200}>
              <div className="perf-top border-[1.5px] border-ink bg-card hard-lime">
                <div className="flex items-center justify-between border-b-[1.5px] border-ink bg-pine px-5 py-3.5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-lime">Estado de cuenta</p>
                  <p className="font-mono text-[11px] text-paper/80">Depto. A-42</p>
                </div>
                <div className="space-y-0 px-5 py-2">
                  {[
                    { c: "Gastos comunes · febrero", m: "$86.400", tag: "pagado" },
                    { c: "Multa estacionamiento", m: "$22.000", tag: "pendiente" },
                    { c: "Reserva quincho · sáb 20:00", m: "—", tag: "activa" },
                  ].map((r) => (
                    <div key={r.c} className="ledger flex items-center justify-between gap-3 py-3">
                      <p className="text-[13.5px] font-medium text-ink">{r.c}</p>
                      <span className="flex items-center gap-2.5">
                        <span className="tnum font-mono text-[13px] font-semibold text-ink">{r.m}</span>
                        <span className={"border px-1.5 py-px font-mono text-[9.5px] font-bold uppercase " + (r.tag === "pagado" ? "border-ok/60 bg-ok/15 text-[#1d6b45]" : r.tag === "activa" ? "border-teal/60 bg-teal/10 text-teal" : "border-amber/60 bg-amber/15 text-[#9a6511]")}>{r.tag}</span>
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3.5">
                    <p className="font-display text-[15px] font-bold text-ink">Total pendiente</p>
                    <p className="tnum font-display text-[22px] font-bold text-signal">$22.000</p>
                  </div>
                </div>
                <div className="border-t-[1.5px] border-ink px-5 py-4">
                  <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">
                    <span>Comunidad al día</span><span className="font-bold text-pine">92%</span>
                  </div>
                  <div className="h-2 border border-ink bg-paper2">
                    <div className="h-full w-[92%] bg-pine" />
                  </div>
                  <button onClick={pagarDemo} className="mt-4 flex w-full items-center justify-center gap-2 border-[1.5px] border-ink bg-[#009ee3]/10 py-3 font-semibold text-[13.5px] text-[#0077ad] transition-all hover:bg-[#009ee3]/20 active:translate-y-[2px]">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><ellipse cx="12" cy="12" rx="10" ry="7" fill="#009ee3" /><ellipse cx="12" cy="12" rx="5.5" ry="3.6" fill="#fff" opacity=".9" /></svg>
                    {pagando ? "Conectando con Mercado Pago…" : "Pagar con Mercado Pago"}
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = ["Cobranza automática", "Transparencia financiera", "Reservas de áreas comunes", "Asambleas digitales", "Muro de avisos", "Control de acceso", "Mercado Pago", "Multi-tenant real"];
  const row = items.map((i) => i.toUpperCase());
  return (
    <div className="marquee overflow-hidden border-b-[1.5px] border-ink bg-pine py-3.5" aria-hidden>
      <div className="marquee-track flex w-max items-center gap-8">
        {[...row, ...row].map((t, i) => (
          <span key={i} className="flex items-center gap-8 font-mono text-[12.5px] font-semibold uppercase tracking-[0.22em] text-lime">
            {t} <span className="text-paper/40">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Servicios() {
  const filas = [
    { t: "Cobranza inteligente", d: "Cobros mensuales de gastos comunes, multas por unidad y recordatorios automáticos. El moroso paga en línea; tú dejas de perseguir." },
    { t: "Transparencia total", d: "Estado de cuenta, recibos descargables, fondo de reserva y reportes mensuales. Cada peso, a la vista de la comunidad." },
    { t: "Reservas sin conflicto", d: "Calendario interactivo de quinchos, salas y terrazas. Un bloque, un vecino: el sistema no permite dobles reservas." },
    { t: "Asambleas digitales", d: "Votaciones con quórum y resultados verificables al instante. Se acabó contar papeletas a medianoche." },
    { t: "Muro de avisos", d: "Noticias, mantenciones y emergencias publicadas al instante, con notificación inmediata a todos los residentes." },
    { t: "Control de acceso", d: "Bitácora digital en conserjería: visitas y proveedores con hora de entrada, salida y destino. Historial completo." },
  ];
  return (
    <section id="servicios" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 md:px-8 md:py-28">
      <div className="mb-12 grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Reveal><p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.24em] text-pine">— Servicios</p></Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink md:text-6xl">
              Todo lo que tu comunidad necesita. <span className="text-pine">Nada que sobre.</span>
            </h2>
          </Reveal>
        </div>
        <Reveal delay={160} className="lg:col-span-5">
          <p className="max-w-md text-[15.5px] leading-relaxed text-ink2 lg:ml-auto">
            Seis módulos que resuelven el 95% de la vida de un condominio, diseñados para administradores con poco tiempo y vecinos con poca paciencia.
          </p>
        </Reveal>
      </div>

      <div className="border-t-[1.5px] border-ink">
        {filas.map((f, i) => (
          <Reveal key={f.t} delay={i * 60}>
            <div className="group grid cursor-default grid-cols-[52px_1fr] items-center gap-x-5 gap-y-2 border-b-[1.5px] border-ink px-2 py-6 transition-colors duration-200 hover:bg-pine md:grid-cols-[72px_1.1fr_1.4fr_44px] md:px-4">
              <span className="font-mono text-[13px] font-bold text-pine transition-colors group-hover:text-lime">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display text-[22px] font-bold tracking-tight text-ink transition-colors group-hover:text-paper md:text-[27px]">{f.t}</h3>
              <p className="col-span-2 text-[14px] leading-relaxed text-ink2 transition-colors group-hover:text-paper/75 md:col-span-1">{f.d}</p>
              <span className="hidden justify-self-end text-pine transition-all duration-200 group-hover:translate-x-1.5 group-hover:text-lime md:block"><Icon name="arrow" size={22} /></span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ComoFunciona() {
  const pasos = [
    { n: "1", t: "Crea tu parcela", d: "El administrador de plataforma registra el condominio: nombre, dirección y unidades. Desde ese instante es un tenant con datos 100% aislados." },
    { n: "2", t: "Invita a la comunidad", d: "Asigna roles en segundos: administrador, comité, propietarios y arrendatarios. Cada uno entra a un portal construido para su nivel de acceso." },
    { n: "3", t: "Cobra, comunica y decide", d: "Genera los cobros del mes, publica en el muro, abre asambleas y registra visitas. Todo queda trazado, conciliado y descargable." },
  ];
  return (
    <section id="como" className="scroll-mt-20 border-y-[1.5px] border-ink bg-paper2 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal><p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.24em] text-pine">— Cómo funciona</p></Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink md:text-6xl">De la llave al portal en tres pasos.</h2>
        </Reveal>
        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {pasos.map((p, i) => (
            <Reveal key={p.n} delay={i * 130}>
              <div className={"relative " + (i === 1 ? "md:translate-y-10" : "")}>
                <span className="font-display text-[92px] font-bold leading-none text-transparent [-webkit-text-stroke:2px_#0e4632]" aria-hidden>{p.n}</span>
                <h3 className="mt-3 font-display text-2xl font-bold text-ink">{p.t}</h3>
                <p className="mt-2.5 max-w-xs text-[14.5px] leading-relaxed text-ink2">{p.d}</p>
                {i < 2 && (
                  <span className="absolute -right-6 top-8 hidden text-pine/50 md:block" aria-hidden>
                    <svg width="46" height="12" viewBox="0 0 46 12" fill="none"><path d="M0 6h40m-6-5 6 5-6 5" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 4" /></svg>
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function MultiTenant() {
  const cadena = [
    { rol: "Plataforma", desc: "crea tenants y usuarios", c: "#c9f04d" },
    { rol: "Administrador", desc: "gestiona su condominio", c: "#2f9e68" },
    { rol: "Comité", desc: "supervisa y fiscaliza", c: "#237386" },
    { rol: "Propietario", desc: "paga, reserva y vota", c: "#e09a31" },
    { rol: "Arrendatario", desc: "solo ve lo suyo", c: "#b0793a" },
  ];
  return (
    <section className="blueprint-lines relative overflow-hidden bg-pine py-20 text-paper md:py-28">
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Reveal><p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.24em] text-lime">— Multi-tenant real</p></Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-[54px]">
                Un solo sistema.<br />Cada condominio, <span className="text-lime">su propio universo.</span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-lg text-[15.5px] leading-relaxed text-paper/75">
                El backend (FastAPI + PostgreSQL) aísla los datos por <code className="font-mono text-lime">parcela_id</code> en cada consulta.
                El token JWT viaja con el condominio y el rol del usuario, y cada endpoint lo valida antes de tocar la base de datos.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-7 space-y-2.5">
                {[
                  "Aislamiento de datos garantizado por parcela_id + índices",
                  "RBAC en cada endpoint con la dependencia require_roles()",
                  "El arrendatario solo ve su estado de cuenta — por diseño",
                ].map((g) => (
                  <p key={g} className="flex items-start gap-3 text-[14.5px] text-paper/90">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center border border-lime text-lime"><Icon name="shield" size={12} /></span>
                    {g}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-6">
            <Reveal delay={140}>
              <div className="space-y-0">
                {cadena.map((c, i) => (
                  <div key={c.rol}>
                    <div className="group flex items-center gap-4 border border-paper/25 bg-pine3/60 px-4 py-3.5 transition-all duration-200 hover:border-lime hover:bg-pine3">
                      <span className="h-3 w-3 shrink-0" style={{ background: c.c }} />
                      <div className="min-w-0">
                        <p className="font-display text-[17px] font-bold leading-tight">{c.rol}</p>
                        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-paper/55">{c.desc}</p>
                      </div>
                      <Icon name={i === cadena.length - 1 ? "lock" : "arrow"} size={16} className="ml-auto text-paper/40 transition-colors group-hover:text-lime" />
                    </div>
                    {i < cadena.length - 1 && (
                      <div className="ml-8 border-l-2 border-dashed border-paper/25 py-1.5" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={260}>
              <div className="mt-6 border border-lime/40 bg-pine3/80 px-4 py-3.5 font-mono text-[12px] leading-relaxed">
                <span className="text-paper/50"># cada request viaja con</span><br />
                <span className="text-lime">JWT</span><span className="text-paper/80"> {"{ sub: usuario, parcela_id, rol, exp }"}</span><span className="caret-blink text-lime">▊</span>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Planes({ nav }: { nav: (v: "login" | "api") => void }) {
  const planes = [
    { n: "Comité", precio: "$0", per: "para siempre", items: ["Muro de avisos", "Bitácora de acceso", "Hasta 20 unidades"], hot: false },
    { n: "Parcela", precio: "$29.900", per: "/ mes por condominio", items: ["Todo lo anterior", "Cobranza + Mercado Pago", "Reservas y votaciones", "Reportes y fondo de reserva", "Unidades ilimitadas"], hot: true },
    { n: "Plataforma", precio: "A medida", per: "multi-condominio", items: ["Consola de superadmin", "API Python completa", "Usuarios y tenants ilimitados"], hot: false },
  ];
  return (
    <section id="planes" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 md:px-8 md:py-28">
      <Reveal><p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.24em] text-pine">— Planes</p></Reveal>
      <Reveal delay={80}>
        <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink md:text-6xl">Precios simples, <span className="text-pine">sin letra chica.</span></h2>
      </Reveal>
      <div className="mt-14 space-y-6">
        {planes.map((p, i) => (
          <Reveal key={p.n} delay={i * 110}>
            <div className={"relative grid gap-6 border-[1.5px] border-ink p-6 transition-all duration-200 md:grid-cols-[1.1fr_2fr_auto] md:items-center md:p-8 " + (p.hot ? "bg-ink text-paper hard-lime" : "bg-card hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#1a2521]")}>
              {p.hot && (
                <span className="stamp-in absolute -top-4 right-6 border-2 border-lime bg-pine px-3 py-1 font-display text-[13px] font-bold uppercase tracking-wider text-lime">Recomendado</span>
              )}
              <div>
                <h3 className={"font-display text-3xl font-bold " + (p.hot ? "text-lime" : "text-ink")}>{p.n}</h3>
                <p className={"mt-1 font-mono text-[11px] uppercase tracking-[0.16em] " + (p.hot ? "text-paper/60" : "text-ink3")}>{p.per}</p>
              </div>
              <ul className={"grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-2 " + (p.hot ? "text-paper/85" : "text-ink2")}>
                {p.items.map((it) => (
                  <li key={it} className="flex items-center gap-2">
                    <Icon name="check" size={13} className={p.hot ? "text-lime" : "text-pine"} /> {it}
                  </li>
                ))}
              </ul>
              <div className="md:text-right">
                <p className={"font-display text-[34px] font-bold leading-none " + (p.hot ? "text-paper" : "text-pine")}>{p.precio}</p>
                <button onClick={() => nav("login")} className={"mt-3 font-mono text-[12px] font-bold uppercase tracking-[0.14em] underline decoration-2 underline-offset-4 transition-colors " + (p.hot ? "text-lime hover:text-paper" : "text-ink hover:text-pine")}>
                  Comenzar →
                </button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ApiTeaser({ nav }: { nav: (v: "login" | "api") => void }) {
  const snippet = `# backend/app/auth.py
def require_roles(*roles: Rol):
    """Barrera RBAC: valida el rol del JWT
    dentro de la parcela activa."""
    async def chequear(dep=Depends(usuario_actual)):
        usuario, parcela_id, rol = dep
        if rol not in {r.value for r in roles}:
            raise HTTPException(403, "Rol no autorizado")
        return usuario, parcela_id, rol
    return chequear`;
  return (
    <section className="border-y-[1.5px] border-ink bg-pine3 py-20 text-paper md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 md:px-8 lg:grid-cols-2">
        <div>
          <Reveal><p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.24em] text-lime">— Para equipos técnicos</p></Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-[54px]">El backend habla <span className="text-lime">Python.</span></h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-paper/75">
              FastAPI asíncrono, SQLAlchemy 2.0 con modelos multi-tenant, JWT con rol por parcela y SDK oficial de Mercado Pago.
              Documentado de punta a punta.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-7">
              <Btn variant="lime" onClick={() => nav("api")}>Ver documentación completa <Icon name="arrow" size={15} /></Btn>
            </div>
          </Reveal>
        </div>
        <Reveal delay={200}>
          <CodeCard file="backend/app/auth.py" lang="py" code={snippet} />
        </Reveal>
      </div>
    </section>
  );
}

function CtaFinal({ nav, sesion, panel }: { nav: (v: "login" | "api") => void; sesion: boolean; panel: () => void }) {
  return (
    <section className="border-b-[1.5px] border-ink bg-lime">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 md:flex-row md:items-center md:px-8 md:py-20">
        <Reveal>
          <h2 className="max-w-2xl font-display text-4xl font-bold leading-[1.03] tracking-tight text-pine3 md:text-6xl">
            ¿Listo para poner tu comunidad en orden?
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <div className="flex flex-wrap gap-3.5">
            {sesion ? (
              <Btn size="lg" onClick={panel}>Ir a mi panel <Icon name="arrow" size={16} /></Btn>
            ) : (
              <>
                <Btn size="lg" onClick={() => nav("login")}>Ingresar <Icon name="arrow" size={16} /></Btn>
                <Btn variant="ghost" size="lg" onClick={() => nav("api")}>Explorar la API</Btn>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer({ nav }: { nav: (v: "login" | "api") => void }) {
  return (
    <footer className="bg-ink py-14 text-paper">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-paper/60">
              La plataforma multi-tenant para administrar edificios y condominios: finanzas claras, comunidad conectada.
            </p>
          </div>
          {[
            { t: "Producto", l: [["Servicios", "#servicios"], ["Cómo funciona", "#como"], ["Planes", "#planes"]] as [string, string][] },
            { t: "Técnico", l: [["API en Python", "@api"]] as [string, string][] },
            { t: "Cuenta", l: [["Ingresar", "@login"]] as [string, string][] },
          ].map((col) => (
            <div key={col.t}>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-lime">{col.t}</p>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                {col.l.map(([txt, href]) => (
                  <li key={txt}>
                    {href.startsWith("@") ? (
                      <button className="text-paper/70 transition-colors hover:text-lime" onClick={() => nav(href.slice(1) as "login" | "api")}>{txt}</button>
                    ) : (
                      <a className="text-paper/70 transition-colors hover:text-lime" href={href}>{txt}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-paper/15 pt-6 font-mono text-[11.5px] text-paper/45 md:flex-row md:items-center">
          <p>© 2026 ComunApp SpA — Santiago de Chile</p>
          <p>FastAPI · PostgreSQL · JWT · React — hecho con rigor de contador y cariño de conserje</p>
        </div>
      </div>
    </footer>
  );
}

/* ── tarjeta de código reutilizable ── */
export function CodeCard({ file, lang, code, onCopy }: { file: string; lang: string; code: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("No se pudo copiar en este navegador.", "err");
    }
  };
  return (
    <div className="border-[1.5px] border-lime/50 bg-pine3 shadow-[6px_6px_0_0_rgb(201_240_77/0.25)]">
      <div className="flex items-center gap-3 border-b border-lime/25 px-4 py-2.5">
        <span className="flex gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-signal" />
          <i className="h-2.5 w-2.5 rounded-full bg-amber" />
          <i className="h-2.5 w-2.5 rounded-full bg-lime" />
        </span>
        <span className="truncate font-mono text-[11.5px] text-paper/70">{file}</span>
        <button onClick={copiar} className="ml-auto flex items-center gap-1.5 border border-paper/30 px-2 py-1 font-mono text-[10.5px] uppercase tracking-wide text-paper/70 transition-colors hover:border-lime hover:text-lime">
          <Icon name={copied ? "check" : "copy"} size={11} /> {copied ? "copiado" : "copiar"}
        </button>
      </div>
      <Code code={code} lang={lang} className="text-paper/90" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   DOCS · API Python / FastAPI
   ════════════════════════════════════════════════════════════ */

const ESTRUCTURA = `comunapp/
├─ backend/                      # FastAPI · Python 3.12
│  ├─ app/
│  │  ├─ main.py                 # instancia, CORS, routers
│  │  ├─ config.py               # pydantic-settings (.env)
│  │  ├─ db.py                   # AsyncSession + engine PostgreSQL
│  │  ├─ auth.py                 # JWT + require_roles() (RBAC)
│  │  ├─ models.py               # SQLAlchemy 2.0 multi-tenant
│  │  ├─ schemas.py              # Pydantic v2 (entrada/salida)
│  │  ├─ routers/
│  │  │  ├─ auth.py              # /api/auth/login · /me
│  │  │  ├─ admin.py             # superadmin: usuarios y parcelas
│  │  │  ├─ cobros.py            # generación, multas, recordatorios
│  │  │  ├─ pagos.py             # Mercado Pago: preferencia + webhook
│  │  │  ├─ finanzas.py          # movimientos, conciliación, reportes
│  │  │  ├─ avisos.py            # muro digital
│  │  │  ├─ reservas.py          # áreas comunes
│  │  │  ├─ votaciones.py        # asambleas digitales
│  │  │  └─ accesos.py           # bitácora de conserjería
│  │  └─ services/
│  │     ├─ mercado_pago.py      # SDK + verificación HMAC
│  │     └─ recordatorios.py     # APScheduler (morosos al día 5)
│  ├─ alembic/                   # migraciones versionadas
│  ├─ tests/                     # pytest + httpx
│  ├─ requirements.txt
│  └─ .env
└─ frontend/                     # este SPA (React + Vite)
   └─ consume /api vía fetch con Bearer token`;

const MODELS = `# backend/app/models.py
from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Rol(str, PyEnum):
    ADMIN = "ADMIN"
    COMITE = "COMITE"
    PROPIETARIO = "PROPIETARIO"
    ARRENDATARIO = "ARRENDATARIO"


class Parcela(Base):
    """Tenant: cada condominio es un universo aislado."""
    __tablename__ = "parcelas"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    nombre: Mapped[str] = mapped_column(String(120))
    direccion: Mapped[str] = mapped_column(String(200))
    ciudad: Mapped[str] = mapped_column(String(80))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    miembros = relationship("MiembroParcela", back_populates="parcela", cascade="all, delete-orphan")
    cobros = relationship("Cobro", back_populates="parcela", cascade="all, delete-orphan")


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    nombre: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))  # bcrypt
    es_superadmin: Mapped[bool] = mapped_column(Boolean, default=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class MiembroParcela(Base):
    """Un usuario puede pertenecer a N condominios, con un rol distinto en cada uno."""
    __tablename__ = "miembros_parcela"
    __table_args__ = (UniqueConstraint("parcela_id", "usuario_id", name="uq_miembro"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    parcela_id: Mapped[UUID] = mapped_column(ForeignKey("parcelas.id", ondelete="CASCADE"), index=True)
    usuario_id: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    rol: Mapped[Rol] = mapped_column(Enum(Rol))
    unidad: Mapped[str | None] = mapped_column(String(12))  # depto: A-42

    parcela = relationship("Parcela", back_populates="miembros")


class Cobro(Base):
    """Gasto común, multa o cobro extra. Nunca duplicado por unidad+periodo+tipo."""
    __tablename__ = "cobros"
    __table_args__ = (
        UniqueConstraint("parcela_id", "unidad", "periodo", "tipo", name="uq_cobro_periodo"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    parcela_id: Mapped[UUID] = mapped_column(ForeignKey("parcelas.id", ondelete="CASCADE"), index=True)
    unidad: Mapped[str] = mapped_column(String(12))
    concepto: Mapped[str] = mapped_column(String(140))
    periodo: Mapped[str] = mapped_column(String(7))          # "2026-02"
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    vencimiento: Mapped[date] = mapped_column(Date)
    estado: Mapped[str] = mapped_column(String(12), default="pendiente", index=True)
    tipo: Mapped[str] = mapped_column(String(16), default="gasto_comun")

    parcela = relationship("Parcela", back_populates="cobros")


class Pago(Base):
    __tablename__ = "pagos"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    parcela_id: Mapped[UUID] = mapped_column(ForeignKey("parcelas.id"), index=True)
    cobro_id: Mapped[UUID] = mapped_column(ForeignKey("cobros.id"), unique=True)
    usuario_id: Mapped[UUID] = mapped_column(ForeignKey("usuarios.id"))
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    metodo: Mapped[str] = mapped_column(String(30))          # "mercado_pago"
    mp_payment_id: Mapped[str | None] = mapped_column(String(40))
    comprobante: Mapped[str] = mapped_column(String(24), unique=True)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())`;

const AUTH = `# backend/app/auth.py
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import get_db
from .models import Rol, Usuario

pwd = CryptContext(schemes=["bcrypt"])
bearer = HTTPBearer()


def crear_token(usuario: Usuario, parcela_id: UUID | None, rol: str | None) -> str:
    """El JWT viaja con el condominio activo y el rol dentro de él."""
    return jwt.encode(
        {
            "sub": str(usuario.id),
            "parcela": str(parcela_id) if parcela_id else None,
            "rol": rol,
            "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        },
        settings.SECRET_KEY,
        algorithm="HS256",
    )


async def usuario_actual(
    cred: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> tuple[Usuario, UUID | None, str | None]:
    try:
        data = jwt.decode(cred.credentials, settings.SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Sesión expirada o inválida")
    u = await db.get(Usuario, UUID(data["sub"]))
    if u is None or not u.activo:
        raise HTTPException(401, "Cuenta inválida")
    parcela = UUID(data["parcela"]) if data["parcela"] else None
    return u, parcela, data["rol"]


def require_roles(*roles: Rol):
    """Barrera RBAC reutilizable por router."""
    async def chequear(dep=Depends(usuario_actual)):
        usuario, parcela_id, rol = dep
        if rol not in {r.value for r in roles}:
            raise HTTPException(403, "Tu rol no permite esta operación")
        return usuario, parcela_id, rol
    return chequear`;

const COBROS = `# backend/app/routers/cobros.py
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import require_roles
from ..db import get_db
from ..models import Cobro, MiembroParcela, Rol
from ..schemas import GenerarCobrosIn, GenerarCobrosOut

router = APIRouter(prefix="/api/cobros", tags=["cobros"])
AdminOComite = Depends(require_roles(Rol.ADMIN, Rol.COMITE))


@router.post("/generar", response_model=GenerarCobrosOut)
async def generar_cobros_mes(
    body: GenerarCobrosIn,
    ctx=AdminOComite,
    db: AsyncSession = Depends(get_db),
):
    _, parcela_id, _ = ctx
    propietarios = await db.scalars(
        select(MiembroParcela).where(
            MiembroParcela.parcela_id == parcela_id,
            MiembroParcela.rol == Rol.PROPIETARIO,
        )
    )
    creados = 0
    for m in propietarios:
        existe = await db.scalar(
            select(Cobro.id).where(
                Cobro.parcela_id == parcela_id,
                Cobro.unidad == m.unidad,
                Cobro.periodo == body.periodo,
                Cobro.tipo == "gasto_comun",
            )
        )
        if existe:
            continue  # idempotente: nunca duplica un periodo
        db.add(Cobro(parcela_id=parcela_id, unidad=m.unidad, concepto="Gastos comunes",
                     periodo=body.periodo, monto=body.monto, vencimiento=body.vencimiento))
        creados += 1
    await db.commit()
    return {"creados": creados, "periodo": body.periodo}`;

const PAGOS = `# backend/app/routers/pagos.py
import hashlib, hmac

from fastapi import APIRouter, Depends, HTTPException, Request
from mercadopago import SDK

from ..auth import require_roles, usuario_actual
from ..config import settings
from ..db import get_db
from ..models import Rol
from ..services.mercado_pago import acreditar_pago, crear_preferencia

router = APIRouter(prefix="/api/pagos", tags=["pagos"])
mp = SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)


@router.post("/preferencia")
async def preferencia(cobro_id: str, ctx=Depends(require_roles(Rol.PROPIETARIO, Rol.ARRENDATARIO)), db=Depends(get_db)):
    """El residente inicia el pago: se crea la preferencia en Mercado Pago."""
    _, parcela_id, _ = ctx
    init_point = await crear_preferencia(mp, cobro_id, parcela_id, db)
    return {"init_point": init_point}


@router.post("/mercadopago/webhook")
async def webhook(request: Request, db=Depends(get_db)):
    """Ruta pública, pero protegida por firma HMAC de Mercado Pago."""
    firma = request.headers.get("x-signature", "")
    cuerpo = await request.body()
    esperada = hmac.new(settings.MP_SECRET.encode(), cuerpo, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(firma, esperada):
        raise HTTPException(401, "Firma HMAC inválida")
    data = await request.json()
    if data.get("type") == "payment":
        await acreditar_pago(data["data"]["id"], db)  # cobro → pagado + movimiento
    return {"ok": True}`;

const MAIN = `# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import accesos, admin, auth, avisos, cobros, finanzas, pagos, reservas, votaciones

app = FastAPI(title="ComunApp API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, admin.router, cobros.router, pagos.router,
          finanzas.router, avisos.router, reservas.router,
          votaciones.router, accesos.router):
    app.include_router(r)`;

const REQ = `fastapi==0.115.*
uvicorn[standard]==0.32.*
sqlalchemy[asyncio]==2.0.*
asyncpg==0.30.*
alembic==1.14.*
pydantic==2.10.*
pydantic-settings==2.6.*
PyJWT==2.10.*
passlib[bcrypt]==1.7.*
mercadopago==2.2.*
apscheduler==3.10.*`;

const ENV = `DATABASE_URL=postgresql+asyncpg://comunapp:secreto@localhost:5432/comunapp
SECRET_KEY=cambia-esto-por-64-bytes-aleatorios
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
MERCADO_PAGO_PUBLIC_KEY=APP_USR-...
CORS_ORIGINS=https://comunapp.cl`;

const RUN = `# 1 · entorno virtual e instalación
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2 · migraciones (crea las tablas multi-tenant)
alembic upgrade head

# 3 · servidor de desarrollo en :8000
uvicorn app.main:app --reload

# 4 · frontend contra la API
cd frontend && npm run dev`;

export function ApiDocs({ back }: { back: () => void }) {
  const secciones = [
    { id: "estructura", n: "01", t: "Estructura del proyecto", d: "Backend FastAPI separado por routers y servicios; el frontend consume /api con Bearer token.", file: "árbol del repositorio", lang: "bash", code: ESTRUCTURA },
    { id: "modelos", n: "02", t: "Modelos relacionales (SQLAlchemy 2.0)", d: "Parcela es el tenant. Usuario se conecta a N parcelas mediante MiembroParcela con rol y unidad. El unique (parcela, unidad, periodo, tipo) hace idempotente la generación de cobros.", file: "backend/app/models.py", lang: "py", code: MODELS },
    { id: "auth", n: "03", t: "Autenticación y RBAC", d: "JWT con parcela_id y rol. La dependencia require_roles() protege cualquier endpoint; un 403 viaja antes de tocar la base de datos.", file: "backend/app/auth.py", lang: "py", code: AUTH },
    { id: "cobros", n: "04", t: "Rutas de cobranza", d: "Generación mensual idempotente, scoped a la parcela del token. Multas y recordatorios siguen el mismo patrón.", file: "backend/app/routers/cobros.py", lang: "py", code: COBROS },
    { id: "pagos", n: "05", t: "Pagos · Mercado Pago", d: "Preferencia por cobro para residentes y webhook público verificado por firma HMAC que acredita el pago y crea el movimiento contable.", file: "backend/app/routers/pagos.py", lang: "py", code: PAGOS },
    { id: "deploy", n: "06", t: "Puesta en marcha", d: "Arranque local con uvicorn, migraciones con Alembic y variables mínimas de entorno.", file: "comandos y configuración", lang: "bash", code: MAIN + "\n\n# ── requirements.txt ──\n" + REQ + "\n\n# ── .env ──\n" + ENV + "\n\n# ── ejecución ──\n" + RUN },
  ];
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-50 border-b-[1.5px] border-ink bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <button onClick={back} aria-label="Volver al sitio"><Logo /></button>
          <button onClick={back} className="flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-ink2 transition-colors hover:text-pine">
            ← volver al sitio
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <Reveal>
          <p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.24em] text-pine">— Documentación técnica</p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.04] tracking-tight text-ink md:text-6xl">
            ComunApp API: <span className="text-pine">Python, FastAPI</span> y aislamiento por parcela.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Python 3.12", "FastAPI async", "SQLAlchemy 2.0", "PostgreSQL", "JWT · RBAC", "Mercado Pago SDK", "Alembic"].map((c) => (
              <span key={c} className="border border-ink bg-card px-2.5 py-1 font-mono text-[11px] font-semibold text-ink2">{c}</span>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[230px_1fr]">
          <nav className="hidden lg:block">
            <div className="sticky top-24 space-y-1 border-l-[1.5px] border-ink pl-5">
              {secciones.map((s) => (
                <a key={s.id} href={"#" + s.id} className="group block py-1.5 font-mono text-[12px] text-ink2 transition-colors hover:text-pine">
                  <span className="text-pine">{s.n}</span> <span className="group-hover:underline">{s.t.split(" (")[0]}</span>
                </a>
              ))}
            </div>
          </nav>

          <div className="space-y-14">
            {secciones.map((s, i) => (
              <Reveal key={s.id} delay={Math.min(i * 60, 180)}>
                <section id={s.id} className="scroll-mt-24">
                  <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-mono text-[13px] font-bold text-pine">{s.n}</span>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">{s.t}</h2>
                  </div>
                  <p className="mb-4 max-w-2xl text-[14.5px] leading-relaxed text-ink2">{s.d}</p>
                  <CodeCard file={s.file} lang={s.lang} code={s.code} onCopy={() => toast(s.file + " copiado al portapapeles.")} />
                </section>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
