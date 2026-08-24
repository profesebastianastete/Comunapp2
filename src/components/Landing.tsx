import {
  ArrowRight, ArrowUpRight, BellRing, Building2, CheckCircle2, ClipboardCheck,
  DoorOpen, Home, Mail, MapPin, Megaphone, PieChart, ShieldCheck, Sparkles, Users, Vote, Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Btn, Field, Logo, Modal, Reveal, Spinner, toast } from "./ui";

/* ═══════════════════════ LANDING ═══════════════════════ */
export default function Landing({ entrar }: { entrar: () => void }) {
  const irA = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ── navbar fijo ── */}
      <header className="glass fixed inset-x-0 top-0 z-50 border-b border-line/70">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-8 px-5 md:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Inicio"><Logo /></button>
          <nav className="ml-auto hidden items-center gap-7 font-mono text-[11.5px] font-semibold uppercase tracking-[0.18em] text-ink2 md:flex">
            <button onClick={() => irA("comunidad")} className="transition-colors hover:text-pine">Tu comunidad</button>
            <button onClick={() => irA("servicios")} className="transition-colors hover:text-pine">Servicios</button>
            <button onClick={() => irA("planes")} className="transition-colors hover:text-pine">Planes</button>
          </nav>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <Btn variant="primary" size="md" onClick={entrar}>Entrar <ArrowRight size={15} /></Btn>
          </div>
        </div>
      </header>

      <Hero irA={irA} />
      <FranjaComunidad />
      <Servicios />
      <ComoFunciona />
      <Planes />
      <Footer entrar={entrar} />
    </div>
  );
}

/* ── hero ───────────────────────────────────────────────────── */
function Hero({ irA }: { irA: (id: string) => void }) {
  return (
    <section className="dotgrid glow-hero relative overflow-hidden pb-20 pt-[128px]">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 md:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* texto */}
        <div>
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-pine/20 bg-card px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-pine shadow-soft">
              <Sparkles size={13} className="text-neon2" /> Administración de comunidades
            </p>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="mt-6 font-display text-[clamp(2.7rem,6vw,4.6rem)] font-bold leading-[0.98] tracking-tight">
              Tu comunidad,<br />
              administrada{" "}
              <span className="relative inline-block -rotate-1 bg-neon px-3 text-deep shadow-neon">
                en orden.
                <svg viewBox="0 0 120 8" className="absolute -bottom-1 left-2 w-[85%]" fill="none" stroke="#0c3b2e" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <path d="M3 5c25-3 60-3 114-1" className="draw-line" style={{ ["--dash" as never]: 130 }} />
                </svg>
              </span>
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink2">
              Centraliza pagos, reservas y comunicación. <strong className="text-ink">ComunApp</strong> simplifica la vida con tus vecinos.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Btn variant="neon" size="lg" onClick={() => irA("planes")}>Crea tu comunidad <ArrowRight size={17} /></Btn>
              <Btn variant="ghost" size="lg" onClick={() => irA("servicios")}>Ver servicios</Btn>
            </div>
          </Reveal>
        </div>

        {/* panel flotante "Tus Pagos" */}
        <Reveal dir="right" delay={200}>
          <PanelTusPagos />
        </Reveal>
      </div>
    </section>
  );
}

function PanelTusPagos() {
  const [pagando, setPagando] = useState<string | null>(null);
  const [pagados, setPagados] = useState<string[]>(["pagos-mes"]);

  const pagar = (id: string) => {
    if (pagados.includes(id) || pagando) return;
    setPagando(id);
    setTimeout(() => {
      setPagados((xs) => [...xs, id]);
      setPagando(null);
      toast("Pago simulado con éxito. Así de fácil será para tus vecinos.");
    }, 1600);
  };

  const items = [
    { id: "pagos-mes", nombre: "Pagos del mes", detalle: "Marzo · Parcela P-14", monto: 55000 },
    { id: "cuota", nombre: "Cuota portón eléctrico", detalle: "Cuota 2 de 3", monto: 30000 },
    { id: "multa", nombre: "Multa · estacionamiento", detalle: "Registrada por el comité", monto: 15000 },
  ];
  const pendiente = items.filter((i) => !pagados.includes(i.id)).reduce((a, i) => a + i.monto, 0);

  return (
    <div className="relative mx-auto max-w-md lg:ml-auto">
      {/* tarjetas de fondo */}
      <div className="absolute -left-8 top-10 hidden -rotate-6 rounded-2xl border border-line bg-card/80 p-4 shadow-soft backdrop-blur sm:block float-b" aria-hidden>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink3">Recaudación del mes</p>
        <p className="mt-1 font-display text-2xl font-bold text-pine">82%</p>
        <div className="mt-2 h-2 w-36 overflow-hidden rounded-full bg-paper">
          <div className="bar-x h-full rounded-full bg-neon" style={{ width: "82%" }} />
        </div>
      </div>
      <div className="absolute -right-6 -top-7 z-10 hidden rotate-3 items-center gap-2.5 rounded-2xl border border-line bg-card px-4 py-3 shadow-soft sm:flex float-c" aria-hidden>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-neon/30 text-pine"><Vote size={17} /></span>
        <div>
          <p className="text-[12.5px] font-semibold leading-tight text-ink">Asamblea abierta</p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink3">Iluminación LED · 12 votos</p>
        </div>
      </div>

      {/* panel principal */}
      <div className="relative z-[5] rounded-[22px] border border-line bg-card p-6 shadow-lift float-a">
        <div className="flex items-center justify-between border-b border-dashed border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-pine text-neon"><Wallet size={20} /></span>
            <div>
              <p className="font-display text-lg font-bold leading-none text-ink">Tus Pagos</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">Parcela P-14 · Los Álamos</p>
            </div>
          </div>
          <span className="rounded-full bg-neon/25 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-pine">Al día</span>
        </div>

        <p className="mt-4 font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink3">Pagos del mes</p>
        <ul className="mt-2 space-y-2.5">
          {items.map((i) => {
            const pagado = pagados.includes(i.id);
            return (
              <li key={i.id} className={"flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all " + (pagado ? "border-neon2/50 bg-neon/10" : "border-line bg-paper/60 hover:border-pine/40")}>
                <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-lg " + (pagado ? "bg-neon text-deep" : "bg-card text-ink3 border border-line")}>
                  {pagado ? <CheckCircle2 size={16} /> : <Wallet size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{i.nombre}</p>
                  <p className="truncate font-mono text-[10px] uppercase tracking-wide text-ink3">{i.detalle}</p>
                </div>
                <p className="tnum font-mono text-[13px] font-bold text-ink">{"$" + i.monto.toLocaleString("es-CL")}</p>
                {pagado ? (
                  <span className="font-mono text-[10px] font-bold uppercase text-pine">Pagado</span>
                ) : (
                  <button onClick={() => pagar(i.id)} disabled={pagando !== null} className="rounded-lg bg-pine px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-pine2 disabled:opacity-60">
                    {pagando === i.id ? <Spinner className="h-3 w-3" /> : "Pagar"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-pine px-4 py-3.5 text-white">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-neon">Total pendiente</p>
            <p className="tnum font-display text-xl font-bold">{"$" + pendiente.toLocaleString("es-CL")}</p>
          </div>
          <Btn variant="neon" size="sm" onClick={() => pagar(items.find((i) => !pagados.includes(i.id))?.id ?? "")} disabled={pendiente === 0 || pagando !== null}>
            {pendiente === 0 ? <>Todo pagado <CheckCircle2 size={14} /></> : <>Pagar todo <ArrowRight size={14} /></>}
          </Btn>
        </div>
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">Pago seguro con Mercado Pago</p>
      </div>

      <div className="absolute -bottom-6 left-6 z-10 hidden items-center gap-2.5 rounded-2xl border border-line bg-card px-4 py-3 shadow-soft sm:flex float-b" aria-hidden>
        <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-amber/20 text-[#8a6114]"><DoorOpen size={17} /></span>
        <div>
          <p className="text-[12.5px] font-semibold leading-tight text-ink">Visita registrada</p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink3">Portón norte · 10:42</p>
        </div>
      </div>
    </div>
  );
}

/* ── franja comunidad (roles) ───────────────────────────────── */
function FranjaComunidad() {
  return (
    <section id="comunidad" className="border-y border-line bg-card py-5 scroll-mt-24">
      <div className="mask-fade-x overflow-hidden">
        <div className="marquee flex w-max items-center gap-10 whitespace-nowrap font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-ink2">
          {[0, 1].map((k) => (
            <span key={k} className="flex items-center gap-10">
              {["Pagos del mes en línea", "Reserva de quincho y salas", "Asambleas con voto digital", "Muro de avisos", "Control de visitas", "Transparencia total", "Cobranza automática", "Tu comunidad en orden"].map((t) => (
                <span key={t} className="flex items-center gap-10">
                  <span>{t}</span><Sparkles size={13} className="text-neon2" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── servicios ──────────────────────────────────────────────── */
const SERVICIOS = [
  { icon: PieChart, titulo: "Transparencia financiera", texto: "Cada ingreso y gasto a la vista de todos. Confianza que se nota.", tag: "El corazón de ComunApp" },
  { icon: Wallet, titulo: "Cobranza inteligente", texto: "Recibe pagos del mes, cuotas y multas automáticamente. Todo en línea.", tag: "Dinero en orden" },
  { icon: Vote, titulo: "Asambleas y votaciones", texto: "Decisiones de la comunidad con votos digitales, trazables y al instante.", tag: "Participación" },
  { icon: Megaphone, titulo: "Muro de avisos", texto: "Noticias, mantenciones y emergencias. Todos los vecinos informados a tiempo.", tag: "Comunicación" },
];
function Servicios() {
  const [destacado, ...resto] = SERVICIOS;
  return (
    <section id="servicios" className="dotgrid-soft relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-pine2">— Servicios</p>
              <h2 className="mt-3 max-w-2xl font-display text-[clamp(2rem,4.4vw,3.4rem)] font-bold leading-[1.02] tracking-tight">
                Todo lo que tu comunidad necesita. <span className="text-pine2">Nada que sobre.</span>
              </h2>
            </div>
            <p className="max-w-xs border-l-2 border-neon pl-4 text-[14px] leading-relaxed text-ink2">
              Cuatro herramientas que trabajan juntas, para que administrar deje de ser una tarea de fin de semana.
            </p>
          </div>
        </Reveal>

        <div className="relative mt-14 space-y-5">
          {/* tarjeta destacada: transparencia financiera primero */}
          <Reveal>
            <article className="group relative overflow-hidden rounded-3xl border border-pine bg-pine text-white shadow-lift transition-shadow duration-300 hover:shadow-[0_36px_80px_-24px_rgba(12,59,46,0.55)]">
              <div className="dotgrid-dark pointer-events-none absolute inset-0" />
              <div className="relative grid gap-10 p-8 md:p-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-neon px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-deep">
                    <Sparkles size={12} /> {destacado.tag}
                  </span>
                  <div className="mt-6 flex items-center gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-neon text-deep shadow-neon transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                      <destacado.icon size={26} />
                    </span>
                    <h3 className="font-display text-[clamp(1.7rem,3vw,2.5rem)] font-bold leading-tight tracking-tight">{destacado.titulo}</h3>
                  </div>
                  <p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-paper/80">{destacado.texto}</p>
                  <ul className="mt-6 space-y-2.5">
                    {["Reporte mensual descargable para toda la comunidad", "Cada gasto registrado exige su motivo", "Fondo de reserva siempre a la vista"].map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-[13.5px] text-paper/85">
                        <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-neon/20 text-neon"><CheckCircle2 size={11} strokeWidth={3} /></span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* mini libro de cuentas en vivo */}
                <div className="rounded-2xl border border-white/15 bg-deep/45 p-6 backdrop-blur-sm">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neon">Libro de la comunidad · marzo</p>
                  <ul className="mt-4 space-y-1">
                    {[
                      { d: "Recaudación del mes", m: "+ $220.000", ok: true },
                      { d: "Electricidad áreas comunes", m: "− $46.500", ok: false, motivo: "Servicios" },
                      { d: "Poda y jardinería", m: "− $85.000", ok: false, motivo: "Mantención" },
                      { d: "Conserjería y guardia", m: "− $140.000", ok: false, motivo: "Personal" },
                    ].map((r, i) => (
                      <li key={r.d} className="ledger flex items-center justify-between gap-3 py-2.5 !border-white/10">
                        <div>
                          <p className="text-[13px] font-semibold text-paper">{r.d}</p>
                          {r.motivo && <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/40">motivo: {r.motivo}</p>}
                        </div>
                        <span className={"bar-x tnum shrink-0 rounded-md px-2 py-1 font-mono text-[12px] font-bold " + (r.ok ? "bg-neon/15 text-neon" : "bg-white/5 text-paper/75")} style={{ animationDelay: i * 120 + "ms" }}>
                          {r.m}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div className="bar-x h-full rounded-full bg-neon" style={{ width: "62%", animationDelay: "0.5s" }} />
                  </div>
                  <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">62% de la recaudación ya rendida</p>
                </div>
              </div>
            </article>
          </Reveal>

          {/* resto de servicios */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resto.map((s, i) => (
              <Reveal key={s.titulo} delay={(i % 3) * 110}>
                <article className="group relative h-full rounded-2xl border border-line bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-pine2/50 hover:shadow-lift">
                  <span className="absolute right-6 top-6 rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink3 transition-colors group-hover:border-neon2 group-hover:bg-neon/20 group-hover:text-pine">{s.tag}</span>
                  <span className="grid h-13 w-13 place-items-center rounded-2xl bg-pine text-neon shadow-soft transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" style={{ height: 52, width: 52 }}>
                    <s.icon size={24} />
                  </span>
                  <h3 className="mt-5 font-display text-[21px] font-bold tracking-tight text-ink">{s.titulo}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink2">{s.texto}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-pine2 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                    Incluido en tu plan <ArrowUpRight size={13} />
                  </span>
                  <span className="absolute bottom-0 left-7 h-[3px] w-0 rounded-full bg-neon transition-all duration-300 group-hover:w-16" />
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── cómo funciona ──────────────────────────────────────────── */
const PASOS = [
  { n: "01", titulo: "Configura tu espacio y tu equipo", texto: "El administrador crea la comunidad y sus unidades en pocos pasos. Toda la información queda segura y organizada desde el primer día." },
  { n: "02", titulo: "Tu comunidad siempre conectada", texto: "Tus vecinos pagan su mensualidad, reservan espacios y votan directamente desde su teléfono. Tú mantienes toda la gestión bajo control." },
  { n: "03", titulo: "El dinero directo en tu cuenta", texto: "Recibe los ingresos de forma íntegra e inmediata. Sin retenciones ni demoras, el dinero va directo a tu cuenta." },
];
function ComoFunciona() {
  return (
    <section id="como" className="border-t border-line bg-card py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-pine2">— Cómo funciona</p>
          <h2 className="mt-3 max-w-3xl font-display text-[clamp(2rem,4.4vw,3.4rem)] font-bold leading-[1.02] tracking-tight">
            De la gestión manual a la simplicidad <span className="relative inline-block">en tres pasos.<span className="absolute -bottom-1 left-0 h-[5px] w-full rounded-full bg-neon" /></span>
          </h2>
        </Reveal>

        <div className="relative mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
          <span className="absolute left-[16%] right-[16%] top-[52px] hidden border-t-2 border-dashed border-pine2/30 lg:block" aria-hidden />
          {PASOS.map((p, i) => (
            <Reveal key={p.n} delay={i * 140}>
              <div className="relative">
                <span className="relative z-[2] grid h-[52px] w-[52px] place-items-center rounded-2xl border-2 border-pine bg-neon font-display text-lg font-bold text-deep shadow-soft">
                  {p.n}
                </span>
                <h3 className="mt-5 font-display text-[22px] font-bold tracking-tight text-ink">{p.titulo}</h3>
                <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-ink2">{p.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* panel de roles */}
        <Reveal delay={160}>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              { icon: Home, titulo: "Tu Espacio", texto: "Cada parcela o unidad con su cuenta, sus pagos y su historial.", chip: "Vecinos" },
              { icon: Users, titulo: "Equipo Administrador", texto: "Administrador y comité trabajando sobre la misma información.", chip: "Gestión" },
              { icon: Vote, titulo: "Votación de Vecinos", texto: "Asambleas digitales donde cada unidad vale un voto.", chip: "Decisiones" },
            ].map((r, i) => (
              <div key={r.titulo} className={"card-in flex items-start gap-4 rounded-2xl border border-line p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift " + (i === 1 ? "bg-pine text-white border-pine" : "bg-paper/60")} style={{ ["--ci-delay" as never]: i * 120 + "ms" }}>
                <span className={"grid h-12 w-12 shrink-0 place-items-center rounded-xl " + (i === 1 ? "bg-neon text-deep" : "bg-card text-pine border border-line")}>
                  <r.icon size={22} />
                </span>
                <div>
                  <p className={"flex items-center gap-2 font-display text-lg font-bold tracking-tight " + (i === 1 ? "text-white" : "text-ink")}>
                    {r.titulo}
                    <span className={"rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] " + (i === 1 ? "bg-neon/25 text-neon" : "bg-neon/30 text-pine")}>{r.chip}</span>
                  </p>
                  <p className={"mt-1 text-[13.5px] leading-relaxed " + (i === 1 ? "text-white/70" : "text-ink2")}>{r.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── planes ─────────────────────────────────────────────────── */
const FEATURES: Record<string, string[]> = {
  PARCELAS: ["Unidades ilimitadas", "Cobranza con Mercado Pago", "Importación de comunidades", "Transparencia financiera", "Asambleas y votaciones", "Soporte prioritario"],
  CUSTOM: ["Soporte Premium", "Integraciones personalizadas", "Capacitación al equipo", "Gerente de cuenta dedicado", "Y mucho más"],
};
function Planes() {
  const [cotiza, setCotiza] = useState(false);

  return (
    <section id="planes" className="dotgrid-soft relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <div className="text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-pine2">— Planes</p>
            <h2 className="mx-auto mt-3 max-w-2xl font-display text-[clamp(2rem,4.4vw,3.4rem)] font-bold leading-[1.02] tracking-tight">
              Precios simples, <span className="text-pine2">sin letra chica.</span>
            </h2>
          </div>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 lg:grid-cols-2">
          {/* Comunidades (destacado) */}
          <Reveal delay={0}>
            <PlanCard
              destacado prefijo="desde" nombre="Comunidades" precio="$29.900" periodo="/ mes"
              texto="Para parcelaciones y comunidades que quieren todo en orden."
              features={FEATURES.PARCELAS} entrar={() => setCotiza(true)} btn="Elegir este plan"
            />
          </Reveal>
          {/* Personalizado */}
          <Reveal delay={260}>
            <PlanCard nombre="Personalizado" precio="A medida" periodo="" texto="Para comunidades con necesidades específicas. Soporte Premium, integraciones personalizadas y más." features={FEATURES.CUSTOM} entrar={() => setCotiza(true)} btn="Conversemos" />
          </Reveal>
        </div>

        {/* botón crítico */}
        <Reveal delay={200}>
          <div className="mt-12 text-center">
            <button
              onClick={() => setCotiza(true)}
              className="group inline-flex w-full max-w-xl items-center justify-center gap-3 rounded-2xl bg-neon px-10 py-6 font-display text-[clamp(1.15rem,2.6vw,1.7rem)] font-bold uppercase tracking-wide text-deep shadow-neon transition-all duration-200 hover:-translate-y-1 hover:bg-neon2 hover:shadow-[0_20px_50px_-10px_rgba(183,236,60,0.8)] active:translate-y-0"
            >
              Cotiza tu plan a la medida
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-deep text-neon transition-transform duration-200 group-hover:translate-x-1.5"><ArrowRight size={19} /></span>
            </button>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink3">Respuesta en menos de 24 horas · sin compromiso</p>
          </div>
        </Reveal>
      </div>

      <ModalCotizar open={cotiza} onClose={() => setCotiza(false)} />
    </section>
  );
}

function PlanCard({
  nombre, precio, periodo, texto, features, entrar, btn, destacado = false, prefijo,
}: { nombre: string; precio: string; periodo: string; texto: string; features: string[]; entrar: () => void; btn: string; destacado?: boolean; prefijo?: string }) {
  return (
    <article
      className={
        "relative flex h-full flex-col rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1.5 " +
        (destacado
          ? "border-pine bg-pine text-white shadow-lift lg:-translate-y-3 lg:hover:-translate-y-4"
          : "border-line bg-card shadow-soft hover:shadow-lift")
      }
    >
      <h3 className={"font-display text-xl font-bold tracking-tight " + (destacado ? "text-neon" : "text-ink")}>{nombre}</h3>
      <p className={"mt-1 text-[13px] leading-relaxed " + (destacado ? "text-white/70" : "text-ink2")}>{texto}</p>
      <p className="mt-5 flex items-baseline gap-2">
        {prefijo && <span className={"font-mono text-[11px] font-bold uppercase tracking-[0.14em] " + (destacado ? "text-neon" : "text-pine2")}>{prefijo}</span>}
        <span className={"font-display text-[38px] font-bold leading-none tracking-tight " + (destacado ? "text-white" : "text-pine")}>{precio}</span>
        {periodo && <span className={"font-mono text-[11px] uppercase tracking-wide " + (destacado ? "text-white/50" : "text-ink3")}>{periodo}</span>}
      </p>
      <ul className={"mt-6 flex-1 space-y-2.5 border-t pt-6 " + (destacado ? "border-white/15" : "border-line")}>
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-snug">
            <CheckCircle2 size={16} className={"mt-0.5 shrink-0 " + (destacado ? "text-neon" : "text-pine2")} />
            <span className={destacado ? "text-white/85" : "text-ink2"}>{f}</span>
          </li>
        ))}
      </ul>
      <Btn variant={destacado ? "neon" : "outline"} className="mt-7 w-full" onClick={entrar}>{btn} <ArrowRight size={15} /></Btn>
    </article>
  );
}

function ModalCotizar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [form, setForm] = useState({ nombre: "", comunidad: "", unidades: "30", correo: "" });

  const enviar = () => {
    if (!form.nombre || !form.comunidad || !form.correo.includes("@")) {
      toast("Completa tu nombre, el de tu comunidad y un correo válido.", "warn");
      return;
    }
    setEnviando(true);
    // Abre el correo del usuario con la cotización dirigida a contacto@comunapp.cl
    const asunto = encodeURIComponent("Cotización ComunApp · " + form.comunidad);
    const cuerpo = encodeURIComponent(
      "Hola, quiero cotizar un plan a la medida.\n\n" +
      "· Nombre: " + form.nombre + "\n" +
      "· Comunidad: " + form.comunidad + "\n" +
      "· Unidades aproximadas: " + form.unidades + "\n" +
      "· Correo de contacto: " + form.correo + "\n",
    );
    window.setTimeout(() => {
      window.location.href = "mailto:contacto@comunapp.cl?subject=" + asunto + "&body=" + cuerpo;
    }, 700);
    setTimeout(() => {
      setEnviando(false);
      setListo(true);
    }, 1200);
  };

  return (
    <Modal open={open} onClose={() => { onClose(); setTimeout(() => setListo(false), 300); }} title="Cotiza tu plan a la medida">
      {listo ? (
        <div className="py-6 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-neon/30 text-pine"><CheckCircle2 size={32} /></span>
          <h4 className="mt-5 font-display text-2xl font-bold text-ink">¡Recibido, {form.nombre.split(" ")[0]}!</h4>
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink2">
            Abrimos tu correo con la solicitud para <strong>contacto@comunapp.cl</strong> — solo presiona enviar. Te responderemos a <strong>{form.correo}</strong> en menos de 24 horas.
          </p>
          <Btn variant="primary" className="mt-6" onClick={() => { onClose(); setTimeout(() => setListo(false), 300); }}>Perfecto</Btn>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tu nombre"><input className="field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Camila Órdenes" /></Field>
            <Field label="Nombre de tu comunidad"><input className="field" value={form.comunidad} onChange={(e) => setForm({ ...form, comunidad: e.target.value })} placeholder="Ej: Los Álamos" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unidades aproximadas"><input className="field" type="number" min={1} value={form.unidades} onChange={(e) => setForm({ ...form, unidades: e.target.value })} /></Field>
            <Field label="Correo de contacto"><input className="field" type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} placeholder="tu@correo.cl" /></Field>
          </div>
          <div className="flex justify-end gap-2.5 border-t border-line pt-4">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn variant="neon" onClick={enviar} disabled={enviando}>{enviando ? <Spinner /> : <>Enviar cotización <ArrowRight size={15} /></>}</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── footer ─────────────────────────────────────────────────── */
function Footer({ entrar }: { entrar: () => void }) {
  return (
    <footer className="dotgrid-dark bg-deep pb-10 pt-16 text-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Logo dark />
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-white/60">
              Tu comunidad, administrada en orden. Pagos del mes, reservas, votaciones y comunicación en un solo lugar.
            </p>
            <Btn variant="neon" className="mt-6" onClick={entrar}>Entrar a mi comunidad <ArrowRight size={15} /></Btn>
          </div>
          <div>
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-neon">Servicios</p>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-white/70">
              {SERVICIOS.map((s) => <li key={s.titulo} className="transition-colors hover:text-neon">{s.titulo}</li>)}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-neon">Contacto</p>
            <ul className="mt-4 space-y-3 text-[13.5px] text-white/70">
              <li>
                <a href="mailto:contacto@comunapp.cl" className="group flex items-center gap-2.5 transition-colors hover:text-neon">
                  <Mail size={15} className="text-neon" /> contacto@comunapp.cl
                </a>
              </li>
              <li className="flex items-center gap-2.5"><MapPin size={15} className="text-neon" /> Puerto Varas, Región de los Lagos</li>
              <li className="flex items-center gap-2.5"><ShieldCheck size={15} className="text-neon" /> Datos protegidos, siempre</li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40">
          <span>© {new Date().getFullYear()} ComunApp — hecho con cariño para las comunidades</span>
          <span className="flex items-center gap-2"><Building2 size={13} className="text-neon" /> Puerto Varas · Región de los Lagos · Chile</span>
        </div>
      </div>
    </footer>
  );
}
