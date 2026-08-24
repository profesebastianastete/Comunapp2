import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, KeyRound, Lock, MailCheck, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { confirmarEmail, login, type Sesion } from "../lib/store";
import { Btn, Field, Logo, Spinner, toast } from "./ui";

export default function Entrar({ onLogin, volver }: { onLogin: (s: Sesion) => void; volver: () => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinServidor, setSinServidor] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Confirmación de correo para cuentas nuevas
  const [necesitaConfirmar, setNecesitaConfirmar] = useState(false);
  const [token, setToken] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const entrar = async () => {
    if (!email || !pass) { setError("Escribe tu correo y contraseña."); setSinServidor(false); return; }
    setError(null);
    setSinServidor(false);
    setNecesitaConfirmar(false);
    setCargando(true);
    try {
      const s = await login(email, pass);
      onLogin(s);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo iniciar sesión.";
      setError(msg);
      // El cliente marca los errores de red (servidor caído o en reposo)
      setSinServidor(/servidor|conectar/i.test(msg));
      // El backend pide confirmar el correo para cuentas nuevas
      if (/confirma tu correo/i.test(msg)) setNecesitaConfirmar(true);
      setCargando(false);
    }
  };

  const confirmar = async () => {
    if (!token.trim()) { setError("Pega el código de confirmación que recibiste por correo."); return; }
    setError(null);
    setConfirmando(true);
    try {
      await confirmarEmail(token.trim());
      toast("Correo confirmado. Ya puedes entrar.");
      setNecesitaConfirmar(false);
      setToken("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "El código no es válido.");
    }
    setConfirmando(false);
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
                {sinServidor && (
                  <p className="flex items-start gap-2 rounded-xl border border-amber/40 bg-amber/10 px-3.5 py-2.5 text-[12.5px] leading-snug text-[#8a6114]">
                    <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                    Si el servicio estuvo inactivo, puede tardar unos segundos en despertar: presiona Entrar nuevamente.
                  </p>
                )}
              </div>
            )}
            <Btn type="submit" variant="primary" size="lg" className="w-full" disabled={cargando}>
              {cargando ? <><Spinner /> Entrando…</> : <>Entrar <ArrowRight size={16} /></>}
            </Btn>
          </form>

          {/* Panel de confirmación de correo (cuentas nuevas) */}
          {necesitaConfirmar && (
            <div className="pop-in mt-5 rounded-xl border border-pine2/40 bg-pine/[0.05] p-5">
              <p className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-pine2">
                <MailCheck size={15} /> Un paso más: confirma tu correo
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink2">
                Tu cuenta es nueva. Revisa tu bandeja de entrada y pega aquí el código de confirmación que te enviamos.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  className="field font-mono text-[12.5px] tracking-wide"
                  placeholder="Código de confirmación"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <Btn variant="neon" onClick={() => void confirmar()} disabled={confirmando}>
                  {confirmando ? <Spinner /> : <><KeyRound size={14} /> Confirmar</>}
                </Btn>
              </div>
            </div>
          )}

          <p className="mt-6 border-t border-dashed border-line pt-5 text-center text-[12px] leading-relaxed text-ink3">
            ¿No tienes cuenta? Pídela al administrador de tu comunidad:
            <br />él crea tu acceso con tu rol y tu unidad.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-pine2" /> Correo verificado</span>
          <span className="flex items-center gap-1.5"><Building2 size={12} className="text-pine2" /> Tu comunidad, tus datos</span>
          <span className="hidden items-center gap-1.5 sm:flex"><Lock size={12} className="text-pine2" /> Pagos con Mercado Pago</span>
        </div>
      </div>
    </div>
  );
}
