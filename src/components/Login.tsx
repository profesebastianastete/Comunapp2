import { useState } from "react";
import { login, resetDemo, type Sesion } from "../lib/store";
import { Btn, Field, Icon, Logo, Spinner, toast } from "./ui";

const QUICK = [
  { rol: "SUPERADMIN", label: "Plataforma", email: "plataforma@comunapp.cl", pass: "admin123", c: "#c9f04d" },
  { rol: "ADMIN", label: "Administrador", email: "admin@torresdelparque.cl", pass: "admin123", c: "#2f9e68" },
  { rol: "COMITE", label: "Comité", email: "comite@torresdelparque.cl", pass: "comite123", c: "#237386" },
  { rol: "PROPIETARIO", label: "Propietaria", email: "maria@demo.cl", pass: "demo123", c: "#e09a31" },
  { rol: "ARRENDATARIO", label: "Arrendatario", email: "jorge@demo.cl", pass: "demo123", c: "#b0793a" },
];

export default function Login({ onLogin, back }: { onLogin: (s: Sesion) => void; back: () => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quien, setQuien] = useState<string | null>(null);

  const entrar = async (e?: React.FormEvent, qEmail?: string, qPass?: string, qLabel?: string) => {
    e?.preventDefault();
    const em = qEmail ?? email;
    const pw = qPass ?? pass;
    if (!em || !pw) {
      setError("Escribe tu correo y contraseña.");
      return;
    }
    setError(null);
    setLoading(true);
    setQuien(qLabel ?? null);
    try {
      const s = await login(em, pw);
      onLogin(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
      setQuien(null);
    }
  };

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[1.05fr_1fr]">
      {/* panel de marca */}
      <aside className="blueprint-lines relative hidden flex-col justify-between overflow-hidden bg-pine p-10 text-paper lg:flex">
        <button onClick={back} aria-label="Volver al inicio"><Logo dark /></button>
        <div>
          <p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.24em] text-lime">— Acceso a la plataforma</p>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.03] tracking-tight xl:text-6xl">
            La comunidad<br />te <span className="text-lime">espera.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-paper/70">
            Cada rol entra a su propio portal: la plataforma administra condominios y usuarios; cada vecino ve exactamente lo que le corresponde.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <span key={q.rol} className="flex items-center gap-2 border border-paper/25 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-paper/80">
                <span className="h-2 w-2" style={{ background: q.c }} /> {q.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] text-paper/45">
          <span>JWT {"{ sub, parcela_id, rol }"}</span>
          <span className="flex items-center gap-2"><span className="pulse-dot h-2 w-2 rounded-full bg-lime" /> API en línea</span>
        </div>
        <svg className="pointer-events-none absolute -bottom-10 -right-10 h-80 w-80 text-lime/10" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M30 180V60l50-30 50 30v120M130 180V90l40-24v114M10 180h180M50 80h14m18 0h14M50 110h14m18 0h14M50 140h14m18 0h14M65 180v-28h22v28" />
        </svg>
      </aside>

      {/* formulario */}
      <main className="dotgrid flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <button onClick={back} aria-label="Volver al inicio"><Logo /></button>
          </div>
          <div className="border-[1.5px] border-ink bg-card p-7 hard-lime sm:p-8">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-pine">— Iniciar sesión</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Bienvenido de vuelta</h2>
            <p className="mt-1.5 text-[13.5px] text-ink3">Ingresa con tu cuenta del condominio o de la plataforma.</p>

            <form onSubmit={entrar} className="mt-6 space-y-4">
              <Field label="Correo electrónico">
                <input className="field" type="email" placeholder="tu@correo.cl" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </Field>
              <Field label="Contraseña">
                <input className="field" type="password" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
              </Field>
              {error && (
                <p className="flex items-start gap-2 border-[1.5px] border-signal bg-signal/10 px-3 py-2.5 text-[13px] font-medium text-[#a03526]">
                  <Icon name="alert" size={15} className="mt-0.5 shrink-0" /> {error}
                </p>
              )}
              <Btn type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <><Spinner /> {quien ? "Entrando como " + quien + "…" : "Verificando credenciales…"}</> : <>Ingresar <Icon name="arrow" size={15} /></>}
              </Btn>
            </form>

            <div className="mt-7">
              <p className="mb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink3">Acceso rápido · demo</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {QUICK.map((q) => (
                  <button
                    key={q.rol}
                    onClick={() => entrar(undefined, q.email, q.pass, q.label)}
                    disabled={loading}
                    className="group flex items-center gap-2 border-[1.5px] border-ink bg-paper px-2.5 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wide text-ink2 transition-all hover:-translate-y-0.5 hover:bg-ink hover:text-paper hover:shadow-[3px_3px_0_0_#c9f04d] disabled:opacity-50"
                  >
                    <span className="h-2 w-2 shrink-0" style={{ background: q.c }} />
                    <span className="truncate">{q.label}</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    resetDemo();
                    toast("Datos de demostración restablecidos.", "warn");
                  }}
                  className="flex items-center justify-center gap-2 border-[1.5px] border-dashed border-ink/40 px-2.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink3 transition-colors hover:border-signal hover:text-signal"
                >
                  <Icon name="refresh" size={12} /> Reiniciar demo
                </button>
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink3">
                Ambiente de demostración: los datos viven en tu navegador y simulan la API FastAPI + PostgreSQL del backend.
              </p>
            </div>
          </div>

          <button onClick={back} className="mt-6 flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-ink2 transition-colors hover:text-pine">
            ← volver al sitio
          </button>
        </div>
      </main>
    </div>
  );
}
