import { useEffect, useState } from "react";
import Architecture from "./components/Architecture";
import Deliverables from "./components/Deliverables";
import Demo from "./components/Demo";
import { Icon, Reveal, Stamp, useDecode } from "./components/ui";
import { TICKER_ITEMS } from "./lib/data";

/* ── navegación superior + progreso de scroll ────────────────── */
function TopNav() {
  const [sp, setSp] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setSp(max > 0 ? window.scrollY / max : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const links = [
    { href: "#plano", label: "El plano" },
    { href: "#entregables", label: "Entregables" },
    { href: "#prototipo", label: "Prototipo" },
    { href: "#rbac", label: "RBAC" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line-400/20 bg-ink-950/92 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-5 px-5 md:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center bg-amber-acc text-ink-950">
            <Icon name="building" size={18} strokeWidth={2} />
          </span>
          <span className="font-display text-lg uppercase tracking-wide text-paper-100">
            Condo<span className="text-amber-acc">/</span>OS
          </span>
        </a>
        <nav className="ml-auto hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group font-mono text-[11px] uppercase tracking-[0.18em] text-ink-200 transition-colors hover:text-amber-acc"
            >
              <span className="mr-1 text-amber-acc/70 group-hover:text-amber-acc">+</span>
              {l.label}
            </a>
          ))}
        </nav>
        <span className="ml-auto border border-line-400/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-line-300 md:ml-6">
          REV 1.0
        </span>
      </div>
      <div
        className="scroll-progress h-[2px] w-full bg-amber-acc"
        style={{ ["--sp" as never]: sp }}
      />
    </header>
  );
}

/* ── alzado del edificio (lámina de dibujo animada) ──────────── */
function Elevation() {
  const D = (ms: number) => ({ ["--draw-delay" as never]: ms + "ms" });
  const hatch = Array.from({ length: 26 }, (_, i) => i);
  const litWindows: [number, number, number][] = [
    [124, 138, 0], [166, 216, 0.7], [208, 164, 1.4],
    [145, 268, 0.4], [229, 294, 1.1], [166, 346, 1.8],
  ];
  return (
    <div className="relative border-2 border-line-400/50 bg-ink-950/60 p-4 md:p-5">
      <span className="absolute -left-px -top-px h-5 w-5 border-l-2 border-t-2 border-amber-acc" />
      <span className="absolute -right-px -top-px h-5 w-5 border-r-2 border-t-2 border-amber-acc" />
      <span className="absolute -bottom-px -left-px h-5 w-5 border-b-2 border-l-2 border-amber-acc" />
      <span className="absolute -bottom-px -right-px h-5 w-5 border-b-2 border-r-2 border-amber-acc" />
      <Stamp text="Para construcción" className="absolute -top-4 right-6 border-amber-acc bg-ink-950/90 text-amber-acc" />

      <svg viewBox="0 0 440 484" className="w-full" role="img" aria-label="Alzado del condominio Torres del Parque">
        {/* grúa */}
        <g className="crane-sway" style={{ transformOrigin: "56px 436px" }}>
          <line x1="56" y1="436" x2="56" y2="84" className="draw-line" pathLength={1} style={D(300)} stroke="#6f9cd4" strokeWidth="1.4" />
          <line x1="56" y1="84" x2="196" y2="84" className="draw-line" pathLength={1} style={D(500)} stroke="#6f9cd4" strokeWidth="1.2" />
          <line x1="56" y1="84" x2="24" y2="84" className="draw-line" pathLength={1} style={D(600)} stroke="#6f9cd4" strokeWidth="1.2" />
          <line x1="56" y1="62" x2="130" y2="84" className="draw-line" pathLength={1} style={D(700)} stroke="#6f9cd4" strokeWidth="0.8" />
          <line x1="56" y1="62" x2="30" y2="84" className="draw-line" pathLength={1} style={D(750)} stroke="#6f9cd4" strokeWidth="0.8" />
          <line x1="56" y1="84" x2="56" y2="62" className="draw-line" pathLength={1} style={D(650)} stroke="#6f9cd4" strokeWidth="1" />
          <rect x="18" y="84" width="16" height="12" className="draw-line" pathLength={1} style={D(800)} stroke="#ffb020" fill="rgba(255,176,32,0.12)" />
          <line x1="156" y1="84" x2="156" y2="150" className="draw-line" pathLength={1} style={D(900)} stroke="#a8c4e6" strokeWidth="0.8" />
          <path d="M150 150h12l-6 9z" className="draw-line" pathLength={1} style={D(1000)} stroke="#ffb020" fill="none" />
        </g>

        {/* torre A */}
        <rect x="110" y="96" width="150" height="340" className="draw-line" pathLength={1} style={D(100)} stroke="#93c5fd" strokeWidth="1.5" fill="rgba(31,74,133,0.18)" />
        <rect x="150" y="76" width="42" height="20" className="draw-line" pathLength={1} style={D(250)} stroke="#6f9cd4" strokeWidth="1" fill="none" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={"v" + i} x1={131 + i * 21} y1="110" x2={131 + i * 21} y2="422" className="draw-line" pathLength={1} style={D(350 + i * 60)} stroke="#3d6aa8" strokeWidth="0.6" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <line key={"h" + i} x1="122" y1={122 + i * 28} x2="248" y2={122 + i * 28} className="draw-line" pathLength={1} style={D(380 + i * 45)} stroke="#3d6aa8" strokeWidth="0.6" />
        ))}
        {litWindows.map(([x, y, d], i) => (
          <rect key={"w" + i} x={x} y={y} width="17" height="21" fill="#ffb020" opacity="0.75" className="window-lit" style={{ ["--glow-delay" as never]: d + "s" }} />
        ))}

        {/* sala común */}
        <rect x="260" y="316" width="112" height="120" className="draw-line" pathLength={1} style={D(450)} stroke="#93c5fd" strokeWidth="1.2" fill="rgba(31,74,133,0.12)" />
        <rect x="296" y="376" width="34" height="60" className="draw-line" pathLength={1} style={D(650)} stroke="#ffb020" strokeWidth="1" fill="rgba(255,176,32,0.08)" />
        <line x1="260" y1="340" x2="372" y2="340" className="draw-line" pathLength={1} style={D(700)} stroke="#3d6aa8" strokeWidth="0.6" />

        {/* línea de terreno + achurado */}
        <line x1="16" y1="436" x2="424" y2="436" className="draw-line" pathLength={1} style={D(50)} stroke="#93c5fd" strokeWidth="1.8" />
        {hatch.map((i) => (
          <line key={"g" + i} x1={20 + i * 15.5} y1="436" x2={12 + i * 15.5} y2="446" className="draw-line" pathLength={1} style={D(150 + i * 18)} stroke="#3d6aa8" strokeWidth="0.7" />
        ))}

        {/* cota de altura */}
        <line x1="92" y1="96" x2="92" y2="436" className="draw-line" pathLength={1} style={D(850)} stroke="#6f9cd4" strokeWidth="0.8" />
        <line x1="86" y1="96" x2="98" y2="96" className="draw-line" pathLength={1} style={D(900)} stroke="#6f9cd4" strokeWidth="0.8" />
        <line x1="86" y1="436" x2="98" y2="436" className="draw-line" pathLength={1} style={D(920)} stroke="#6f9cd4" strokeWidth="0.8" />
        <text x="84" y="270" className="fade-late" style={D(1300)} fill="#a8c4e6" fontSize="9" fontFamily="var(--font-mono)" transform="rotate(-90 84 270)">
          54.0 m · 18 NIVELES
        </text>

        {/* ejes */}
        {[
          { x: 110, l: "A" }, { x: 185, l: "B" }, { x: 260, l: "C" }, { x: 372, l: "D" },
        ].map((e, i) => (
          <g key={e.l}>
            <line x1={e.x} y1="446" x2={e.x} y2="456" className="draw-line" pathLength={1} style={D(950 + i * 60)} stroke="#6f9cd4" strokeWidth="0.8" strokeDasharray="3 3" />
            <circle cx={e.x} cy="466" r="8" className="draw-line" pathLength={1} style={D(1050 + i * 60)} stroke="#93c5fd" strokeWidth="1" fill="none" />
            <text x={e.x} y="469" textAnchor="middle" className="fade-late" style={D(1400 + i * 80)} fill="#ffb020" fontSize="8.5" fontFamily="var(--font-mono)">{e.l}</text>
          </g>
        ))}

        {/* norte + rótulos */}
        <circle cx="404" cy="42" r="15" className="draw-line" pathLength={1} style={D(1100)} stroke="#6f9cd4" strokeWidth="0.9" fill="none" />
        <path d="M404 52V32m0 0l-5 8m5-8l5 8" className="draw-line" pathLength={1} style={D(1200)} stroke="#ffb020" strokeWidth="1" fill="none" />
        <text x="118" y="90" className="fade-late" style={D(1500)} fill="#a8c4e6" fontSize="9" letterSpacing="2" fontFamily="var(--font-mono)">TORRE A · 96 UNIDADES</text>
        <text x="264" y="310" className="fade-late" style={D(1600)} fill="#a8c4e6" fontSize="8.5" letterSpacing="2" fontFamily="var(--font-mono)">QUINCHO + SALA</text>
      </svg>

      <p className="mt-3 border-t border-line-400/20 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
        Fig. 0 · Caso de estudio: <span className="text-amber-acc">torres-del-parque</span> · slug del tenant en la URL
      </p>
    </div>
  );
}

/* ── apertura tipo lámina de dibujo ──────────────────────────── */
function Hero() {
  const decoded = useDecode("MULTI-TENANT");
  return (
    <section id="top" className="bg-blueprint relative overflow-hidden pb-14 pt-24 md:pt-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14">
          <div>
            <Reveal>
              <p className="mb-5 inline-flex items-center gap-3 border border-line-400/40 bg-ink-950/60 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.24em] text-line-300">
                <Icon name="crane" size={14} className="text-amber-acc" />
                Lámina A-01 · Arquitectura de software · 2026
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="font-display uppercase leading-[0.88] text-paper-100">
                <span className="line-mask block text-[19vw] sm:text-7xl md:text-8xl lg:text-[92px]">
                  <span>Condo<span className="text-amber-acc">/</span>OS</span>
                </span>
                <span className="mt-2 block font-mono text-xl font-semibold tracking-[0.14em] text-amber-acc sm:text-2xl md:text-3xl">
                  {decoded || "\u00A0"}
                  <span className="caret-blink text-line-300">▊</span>
                </span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-paper-200">
                Plano completo para administrar <strong className="text-paper-50">edificios y condominios</strong>:
                cobranza y contabilidad, muro de avisos, reservas, asambleas digitales y control de acceso —
                con cada condominio como una <strong className="text-amber-acc">Parcela aislada</strong> y cuatro
                niveles de acceso bajo RBAC.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <dl className="mt-8 grid max-w-xl grid-cols-2 gap-px border-2 border-line-400/40 bg-line-400/25 sm:grid-cols-4">
                {[
                  { k: "Stack", v: "Next.js + Prisma" },
                  { k: "Roles", v: "4 niveles RBAC" },
                  { k: "Módulos", v: "6 operativos" },
                  { k: "Aislamiento", v: "3 capas" },
                ].map((c) => (
                  <div key={c.k} className="bg-ink-950/80 p-3 transition-colors hover:bg-ink-800/80">
                    <dt className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-300">{c.k}</dt>
                    <dd className="mt-1 font-mono text-[12.5px] font-semibold text-paper-100">{c.v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal delay={400}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#entregables"
                  className="group inline-flex items-center gap-3 border-2 border-ink-950 bg-amber-acc px-6 py-3.5 font-mono text-[12.5px] font-bold uppercase tracking-[0.16em] text-ink-950 transition-all hover:-translate-y-0.5 hard-shadow-light hover:bg-paper-100"
                >
                  Abrir entregables
                  <Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="#prototipo"
                  className="inline-flex items-center gap-3 border-2 border-line-400/60 px-6 py-3.5 font-mono text-[12.5px] uppercase tracking-[0.16em] text-line-300 transition-all hover:border-amber-acc hover:text-amber-acc"
                >
                  <Icon name="user" size={15} /> Probar el prototipo
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={250}>
            <Elevation />
          </Reveal>
        </div>

        {/* cajetín / title block */}
        <Reveal delay={350}>
          <div className="mt-14 grid grid-cols-2 gap-px border-2 border-line-400/50 bg-line-400/30 font-mono sm:grid-cols-3 lg:grid-cols-6">
            {[
              { k: "Proyecto", v: "Gestión de condominios" },
              { k: "Lámina", v: "A-01 · Arquitectura" },
              { k: "Escala", v: "1:1 (código real)" },
              { k: "Tenant demo", v: "torres-del-parque" },
              { k: "Pasarela", v: "Mercado Pago" },
              { k: "Estado", v: "Aprobado ✓" },
            ].map((c) => (
              <div key={c.k} className="bg-ink-950/85 px-4 py-3">
                <p className="text-[9px] uppercase tracking-[0.22em] text-ink-300">{c.k}</p>
                <p className="mt-1 text-[12px] font-semibold text-paper-100">{c.v}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── cinta de módulos ────────────────────────────────────────── */
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="marquee overflow-hidden border-y-2 border-ink-950 bg-amber-acc py-3" aria-hidden="true">
      <div className="marquee-track">
        {items.map((t, i) => (
          <span key={i} className="flex items-center whitespace-nowrap font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-ink-950">
            <span className="px-5">{t}</span>
            <span className="text-ink-950/50">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── cierre tipo fin de plano ────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-drafting text-ink-900">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink-900 pb-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-500">Fin del plano · doblar aquí</p>
            <p className="mt-2 font-display text-5xl uppercase leading-none text-ink-900 md:text-7xl">
              Listo para <span className="text-amber-deep">construir</span>
            </p>
          </div>
          <Stamp text="Rev 1.0 · Aprobado" className="border-ink-900 text-ink-900" />
        </div>

        <div className="mt-10 grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-500">Índice de la lámina</h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { href: "#plano", t: "A · Plano multi-tenant y 3 capas de aislamiento" },
                { href: "#entregables", t: "B1 · Estructura de carpetas (App Router)" },
                { href: "#entregables", t: "B2 · schema.prisma completo" },
                { href: "#entregables", t: "B3 · Middleware RBAC + requireRole()" },
                { href: "#entregables", t: "B4 · Plan de desarrollo en 6 fases" },
                { href: "#prototipo", t: "C · Prototipo por rol + simulador de rutas" },
              ].map((l) => (
                <li key={l.t}>
                  <a href={l.href} className="group flex items-start gap-2 py-1 text-[14px] text-ink-700 transition-colors hover:text-amber-deep">
                    <span className="mt-1 h-2 w-2 shrink-0 border border-ink-900 transition-colors group-hover:bg-amber-acc" />
                    {l.t}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-ink-900 bg-paper-50 p-5 hard-shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-500">Nota del delineante</p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-700">
              Los cuatro grupos de archivos de la <strong>Sección B</strong> son código real de arranque:
              cópialos al repositorio, ejecuta <code className="bg-ink-900 px-1.5 py-0.5 font-mono text-[12px] text-amber-acc">npx prisma migrate dev</code> y
              siembra la parcela demo. El resto del plano se construye fase a fase.
            </p>
            <p className="mt-4 flex flex-wrap gap-2 font-mono text-[10.5px] text-ink-600">
              {["Next.js App Router", "PostgreSQL", "Prisma", "Auth.js", "Tailwind + shadcn/ui", "Mercado Pago"].map((s) => (
                <span key={s} className="border border-ink-900/30 px-2 py-0.5">{s}</span>
              ))}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-ink-900/25 pt-6 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500">
          <span>CONDO/OS · Lámina A-01 · 2026</span>
          <span>Multi-tenant · RBAC · Parcela como raíz de todo</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <TopNav />
      <main>
        <Hero />
        <Ticker />
        <Architecture />
        <Deliverables />
        <Demo />
      </main>
      <Footer />
    </>
  );
}
