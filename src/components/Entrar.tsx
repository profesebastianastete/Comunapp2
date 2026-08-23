import { ArrowRight, Building2, Eye, EyeOff, Lock, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { apiMode } from "../lib/api";
import { login, resetDemo, type Sesion } from "../lib/store";
import { Btn, Field, Logo, Spinner, toast } from "./ui";

export default function Entrar({ onLogin, volver }: { onLogin: (s: Sesion) => void; volver: () => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Si el servidor no responde, la app degrada a datos locales: se avisa una vez,
  // mostrando la URL intentada para facilitar el diagnóstico de variables de entorno.
  useEffect(() => {
    const aviso = (ev: Event) => {
      const url = (ev as CustomEvent<string>).detail;
      toast(
        "Sin conexión con el servidor" + (url ? " (" + url + ")" : "") +
        ". Se usaron datos locales; revisa VITE_API_URL en Railway.",
        "warn",
      );
    };
    window.addEventListener("comunapp:red-caida", aviso);
    return () => window.removeEventListener("comunapp:red-caida", aviso);
  }, []);

  const entrar = async () => {
    if (!email || !pass) { setError("Escribe tu correo y contraseña."); return; }
    setError(null);
    setCargando(true);
    try {
      const s = await login(email, pass);
      onLogin(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
      setCargando(false);
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
              <div className="relative">
                <input
                  className="field pr-11"
                  type={verPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setVerPass((v) => !v)}
                  title={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-ink3 transition-all hover:scale-110 hover:bg-paper hover:text-pine active:scale-95"
                >
                  {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            {error && (
              <div className="space-y-2">
                <p className="rounded-xl border border-signal/40 bg-signal/10 px-3.5 py-2.5 text-[13px] font-medium text-signal">{error}</p>
                {!apiMode && (
                  <button
                    type="button"
                    onClick={() => {
                      resetDemo();
                      setError(null);
                      toast("Acceso restablecido. Vuelve a intentar.", "ok");
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pine/40 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-pine transition-colors hover:border-pine hover:bg-pine/5"
                  >
                    <RotateCcw size={13} /> Restablecer acceso
                  </button>
                )}
              </div>
            )}
            <Btn type="submit" variant="primary" size="lg" className="w-full" disabled={cargando}>
              {cargando ? <><Spinner /> Entrando…</> : <>Entrar <ArrowRight size={16} /></>}
            </Btn>
          </form>

          <p className="mt-6 border-t border-dashed border-line pt-5 text-center text-[12px] leading-relaxed text-ink3">
            ¿No tienes cuenta? Pídela al administrador de tu comunidad:
            <br />él crea tu acceso con tu rol y tu unidad.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">
          <span className="flex items-center gap-1.5"><Lock size={12} className="text-pine2" /> Sesión segura</span>
          <span className="flex items-center gap-1.5"><Building2 size={12} className="text-pine2" /> Tu comunidad, tus datos</span>
          <span className="hidden items-center gap-1.5 sm:flex"><Lock size={12} className="text-pine2" /> Pagos con Mercado Pago</span>
        </div>
      </div>
    </div>
  );
}
