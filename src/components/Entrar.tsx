import { ArrowRight, Building2, KeyRound, Lock, RotateCcw, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { apiMode } from "../lib/api";
import { login, resetDemo, type Sesion } from "../lib/store";
import { Btn, Field, Logo, Spinner, toast } from "./ui";

const RAPIDOS = [
  { rol: "Superadmin", email: "equipo@comunapp.cl", pass: "admin123", icon: Sparkles, c: "#9cc72a" },
  { rol: "Administrador", email: "admin@losalamos.cl", pass: "admin123", icon: ShieldCheck, c: "#12523e" },
  { rol: "Comité", email: "comite@losalamos.cl", pass: "comite123", icon: Users, c: "#1f7d72" },
  { rol: "Propietaria", email: "maria@demo.cl", pass: "demo123", icon: Wallet, c: "#d9a036" },
  { rol: "Arrendatario", email: "jorge@demo.cl", pass: "demo123", icon: KeyRound, c: "#b0793a" },
];

export default function Entrar({ onLogin, volver }: { onLogin: (s: Sesion) => void; volver: () => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);

  const entrar = async (qEmail?: string, qPass?: string, qRol?: string) => {
    const em = qEmail ?? email;
    const pw = qPass ?? pass;
    if (!em || !pw) { setError("Escribe tu correo y contraseña."); return; }
    setError(null);
    setCargando(qRol ?? "tu cuenta");
    try {
      const s = await login(em, pw);
      onLogin(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
      setCargando(null);
    }
  };

  return (
    <div className="dotgrid glow-hero flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-between">
          <button onClick={volver} aria-label="Volver al inicio"><Logo /></button>
          <button onClick={volver} className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink2 transition-colors hover:text-pine">← Volver al sitio</button>
        </div>

        <div className="rounded-[22px] border border-line bg-card p-8 shadow-lift">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-pine2">— Bienvenido de vuelta</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Entra a tu comunidad</h1>
          <p className="mt-1.5 text-[13.5px] text-ink3">Pagos del mes, reservas, votaciones y avisos te esperan.</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => { e.preventDefault(); void entrar(); }}
          >
            <Field label="Correo electrónico">
              <input className="field" type="email" placeholder="tu@correo.cl" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="Contraseña">
              <input className="field" type="password" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
            </Field>
            {error && (
              <p className="rounded-xl border border-signal/40 bg-signal/10 px-3.5 py-2.5 text-[13px] font-medium text-signal">{error}</p>
            )}
            <Btn type="submit" variant="primary" size="lg" className="w-full" disabled={cargando !== null}>
              {cargando ? <><Spinner /> Entrando…</> : <>Entrar <ArrowRight size={16} /></>}
            </Btn>
          </form>

          <div className="mt-7 border-t border-dashed border-line pt-6">
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink3">Entrada rápida · demostración</p>

            {/* superadmin destacado (acceso al panel interno /adminapp) */}
            {(() => {
              const q = RAPIDOS[0];
              return (
                <button
                  key={q.rol}
                  disabled={cargando !== null}
                  onClick={() => void entrar(q.email, q.pass, q.rol)}
                  className="group mb-2 flex w-full items-center gap-3 rounded-xl border-[1.5px] border-pine bg-pine px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(12,59,46,0.6)] disabled:opacity-60"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neon text-deep transition-transform group-hover:scale-105">
                    <q.icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[13px] font-bold text-paper">
                      {q.rol}
                      <span className="rounded-full bg-neon/15 px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-neon">panel interno</span>
                    </span>
                    <span className="block truncate font-mono text-[9.5px] uppercase tracking-wide text-paper/55">{q.email}</span>
                  </span>
                  <ArrowRight size={15} className="shrink-0 text-neon transition-transform group-hover:translate-x-1" />
                </button>
              );
            })()}

            <div className="grid grid-cols-2 gap-2">
              {RAPIDOS.slice(1).map((q) => (
                <button
                  key={q.rol}
                  disabled={cargando !== null}
                  onClick={() => void entrar(q.email, q.pass, q.rol)}
                  className="group flex items-center gap-2.5 rounded-xl border-[1.5px] border-line bg-paper px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-pine hover:shadow-soft disabled:opacity-60"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white transition-transform group-hover:scale-105" style={{ background: q.c }}>
                    <q.icon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-ink">{q.rol}</span>
                    <span className="block truncate font-mono text-[9.5px] uppercase tracking-wide text-ink3">{q.email}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] leading-snug text-ink3">
                {apiMode ? "Conectado a la API en Railway · datos reales." : "Ambiente de demostración: los datos viven en tu navegador."}
              </p>
              <button
                onClick={() => { resetDemo(); toast("Datos de demostración restablecidos.", "warn"); }}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink3 transition-colors hover:border-signal hover:text-signal"
              >
                <RotateCcw size={11} /> Reiniciar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">
          <span className="flex items-center gap-1.5"><Lock size={12} className="text-pine2" /> Sesión segura</span>
          <span className="flex items-center gap-1.5"><Building2 size={12} className="text-pine2" /> Tu comunidad, tus datos</span>
          <span className="hidden items-center gap-1.5 sm:flex"><Sparkles size={12} className="text-pine2" /> Pagos con Mercado Pago</span>
        </div>
      </div>
    </div>
  );
}
