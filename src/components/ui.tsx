import { Check, Copy, Inbox } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ROL_COLOR, type Rol } from "../lib/store";

/* ── logo ───────────────────────────────────────────────────── */
export function Logo({ dark = false, small = false }: { dark?: boolean; small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine shadow-soft">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#c9f24b" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V9l8-5 8 5v11" />
          <path d="M2 20h20" />
          <path d="M9.5 20v-5h5v5" />
          <path d="M12 8.5v.01" />
        </svg>
      </span>
      {!small && (
        <span className={"font-display text-[22px] font-bold tracking-tight " + (dark ? "text-white" : "text-ink")}>
          Comun<span className="text-pine2">App</span>
        </span>
      )}
    </span>
  );
}

/* ── botón ──────────────────────────────────────────────────── */
const BTN: Record<string, string> = {
  primary: "bg-pine text-white hover:bg-pine2 shadow-soft hover:shadow-lift hover:-translate-y-0.5",
  neon: "bg-neon text-deep font-bold hover:bg-neon2 shadow-neon hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-8px_rgba(183,236,60,0.7)]",
  outline: "border-[1.5px] border-pine text-pine hover:bg-pine hover:text-white",
  ghost: "border-[1.5px] border-line text-ink2 hover:border-pine hover:text-pine bg-card",
  danger: "bg-signal text-white hover:bg-[#b03f2a] shadow-soft",
  white: "bg-card text-pine border-[1.5px] border-line hover:border-pine shadow-soft hover:-translate-y-0.5",
};
export function Btn({
  children, variant = "primary", size = "md", className = "", disabled, onClick, type = "button", title,
}: {
  children: ReactNode; variant?: keyof typeof BTN; size?: "sm" | "md" | "lg" | "xl";
  className?: string; disabled?: boolean; onClick?: () => void; type?: "button" | "submit"; title?: string;
}) {
  const sizes = { sm: "px-3.5 py-2 text-[12.5px] gap-1.5", md: "px-5 py-2.5 text-[13.5px] gap-2", lg: "px-7 py-3.5 text-[15px] gap-2", xl: "px-8 py-4.5 text-[17px] gap-2.5" };
  return (
    <button
      type={type} title={title} onClick={onClick} disabled={disabled}
      className={
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 " +
        sizes[size] + " " + BTN[variant] + " " + className
      }
    >
      {children}
    </button>
  );
}

/* ── spinner ────────────────────────────────────────────────── */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={"spin " + className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ── reveal on scroll ───────────────────────────────────────── */
export function Reveal({
  children, delay: d = 0, className = "", dir = "up",
}: { children: ReactNode; delay?: number; className?: string; dir?: "up" | "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { setInView(true); ob.disconnect(); } }),
      { threshold: 0.12 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  const dirCls = dir === "left" ? "reveal-left" : dir === "right" ? "reveal-right" : "";
  return (
    <div ref={ref} className={"reveal " + dirCls + (inView ? " in" : "") + " " + className} style={{ transitionDelay: d + "ms" }}>
      {children}
    </div>
  );
}

/* ── contador animado ───────────────────────────────────────── */
export function CountUp({ to, prefix = "", suffix = "", className = "" }: { to: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const dur = 1200;
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          ob.disconnect();
        }
      });
    }, { threshold: 0.4 });
    ob.observe(el);
    return () => ob.disconnect();
  }, [to]);
  return <span ref={ref} className={"tnum " + className}>{prefix}{val.toLocaleString("es-CL")}{suffix}</span>;
}

/* ── modal ──────────────────────────────────────────────────── */
export function Modal({
  open, onClose, title, children, wide = false,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-deep/60 backdrop-blur-[3px]" onClick={onClose} />
      <div className={"pop-in relative max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-line bg-card shadow-lift " + (wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-card/95 px-6 py-4 backdrop-blur">
          <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink2 transition-colors hover:border-signal hover:text-signal" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ── toasts ─────────────────────────────────────────────────── */
type Toast = { id: number; msg: string; tipo: "ok" | "warn" };
let pushToast: ((t: Toast) => void) | null = null;
export function toast(msg: string, tipo: "ok" | "warn" = "ok") {
  pushToast?.({ id: Date.now() + Math.random(), msg, tipo });
}
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    pushToast = (t) => {
      setItems((xs) => [...xs, t].slice(-4));
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 4200);
    };
    return () => { pushToast = null; };
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-[min(380px,90vw)] flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className={"pop-in pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lift " + (t.tipo === "ok" ? "border-pine2/30 bg-pine text-white" : "border-signal/40 bg-card text-ink")}>
          <span className={"mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full " + (t.tipo === "ok" ? "bg-neon text-deep" : "bg-signal text-white")}>
            {t.tipo === "ok" ? <Check size={13} strokeWidth={3} /> : <span className="text-[11px] font-bold">!</span>}
          </span>
          <p className="text-[13px] font-medium leading-snug">{t.msg}</p>
        </div>
      ))}
    </div>
  );
}

/* ── campo de formulario ────────────────────────────────────── */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink2">
        {label}
        {hint && <em className="font-body text-[11px] normal-case not-italic tracking-normal text-ink3">{hint}</em>}
      </span>
      {children}
    </label>
  );
}

/* ── tags de estado y rol ───────────────────────────────────── */
const ESTADOS: Record<string, { t: string; cls: string }> = {
  PAGADO: { t: "Pagado", cls: "bg-neon/25 text-pine border-neon2/60" },
  PENDIENTE: { t: "Pendiente", cls: "bg-amber/15 text-[#8a6114] border-amber/40" },
  VENCIDO: { t: "Vencido", cls: "bg-signal/10 text-signal border-signal/40" },
  ACTIVA: { t: "Activa", cls: "bg-neon/25 text-pine border-neon2/60" },
  SUSPENDIDA: { t: "Suspendida", cls: "bg-signal/10 text-signal border-signal/40" },
  activa: { t: "Activa", cls: "bg-neon/25 text-pine border-neon2/60" },
  inactiva: { t: "Inactiva", cls: "bg-signal/10 text-signal border-signal/40" },
};
export function EstadoTag({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? { t: estado, cls: "bg-line/40 text-ink2 border-line" };
  return <span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide " + e.cls}>{e.t}</span>;
}
export function RolTag({ rol, label }: { rol: Rol; label?: string }) {
  const c = ROL_COLOR[rol];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-ink2">
      <span className="h-2 w-2 rounded-full" style={{ background: c }} />
      {label ?? rol}
    </span>
  );
}

/* ── tarjetas de métrica ────────────────────────────────────── */
export function StatCard({
  label, value, sub, icon, accent = false, delay: d = 0,
}: { label: string; value: ReactNode; sub?: string; icon?: ReactNode; accent?: boolean; delay?: number }) {
  return (
    <div
      className={"card-in group rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lift " +
        (accent ? "border-pine bg-pine text-white shadow-soft" : "border-line bg-card shadow-soft")}
      style={{ ["--ci-delay" as never]: d + "ms" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={"font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] " + (accent ? "text-neon" : "text-ink3")}>{label}</p>
        {icon && <span className={accent ? "text-neon" : "text-pine2"}>{icon}</span>}
      </div>
      <p className={"mt-2 font-display text-[30px] font-bold leading-none tracking-tight " + (accent ? "text-white" : "text-ink")}>{value}</p>
      {sub && <p className={"mt-1.5 text-[12px] " + (accent ? "text-white/60" : "text-ink3")}>{sub}</p>}
    </div>
  );
}

/* ── estado vacío ───────────────────────────────────────────── */
export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-card/60 px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-paper text-ink3"><Inbox size={26} /></span>
      <p className="mt-4 font-display text-lg font-bold text-ink">{title}</p>
      {sub && <p className="mt-1 max-w-sm text-[13px] text-ink3">{sub}</p>}
    </div>
  );
}

/* ── botón copiar ───────────────────────────────────────────── */
export function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => undefined);
        setOk(true);
        setTimeout(() => setOk(false), 1600);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-ink2 transition-colors hover:border-pine hover:text-pine"
    >
      {ok ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
    </button>
  );
}
