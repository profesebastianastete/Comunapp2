import { Lock, RotateCcw } from "lucide-react";
import { Component, useEffect, useState, type ReactNode } from "react";
import AdminApp from "./components/AdminApp";
import Dashboard from "./components/Dashboard";
import Entrar from "./components/Entrar";
import Landing from "./components/Landing";
import { Btn, Logo, Toaster, toast } from "./components/ui";
import { getSesion, ROL_LABEL, setSesion, usuarioActual, type Sesion } from "./lib/store";

/* ── mini router por hash ───────────────────────────────────── */
function useRuta() {
  const [ruta, setRuta] = useState(() => (window.location.hash.replace(/^#/, "") || "/"));
  useEffect(() => {
    const on = () => setRuta(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return ruta;
}
const irA = (ruta: string) => {
  window.location.hash = ruta;
  window.scrollTo({ top: 0, behavior: "auto" });
};

export default function App() {
  const ruta = useRuta();
  const [sesion, setSesionState] = useState<Sesion | null>(() => getSesion());

  const alEntrar = (s: Sesion) => {
    setSesionState(s);
    irA(s.rol === "SUPERADMIN" ? "/adminapp" : "/dashboard");
    toast("Sesión iniciada como " + ROL_LABEL[s.rol] + ".");
  };
  const salir = () => {
    setSesion(null);
    setSesionState(null);
    irA("/");
    toast("Sesión cerrada. ¡Hasta pronto!", "warn");
  };

  /* guard de rutas */
  useEffect(() => {
    if (ruta === "/dashboard" && !sesion) irA("/entrar");
    if (ruta === "/adminapp" && sesion?.rol !== "SUPERADMIN") {
      // se mantiene la vista para mostrar el aviso de acceso restringido
    }
  }, [ruta, sesion]);

  /* sesión huérfana: la cuenta ya no existe en los datos (reset, redeploy, caché vieja) */
  useEffect(() => {
    if (sesion && !usuarioActual(sesion)) {
      setSesion(null);
      setSesionState(null);
      toast("Tu sesión venció porque los datos cambiaron. Vuelve a entrar.", "warn");
      irA("/entrar");
    }
  }, [sesion]);

  let vista: React.ReactNode;
  if (ruta === "/entrar") {
    vista = sesion
      ? <Redirigir a={sesion.rol === "SUPERADMIN" ? "/adminapp" : "/dashboard"} />
      : <Entrar onLogin={alEntrar} volver={() => irA("/")} />;
  } else if (ruta === "/dashboard") {
    vista = sesion
      ? sesion.rol === "SUPERADMIN"
        ? <Redirigir a="/adminapp" />
        : <Dashboard sesion={sesion} salir={salir} />
      : <Redirigir a="/entrar" />;
  } else if (ruta === "/adminapp") {
    vista = sesion?.rol === "SUPERADMIN"
      ? <AdminApp sesion={sesion} salir={salir} />
      : <AccesoRestringido entrar={() => irA("/entrar")} volver={() => irA("/")} />;
  } else {
    vista = <Landing entrar={() => irA(sesion ? (sesion.rol === "SUPERADMIN" ? "/adminapp" : "/dashboard") : "/entrar")} />;
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <ErrorBoundary>{vista}</ErrorBoundary>
      <Toaster />
    </div>
  );
}

/* Nunca más una pantalla en blanco: atrapa errores de render y ofrece recuperación */
class ErrorBoundary extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="dotgrid-soft flex min-h-screen flex-col items-center justify-center bg-paper px-5 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl border border-line bg-card text-signal shadow-soft">
          <RotateCcw size={26} />
        </span>
        <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-pine2">Algo se soltó</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          La pantalla encontró un problema
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink2">
          No es tu culpa. Recarga la página; si se repite, vuelve a entrar con tu cuenta (tus datos no se pierden).
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Btn variant="primary" size="lg" onClick={() => window.location.reload()}>
            <RotateCcw size={16} /> Recargar
          </Btn>
          <Btn
            variant="ghost" size="lg"
            onClick={() => {
              setSesion(null);
              window.location.hash = "/entrar";
              window.location.reload();
            }}
          >
            Volver a entrar
          </Btn>
        </div>
        <div className="mt-10"><Logo /></div>
      </div>
    );
  }
}

function Redirigir({ a }: { a: string }) {
  useEffect(() => { irA(a); }, [a]);
  return null;
}

/* pantalla para la ruta oculta sin permisos */
function AccesoRestringido({ entrar, volver }: { entrar: () => void; volver: () => void }) {
  return (
    <div className="dotgrid-dark flex min-h-screen flex-col items-center justify-center bg-deep px-5 text-center text-white">
      <span className="grid h-16 w-16 place-items-center rounded-2xl border border-neon/40 bg-neon/10 text-neon"><Lock size={30} /></span>
      <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.26em] text-neon">/adminapp · acceso restringido</p>
      <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-tight tracking-tight">
        Esta sala es solo para el<br />equipo de ComunApp.
      </h1>
      <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-white/60">
        El panel de administración de la plataforma requiere una cuenta de superadmin. Si tienes una, entra desde aquí.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Btn variant="neon" size="lg" onClick={entrar}>Ingresar con mi cuenta</Btn>
        <Btn variant="ghost" size="lg" onClick={volver} className="border-white/25! text-white/80! hover:border-white! hover:bg-white/10!">Volver al sitio</Btn>
      </div>
      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
        pista para la demo: equipo@comunapp.cl · admin123
      </p>
      <div className="mt-12"><Logo dark /></div>
    </div>
  );
}
