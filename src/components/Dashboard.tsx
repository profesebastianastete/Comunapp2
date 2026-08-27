import {
  AlertTriangle, BellRing, CalendarDays, CheckCircle2, Download, FileDown, KeyRound, LogOut,
  Megaphone, Menu, PieChart, Receipt, RefreshCw, ShieldCheck, UserRound, Vote, Wallet, Wrench, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  cancelarReserva, crearAviso, crearReserva, crearVotacion, datosComunidad, eliminarDocumento, fmtCLP, fmtFecha,
  fmtFechaHora, fmtMes, pagarCobro, ROL_LABEL, subirDocumento, usuarioActual, votar,
  type Aviso, type Cobro, type DatosComunidad, type DocumentoComunidad, type Pago, type Reserva, type Sesion, type Votacion,
} from "../lib/store";
import { Btn, Empty, EstadoTag, Field, Logo, Modal, ModalCambiarPassword, RolTag, Spinner, toast } from "./ui";
import { FormMovimiento, ModuloBitacora, ModuloCobranza, ModuloInforme, ModuloPagosMes, ModuloSuscripciones, ModuloVecinos } from "./DashAdmin";
import { generarReciboPDF } from "../lib/pdf";

type Modulo =
  | "tus-pagos" | "historial" | "transparencia" | "informe" | "avisos" | "reservas" | "participacion"
  | "pagos-mes" | "cobranza" | "suscripciones" | "vecinos" | "bitacora";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════ SHELL ═══════════════════ */
export default function Dashboard({ sesion, salir }: { sesion: Sesion; salir: () => void }) {
  const usuario = usuarioActual(sesion);
  const [datos, setDatos] = useState<DatosComunidad | null>(null);
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [modalPass, setModalPass] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [cargaLenta, setCargaLenta] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);

  const esResidente = sesion.rol === "PROPIETARIO" || sesion.rol === "ARRENDATARIO";
  const esAdmin = sesion.rol === "ADMIN";

  const recargar = async () => {
    // Sin comunidad no hay nada que cargar: mostrar un mensaje claro en vez de
    // dejar el spinner girando para siempre.
    if (!sesion.comunidadId) {
      setDatos(null);
      setErrorCarga(
        "Tu cuenta no tiene una comunidad asociada en esta sesión. " +
        "Vuelve a entrar; si el problema sigue, contacta a quien administra tu comunidad.",
      );
      return;
    }
    setErrorCarga(null);
    setCargaLenta(false);
    // Si la carga demora, avisar que el servidor puede estar despertando
    // (el plan gratuito de Railway duerme el servicio tras inactividad).
    const tLento = window.setTimeout(() => setCargaLenta(true), 2500);
    try {
      setDatos(await datosComunidad(sesion.comunidadId));
    } catch (e) {
      setDatos(null);
      setErrorCarga(e instanceof Error ? e.message : "Error inesperado al cargar la comunidad.");
    } finally {
      window.clearTimeout(tLento);
    }
  };
  useEffect(() => { void recargar(); }, [sesion.comunidadId, sesion.token]);

  // módulo por defecto según rol
  useEffect(() => {
    setModulo(esResidente ? "tus-pagos" : "pagos-mes");
  }, [sesion.comunidadId, sesion.token, esResidente]);

  const nav: { id: Modulo; label: string; icon: typeof Wallet; extra?: boolean }[] = useMemo(() => {
    if (esResidente) {
      const base = [
        { id: "tus-pagos" as Modulo, label: "Tus Pagos", icon: Wallet },
        { id: "historial" as Modulo, label: "Pagos del mes", icon: Receipt },
        { id: "transparencia" as Modulo, label: "Transparencia", icon: PieChart },
        { id: "avisos" as Modulo, label: "Muro de avisos", icon: Megaphone },
      ];
      const recursos = datos?.comunidad.recursos ?? { reservas: true, bitacora: true };
      if (sesion.rol === "PROPIETARIO") {
        if (recursos.reservas) base.push({ id: "reservas" as Modulo, label: "Reservas", icon: CalendarDays });
        base.push({ id: "participacion" as Modulo, label: "Participación", icon: Vote });
      }
      return base;
    }
    const recursos = datos?.comunidad.recursos ?? { reservas: true, bitacora: true };
    return [
      { id: "pagos-mes", label: "Pagos del mes", icon: Wallet },
      { id: "transparencia", label: esAdmin ? "Transparencia Activa" : "Transparencia", icon: PieChart },
      { id: "informe", label: "Informe mensual", icon: FileDown },
      { id: "cobranza", label: "Cobros en línea", icon: Receipt },
      { id: "suscripciones", label: "Pagos automáticos", icon: RefreshCw },
      { id: "avisos", label: "Muro de avisos", icon: Megaphone },
      ...(recursos.reservas ? [{ id: "reservas" as Modulo, label: "Reservas", icon: CalendarDays }] : []),
      { id: "participacion", label: "Participación", icon: Vote },
      ...(esAdmin ? [{ id: "vecinos" as Modulo, label: "Vecinos", icon: ShieldCheck }] : []),
      ...(recursos.bitacora ? [{ id: "bitacora" as Modulo, label: "Control de acceso", icon: ShieldCheck }] : []),
    ];
  }, [esResidente, esAdmin, sesion.rol, datos]);

  // Si el módulo activo fue desactivado (ej: superadmin apagó Reservas), volver al módulo por defecto
  useEffect(() => {
    if (nav.length > 0 && !nav.some((n) => n.id === modulo)) {
      setModulo(esResidente ? "tus-pagos" : "pagos-mes");
    }
  }, [nav, modulo, esResidente]);

  // Título de la sección actual (visible en pantallas pequeñas)
  const tituloModulo = nav.find((n) => n.id === modulo)?.label ?? "Panel";

  if (!usuario) {
    // Sesión huérfana (cuenta eliminada, datos reiniciados o caché antigua):
    // nunca dejar la pantalla en blanco.
    return (
      <div className="dotgrid-soft flex min-h-screen flex-col items-center justify-center bg-paper px-5 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl border border-line bg-card text-amber shadow-soft">
          <AlertTriangle size={28} />
        </span>
        <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-pine2">Sesión vencida</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Tu cuenta no está en los datos actuales
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink2">
          Puede que los datos se hayan reiniciado o que esta sesión sea de una versión anterior. Vuelve a entrar con tu correo y contraseña.
        </p>
        <Btn variant="primary" size="lg" className="mt-7" onClick={salir}>
          <KeyRound size={16} /> Volver a entrar
        </Btn>
      </div>
    );
  }

  return (
    <div className="dotgrid-soft min-h-screen bg-paper">
      {/* topbar */}
      <header className="glass sticky top-0 z-50 border-b border-line/80">
        <div className="mx-auto flex h-[64px] max-w-[1400px] items-center gap-3 px-4 sm:px-5 md:gap-4 md:px-8">
          <span className="shrink-0"><Logo small /></span>
          <span className="hidden h-6 w-px bg-line lg:block" />
          {/* Título de la sección actual (pantallas pequeñas) */}
          <div className="min-w-0 lg:hidden">
            <p className="truncate font-display text-[15px] font-bold leading-tight text-ink">{tituloModulo}</p>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">{datos?.comunidad.nombre ?? "Tu comunidad"}</p>
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate font-display text-[15px] font-bold leading-tight text-ink">{datos?.comunidad.nombre ?? "Tu comunidad"}</p>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink3">{datos?.comunidad.ciudad} · {datos?.comunidad.unidades} unidades</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
            {/* Escritorio */}
            <div className="hidden text-right lg:block">
              <p className="text-[12.5px] font-semibold leading-tight text-ink">{usuario.nombre}</p>
              <p className="font-mono text-[9.5px] uppercase tracking-wide text-ink3">{sesion.unidad ?? ROL_LABEL[sesion.rol]}</p>
            </div>
            <span className="hidden md:block"><RolTag rol={sesion.rol} label={ROL_LABEL[sesion.rol]} /></span>
            <button
              onClick={() => setModalPass(true)}
              title="Cambiar contraseña" aria-label="Cambiar contraseña"
              className="hidden h-9 w-9 place-items-center rounded-xl border border-line bg-card text-ink2 transition-all hover:-translate-y-0.5 hover:border-pine hover:text-pine hover:shadow-soft lg:grid"
            >
              <KeyRound size={15} />
            </button>
            <span className="hidden lg:block"><Btn variant="ghost" size="sm" onClick={salir} title="Salir">Salir</Btn></span>
            {/* Móvil: perfil (dropdown) + hamburguesa */}
            <div className="relative lg:hidden">
              <button
                onClick={() => setPerfilAbierto((v) => !v)}
                aria-label="Menú de usuario" aria-expanded={perfilAbierto}
                className={"grid h-9 w-9 place-items-center rounded-xl border transition-all active:scale-95 " + (perfilAbierto ? "border-pine bg-pine text-white" : "border-line bg-card text-ink2 hover:border-pine hover:text-pine")}
              >
                <UserRound size={16} />
              </button>
              {perfilAbierto && (
                <>
                  <button className="fixed inset-0 z-[80] cursor-default" onClick={() => setPerfilAbierto(false)} aria-label="Cerrar menú de usuario" />
                  <div className="pop-in absolute right-0 top-[calc(100%+10px)] z-[81] w-64 rounded-2xl border border-line bg-card p-2 shadow-lift">
                    <div className="border-b border-line px-3 py-2.5">
                      <p className="truncate text-[13.5px] font-bold text-ink">{usuario.nombre}</p>
                      <p className="truncate font-mono text-[10px] text-ink3">{usuario.email}</p>
                      <div className="mt-2"><RolTag rol={sesion.rol} label={ROL_LABEL[sesion.rol]} /></div>
                    </div>
                    <button onClick={() => { setPerfilAbierto(false); setModalPass(true); }} className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-[13px] font-semibold text-ink2 transition-colors hover:bg-paper active:bg-paper">
                      <KeyRound size={15} className="text-pine2" /> Cambiar contraseña
                    </button>
                    <button onClick={salir} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-[13px] font-semibold text-signal transition-colors hover:bg-signal/10 active:bg-signal/10">
                      <LogOut size={15} /> Salir
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú de navegación"
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-card text-ink transition-all hover:border-pine hover:text-pine active:scale-95 lg:hidden"
            >
              <Menu size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer de navegación (móvil / tablet) */}
      {menuAbierto && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button className="absolute inset-0 bg-deep/50 backdrop-blur-[2px]" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú" />
          <aside className="slide-in-right absolute right-0 top-0 flex h-full w-[300px] max-w-[86vw] flex-col border-l border-line bg-paper shadow-lift">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-display text-[16px] font-bold text-ink">{datos?.comunidad.nombre ?? "Tu comunidad"}</p>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink3">{datos?.comunidad.ciudad ?? "—"} · {ROL_LABEL[sesion.rol]}</p>
              </div>
              <button onClick={() => setMenuAbierto(false)} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-card text-ink2 transition-all hover:border-pine hover:text-pine active:scale-95">
                <X size={16} />
              </button>
            </div>
            <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
              {nav.map((n) => {
                const activo = modulo === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => { setModulo(n.id); setMenuAbierto(false); }}
                    className={
                      "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left font-mono text-[11.5px] font-bold uppercase tracking-[0.08em] transition-all active:scale-[0.98] " +
                      (activo ? "border-pine bg-pine text-white shadow-soft" : "border-line bg-card text-ink2 hover:border-pine/60 hover:text-pine")
                    }
                  >
                    <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-lg " + (activo ? "bg-neon text-deep" : "bg-paper text-pine")}>
                      <n.icon size={17} />
                    </span>
                    <span className="truncate">{n.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="space-y-1 border-t border-line p-4">
              <button onClick={() => { setMenuAbierto(false); setModalPass(true); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-[13px] font-semibold text-ink2 transition-colors hover:bg-card active:bg-card">
                <KeyRound size={15} className="text-pine2" /> Cambiar contraseña
              </button>
              <button onClick={salir} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-[13px] font-semibold text-signal transition-colors hover:bg-signal/10 active:bg-signal/10">
                <LogOut size={15} /> Salir
              </button>
            </div>
          </aside>
        </div>
      )}

      <ModalCambiarPassword open={modalPass} onClose={() => setModalPass(false)} usuario={usuario.nombre} />

      <div className="mx-auto grid max-w-[1400px] gap-7 px-5 py-8 md:px-8 lg:grid-cols-[230px_1fr]">
        {/* sidebar (solo escritorio; en pantallas pequeñas lo reemplaza el drawer) */}
        <aside className="hidden lg:sticky lg:top-[88px] lg:block lg:self-start">
          <nav className="flex flex-col gap-1.5">
            {nav.map((n) => {
              const activo = modulo === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setModulo(n.id)}
                  className={
                    "flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.08em] transition-all duration-150 " +
                    (activo
                      ? "border-pine bg-pine text-white shadow-soft"
                      : "border-transparent text-ink2 hover:border-line hover:bg-card hover:text-pine")
                  }
                >
                  <n.icon size={15} className={activo ? "text-neon" : "text-pine2"} />
                  {n.label}
                  {activo && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-neon lg:block" />}
                </button>
              );
            })}
          </nav>
          <div className="mt-5 hidden rounded-2xl border border-line bg-card p-4 shadow-soft lg:block">
            <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-ink3">Tu rol</p>
            <p className="mt-1.5 text-[13px] leading-snug text-ink2">
              {esResidente
                ? "Ves tus pagos, la transparencia de la comunidad y participas en la vida vecinal."
                : esAdmin
                  ? "Administra los pagos del mes, la transparencia, los vecinos y el acceso."
                  : "Supervisa la comunidad: todo en lectura, con avisos y control de acceso."}
            </p>
          </div>
        </aside>

        {/* contenido */}
        <main className="min-w-0">
          {!datos ? (
            errorCarga ? (
              <div className="mx-auto max-w-lg py-20 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-signal/40 bg-signal/10 text-signal">
                  <AlertTriangle size={24} />
                </span>
                <p className="mt-5 font-display text-xl font-bold text-ink">No se pudo cargar tu comunidad</p>
                <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-ink2">{errorCarga}</p>
                <p className="mt-2 font-mono text-[10.5px] uppercase tracking-wide text-ink3">
                  Si acaba de haber un despliegue, espera 10 segundos y reintenta.
                </p>
                <Btn variant="primary" className="mt-6" onClick={() => void recargar()}>
                  <RefreshCw size={15} /> Reintentar
                </Btn>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-28 text-ink2">
                <div className="flex items-center gap-3">
                  <Spinner className="h-5 w-5" />
                  <span className="font-mono text-[12px] uppercase tracking-[0.16em]">Cargando tu comunidad…</span>
                </div>
                {cargaLenta && (
                  <p className="ticker-in max-w-sm text-center text-[12.5px] leading-relaxed text-ink3">
                    Está tomando más de lo usual: el servidor puede estar <strong className="text-ink2">despertando del reposo</strong> (plan gratuito).
                    Espera unos segundos; si no carga, usa <em>Reintentar</em> más abajo.
                  </p>
                )}
                {cargaLenta && (
                  <Btn variant="ghost" size="sm" onClick={() => void recargar()}>
                    <RefreshCw size={13} /> Reintentar ahora
                  </Btn>
                )}
              </div>
            )
          ) : modulo === "tus-pagos" ? (
            <ModuloTusPagos datos={datos} sesion={sesion} recargar={recargar} />
          ) : modulo === "historial" ? (
            <ModuloHistorial datos={datos} sesion={sesion} />
          ) : modulo === "transparencia" ? (
            <ModuloTransparencia datos={datos} esAdmin={esAdmin} recargar={recargar} />
          ) : modulo === "informe" ? (
            <ModuloInforme datos={datos} recargar={recargar} />
          ) : modulo === "avisos" ? (
            <ModuloAvisos datos={datos} puedePublicar={!esResidente} autor={usuario.nombre} recargar={recargar} />
          ) : modulo === "reservas" ? (
            <ModuloReservas datos={datos} sesion={sesion} usuarioNombre={usuario.nombre} recargar={recargar} />
          ) : modulo === "participacion" ? (
            <ModuloParticipacion datos={datos} sesion={sesion} recargar={recargar} />
          ) : modulo === "pagos-mes" ? (
            <ModuloPagosMes datos={datos} sesion={sesion} recargar={recargar} />
          ) : modulo === "cobranza" ? (
            <ModuloCobranza datos={datos} sesion={sesion} recargar={recargar} />
          ) : modulo === "suscripciones" ? (
            <ModuloSuscripciones datos={datos} recargar={recargar} />
          ) : modulo === "vecinos" ? (
            <ModuloVecinos datos={datos} recargar={recargar} />
          ) : (
            <ModuloBitacora datos={datos} recargar={recargar} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════ TUS PAGOS ═══════════════════ */
function ModuloTusPagos({ datos, sesion, recargar }: { datos: DatosComunidad; sesion: Sesion; recargar: () => Promise<void> }) {
  const unidad = sesion.unidad ?? "";
  const [modal, setModal] = useState<{ cobros: Cobro[] } | null>(null);
  const vinculado = datos.comunidad.vinculacion.conectada;

  const mios = datos.cobros.filter((c) => c.unidad === unidad).sort((a, b) => (a.estado === "PAGADO" ? 1 : 0) - (b.estado === "PAGADO" ? 1 : 0) || b.periodo.localeCompare(a.periodo));
  const pendientes = mios.filter((c) => c.estado !== "PAGADO");
  const totalPendiente = pendientes.reduce((a, c) => a + c.monto, 0);
  const alDia = pendientes.length === 0;

  return (
    <div className="fade-swap space-y-6">
      {/* cabecera */}
      <div className={"relative overflow-hidden rounded-2xl border p-7 " + (alDia ? "border-neon2/70 bg-neon/15" : "border-line bg-card shadow-soft")}>
        <div className="flex flex-wrap items-center gap-5">
          <span className={"grid h-14 w-14 place-items-center rounded-2xl " + (alDia ? "bg-pine text-neon" : "bg-paper text-pine border border-line")}>
            {alDia ? <CheckCircle2 size={27} /> : <Wallet size={26} />}
          </span>
          <div className="min-w-[200px] flex-1">
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-pine2">Tus Pagos · {unidad}</p>
            <h2 className="mt-1 font-display text-[28px] font-bold leading-tight tracking-tight text-ink">
              {alDia ? "¡Estás al día! Gracias por mantener la comunidad en orden." : fmtCLP(totalPendiente) + " por pagar"}
            </h2>
            <p className="mt-1 text-[13px] text-ink2">
              {alDia ? "No tienes pagos pendientes." : pendientes.length + (pendientes.length === 1 ? " pago pendiente. " : " pagos pendientes. ") + "Paga en línea en menos de un minuto."}
            </p>
          </div>
          {!alDia && (
            <Btn variant="neon" size="lg" onClick={() => setModal({ cobros: pendientes })} disabled={!vinculado}>
              <Wallet size={17} /> Pagar con Mercado Pago
            </Btn>
          )}
        </div>
        {!vinculado && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber/50 bg-amber/10 px-4 py-2.5 text-[12.5px] text-[#6d4d10]">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            Tu comunidad aún no habilita los pagos en línea. Mientras tanto, puedes pagar en la administración.
          </p>
        )}
      </div>

      {/* lista de cobros */}
      <div className="rounded-2xl border border-line bg-card shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-xl font-bold text-ink">Estado de cuenta</h3>
          <p className="text-[12.5px] text-ink3">Todo lo cobrado a {unidad}, mes a mes</p>
        </div>
        {mios.length === 0 ? (
          <div className="p-6"><Empty title="Sin cobros todavía" sub="Cuando la administración genere los pagos del mes, aparecerán aquí." /></div>
        ) : (
          <ul className="divide-y divide-line/70">
            {mios.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-paper/70">
                <span className={"grid h-10 w-10 place-items-center rounded-xl " + (c.estado === "PAGADO" ? "bg-neon/30 text-pine" : "bg-paper text-ink3 border border-line")}>
                  {c.estado === "PAGADO" ? <CheckCircle2 size={18} /> : <Wallet size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{c.concepto}</p>
                  <p className="font-mono text-[10.5px] uppercase tracking-wide text-ink3">{fmtMes(c.periodo)} · vence {fmtFecha(c.vencimiento)}</p>
                </div>
                <p className="tnum font-mono text-[14px] font-bold text-ink">{fmtCLP(c.monto)}</p>
                <EstadoTag estado={c.estado} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal && <ModalPago datos={datos} cobros={modal.cobros} onClose={() => setModal(null)} recargar={recargar} />}
    </div>
  );
}

/* ── modal de pago con Mercado Pago ── */
function ModalPago({ datos, cobros, onClose, recargar }: { datos: DatosComunidad; cobros: Cobro[]; onClose: () => void; recargar: () => Promise<void> }) {
  const [fase, setFase] = useState<"form" | "procesando" | "listo">("form");
  const [msg, setMsg] = useState("");
  const [ultimo, setUltimo] = useState<Pago | null>(null);
  const [tarjeta, setTarjeta] = useState({ num: "", nombre: "", exp: "", cvc: "" });

  const total = cobros.reduce((a, c) => a + c.monto, 0);

  const confirmar = async () => {
    const limpio = tarjeta.num.replace(/\s/g, "");
    if (limpio.length < 12 || !tarjeta.nombre.trim() || tarjeta.exp.length < 4 || tarjeta.cvc.length < 3) {
      toast("Completa los datos de la tarjeta.", "warn");
      return;
    }
    setFase("procesando");
    const pasos = ["Conectando con Mercado Pago…", "Verificando la tarjeta…", "Confirmando el pago…"];
    for (const p of pasos) {
      setMsg(p);
      await espera(800);
    }
    let ultimoPago: Pago | null = null;
    for (const c of cobros) {
      ultimoPago = await pagarCobro(datos.comunidad.id, c.id);
    }
    setUltimo(ultimoPago);
    setFase("listo");
    await recargar();
    toast("¡Pago recibido! Tu estado de cuenta está actualizado.");
  };

  return (
    <Modal open onClose={onClose} title={fase === "listo" ? "Comprobante de pago" : "Pagar con Mercado Pago"}>
      {fase === "form" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-paper px-4 py-3.5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink3">Resumen</p>
            {cobros.map((c) => (
              <p key={c.id} className="mt-1 flex justify-between text-[13px] text-ink2">
                <span>{c.concepto} · {fmtMes(c.periodo)}</span>
                <span className="tnum font-mono font-semibold text-ink">{fmtCLP(c.monto)}</span>
              </p>
            ))}
            <p className="mt-2 flex justify-between border-t border-dashed border-line pt-2 text-[14px] font-bold text-ink">
              <span>Total</span><span className="tnum font-mono">{fmtCLP(total)}</span>
            </p>
          </div>
          <Field label="Número de tarjeta">
            <input className="field font-mono" inputMode="numeric" placeholder="4509 9535 6623 3704" maxLength={19}
              value={tarjeta.num}
              onChange={(e) => setTarjeta({ ...tarjeta, num: e.target.value.replace(/[^\d]/g, "").replace(/(\d{4})(?=\d)/g, "$1 ") })} />
          </Field>
          <Field label="Nombre en la tarjeta">
            <input className="field" placeholder="Como aparece en la tarjeta" value={tarjeta.nombre} onChange={(e) => setTarjeta({ ...tarjeta, nombre: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vencimiento"><input className="field font-mono" placeholder="12/27" maxLength={5} value={tarjeta.exp}
              onChange={(e) => setTarjeta({ ...tarjeta, exp: e.target.value.replace(/[^\d]/g, "").replace(/(\d{2})(?=\d)/, "$1/") })} /></Field>
            <Field label="CVC"><input className="field font-mono" placeholder="123" maxLength={4} value={tarjeta.cvc} onChange={(e) => setTarjeta({ ...tarjeta, cvc: e.target.value.replace(/[^\d]/g, "") })} /></Field>
          </div>
          <Btn variant="neon" size="lg" className="w-full" onClick={() => void confirmar()}>
            Pagar {fmtCLP(total)}
          </Btn>
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">Tarjeta de prueba · ningún cargo es real</p>
        </div>
      )}

      {fase === "procesando" && (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-pine text-neon"><Spinner className="h-7 w-7" /></span>
          <p className="mt-5 font-display text-xl font-bold text-ink">{msg}</p>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink3">No cierres esta ventana</p>
        </div>
      )}

      {fase === "listo" && ultimo && (
        <div className="space-y-4">
          <div className="flex flex-col items-center pt-2 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-neon text-deep"><CheckCircle2 size={32} /></span>
            <p className="mt-4 font-display text-2xl font-bold text-ink">¡Pago exitoso!</p>
            <p className="mt-1 text-[13.5px] text-ink2">Mercado Pago confirmó tu pago de <strong className="text-ink">{fmtCLP(total)}</strong>.</p>
          </div>
          <div className="rounded-xl border border-line bg-paper px-4 py-3.5 font-mono text-[12px] text-ink2">
            <p className="flex justify-between"><span className="uppercase tracking-wide text-ink3">Referencia</span><span className="font-bold text-pine">{ultimo.referencia}</span></p>
            <p className="mt-1.5 flex justify-between"><span className="uppercase tracking-wide text-ink3">Fecha</span><span>{fmtFechaHora(ultimo.fecha)}</span></p>
            <p className="mt-1.5 flex justify-between"><span className="uppercase tracking-wide text-ink3">Comunidad</span><span>{datos.comunidad.nombre}</span></p>
          </div>
          <div className="flex justify-end gap-2.5">
            <Btn variant="ghost" onClick={() => descargarRecibo(ultimo, datos.comunidad.nombre)}><Download size={15} /> Recibo</Btn>
            <Btn variant="primary" onClick={onClose}>Listo</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function descargarRecibo(p: Pago, comunidad: string, residente = "Vecino/a", concepto = "Pagos del mes") {
  // Recibo en formato PDF (antes era .txt)
  generarReciboPDF({
    comunidad,
    unidad: p.unidad,
    residente,
    concepto,
    monto: p.monto,
    metodo: p.metodo,
    referencia: p.referencia,
    fecha: p.fecha,
  }).save("recibo-" + p.referencia + ".pdf");
}

/* ═══════════════════ HISTORIAL ═══════════════════ */
function ModuloHistorial({ datos, sesion }: { datos: DatosComunidad; sesion: Sesion }) {
  const mios = datos.pagos
    .filter((p) => p.unidad === sesion.unidad)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const totalAno = mios.reduce((a, p) => a + p.monto, 0);

  return (
    <div className="fade-swap space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Pagos del mes</h2>
          <p className="text-[13px] text-ink3">Tu historial de pagos y comprobantes</p>
        </div>
        <p className="rounded-xl border border-line bg-card px-4 py-2.5 font-mono text-[12px] text-ink2 shadow-soft">
          Total aportado: <strong className="text-pine">{fmtCLP(totalAno)}</strong>
        </p>
      </div>

      {mios.length === 0 ? (
        <Empty title="Aún no tienes pagos registrados" sub="Cuando pagues el mes, tus comprobantes aparecerán aquí." />
      ) : (
        <div className="rounded-2xl border border-line bg-card shadow-soft">
          <ul className="divide-y divide-line/70">
            {mios.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3.5 px-5 py-4 transition-colors hover:bg-paper/70">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon/30 text-pine"><CheckCircle2 size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">Pagos del mes · {p.unidad}</p>
                  <p className="font-mono text-[10.5px] uppercase tracking-wide text-ink3">{p.metodo} · {p.referencia} · {fmtFechaHora(p.fecha)}</p>
                </div>
                <p className="tnum font-mono text-[14px] font-bold text-pine">{fmtCLP(p.monto)}</p>
                <button onClick={() => descargarRecibo(p, datos.comunidad.nombre)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-wide text-ink2 transition-colors hover:border-pine hover:text-pine">
                  <Download size={13} /> Recibo
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ TRANSPARENCIA ═══════════════════ */
function ModuloTransparencia({ datos, esAdmin, recargar }: { datos: DatosComunidad; esAdmin: boolean; recargar: () => Promise<void> }) {
  const movs = datos.movimientos;
  const ingresos = movs.filter((m) => m.tipo === "INGRESO").reduce((a, m) => a + m.monto, 0);
  const gastos = movs.filter((m) => m.tipo === "GASTO").reduce((a, m) => a + m.monto, 0);

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    movs.filter((m) => m.tipo === "GASTO").forEach((m) => mapa.set(m.categoria, (mapa.get(m.categoria) ?? 0) + m.monto));
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [movs]);
  const maxCat = Math.max(...porCategoria.map(([, v]) => v), 1);

  const maxMes = Math.max(ingresos, gastos, 1);

  return (
    <div className="fade-swap space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{esAdmin ? "Transparencia Activa" : "Transparencia"}</h2>
        <p className="text-[13px] text-ink3">
          {esAdmin ? "Registra cada movimiento y la comunidad lo verá al instante." : "En qué se usa el dinero de la comunidad, a la vista de todos."}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card-in rounded-2xl border border-line bg-card p-5 shadow-soft">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink3">Ingresos</p>
              <p className="tnum mt-1.5 font-display text-[26px] font-bold text-pine">{fmtCLP(ingresos)}</p>
            </div>
            <div className="card-in rounded-2xl border border-line bg-card p-5 shadow-soft" style={{ ["--ci-delay" as never]: "80ms" }}>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink3">Gastos</p>
              <p className="tnum mt-1.5 font-display text-[26px] font-bold text-signal">{fmtCLP(gastos)}</p>
            </div>
            <div className="card-in rounded-2xl border border-pine bg-pine p-5 shadow-soft" style={{ ["--ci-delay" as never]: "160ms" }}>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-neon">Saldo</p>
              <p className="tnum mt-1.5 font-display text-[26px] font-bold text-white">{fmtCLP(ingresos - gastos)}</p>
            </div>
          </div>

          {/* ingresos vs gastos */}
          <div className="rounded-2xl border border-line bg-card p-6 shadow-soft">
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink3">Ingresos vs gastos</p>
            <div className="mt-5 flex h-44 items-end gap-8 px-4">
              {[{ l: "Ingresos", v: ingresos, c: "bg-pine" }, { l: "Gastos", v: gastos, c: "bg-neon2" }].map((b) => (
                <div key={b.l} className="flex h-full flex-1 flex-col items-center justify-end gap-2.5">
                  <span className="tnum font-mono text-[12px] font-bold text-ink">{fmtCLP(b.v)}</span>
                  <div className="bar-up w-full max-w-[90px] rounded-t-xl" style={{ height: Math.max(8, (b.v / maxMes) * 100) + "%", background: b.c === "bg-pine" ? "#0c3b2e" : "#c9f24b", border: b.c === "bg-neon2" ? "1.5px solid #0c3b2e" : "none", animationDelay: "0.15s" }} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">{b.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* por categoría */}
          <div className="rounded-2xl border border-line bg-card p-6 shadow-soft">
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink3">¿En qué se gasta?</p>
            <div className="mt-4 space-y-3.5">
              {porCategoria.map(([cat, v], i) => (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-[12.5px]">
                    <span className="font-semibold text-ink">{cat}</span>
                    <span className="tnum font-mono text-ink2">{fmtCLP(v)} · {Math.round((v / (gastos || 1)) * 100)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-paper">
                    <div className="bar-x h-full rounded-full bg-pine" style={{ width: (v / maxCat) * 100 + "%", animationDelay: i * 90 + "ms" }} />
                  </div>
                </div>
              ))}
              {porCategoria.length === 0 && <p className="text-[13px] text-ink3">Aún no hay gastos registrados.</p>}
            </div>
          </div>

          {/* movimientos */}
          <div className="rounded-2xl border border-line bg-card shadow-soft">
            <div className="border-b border-line px-5 py-3.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink3">Últimos movimientos</div>
            <ul className="divide-y divide-line/70">
              {[...movs].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8).map((m) => (
                <li key={m.id} className="flex items-center gap-3.5 px-5 py-3.5">
                  <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl " + (m.tipo === "INGRESO" ? "bg-neon/30 text-pine" : "bg-paper text-ink3 border border-line")}>
                    {m.tipo === "INGRESO" ? <Wallet size={16} /> : <Wrench size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{m.descripcion}</p>
                    <p className="font-mono text-[10.5px] uppercase tracking-wide text-ink3">{m.categoria} · {fmtFecha(m.fecha)}</p>
                  </div>
                  <span className={"tnum font-mono text-[13.5px] font-bold " + (m.tipo === "INGRESO" ? "text-pine" : "text-ink")}>
                    {m.tipo === "INGRESO" ? "+" : "−"}{fmtCLP(m.monto)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* formulario admin */}
        <div className="space-y-5">
          {esAdmin ? (
            <div className="lg:sticky lg:top-[88px]"><FormMovimiento datos={datos} recargar={recargar} /></div>
          ) : (
            <div className="rounded-2xl border border-dashed border-pine2/40 bg-pine/[0.05] p-6">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-ink"><PieChart size={19} className="text-pine2" /> Solo lectura</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink2">
                Como comité puedes revisar toda la información financiera. El registro de movimientos lo hace el administrador.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ AVISOS ═══════════════════ */
function ModuloAvisos({ datos, puedePublicar, autor, recargar }: { datos: DatosComunidad; puedePublicar: boolean; autor: string; recargar: () => Promise<void> }) {
  const [form, setForm] = useState({ titulo: "", cuerpo: "", tipo: "INFORMATIVO" as Aviso["tipo"] });
  const [busy, setBusy] = useState(false);

  const publicar = async () => {
    if (!form.titulo.trim() || !form.cuerpo.trim()) { toast("Escribe un título y el contenido del aviso.", "warn"); return; }
    setBusy(true);
    await crearAviso(datos.comunidad.id, { ...form, autor });
    await recargar();
    setBusy(false);
    setForm({ titulo: "", cuerpo: "", tipo: "INFORMATIVO" });
    toast("Aviso publicado. Los vecinos ya pueden verlo en su muro.");
  };

  const estilo: Record<Aviso["tipo"], { chip: string; icono: typeof BellRing; borde: string }> = {
    EMERGENCIA: { chip: "bg-signal text-white", icono: AlertTriangle, borde: "border-l-signal" },
    MANTENCION: { chip: "bg-amber/20 text-[#8a6114]", icono: Wrench, borde: "border-l-amber" },
    INFORMATIVO: { chip: "bg-neon/30 text-pine", icono: BellRing, borde: "border-l-pine2" },
  };

  return (
    <div className="fade-swap space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Muro de avisos</h2>
        <p className="text-[13px] text-ink3">Noticias y avisos de tu comunidad, siempre a la mano</p>
      </div>

      {puedePublicar && (
        <div className="rounded-2xl border border-line bg-card p-5 shadow-soft">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-ink"><Megaphone size={19} className="text-pine2" /> Publicar un aviso</p>
          <div className="mt-3.5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <input className="field" placeholder="Título del aviso" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              <select className="field" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Aviso["tipo"] })}>
                <option value="INFORMATIVO">Informativo</option>
                <option value="MANTENCION">Mantención</option>
                <option value="EMERGENCIA">Emergencia</option>
              </select>
            </div>
            <textarea className="field min-h-[84px]" placeholder="Cuéntale a los vecinos…" value={form.cuerpo} onChange={(e) => setForm({ ...form, cuerpo: e.target.value })} />
            <div className="flex justify-end"><Btn variant="neon" onClick={() => void publicar()} disabled={busy}>{busy ? <Spinner /> : <>Publicar en el muro</>}</Btn></div>
          </div>
        </div>
      )}

      {datos.avisos.length === 0 ? (
        <Empty title="El muro está vacío" sub="Aquí aparecerán las noticias y avisos de la comunidad." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {datos.avisos.map((a, i) => {
            const e = estilo[a.tipo];
            return (
              <article key={a.id} className={"card-in rounded-2xl border border-line border-l-4 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift " + e.borde} style={{ ["--ci-delay" as never]: Math.min(i, 6) * 70 + "ms" }}>
                <div className="flex items-center gap-2">
                  <span className={"rounded-full px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] " + e.chip}>{a.tipo}</span>
                  <span className="ml-auto font-mono text-[10.5px] uppercase text-ink3">{fmtFecha(a.creado)}</span>
                </div>
                <h3 className="mt-3 flex items-start gap-2 font-display text-[19px] font-bold leading-tight text-ink">
                  <e.icono size={18} className="mt-1 shrink-0 text-pine2" /> {a.titulo}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink2">{a.cuerpo}</p>
                <p className="mt-3 font-mono text-[10.5px] uppercase tracking-wide text-ink3">— {a.autor}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ RESERVAS ═══════════════════ */
const AREAS = ["Quincho central", "Sala multiuso", "Cancha de tenis"];
const BLOQUES: Reserva["bloque"][] = ["MAÑANA", "TARDE", "DÍA COMPLETO"];
function ModuloReservas({ datos, sesion, usuarioNombre, recargar }: { datos: DatosComunidad; sesion: Sesion; usuarioNombre: string; recargar: () => Promise<void> }) {
  const [area, setArea] = useState(AREAS[0]);
  const [fecha, setFecha] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [bloque, setBloque] = useState<Reserva["bloque"]>("TARDE");
  const [busy, setBusy] = useState(false);
  const [cancelando, setCancelando] = useState<string | null>(null);

  const puedeReservar = sesion.rol === "PROPIETARIO";
  const diaSel = datos.reservas.filter((r) => r.area === area && r.fecha === fecha);

  const reservar = async () => {
    setBusy(true);
    try {
      await crearReserva(datos.comunidad.id, { area, fecha, bloque, unidad: sesion.unidad ?? "—", residente: usuarioNombre });
      await recargar();
      toast("¡Reserva confirmada! El " + area.toLowerCase() + " es tuyo en ese horario.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo reservar.", "warn");
    }
    setBusy(false);
  };

  return (
    <div className="fade-swap space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Reservas de espacios</h2>
        <p className="text-[13px] text-ink3">Quincho, sala y cancha · sin listas de papel</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="h-fit rounded-2xl border border-line bg-card p-5 shadow-soft">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink3">Nueva reserva</p>
          <div className="mt-3.5 space-y-3.5">
            <Field label="Espacio">
              <select className="field" value={area} onChange={(e) => setArea(e.target.value)}>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Fecha"><input className="field" type="date" min={new Date().toISOString().slice(0, 10)} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
            <Field label="Bloque">
              <div className="grid grid-cols-3 gap-2">
                {BLOQUES.map((b) => (
                  <button key={b} onClick={() => setBloque(b)} className={"rounded-xl border px-2 py-2.5 font-mono text-[9.5px] font-bold uppercase tracking-wide transition-all " + (bloque === b ? "border-pine bg-pine text-neon" : "border-line text-ink2 hover:border-pine")}>
                    {b === "DÍA COMPLETO" ? "Todo el día" : b}
                  </button>
                ))}
              </div>
            </Field>
            {puedeReservar ? (
              <Btn variant="neon" className="w-full" onClick={() => void reservar()} disabled={busy}>{busy ? <Spinner /> : <>Reservar {area.split(" ")[0].toLowerCase()}</>}</Btn>
            ) : (
              <p className="rounded-xl border border-dashed border-line bg-paper px-3 py-2.5 text-[12px] text-ink3">
                {sesion.rol === "ARRENDATARIO" ? "Las reservas están disponibles para propietarios." : "Vista de gestión: revisa y administra las reservas de los vecinos."}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
            <p className="font-display text-lg font-bold text-ink">{area} · {fmtFecha(fecha + "T12:00:00")}</p>
            <span className="font-mono text-[10.5px] uppercase tracking-wide text-ink3">{diaSel.length} reservas</span>
          </div>
          {BLOQUES.map((b) => {
            const r = diaSel.find((x) => x.bloque === b);
            const mia = r && (puedeReservar ? r.unidad === sesion.unidad : true);
            return (
              <div key={b} className="flex flex-wrap items-center gap-3 border-b border-line/70 px-5 py-4 last:border-0">
                <span className="w-24 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink3">{b}</span>
                {r ? (
                  <>
                    <span className="flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-[12.5px] font-semibold text-ink">
                      <span className="h-2 w-2 rounded-full bg-pine2" /> {r.residente} · {r.unidad}
                    </span>
                    {mia && !puedeReservar && (
                      <button
                        disabled={cancelando === r.id}
                        onClick={async () => {
                          setCancelando(r.id);
                          await cancelarReserva(datos.comunidad.id, r.id);
                          await recargar();
                          setCancelando(null);
                          toast("Reserva cancelada.", "warn");
                        }}
                        className="ml-auto font-mono text-[10.5px] font-bold uppercase tracking-wide text-signal underline-offset-4 hover:underline"
                      >
                        {cancelando === r.id ? "Cancelando…" : "Cancelar"}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="rounded-full border border-dashed border-line px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wide text-ink3">Disponible</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ VOTACIONES ═══════════════════ */
function ModuloParticipacion({ datos, sesion, recargar }: { datos: DatosComunidad; sesion: Sesion; recargar: () => Promise<void> }) {
  const [votando, setVotando] = useState<string | null>(null);
  const [modalNueva, setModalNueva] = useState(false);
  const [form, setForm] = useState({ titulo: "", pregunta: "", opciones: "A favor;En contra;Abstención", inicio: "", fin: "" });
  const [busy, setBusy] = useState(false);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const esGestion = sesion.rol === "ADMIN" || sesion.rol === "COMITE";

  const crear = async () => {
    const opciones = form.opciones.split(/[;\n]/).map((o) => o.trim()).filter(Boolean);
    if (!form.titulo.trim() || !form.pregunta.trim() || opciones.length < 2) {
      toast("Necesitas título, pregunta y al menos 2 opciones.", "warn");
      return;
    }
    setBusy(true);
    const payload: any = { titulo: form.titulo, pregunta: form.pregunta, opciones };
    if (form.inicio) payload.inicio = new Date(form.inicio).toISOString();
    if (form.fin) payload.fin = new Date(form.fin).toISOString();
    await crearVotacion(datos.comunidad.id, payload);
    await recargar();
    setBusy(false);
    setModalNueva(false);
    setForm({ titulo: "", pregunta: "", opciones: "A favor;En contra;Abstención", inicio: "", fin: "" });
    toast("Asamblea abierta. Los propietarios ya pueden votar.");
  };

  const handleSubirDocumento = async (tipo: "ESTATUTO" | "REGLAMENTO" | "ACTA", file: File) => {
    if (!file) return;
    setSubiendo(tipo);
    try {
      const formData = new FormData();
      formData.append("tipo", tipo);
      formData.append("nombre", file.name);
      formData.append("archivo", file);
      await subirDocumento(datos.comunidad.id, formData);
      await recargar();
      toast(`Documento "${file.name}" subido correctamente.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo subir el documento.", "warn");
    }
    setSubiendo(null);
  };

  const handleEliminarDocumento = async (docId: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await eliminarDocumento(datos.comunidad.id, docId);
      await recargar();
      toast("Documento eliminado.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo eliminar el documento.", "warn");
    }
  };

  // Renderizado de documentos de la comunidad
  const documentos = datos.documentos ?? [];
  const estatutos = documentos.filter(d => d.tipo === "ESTATUTO");
  const reglamentos = documentos.filter(d => d.tipo === "REGLAMENTO");
  const actas = documentos.filter(d => d.tipo === "ACTA");

  const descargarDocumento = (doc: DocumentoComunidad) => {
    const link = document.createElement("a");
    link.href = doc.dataUrl;
    link.download = doc.nombre;
    link.click();
  };

  const DocumentoCard = ({ titulo, iconColor, docs, tipo }: { titulo: string; iconColor: string; docs: DocumentoComunidad[]; tipo: "ESTATUTO" | "REGLAMENTO" | "ACTA" }) => (
    <article className="card-in rounded-2xl border border-line bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <FileDown className={iconColor} size={18} />
        <h3 className="font-display text-lg font-bold text-ink">{titulo}</h3>
      </div>
      {docs.length === 0 ? (
        <p className="mt-3 text-sm text-ink3">No hay {titulo.toLowerCase()} publicados.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {docs.map(doc => (
            <li key={doc.id} className="flex items-center justify-between text-sm">
              <span className="truncate text-ink2">{doc.nombre}</span>
              <div className="flex gap-1">
                <button onClick={() => descargarDocumento(doc)} className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-paper">
                  Descargar
                </button>
                {esGestion && (
                  <button onClick={() => handleEliminarDocumento(doc.id, doc.nombre)} className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {esGestion && (
        <div className="mt-4">
          <label className="block cursor-pointer rounded-lg border border-dashed border-line px-3 py-2 text-center text-xs text-ink3 hover:bg-paper">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSubirDocumento(tipo, file);
              }}
            />
            {subiendo === tipo ? "Subiendo..." : `+ Subir ${titulo.toLowerCase()}`}
          </label>
        </div>
      )}
    </article>
  );

  return (
    <div className="fade-swap space-y-6">
      {/* Sección de Documentos */}
      <section>
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Documentos de la comunidad</h2>
            <p className="text-[13px] text-ink3">Estatutos, reglamentos y actas oficiales</p>
          </div>
        </div>
        
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <DocumentoCard titulo="Estatutos" iconColor="text-pine" docs={estatutos} tipo="ESTATUTO" />
          <DocumentoCard titulo="Reglamentos" iconColor="text-pine" docs={reglamentos} tipo="REGLAMENTO" />
          <DocumentoCard titulo="Actas" iconColor="text-pine" docs={actas} tipo="ACTA" />
        </div>
      </section>
          {/* Estatutos */}
          <article className="card-in rounded-2xl border border-line bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <FileDown className="text-pine" size={18} />
              <h3 className="font-display text-lg font-bold text-ink">Estatutos</h3>
            </div>
            {estatutos.length === 0 ? (
              <p className="mt-3 text-sm text-ink3">No hay estatutos publicados.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {estatutos.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-ink2">{doc.nombre}</span>
                    <button onClick={() => descargarDocumento(doc)} className="ml-2 rounded-lg border border-line px-2 py-1 text-xs hover:bg-paper">
                      Descargar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Reglamentos */}
          <article className="card-in rounded-2xl border border-line bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <FileDown className="text-pine" size={18} />
              <h3 className="font-display text-lg font-bold text-ink">Reglamentos</h3>
            </div>
            {reglamentos.length === 0 ? (
              <p className="mt-3 text-sm text-ink3">No hay reglamentos publicados.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {reglamentos.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-ink2">{doc.nombre}</span>
                    <button onClick={() => descargarDocumento(doc)} className="ml-2 rounded-lg border border-line px-2 py-1 text-xs hover:bg-paper">
                      Descargar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Actas */}
          <article className="card-in rounded-2xl border border-line bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <FileDown className="text-pine" size={18} />
              <h3 className="font-display text-lg font-bold text-ink">Actas</h3>
            </div>
            {actas.length === 0 ? (
              <p className="mt-3 text-sm text-ink3">No hay actas publicadas.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {actas.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-ink2">{doc.nombre}</span>
                    <button onClick={() => descargarDocumento(doc)} className="ml-2 rounded-lg border border-line px-2 py-1 text-xs hover:bg-paper">
                      Descargar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>

      {/* Sección de Participación (Votaciones) */}
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Participación</h2>
            <p className="text-[13px] text-ink3">Cada unidad vale un voto · resultados en tiempo real</p>
          </div>
          {esGestion && <Btn className="ml-auto" onClick={() => setModalNueva(true)}><Vote size={15} /> Abrir asamblea</Btn>}
        </div>

        {datos.votaciones.length === 0 ? (
          <Empty title="Sin votaciones activas" sub="Cuando se abra una asamblea, podrás votar desde aquí." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {datos.votaciones.map((v) => (
              <VotacionCard key={v.id} v={v} sesion={sesion} votando={votando} onVotar={async (opcion) => {
                setVotando(v.id);
                try {
                  await votar(datos.comunidad.id, v.id, sesion.unidad ?? "—", opcion);
                  await recargar();
                  toast("¡Voto registrado! Gracias por participar.");
                } catch (e) {
                  toast(e instanceof Error ? e.message : "No se pudo votar.", "warn");
                }
                setVotando(null);
              }} />
            ))}
          </div>
        )}

        <Modal open={modalNueva} onClose={() => setModalNueva(false)} title="Abrir una asamblea">
          <div className="space-y-4">
            <Field label="Título"><input className="field" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Pintura de fachada" /></Field>
            <Field label="Pregunta"><textarea className="field min-h-[70px]" value={form.pregunta} onChange={(e) => setForm({ ...form, pregunta: e.target.value })} placeholder="¿Qué se somete a votación?" /></Field>
            <Field label="Opciones" hint="separadas por punto y coma">
              <input className="field" value={form.opciones} onChange={(e) => setForm({ ...form, opciones: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio del periodo hábil" hint="opcional">
                <input type="datetime-local" className="field" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
              </Field>
              <Field label="Fin del periodo hábil" hint="opcional">
                <input type="datetime-local" className="field" value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-ink3">Define el periodo durante el cual los residentes podrán emitir su voto. Si no se define, la votación estará abierta hasta que la cierres manualmente.</p>
            <div className="flex justify-end gap-2.5 border-t border-line pt-4">
              <Btn variant="ghost" onClick={() => setModalNueva(false)}>Cancelar</Btn>
              <Btn variant="neon" onClick={() => void crear()} disabled={busy}>{busy ? <Spinner /> : <>Abrir votación</>}</Btn>
            </div>
          </div>
        </Modal>
      </section>
    </div>
  );
}

function VotacionCard({ v, sesion, votando, onVotar }: { v: Votacion; sesion: Sesion; votando: string | null; onVotar: (o: string) => Promise<void> }) {
  const yaVote = v.votos.some((x) => x.unidad === sesion.unidad);
  const puedeVotar = sesion.rol === "PROPIETARIO" && v.abierta && !yaVote;
  const total = Math.max(v.votos.length, 1);
  
  // Verificar periodo hábil
  const ahora = new Date();
  const inicio = v.inicio ? new Date(v.inicio) : null;
  const fin = v.fin ? new Date(v.fin) : null;
  const dentroPeriodo = (!inicio || ahora >= inicio) && (!fin || ahora <= fin);
  const puedeVotarConPeriodo = puedeVotar && dentroPeriodo;
  const fueraDePeriodo = puedeVotar && !dentroPeriodo;

  return (
    <article className="card-in rounded-2xl border border-line bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <span className={"rounded-full px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] " + (v.abierta ? "bg-neon/30 text-pine" : "bg-line/60 text-ink2")}>
          {v.abierta ? "Abierta" : "Cerrada"}
        </span>
        {inicio && fin && (
          <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[9px] uppercase text-ink3">
            {fmtFechaHora(inicio)} - {fmtFechaHora(fin)}
          </span>
        )}
        <span className="ml-auto font-mono text-[10.5px] uppercase text-ink3">{fmtFecha(v.creado)}</span>
      </div>
      <h3 className="mt-3 font-display text-[20px] font-bold leading-tight text-ink">{v.titulo}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2">{v.pregunta}</p>

      <div className="mt-4 space-y-2.5">
        {v.opciones.map((o) => {
          const n = v.votos.filter((x) => x.opcion === o).length;
          const pct = Math.round((n / total) * 100);
          return (
            <div key={o}>
              <div className="mb-1 flex justify-between text-[12.5px]">
                <span className="font-semibold text-ink">{o}</span>
                <span className="tnum font-mono text-ink3">{n} {n === 1 ? "voto" : "votos"} · {v.votos.length ? pct : 0}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-paper">
                <div className="bar-x h-full rounded-full bg-pine transition-all" style={{ width: (v.votos.length ? pct : 0) + "%" }} />
              </div>
            </div>
          );
        })}
      </div>

      {puedeVotarConPeriodo && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          {v.opciones.map((o) => (
            <button
              key={o}
              disabled={votando === v.id}
              onClick={() => void onVotar(o)}
              className="rounded-xl border-[1.5px] border-pine px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wide text-pine transition-all hover:-translate-y-0.5 hover:bg-pine hover:text-neon disabled:opacity-60"
            >
              {votando === v.id ? "Registrando…" : o}
            </button>
          ))}
        </div>
      )}
      {fueraDePeriodo && (
        <p className="mt-4 border-t border-line pt-4 font-mono text-[11px] text-ink3">
          {ahora < inicio! ? "La votación aún no ha comenzado." : "La votación ha finalizado."}
        </p>
      )}
      {yaVote && sesion.rol === "PROPIETARIO" && (
        <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-[12.5px] font-semibold text-pine">
          <CheckCircle2 size={15} /> Ya votaste por tu unidad ({sesion.unidad}). ¡Gracias!
        </p>
      )}
      {sesion.rol === "ARRENDATARIO" && (
        <p className="mt-4 border-t border-line pt-4 font-mono text-[10.5px] uppercase tracking-wide text-ink3">Las votaciones son para propietarios</p>
      )}
    </article>
  );
}
