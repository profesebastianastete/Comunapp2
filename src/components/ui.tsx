import { useEffect, useRef, useState, type ReactNode } from "react";

/* ────────────────────────────────────────────────
   Iconos SVG propios (trazo 1.8, estilo esquemático)
   ──────────────────────────────────────────────── */
const PATHS: Record<string, ReactNode> = {
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  check: <path d="m4.5 12.5 5 5L19.5 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (<><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>),
  users: (<><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><circle cx="17" cy="9.5" r="2.6" /><path d="M16 14.7c2.6.3 4.6 2 5.3 4.8" /></>),
  user: (<><circle cx="12" cy="8" r="3.8" /><path d="M5 20.2c.9-4 3.7-6 7-6s6.1 2 7 6" /></>),
  wallet: (<><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V9" /><path d="M3 7.5V17a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17v-5.5A2.5 2.5 0 0 0 18.5 9H5.5A2.5 2.5 0 0 1 3 7.5Z" /><path d="M16.5 14.2h.01" /></>),
  coins: (<><ellipse cx="9" cy="7.5" rx="6" ry="3" /><path d="M3 7.5v4.5c0 1.66 2.7 3 6 3s6-1.34 6-3V7.5" /><path d="M3 12v4.5c0 1.66 2.7 3 6 3s6-1.34 6-3" /><path d="M18 10.5c1.8.5 3 1.5 3 2.7v4.3c0 1.4-1.8 2.6-4.2 2.9" /></>),
  receipt: (<><path d="M6 3h12v18l-2.4-1.6L13.2 21l-2.4-1.6L8.4 21 6 19.4V3Z" /><path d="M9 8h6M9 12h6" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="16" rx="1.5" /><path d="M3.5 10h17M8 2.5V7M16 2.5V7" /></>),
  vote: (<><path d="m4 13 4.5 4.5L19.5 6.5" /><path d="M4 20.5h16" opacity=".4" /></>),
  bell: (<><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" /><path d="M10 19.5a2.2 2.2 0 0 0 4 0" /></>),
  megaphone: (<><path d="M3.5 10v4l3 .5L18 19V5L6.5 9.5l-3 .5Z" /><path d="M18 9.5a3 3 0 0 1 0 5M7 14.8l1 4.7h2.4l-.8-4.3" /></>),
  shield: (<><path d="M12 3 5 5.8v5.4c0 4.4 2.9 7.6 7 9.3 4.1-1.7 7-4.9 7-9.3V5.8L12 3Z" /><path d="m9 11.5 2.2 2.2L15.5 9" /></>),
  gate: (<><path d="M4 21V8l8-4.5L20 8v13" /><path d="M4 21h16M9 21v-8h6v8M9 17h6" /></>),
  chart: (<><path d="M4 20V4" /><path d="M4 20h16" /><path d="m8 15 3.5-4 3 2.5L19 8" /></>),
  building: (<><path d="M5 21V5.5L12 3l7 2.5V21" /><path d="M3 21h18" /><path d="M9 8h2m2 0h2M9 12h2m2 0h2M10 21v-4h4v4" /></>),
  key: (<><circle cx="8" cy="8.5" r="4.5" /><path d="m11.5 11.5 8 8M17 17l2.5-2.5M14.5 14.5 17 12" /></>),
  lock: (<><rect x="5.5" y="10.5" width="13" height="10" rx="1.5" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /></>),
  logout: (<><path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" /><path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" /></>),
  download: (<><path d="M12 4v11m0 0 4-4m-4 4-4-4" /><path d="M4.5 19.5h15" /></>),
  copy: (<><rect x="8.5" y="8.5" width="12" height="12" rx="1.5" /><path d="M15.5 8.5v-3A2.5 2.5 0 0 0 13 3H5.5A2.5 2.5 0 0 0 3 5.5V13a2.5 2.5 0 0 0 2.5 2.5h3" /></>),
  edit: (<><path d="m14.5 5 4.5 4.5L8.5 20H4v-4.5L14.5 5Z" /><path d="m12.5 7 4.5 4.5" /></>),
  trash: (<><path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" /><path d="M10.5 11v5m3-5v5" /></>),
  alert: (<><path d="M12 3.5 2.5 20h19L12 3.5Z" /><path d="M12 10v4.5m0 2.5v.01" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.2l3.4 2" /></>),
  eye: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>),
  home: (<><path d="m4 11 8-7 8 7v9.5h-5.5V15h-5v5.5H4V11Z" /></>),
  code: (<><path d="m8 7-5 5 5 5M16 7l5 5-5 5" /><path d="m13.5 4.5-3 15" opacity=".5" /></>),
  refresh: (<><path d="M4.5 12a7.5 7.5 0 0 1 13-5.2L20 9" /><path d="M20 4.5V9h-4.5M19.5 12a7.5 7.5 0 0 1-13 5.2L4 15" /><path d="M4 19.5V15h4.5" /></>),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  card: (<><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M2.5 10h19M6 15h4" /></>),
  send: (<><path d="M21 3.5 3 10.5l7 3 3 7 8-17Z" /><path d="M21 3.5 10 13.5" /></>),
  file: (<><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v4h4M9.5 12h5m-5 4h5" /></>),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sparkle: <path d="M12 3.5 14 10l6.5 2L14 14l-2 6.5L10 14l-6.5-2L10 10l2-6.5Z" />,
  python: (<><path d="M12 3c-3 0-3.5 1.3-3.5 2.8V8h7v1H6.2C4.4 9 3 10.4 3 12.8c0 2.4 1.4 3.7 3.2 3.7h2v-2.2c0-1.5 1.2-2.8 2.8-2.8h3.6c1.5 0 2.9-1.3 2.9-2.9V5.8C17.5 4.3 15 3 12 3Z" /><path d="M12 21c3 0 3.5-1.3 3.5-2.8V16h-7v-1h9.3c1.8 0 3.2-1.4 3.2-3.8" opacity=".55" /><path d="M9.8 5.3h.01M14.2 18.7h.01" /></>),
};

export function Icon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={"shrink-0 " + className} aria-hidden
    >
      {PATHS[name] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}

/* ── logo ── */
export function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center border-2 border-ink bg-pine">
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden>
          <path d="M8 25V12.5L16 7l8 5.5V25h-5.4v-6.5h-5.2V25H8Z" fill="#c9f04d" />
          <path d="M13 15h2m2 0h2M13 18h2m2 0h2" stroke="#0e4632" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="absolute -right-1 -top-1 h-2 w-2 bg-lime" />
      </span>
      {!compact && (
        <span className={"font-display text-[22px] font-bold leading-none tracking-tight " + (dark ? "text-paper" : "text-ink")}>
          Comun<span className={dark ? "text-lime" : "text-pine"}>App</span>
        </span>
      )}
    </span>
  );
}

/* ── reveal al hacer scroll ── */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={"rv " + className} style={{ ["--rv-delay" as never]: delay + "ms" }}>
      {children}
    </div>
  );
}

/* ── contador animado ── */
export function CountUp({ to, prefix = "", suffix = "", decimals = 0, className = "" }: { to: number; prefix?: string; suffix?: string; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || started.current) return;
      started.current = true;
      if (reduce) {
        setVal(to);
        return;
      }
      const t0 = performance.now();
      const dur = 1100;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setVal(to * e);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  const fmt = val.toLocaleString("es-CL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span ref={ref} className={"tnum " + className}>
      {prefix}{fmt}{suffix}
    </span>
  );
}

/* ── botones ── */
export function Btn({
  children, onClick, variant = "pine", size = "md", className = "", disabled, type = "button",
}: {
  children: ReactNode; onClick?: () => void; variant?: "pine" | "lime" | "ghost" | "danger" | "paper";
  size?: "sm" | "md" | "lg"; className?: string; disabled?: boolean; type?: "button" | "submit";
}) {
  const base = "inline-flex items-center justify-center gap-2 border-[1.5px] border-ink font-semibold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0";
  const sizes = { sm: "h-9 px-3.5 text-[13px]", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-[15px]" };
  const variants = {
    pine: "bg-pine text-paper hover:bg-pine2 shadow-[4px_4px_0_0_#1a2521] hover:shadow-[2px_2px_0_0_#1a2521]",
    lime: "bg-lime text-pine3 hover:bg-lime2 shadow-[4px_4px_0_0_#1a2521] hover:shadow-[2px_2px_0_0_#1a2521]",
    ghost: "bg-transparent text-ink hover:bg-ink hover:text-paper",
    danger: "bg-signal text-paper hover:brightness-110 shadow-[4px_4px_0_0_#1a2521]",
    paper: "bg-card text-ink hover:bg-paper2 shadow-[4px_4px_0_0_#1a2521] hover:shadow-[2px_2px_0_0_#1a2521]",
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={[base, sizes[size], variants[variant], className].join(" ")}>
      {children}
    </button>
  );
}

/* ── campos ── */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-ink3">{hint}</span>}
    </label>
  );
}

/* ── tags de estado ── */
export function EstadoTag({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    pendiente: "bg-amber/15 text-[#9a6511] border-amber/60",
    pagado: "bg-ok/15 text-[#1d6b45] border-ok/60",
    vencido: "bg-signal/15 text-[#a03526] border-signal/60",
    abierta: "bg-ok/15 text-[#1d6b45] border-ok/60",
    cerrada: "bg-ink/10 text-ink2 border-ink/30",
    activa: "bg-ok/15 text-[#1d6b45] border-ok/60",
    inactiva: "bg-ink/10 text-ink2 border-ink/30",
    dentro: "bg-ok/15 text-[#1d6b45] border-ok/60",
    salida: "bg-ink/10 text-ink2 border-ink/30",
  };
  return (
    <span className={"inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide " + (map[estado] ?? "border-line text-ink2")}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {estado}
    </span>
  );
}

export function RolTag({ rol, label }: { rol: string; label: string }) {
  const colores: Record<string, string> = {
    SUPERADMIN: "#c9f04d", ADMIN: "#2f9e68", COMITE: "#237386", PROPIETARIO: "#e09a31", ARRENDATARIO: "#b0793a",
  };
  const c = colores[rol] ?? "#6e7d74";
  return (
    <span className="inline-flex items-center gap-1.5 border border-line bg-card px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-ink2">
      <span className="h-2 w-2" style={{ background: c }} />
      {label}
    </span>
  );
}

/* ── modal ── */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-pine3/70" onClick={onClose} />
      <div className={"pop-in relative max-h-[92vh] w-full overflow-y-auto border-2 border-ink bg-paper p-6 hard-lime " + (wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="font-display text-xl font-bold leading-tight text-ink">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center border border-ink text-ink2 transition-colors hover:bg-ink hover:text-paper" aria-label="Cerrar">
            <Icon name="x" size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── toasts ── */
type Toast = { id: number; msg: string; tone: "ok" | "warn" | "err" };
let listener: ((t: Toast) => void) | null = null;
let toastId = 0;

export function toast(msg: string, tone: Toast["tone"] = "ok") {
  listener?.({ id: ++toastId, msg, tone });
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    listener = (t) => {
      setItems((x) => [...x, t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 3800);
    };
    return () => {
      listener = null;
    };
  }, []);
  const borde = { ok: "border-l-ok", warn: "border-l-amber", err: "border-l-signal" };
  const icono = { ok: "check", warn: "alert", err: "alert" };
  const color = { ok: "text-ok", warn: "text-amber", err: "text-signal" };
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[95] flex w-[min(360px,90vw)] flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className={"toast-in pointer-events-auto flex items-start gap-3 border-[1.5px] border-ink border-l-[6px] bg-card p-3.5 shadow-[5px_5px_0_0_#1a2521] " + borde[t.tone]}>
          <Icon name={icono[t.tone]} size={17} className={"mt-0.5 " + color[t.tone]} />
          <p className="text-[13.5px] font-medium leading-snug text-ink">{t.msg}</p>
        </div>
      ))}
    </div>
  );
}

/* ── misc ── */
export function Empty({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="grid place-items-center gap-2 border-2 border-dashed border-line px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center border border-line text-ink3"><Icon name={icon} size={22} /></span>
      <p className="font-display text-lg font-semibold text-ink2">{title}</p>
      {sub && <p className="max-w-sm text-[13px] text-ink3">{sub}</p>}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={"spin h-4 w-4 " + className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function StatCard({ label, value, icon, accent = false, sub }: { label: string; value: ReactNode; icon: string; accent?: boolean; sub?: string }) {
  return (
    <div className={"group border-[1.5px] border-ink p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[5px_5px_0_0_#1a2521] " + (accent ? "bg-pine text-paper" : "bg-card")}>
      <div className="flex items-center justify-between">
        <p className={"font-mono text-[10px] font-semibold uppercase tracking-[0.18em] " + (accent ? "text-lime" : "text-ink3")}>{label}</p>
        <Icon name={icon} size={16} className={accent ? "text-lime" : "text-ink3"} />
      </div>
      <p className={"mt-2 font-display text-[26px] font-bold leading-none tracking-tight " + (accent ? "text-paper" : "text-ink")}>{value}</p>
      {sub && <p className={"mt-1.5 text-[11.5px] " + (accent ? "text-paper/70" : "text-ink3")}>{sub}</p>}
    </div>
  );
}
