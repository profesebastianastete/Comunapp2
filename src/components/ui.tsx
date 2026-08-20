import { useEffect, useRef, useState, type ReactNode } from "react";

export const prefersReduced = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Reveal por IntersectionObserver ─────────────────────────── */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "figure" | "li" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("in");
            io.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={"reveal " + className}
      style={{ ["--rv-delay" as never]: delay + "ms" }}
    >
      {children}
    </Tag>
  );
}

/* ── Título que se decodifica ─────────────────────────────────── */
const GLYPHS = "▓▒░/\\#%&@$·+=";
export function useDecode(text: string, start = true): string {
  const [out, setOut] = useState(prefersReduced() ? text : "");
  useEffect(() => {
    if (!start) return;
    if (prefersReduced()) {
      setOut(text);
      return;
    }
    let frame = 0;
    const total = Math.max(18, text.length * 2);
    const id = window.setInterval(() => {
      frame++;
      const solved = Math.floor((frame / total) * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        s += i < solved ? text[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (frame >= total) {
        setOut(text);
        window.clearInterval(id);
      }
    }, 34);
    return () => window.clearInterval(id);
  }, [text, start]);
  return out;
}

/* ── Cabecera de sección estilo plano ─────────────────────────── */
export function SectionHead({
  kicker,
  title,
  note,
  dark = false,
  index,
}: {
  kicker: string;
  title: string;
  note?: string;
  dark?: boolean;
  index: string;
}) {
  return (
    <Reveal className="mb-10 md:mb-14">
      <div className="flex items-end justify-between gap-6 border-b-2 pb-5 md:pb-6"
        style={{ borderColor: dark ? "rgba(111,177,255,0.35)" : "rgba(10,31,60,0.85)" }}>
        <div>
          <p className={"font-mono text-[11px] md:text-xs tracking-[0.28em] uppercase mb-3 " +
            (dark ? "text-line-400" : "text-ink-600")}>
            <span className={dark ? "text-amber-acc" : "text-amber-deep"}>{index}</span> · {kicker}
          </p>
          <h2 className={"font-display text-4xl md:text-6xl leading-[0.95] uppercase " +
            (dark ? "text-paper-100" : "text-ink-900")}>
            <span className="line-mask"><span>{title}</span></span>
          </h2>
        </div>
        {note && (
          <p className={"hidden md:block max-w-[240px] font-mono text-[11px] leading-relaxed text-right " +
            (dark ? "text-ink-200" : "text-ink-500")}>
            {note}
          </p>
        )}
      </div>
    </Reveal>
  );
}

/* ── Botón copiar ─────────────────────────────────────────────── */
export function CopyButton({ text, light = false, label = "Copiar archivo" }: { text: string; light?: boolean; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setOk(true);
        window.setTimeout(() => setOk(false), 1600);
      }}
      className={
        "inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-all active:translate-y-px " +
        (ok
          ? "border-jade-acc text-jade-acc"
          : light
            ? "border-ink-500/50 text-ink-200 hover:border-amber-acc hover:text-amber-acc"
            : "border-ink-900/40 text-ink-600 hover:border-amber-deep hover:text-amber-deep")
      }
    >
      {ok ? (
        <>
          <Icon name="check" size={12} /> Copiado
        </>
      ) : (
        <>
          <Icon name="copy" size={12} /> {label}
        </>
      )}
    </button>
  );
}

/* ── Sello de plano ───────────────────────────────────────────── */
export function Stamp({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span
      className={
        "inline-block -rotate-6 border-2 px-3 py-1 font-display uppercase tracking-[0.18em] text-sm md:text-base " +
        className
      }
    >
      {text}
    </span>
  );
}

/* ── Iconos SVG de trazo ──────────────────────────────────────── */
const PATHS: Record<string, ReactNode> = {
  building: (
    <>
      <path d="M4 21V7l8-4v18M12 21V9l8 3v9" />
      <path d="M2 21h20M7 9h2M7 12h2M7 15h2M15 14h2M15 17h2" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 9.8c0-1 1.1-1.8 2.5-1.8s2.5.8 2.5 1.8c0 2.6-5 1.8-5 4.4 0 1 1.1 1.8 2.5 1.8s2.5-.8 2.5-1.8" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 3.5v17h17" />
      <path d="M7 16l4-5 3 2.5L19 7" />
      <path d="M16.5 7H19v2.5" />
    </>
  ),
  bell: (
    <>
      <path d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 5-2 6-2 6h15s-2-1-2-6A5.5 5.5 0 0 0 12 4Z" />
      <path d="M10 19a2 2 0 0 0 4 0M12 2.5V4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" />
      <path d="M3.5 9.5h17M8 2.8V6M16 2.8V6M7.5 13h3M13.5 13h3M7.5 16.5h3" />
    </>
  ),
  vote: (
    <>
      <path d="M4 13.5h16V20H4zM9 13.5l3.5-8 4 1.8-2.6 6.2" />
      <path d="M10.6 16.4l1.6 1.5 2.9-3" />
    </>
  ),
  door: (
    <>
      <path d="M4 21V4.5L14 3v18M14 8l6 1.5V21M2 21h20" />
      <circle cx="11.5" cy="12.5" r="0.4" fill="currentColor" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 2.8v5.4c0 5-3.2 8.3-7.5 9.8-4.3-1.5-7.5-4.8-7.5-9.8V5.8Z" />
      <path d="M8.8 12l2.2 2.2 4.2-4.4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" />
      <path d="M15.5 8.5v-5h-12v12h5" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5 10-11" />,
  arrow: <path d="M4 12h15m-6-7l7 7-7 7" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c.9-3.5 3.4-5.5 6.5-5.5s5.6 2 6.5 5.5M15.5 5.6a3.5 3.5 0 0 1 0 5.9M18 14.8c1.7.8 3 2.4 3.5 5.2" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6.5" width="18" height="13" />
      <path d="M3 9.5h18M16.5 14h1.5" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v4h4M9 12h6M9 15.5h6" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="4.5" />
      <path d="M12.5 12H21M18 12v3M15.5 12v2.2" />
    </>
  ),
  db: (
    <>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
      <path d="M4.5 5.5v13c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8v-13M4.5 12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" strokeDasharray="2.5 2.5" />
    </>
  ),
  crane: (
    <>
      <path d="M6 21V6l14-3v3M6 8.5 2 10M6 6h14M17 3v6M15.5 9h3l-1.5 3z" />
      <path d="M4 21h5" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className = "",
  strokeWidth = 1.7,
}: {
  name: keyof typeof PATHS | string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.building}
    </svg>
  );
}
