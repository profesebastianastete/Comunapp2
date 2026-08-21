import { useEffect, useState } from "react";
import AdminPlatform from "./components/AdminPlatform";
import DashCondo from "./components/DashCondo";
import DashResidente from "./components/DashResidente";
import Home, { ApiDocs } from "./components/Home";
import Login from "./components/Login";
import { Btn, Icon, Logo, RolTag, Toaster, toast } from "./components/ui";
import { cambiarParcelaSesion, getSesion, ROL_LABEL, setSesion, usuarioActual, type Sesion } from "./lib/store";

type Vista = "home" | "login" | "api" | "app";

export default function App() {
  const [vista, setVista] = useState<Vista>("home");
  const [sesion, setSesionState] = useState<Sesion | null>(() => getSesion());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [vista]);

  const usuario = sesion ? usuarioActual(sesion) : null;

  // si el usuario fue eliminado mientras tanto, cerrar sesión con aviso
  useEffect(() => {
    if (sesion && !usuario) {
      setSesion(null);
      setSesionState(null);
      toast("Tu cuenta ya no existe. La sesión fue cerrada.", "warn");
    }
  }, [sesion, usuario]);

  const entrar = (s: Sesion) => {
    setSesionState(s);
    setVista("app");
    const u = usuarioActual(s);
    toast("Bienvenido, " + (u?.nombre.split(" ")[0] ?? "vecino") + " — sesión como " + ROL_LABEL[s.rol] + ".");
  };

  const salir = () => {
    setSesion(null);
    setSesionState(null);
    setVista("home");
    toast("Sesión cerrada. ¡Hasta pronto!", "warn");
  };

  const irA = (v: Vista) => setVista(v);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {vista === "home" && <Home nav={irA} sesion={!!sesion} panel={() => setVista("app")} />}
      {vista === "login" && <Login onLogin={entrar} back={() => irA("home")} />}
      {vista === "api" && <ApiDocs back={() => irA("home")} />}

      {vista === "app" && sesion && usuario && (
        <div className="min-h-screen">
          {/* barra de la aplicación */}
          <header className="sticky top-0 z-50 border-b-[1.5px] border-ink bg-paper/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-5 md:px-8">
              <button onClick={() => irA("home")} aria-label="Ir al sitio">
                <Logo />
              </button>

              <span className="hidden h-6 w-px bg-ink/20 sm:block" />

              {/* contexto del tenant */}
              <div className="hidden min-w-0 items-center gap-2 md:flex">
                <Icon name={sesion.rol === "SUPERADMIN" ? "sparkle" : "building"} size={15} className="shrink-0 text-pine" />
                <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink2">
                  {sesion.rol === "SUPERADMIN" ? "Consola global · todos los tenants" : "Tenant " + sesion.parcelaId?.slice(0, 8)}
                </span>
                {/* cambio de condominio si pertenece a varios */}
                {usuario.membresias.length > 1 && (
                  <select
                    className="field h-9! w-auto! border-ink/40! text-[12px]!"
                    value={sesion.parcelaId ?? ""}
                    onChange={(e) => {
                      const nueva = cambiarParcelaSesion(sesion, e.target.value);
                      if (nueva) {
                        setSesionState(nueva);
                        toast("Cambiaste a tu rol " + ROL_LABEL[nueva.rol] + " en otro condominio.");
                      }
                    }}
                  >
                    {usuario.membresias.map((m) => (
                      <option key={m.parcelaId} value={m.parcelaId}>
                        {m.parcelaId === "p_torres" ? "Torres del Parque" : m.parcelaId === "p_alamos" ? "Los Álamos" : m.parcelaId.slice(0, 8)} · {ROL_LABEL[m.rol]}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="ml-auto flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-[12.5px] font-semibold leading-tight text-ink">{usuario.nombre}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wide leading-tight text-ink3">{usuario.email}</p>
                </div>
                <RolTag rol={sesion.rol} label={ROL_LABEL[sesion.rol]} />
                <Btn variant="ghost" size="sm" onClick={salir}>
                  <Icon name="logout" size={14} /> <span className="hidden sm:inline">Salir</span>
                </Btn>
              </div>
            </div>
          </header>

          {/* consola según rol */}
          <main className="pb-16">
            {sesion.rol === "SUPERADMIN" && <AdminPlatform sesion={sesion} />}
            {(sesion.rol === "ADMIN" || sesion.rol === "COMITE") && <DashCondo sesion={sesion} usuario={usuario} />}
            {(sesion.rol === "PROPIETARIO" || sesion.rol === "ARRENDATARIO") && <DashResidente sesion={sesion} usuario={usuario} />}
          </main>

          <footer className="border-t-[1.5px] border-ink bg-paper2 py-6">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 md:px-8">
              <span>ComunApp · demo funcional — los datos simulan la API FastAPI en tu navegador</span>
              <button onClick={() => irA("api")} className="flex items-center gap-1.5 text-pine transition-colors hover:text-ink">
                <Icon name="python" size={13} /> ver la API en Python
              </button>
            </div>
          </footer>
        </div>
      )}

      <Toaster />
    </div>
  );
}
