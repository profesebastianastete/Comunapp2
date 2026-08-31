import {
  AlertTriangle, Building2, CheckCircle2, Coins, Copy, CreditCard, DoorOpen, ExternalLink, Eye,
  FileDown, FileSpreadsheet, KeyRound, Landmark, Link2, Mail, PlugZap, PlusCircle, RefreshCw,
  Search, ShieldCheck, UploadCloud, Users, Wallet, XCircle, Calendar, UserPen,
} from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  calcularComision, cancelarSuscripcion, configurarMP, crearMovimiento, crearSuscripcion, crearVecino,
  desvincularMP, enviarInforme, fmtCLP, fmtFecha, fmtMes, generarMes, importarCSV, informe, marcarSalida,
  periodoActual, probarMP, registrarAcceso, registrarPagoVecino, restablecerPassword, ROL_LABEL,
  setInformeAuto, validarTransferencia as validarTransferenciaFn, verPassword,
  type DatosComunidad, type FilaCSV, type InformeAPI, type Sesion, type Suscripcion, type Usuario,
} from "../lib/store";
import { generarInformePDF } from "../lib/pdf";
import { Btn, CountUp, Empty, EstadoTag, Field, Modal, RolTag, Spinner, StatCard, toast } from "./ui";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-line bg-card shadow-soft ${className}`}>{children}</div>
);

/* ════════ PAGOS DEL MES (cobranza) ════════ */
export function ModuloPagosMes({ datos, sesion, recargar }: { datos: DatosComunidad; sesion: Sesion; recargar: () => Promise<void> }) {
  const esAdmin = sesion.rol === "ADMIN";
  const [periodo, setPeriodo] = useState(periodoActual());
  const [fEstado, setFEstado] = useState("todos");
  const [generando, setGenerando] = useState(false);
  const [montoMes, setMontoMes] = useState(55000);
  const [motivo, setMotivo] = useState("Pagos del mes");
  const [registrando, setRegistrando] = useState<string | null>(null);
  const [validando, setValidando] = useState<string | null>(null);

  const periodos = useMemo(() => {
    const s = new Set(datos.cobros.map((c) => c.periodo));
    s.add(periodoActual());
    return [...s].sort().reverse();
  }, [datos.cobros]);

  const delPeriodo = useMemo(() => datos.cobros.filter((c) => c.periodo === periodo), [datos.cobros, periodo]);
  const filtrados = delPeriodo.filter((c) => fEstado === "todos" || c.estado === fEstado);

  const cobrado = delPeriodo.filter((c) => c.estado === "PAGADO").reduce((a, c) => a + c.monto, 0);
  const total = delPeriodo.reduce((a, c) => a + c.monto, 0);
  const pct = total ? Math.round((cobrado / total) * 100) : 0;
  const pendientes = delPeriodo.filter((c) => c.estado !== "PAGADO").length;

  const generar = async () => {
    setGenerando(true);
    const r = await generarMes(datos.comunidad.id, periodo, montoMes, motivo.trim() || "Pagos del mes");
    await recargar();
    setGenerando(false);
    toast(r.creados > 0
      ? "Cobro generado para " + r.creados + " unidades. Se notificó por correo a los vecinos."
      : "Este cobro ya existe para el periodo. No se duplicó.", r.creados > 0 ? "ok" : "warn");
  };

  const registrarPago = async (cobroId: string) => {
    setRegistrando(cobroId);
    await registrarPagoVecino(datos.comunidad.id, cobroId, "Efectivo / caja");
    await recargar();
    setRegistrando(null);
    toast("Pago registrado. El estado de cuenta del vecino se actualizó.");
  };

  const validarTransferencia = async (cobroId: string, fecha?: string, folio?: string, boleta?: string) => {
    setValidando(cobroId);
    try {
      await validarTransferenciaFn(datos.comunidad.id, cobroId, fecha, folio, boleta);
      await recargar();
      toast("Transferencia validada. El cobro quedó como pagado.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo validar la transferencia.", "warn");
    }
    setValidando(null);
  };

  return (
    <div className="fade-swap space-y-5 md:space-y-6">
      {/* ── KPIs · prioridad: COBRADO → POR COBRAR → RECAUDACIÓN → UNIDADES ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card-in relative overflow-hidden rounded-2xl bg-pine p-5 text-white shadow-soft">
          <span className="pointer-events-none absolute -right-7 -top-9 h-28 w-28 rounded-full bg-neon/10" aria-hidden />
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Cobrado</p>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-neon/15 text-neon"><Wallet size={17} /></span>
          </div>
          <p className="tnum mt-3 font-display text-[32px] font-bold leading-none text-neon">
            <CountUp to={cobrado} prefix="$" />
          </p>
          <p className="mt-2.5 text-[12px] text-white/60">{fmtMes(periodo)} · {delPeriodo.length - pendientes} de {delPeriodo.length} pagos</p>
        </div>

        <div className="card-in relative overflow-hidden rounded-2xl bg-deep p-5 text-white shadow-soft" style={{ ["--ci-delay" as never]: "70ms" }}>
          <span className="pointer-events-none absolute -right-7 -top-9 h-28 w-28 rounded-full bg-signal/10" aria-hidden />
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Por cobrar</p>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white/80"><Coins size={17} /></span>
          </div>
          <p className="tnum mt-3 font-display text-[32px] font-bold leading-none text-white">
            <CountUp to={total - cobrado} prefix="$" />
          </p>
          <p className="mt-2.5 text-[12px] text-white/60">{pendientes} {pendientes === 1 ? "pago pendiente" : "pagos pendientes"}</p>
        </div>

        <div className="card-in rounded-2xl border border-line bg-card p-5 shadow-soft" style={{ ["--ci-delay" as never]: "140ms" }}>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink3">Recaudación</p>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine/10 text-pine"><CheckCircle2 size={17} /></span>
          </div>
          <p className="tnum mt-3 font-display text-[32px] font-bold leading-none text-pine"><CountUp to={pct} suffix="%" /></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
            <div className="bar-x h-full rounded-full bg-neon" style={{ width: pct + "%" }} />
          </div>
          <p className="mt-2 text-[12px] text-ink3">del total del mes</p>
        </div>

        <div className="card-in rounded-2xl border border-line bg-card p-5 shadow-soft" style={{ ["--ci-delay" as never]: "210ms" }}>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink3">Unidades</p>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine/10 text-pine"><Building2 size={17} /></span>
          </div>
          <p className="tnum mt-3 font-display text-[32px] font-bold leading-none text-ink"><CountUp to={datos.comunidad.unidades} /></p>
          <p className="mt-2.5 text-[12px] text-ink3">{delPeriodo.length} cobros este mes</p>
        </div>
      </div>

      {/* ── Filtros: apilados a ancho completo en móvil, táctiles ── */}
      <div className="grid grid-cols-1 gap-3 md:flex md:flex-wrap md:items-center">
        <select className="field h-12 w-full cursor-pointer text-[14px] font-medium transition-colors active:border-pine md:h-10! md:w-auto! md:text-[13px]" value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Periodo">
          {periodos.map((p) => <option key={p} value={p}>{fmtMes(p)}</option>)}
        </select>
        <select className="field h-12 w-full cursor-pointer text-[14px] font-medium transition-colors active:border-pine md:h-10! md:w-auto! md:text-[13px]" value={fEstado} onChange={(e) => setFEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="todos">Todos los estados</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="PAGADO">Pagados</option>
          <option value="VENCIDO">Vencidos</option>
        </select>
        <p className="px-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink3 md:ml-1">{filtrados.length} {filtrados.length === 1 ? "resultado" : "resultados"}</p>
      </div>

      <div className="rounded-2xl border border-line bg-card shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-xl font-bold text-ink">Cobros del mes</h3>
          <p className="text-[12.5px] text-ink3">Pagos del mes, cuotas y multas por unidad</p>
        </div>

        {filtrados.length === 0 ? (
          <div className="p-6"><Empty title="Sin cobros en este periodo" sub={esAdmin ? "Genera los pagos del mes para todas las unidades." : "El administrador aún no genera este mes."} /></div>
        ) : (
          <>
            {/* ── Tarjetas de lista táctiles (móvil): unidad → monto → concepto → estado + acciones ── */}
            <ul className="space-y-3.5 p-4 md:hidden">
              {filtrados.map((c, i) => (
                <li key={c.id} className="card-in rounded-2xl border border-line bg-paper/60 p-4 shadow-soft transition-shadow hover:shadow-lift" style={{ ["--ci-delay" as never]: Math.min(i, 8) * 45 + "ms" }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pine font-display text-[17px] font-bold text-neon" title={"Unidad " + c.unidad}>{c.unidad}</span>
                    <div className="min-w-0 text-right">
                      <p className="tnum font-display text-[26px] font-bold leading-none text-ink">{fmtCLP(c.monto)}</p>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">{fmtMes(c.periodo)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[14px] font-medium leading-snug text-ink2">{c.concepto}</p>
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 border-t border-dashed border-line pt-3.5">
                    <EstadoTag estado={c.estado} />
                    {esAdmin && (c.estado !== "PAGADO" ? (
                      <div className="flex w-full gap-2 sm:w-auto">
                        <button
                          onClick={() => void registrarPago(c.id)} disabled={registrando === c.id}
                          title="Registrar pago recibido"
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pine px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wide text-white transition-all hover:bg-pine2 active:scale-[0.96] disabled:opacity-60 sm:flex-none"
                        >
                          {registrando === c.id ? <Spinner className="h-4 w-4" /> : <CreditCard size={16} />} Pago
                        </button>
                        <button
                          onClick={() => void validarTransferencia(c.id)} disabled={validando === c.id}
                          title="Confirmar transferencia bancaria recibida"
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-pine2/60 bg-card px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wide text-pine2 transition-all hover:bg-pine2 hover:text-white active:scale-[0.96] disabled:opacity-60 sm:flex-none"
                        >
                          {validando === c.id ? <Spinner className="h-4 w-4" /> : <Landmark size={16} />} Transferencia
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wide text-ink3">Conciliado</span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            {/* ── Tabla (escritorio) ── */}
            <div className="code-scroll hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">
                  <th className="px-5 py-3">Unidad</th>
                  <th className="px-5 py-3">Concepto</th>
                  <th className="px-5 py-3">Monto</th>
                  <th className="px-5 py-3">Estado</th>
                  {esAdmin && <th className="px-5 py-3 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-paper/70">
                    <td className="px-5 py-3 font-mono text-[13px] font-bold text-pine">{c.unidad}</td>
                    <td className="px-5 py-3 text-[13.5px] text-ink2">{c.concepto}</td>
                    <td className="tnum px-5 py-3 font-mono text-[13px] font-semibold text-ink">{fmtCLP(c.monto)}</td>
                    <td className="px-5 py-3"><EstadoTag estado={c.estado} /></td>
                    {esAdmin && (
                      <td className="px-5 py-3">
                        {c.estado !== "PAGADO" ? (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button onClick={() => void registrarPago(c.id)} disabled={registrando === c.id} title="Registrar pago recibido en efectivo o caja" className="inline-flex items-center gap-1.5 rounded-lg bg-pine px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-pine2 disabled:opacity-60">
                              {registrando === c.id ? <Spinner className="h-3 w-3" /> : <><Coins size={12} /> Pago</>}
                            </button>
                            <button onClick={() => void validarTransferencia(c.id)} disabled={validando === c.id} title="Confirmar una transferencia bancaria recibida" className="inline-flex items-center gap-1.5 rounded-lg border border-pine2/50 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-pine2 transition-colors hover:bg-pine2 hover:text-white disabled:opacity-60">
                              {validando === c.id ? <Spinner className="h-3 w-3" /> : <><Landmark size={12} /> Transferencia</>}
                            </button>
                          </div>
                        ) : (
                          <span className="block text-right font-mono text-[10.5px] uppercase text-ink3">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {esAdmin && (
        <div className="rounded-2xl border border-dashed border-pine2/40 bg-pine/[0.04] p-6">
          <h4 className="flex items-center gap-2 font-display text-lg font-bold text-ink"><PlusCircle size={19} className="text-pine2" /> Generar cobro</h4>
          <p className="mt-1 max-w-xl text-[13px] text-ink2">
            Crea un cobro para todas las unidades. Se notificará por correo a propietarios y arrendatarios. Si ya existe para el periodo, no se duplica.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr_160px_auto] sm:items-end">
            <Field label="Mes">
              <select className="field" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                {periodos.map((p) => <option key={p} value={p}>{fmtMes(p)}</option>)}
              </select>
            </Field>
            <Field label="Motivo" hint="ej: Pagos del mes, Cuota extraordinaria">
              <input className="field" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Pagos del mes" />
            </Field>
            <Field label="Monto por unidad">
              <input className="field" type="number" min={0} step={1000} value={montoMes || ""} onChange={(e) => setMontoMes(Number(e.target.value))} />
            </Field>
            <Btn variant="neon" className="h-12 w-full sm:h-auto sm:w-auto" onClick={() => void generar()} disabled={generando || montoMes <= 0}>
              {generando ? <Spinner /> : <>Generar cobro</>}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════ FORM TRANSPARENCIA ACTIVA ════════ */
export function FormMovimiento({ datos, recargar }: { datos: DatosComunidad; recargar: () => Promise<void> }) {
  const [tipo, setTipo] = useState<"GASTO" | "INGRESO">("GASTO");
  const [categoria, setCategoria] = useState("Mantención");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState(0);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const guardar = async () => {
    if (!descripcion.trim()) {
      toast(tipo === "GASTO" ? "El motivo del gasto es obligatorio." : "Escribe el concepto del ingreso.", "warn");
      return;
    }
    if (monto <= 0) {
      toast("Indica un monto válido (mayor a 0).", "warn");
      return;
    }
    setBusy(true);
    await crearMovimiento(datos.comunidad.id, { tipo, categoria, descripcion: descripcion.trim(), monto, fecha });
    await recargar();
    setBusy(false);
    setDescripcion(""); setMonto(0);
    toast((tipo === "GASTO" ? "Gasto" : "Ingreso") + " registrado. Los gráficos de la comunidad se actualizaron.");
  };

  return (
    <div className="rounded-2xl border border-pine bg-pine p-6 text-white shadow-soft">
      <h4 className="flex items-center gap-2 font-display text-xl font-bold"><PlusCircle size={20} className="text-neon" /> Transparencia Activa</h4>
      <p className="mt-1 text-[13px] text-white/70">Registra un gasto, ingreso o pago y la comunidad lo verá al instante.</p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {(["GASTO", "INGRESO"] as const).map((t) => (
          <button key={t} onClick={() => setTipo(t)} className={"rounded-xl border px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-all " + (tipo === t ? "border-neon bg-neon text-deep" : "border-white/20 text-white/70 hover:border-white/50")}>
            {t === "GASTO" ? "Gasto / pago" : "Ingreso"}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3.5">
        <Field label="Categoría">
          <select className="field" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {["Mantención", "Servicios", "Personal", "Seguridad", "Áreas verdes", "Pagos del mes", "Fondo de reserva", "Otros"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={tipo === "GASTO" ? "Motivo" : "Concepto"} hint="obligatorio">
          <input className="field" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={tipo === "GASTO" ? "Ej: Reparación de luminarias del acceso sur" : "Ej: Recaudación parcial del mes"} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto (CLP)"><input className="field" type="number" min={0} step={500} value={monto || ""} onChange={(e) => setMonto(Number(e.target.value))} placeholder="0" /></Field>
          <Field label="Fecha"><input className="field" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        </div>
      </div>

      <Btn variant="neon" className="mt-5 w-full" onClick={() => void guardar()} disabled={busy}>
        {busy ? <Spinner /> : <>Registrar en la comunidad</>}
      </Btn>
    </div>
  );
}

/* ════════ COBROS EN LÍNEA (vinculación + importación) ════════ */
export function ModuloCobranza({ datos, sesion, recargar }: { datos: DatosComunidad; sesion: Sesion; recargar: () => Promise<void> }) {
  const v = datos.comunidad.vinculacion;
  const [modalCfg, setModalCfg] = useState(false);
  const [probando, setProbando] = useState(false);

  const enmascarar = (s?: string) => (s ? s.slice(0, 6) + "••••" + s.slice(-4) : "—");

  const probar = async () => {
    setProbando(true);
    const r = await probarMP(datos.comunidad.id);
    setProbando(false);
    if (r.ok) toast(r.mensaje + (r.cuenta ? " Cuenta: " + r.cuenta : ""));
    else toast(r.mensaje, "warn");
  };

  return (
    <div className="fade-swap space-y-6">
      {/* configuración de Mercado Pago */}
      <div className={"relative overflow-hidden rounded-2xl border p-7 shadow-soft " + (v.conectada ? "border-neon2/70 bg-neon/10" : "border-line bg-card")}>
        <div className="flex flex-wrap items-start gap-5">
          <span className={"grid h-14 w-14 shrink-0 place-items-center rounded-2xl " + (v.conectada ? "bg-pine text-neon" : "bg-paper text-pine border border-line")}>
            <PlugZap size={26} />
          </span>
          <div className="min-w-[260px] flex-1">
            <h3 className="font-display text-[22px] font-bold tracking-tight text-ink">Cobros en línea con Mercado Pago</h3>
            <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink2">
              {v.conectada
                ? "Tu comunidad ya puede recibir los pagos del mes de propietarios y arrendatarios desde la aplicación. Cada pago queda registrado y conciliado."
                : "Configura las credenciales de tu cuenta de Mercado Pago para que los vecinos paguen el mes desde su teléfono. Usa el modo sandbox para probar sin dinero real."}
            </p>

            {v.conectada ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-line bg-card px-3.5 py-2.5">
                    <p className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink3"><KeyRound size={11} /> Access Token</p>
                    <p className="mt-0.5 truncate font-mono text-[12px] font-semibold text-ink">{enmascarar(v.accessToken)}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-card px-3.5 py-2.5">
                    <p className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink3"><ShieldCheck size={11} /> Public Key</p>
                    <p className="mt-0.5 truncate font-mono text-[12px] font-semibold text-ink">{enmascarar(v.publicKey)}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-card px-3.5 py-2.5">
                    <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink3">Cuenta · modo</p>
                    <p className="mt-0.5 truncate font-mono text-[12px] font-semibold text-ink">{v.email} · <span className={v.modo === "sandbox" ? "text-amber" : "text-pine"}>{v.modo === "sandbox" ? "SANDBOX" : "PRODUCCIÓN"}</span></p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full bg-pine px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-neon">
                    <CheckCircle2 size={13} /> Conectada {v.fecha && "· " + fmtFecha(v.fecha)}
                  </span>
                  <Btn variant="paper" size="sm" onClick={() => void probar()} disabled={probando}>
                    {probando ? <Spinner /> : <><PlugZap size={13} /> Probar conexión</>}
                  </Btn>
                  <button onClick={() => setModalCfg(true)} className="font-mono text-[11px] font-bold uppercase tracking-wide text-pine underline-offset-4 hover:underline">Reconfigurar</button>
                  <button
                    onClick={async () => { await desvincularMP(datos.comunidad.id); await recargar(); toast("Credenciales eliminadas. Los vecinos ya no pueden pagar en línea.", "warn"); }}
                    className="font-mono text-[11px] font-bold uppercase tracking-wide text-signal underline-offset-4 hover:underline"
                  >
                    Desvincular
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Btn variant="neon" size="lg" onClick={() => setModalCfg(true)}><PlugZap size={17} /> Configurar Mercado Pago</Btn>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">Necesitas tu Access Token y Public Key</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalCfg && (
        <ModalConfigMP
          comunidadId={datos.comunidad.id}
          inicial={{ accessToken: v.accessToken ?? "", publicKey: v.publicKey ?? "", email: v.email ?? "", modo: v.modo ?? "sandbox" }}
          onClose={() => setModalCfg(false)}
          onSaved={async () => { setModalCfg(false); await recargar(); }}
        />
      )}

      {/* importación CSV */}
      <ImportarComunidad datos={datos} recargar={recargar} />
    </div>
  );
}

/* ── Modal de configuración real de credenciales Mercado Pago ── */
function ModalConfigMP({
  comunidadId, inicial, onClose, onSaved,
}: {
  comunidadId: string;
  inicial: { accessToken: string; publicKey: string; email: string; modo: "sandbox" | "produccion" };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [accessToken, setAccessToken] = useState(inicial.accessToken);
  const [publicKey, setPublicKey] = useState(inicial.publicKey);
  const [email, setEmail] = useState(inicial.email);
  const [modo, setModo] = useState<"sandbox" | "produccion">(inicial.modo);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!accessToken.trim()) return setError("El Access Token es obligatorio (lo usa el servidor para crear cobros).");
    if (!publicKey.trim()) return setError("La Public Key es obligatoria (la usa el punto de pago en el navegador).");
    if (!email.includes("@")) return setError("Escribe el correo de tu cuenta de Mercado Pago.");
    setError(null);
    setGuardando(true);
    const r = await configurarMP(comunidadId, { accessToken: accessToken.trim(), publicKey: publicKey.trim(), email: email.trim(), modo });
    setGuardando(false);
    if (r.ok) {
      toast("Credenciales de Mercado Pago guardadas. " + r.mensaje);
      await onSaved();
    } else {
      setError(r.mensaje);
    }
  };

  return (
    <Modal open onClose={onClose} title="Configurar Mercado Pago" wide>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-pine/30 bg-pine/5 px-4 py-3">
          <CreditCard size={18} className="mt-0.5 shrink-0 text-pine" />
          <p className="text-[12.5px] leading-relaxed text-ink2">
            Encuentra tus credenciales en el <strong className="text-ink">panel de desarrolladores de Mercado Pago</strong>{" "}
            <span className="font-mono text-[11px] text-pine">(mercadopago.cl → Tu negocio → Configuración → Credenciales de producción / de prueba)</span>.
            El <strong className="text-ink">Access Token</strong> crea los cobros desde el servidor y la <strong className="text-ink">Public Key</strong> muestra el punto de pago.
          </p>
        </div>

        <Field label="Access Token" hint="Empieza por APP_USR- (producción) o TEST- (sandbox)">
          <input className="field font-mono text-[12.5px]" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="APP_USR-0000000000000000-..." />
        </Field>
        <Field label="Public Key" hint="Empieza por APP_USR- (producción) o TEST- (sandbox)">
          <input className="field font-mono text-[12.5px]" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="APP_USR-xxxxxxxx-xxxx-..." />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Correo de la cuenta Mercado Pago">
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tesoreria@tucomunidad.cl" />
          </Field>
          <Field label="Modo">
            <div className="grid grid-cols-2 gap-2">
              {(["sandbox", "produccion"] as const).map((m) => (
                <button
                  key={m} type="button" onClick={() => setModo(m)}
                  className={"rounded-xl border-[1.5px] px-3 py-2.5 text-left font-mono text-[11px] font-bold uppercase tracking-wide transition-all " + (modo === m ? "border-pine bg-pine text-lime shadow-[3px_3px_0_0_#c9f24b]" : "border-line bg-card text-ink2 hover:border-pine")}
                >
                  {m === "sandbox" ? "Sandbox" : "Producción"}
                  <span className={"block text-[9px] font-medium normal-case tracking-normal " + (modo === m ? "text-paper/70" : "text-ink3")}>
                    {m === "sandbox" ? "pagos de prueba" : "dinero real"}
                  </span>
                </button>
              ))}
            </div>
          </Field>
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-xl border-[1.5px] border-signal bg-signal/10 px-3.5 py-2.5 text-[13px] font-medium text-[#a03526]">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2.5 border-t border-line pt-4">
          <a
            href="https://www.mercadopago.cl/developers/panel" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-pine underline-offset-4 hover:underline"
          >
            <ExternalLink size={12} /> Obtener credenciales
          </a>
          <div className="flex gap-2.5">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn variant="neon" onClick={() => void guardar()} disabled={guardando}>
              {guardando ? <Spinner /> : <><CheckCircle2 size={15} /> Guardar credenciales</>}
            </Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const CSV_EJEMPLO = `Parcela;Propietario;Arrendatario;Contacto;Correo Electrónico;Deuda
P-31;Laura Espinoza;;;laura.espinoza@correo.cl;55000
P-32;Héctor Camus;Daniela Paz;+56 9 8811 2233;hector.camus@correo.cl;110000
P-33;Rosa Valenzuela;;;rosa.v@correo.cl;0
P-34;Iván Sepúlveda;Carolina Reyes;;ivan.sepulveda@correo.cl;27500
P-35;Marta Guzmán;;;marta.guzman@correo.cl;55000
P-36;Óscar Peralta;Felipe Mora;+56 9 7700 1188;oscar.peralta@correo.cl;0
P-37;Julia Contreras;;;julia.contreras@correo.cl;82500
P-38;Ramón Díaz;;;ramon.diaz@correo.cl;0`;

function parseCSV(texto: string): { filas: FilaCSV[]; errores: string[] } {
  const lineas = texto.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length < 2) return { filas: [], errores: ["El archivo debe tener un encabezado y al menos una fila."] };
  const delim = (lineas[0].match(/;/g)?.length ?? 0) >= (lineas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const cab = lineas[0].split(delim).map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
  const idx = (nombres: string[]) => cab.findIndex((h) => nombres.some((n) => h.includes(n)));
  const iP = idx(["parcela", "lote", "unidad"]);
  const iPr = idx(["propietario"]);
  const iA = idx(["arrendatario", "arrend"]);
  const iC = idx(["contacto", "tel", "fono"]);
  const iE = idx(["correo", "email", "mail"]);
  const iD = idx(["deuda", "monto", "saldo"]);
  const errores: string[] = [];
  if (iP < 0) errores.push("Falta la columna «Parcela».");
  if (iPr < 0) errores.push("Falta la columna «Propietario».");
  if (iE < 0) errores.push("Falta la columna «Correo Electrónico».");
  if (errores.length) return { filas: [], errores };

  const filas: FilaCSV[] = [];
  lineas.slice(1).forEach((l, k) => {
    const c = l.split(delim).map((x) => x.trim().replace(/^"|"$/g, ""));
    const parcela = c[iP] ?? "";
    const propietario = c[iPr] ?? "";
    const correo = c[iE] ?? "";
    if (!parcela || !propietario || !correo.includes("@")) {
      errores.push("Fila " + (k + 2) + ": necesita Parcela, Propietario y un correo válido.");
      return;
    }
    filas.push({
      parcela, propietario,
      arrendatario: iA >= 0 ? c[iA] || undefined : undefined,
      contacto: iC >= 0 ? c[iC] || undefined : undefined,
      correo,
      deuda: iD >= 0 ? Math.max(0, Number(c[iD]?.replace(/[^\d]/g, "")) || 0) : 0,
    });
  });
  return { filas, errores };
}

function ImportarComunidad({ datos, recargar }: { datos: DatosComunidad; recargar: () => Promise<void> }) {
  const [arrastrando, setArrastrando] = useState(false);
  const [preview, setPreview] = useState<{ filas: FilaCSV[]; errores: string[]; nombre: string } | null>(null);
  const [importando, setImportando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const procesar = (texto: string, nombre: string) => {
    const { filas, errores } = parseCSV(texto);
    setPreview({ filas, errores, nombre });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) { toast("Solo se aceptan archivos .csv", "warn"); return; }
    const reader = new FileReader();
    reader.onload = () => procesar(String(reader.result ?? ""), f.name);
    reader.readAsText(f);
  };

  const importar = async () => {
    if (!preview || preview.filas.length === 0) return;
    setImportando(true);
    const r = await importarCSV(datos.comunidad.id, preview.filas);
    await recargar();
    setImportando(false);
    setPreview(null);
    toast("Comunidad importada: " + r.parcelas + " parcelas, " + r.vecinos + " vecinos nuevos y " + r.cargos + " deudas cargadas.");
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-7 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pine/10 text-pine"><Users size={22} /></span>
          <div>
            <h3 className="font-display text-[22px] font-bold tracking-tight text-ink">Importar Comunidad</h3>
            <p className="mt-1 max-w-xl text-[13.5px] text-ink2">
              ¿Ya tienes tu nómina en una planilla? Arrástrala aquí y crearemos las parcelas, los vecinos y sus deudas iniciales en segundos.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" size="sm" onClick={() => procesar(CSV_EJEMPLO, "ejemplo_comunidad.csv")}><FileSpreadsheet size={14} /> Probar con un ejemplo</Btn>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") inputRef.current?.click(); }}
        className={
          "mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 " +
          (arrastrando ? "scale-[1.01] border-neon2 bg-neon/15 shadow-neon" : "border-pine2/35 bg-paper/60 hover:border-pine hover:bg-neon/5")
        }
      >
        <span className={"grid h-14 w-14 place-items-center rounded-2xl transition-all " + (arrastrando ? "scale-110 bg-pine text-neon" : "bg-card text-pine border border-line shadow-soft")}>
          <UploadCloud size={26} />
        </span>
        <p className="mt-4 font-display text-lg font-bold text-ink">
          {arrastrando ? "Suéltalo aquí" : "Arrastra tu archivo CSV"}
        </p>
        <p className="mt-1 text-[13px] text-ink3">o haz clic para buscarlo en tu equipo</p>
        <p className="mt-4 rounded-full border border-line bg-card px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink2">
          Columnas: Parcela · Propietario · Arrendatario (opcional) · Contacto · Correo Electrónico · Deuda
        </p>
        <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => procesar(String(reader.result ?? ""), f.name);
          reader.readAsText(f);
          e.target.value = "";
        }} />
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Importar Comunidad" wide>
        {preview && (
          <div className="space-y-4">
            <p className="flex items-center gap-2 rounded-xl border border-line bg-paper px-4 py-2.5 font-mono text-[11.5px] text-ink2">
              <FileSpreadsheet size={14} className="text-pine2" /> {preview.nombre} · {preview.filas.length} filas detectadas
            </p>

            {preview.errores.length > 0 && (
              <div className="rounded-xl border border-amber/50 bg-amber/10 px-4 py-3">
                <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wide text-[#8a6114]"><AlertTriangle size={14} /> Avisos del archivo</p>
                <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[12.5px] text-[#6d4d10]">
                  {preview.errores.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  {preview.errores.length > 5 && <li>… y {preview.errores.length - 5} más</li>}
                </ul>
              </div>
            )}

            {preview.filas.length > 0 ? (
              <>
                <div className="code-scroll overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line bg-paper font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink3">
                        <th className="px-3.5 py-2.5">Parcela</th><th className="px-3.5 py-2.5">Propietario</th>
                        <th className="px-3.5 py-2.5">Arrendatario</th><th className="px-3.5 py-2.5">Contacto</th>
                        <th className="px-3.5 py-2.5">Correo</th><th className="px-3.5 py-2.5 text-right">Deuda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.filas.slice(0, 8).map((f, i) => (
                        <tr key={i} className="border-b border-line/60 text-[12.5px] last:border-0">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-pine">{f.parcela}</td>
                          <td className="px-3.5 py-2.5">{f.propietario}</td>
                          <td className="px-3.5 py-2.5 text-ink3">{f.arrendatario ?? "—"}</td>
                          <td className="px-3.5 py-2.5 text-ink3">{f.contacto ?? "—"}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-ink2">{f.correo}</td>
                          <td className="tnum px-3.5 py-2.5 text-right font-mono font-semibold">{f.deuda > 0 ? fmtCLP(f.deuda) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.filas.length > 8 && <p className="px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-wide text-ink3">… y {preview.filas.length - 8} filas más</p>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-[12.5px] text-ink3">Se crearán accesos para los vecinos y cobros por las deudas iniciales.</p>
                  <div className="flex gap-2.5">
                    <Btn variant="ghost" onClick={() => setPreview(null)}>Cancelar</Btn>
                    <Btn variant="neon" onClick={() => void importar()} disabled={importando}>
                      {importando ? <Spinner /> : <>Importar {preview.filas.length} parcelas</>}
                    </Btn>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="font-display text-lg font-bold text-ink">No hay filas válidas para importar</p>
                <p className="mt-1 text-[13px] text-ink3">Revisa que el archivo tenga las columnas indicadas.</p>
                <Btn variant="ghost" className="mt-4" onClick={() => setPreview(null)}>Entendido</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ════════ PAGOS AUTOMÁTICOS (suscripciones de vecinos) ════════ */
export function ModuloSuscripciones({ datos, recargar }: { datos: DatosComunidad; recargar: () => Promise<void> }) {
  const mp = datos.comunidad.vinculacion;
  const [form, setForm] = useState({ unidad: "", email: "", monto: 55000 });
  const [creando, setCreando] = useState(false);
  const [link, setLink] = useState<Suscripcion | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const crear = async () => {
    if (!form.unidad.trim() || !form.email.includes("@")) { setError("Completa la unidad y un correo válido."); return; }
    if (form.monto <= 0) { setError("El monto debe ser mayor a 0."); return; }
    setError(null);
    setCreando(true);
    try {
      const s = await crearSuscripcion(datos.comunidad.id, { unidad: form.unidad.trim().toUpperCase(), email: form.email.trim(), monto: form.monto });
      setLink(s);
      setForm({ unidad: "", email: "", monto: 55000 });
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la suscripción.");
    }
    setCreando(false);
  };

  const cancelar = async (s: Suscripcion) => {
    setCancelando(s.id);
    await cancelarSuscripcion(datos.comunidad.id, s.id);
    toast("Suscripción de " + s.unidad + " cancelada.", "warn");
    setCancelando(null);
    await recargar();
  };

  const com = form.monto > 0 ? calcularComision(form.monto) : null;

  return (
    <div className="fade-swap space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pine/10 text-pine"><RefreshCw size={22} /></span>
          <div>
            <h3 className="font-display text-[22px] font-bold tracking-tight text-ink">Pagos automáticos</h3>
            <p className="mt-1 max-w-xl text-[13.5px] text-ink2">
              Crea una suscripción de Mercado Pago para que un propietario o arrendatario autorice el cargo de sus
              pagos del mes con <strong className="text-ink">tarjeta de crédito</strong>. Después se cobra solo, cada mes.
            </p>
          </div>
        </div>
        {mp.conectada
          ? <span className="inline-flex items-center gap-2 rounded-full bg-pine px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-neon"><CheckCircle2 size={13} /> Mercado Pago conectado</span>
          : <span className="inline-flex items-center gap-2 rounded-full bg-amber/15 px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-[#8a6114]"><AlertTriangle size={13} /> Configura Mercado Pago primero</span>}
      </div>

      {/* crear suscripción */}
      <div className="rounded-2xl border border-line bg-card p-6 shadow-soft">
        <h4 className="flex items-center gap-2 font-display text-lg font-bold text-ink"><PlusCircle size={19} className="text-pine2" /> Nueva suscripción</h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-[130px_1fr_150px_auto]">
          <Field label="Unidad"><input className="field" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value.toUpperCase() })} placeholder="P-14" /></Field>
          <Field label="Correo del vecino"><input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vecino@correo.cl" /></Field>
          <Field label="Monto mensual (CLP)"><input className="field" type="number" min={0} step={500} value={form.monto || ""} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} /></Field>
          <div className="flex items-end">
            <Btn variant="neon" onClick={() => void crear()} disabled={creando || !mp.conectada}>
              {creando ? <Spinner /> : <><RefreshCw size={15} /> Crear</>}
            </Btn>
          </div>
        </div>
        {com && mp.conectada && (
          <p className="mt-3 rounded-lg border border-line bg-paper px-4 py-2.5 font-mono text-[11.5px] text-ink2">
            Cargo mensual: <strong className="text-ink">{fmtCLP(com.base)}</strong> + 3% app ({fmtCLP(com.comisionApp)}) + 2% MP ({fmtCLP(com.comisionMP)}) = <strong className="text-pine">{fmtCLP(com.total)}</strong>
          </p>
        )}
        {error && <p className="mt-3 rounded-lg border border-signal/40 bg-signal/10 px-3.5 py-2.5 text-[13px] font-medium text-[#a03526]">{error}</p>}
      </div>

      {/* listado */}
      <div className="rounded-2xl border border-line bg-card shadow-soft">
        <div className="border-b border-line px-5 py-3.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink3">Suscripciones activas y pendientes</div>
        {datos.suscripciones.length === 0 ? (
          <div className="p-6"><Empty title="Sin suscripciones" sub="Crea la primera para que un vecino pague el mes automáticamente." /></div>
        ) : (
          <ul className="divide-y divide-line/70">
            {datos.suscripciones.map((s) => {
              const comS = calcularComision(s.monto);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-paper/70">
                  <span className={"grid h-10 w-10 place-items-center rounded-xl " + (s.estado === "AUTORIZADA" ? "bg-pine/10 text-pine" : s.estado === "PENDIENTE" ? "bg-amber/15 text-[#8a6114]" : "bg-line/40 text-ink3")}>
                    <RefreshCw size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">{s.unidad} · <span className="font-mono text-[11.5px] font-normal text-ink3">{s.email}</span></p>
                    <p className="font-mono text-[10.5px] uppercase tracking-wide text-ink3">{s.frecuencia} · creada {fmtFecha(s.creada)}</p>
                  </div>
                  <div className="text-right">
                    <p className="tnum font-mono text-[14px] font-bold text-ink">{fmtCLP(comS.total)}<span className="text-[10.5px] font-normal text-ink3">/mes</span></p>
                    <EstadoTag estado={s.estado === "AUTORIZADA" ? "PAGADO" : s.estado === "PENDIENTE" ? "PENDIENTE" : "VENCIDO"} />
                  </div>
                  <div className="flex gap-1.5">
                    {s.estado === "PENDIENTE" && s.linkAutorizacion && (
                      <button onClick={() => setLink(s)} className="inline-flex items-center gap-1.5 rounded-lg bg-pine px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-pine2" title="Ver enlace de autorización">
                        <Link2 size={12} /> Autorizar
                      </button>
                    )}
                    {s.estado !== "CANCELADA" && (
                      <button disabled={cancelando === s.id} onClick={() => void cancelar(s)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink3 transition-colors hover:border-signal hover:text-signal disabled:opacity-50" title="Cancelar suscripción">
                        {cancelando === s.id ? <Spinner className="h-3.5 w-3.5" /> : <XCircle size={14} />}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* enlace de autorización */}
      {link && (
        <Modal open onClose={() => setLink(null)} title={"Autorizar pago automático · " + link.unidad} wide>
          <div className="space-y-4">
            <p className="rounded-xl border border-pine/30 bg-pine/5 px-4 py-3 text-[13px] leading-relaxed text-ink2">
              Envía este enlace a <strong className="text-ink">{link.email}</strong>. Al abrirlo, Mercado Pago le pedirá autorizar el cargo
              automático con su <strong className="text-ink">tarjeta de crédito</strong>. Desde entonces, sus pagos del mes se cobran solos.
            </p>
            <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-5 py-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink3">Cargo mensual</p>
                <p className="tnum mt-1 font-display text-3xl font-bold text-pine">{fmtCLP(calcularComision(link.monto).total)}</p>
              </div>
              <span className="rounded-full bg-amber/15 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-[#8a6114]">Pendiente de autorización</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-3.5 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink2">{link.linkAutorizacion}</span>
              <button onClick={() => { void navigator.clipboard.writeText(link.linkAutorizacion ?? ""); toast("Enlace copiado."); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-ink2 transition-colors hover:border-pine hover:text-pine" title="Copiar">
                <Copy size={13} />
              </button>
              <a href={link.linkAutorizacion} target="_blank" rel="noreferrer" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-ink2 transition-colors hover:border-pine hover:text-pine" title="Abrir">
                <ExternalLink size={13} />
              </a>
            </div>
            <div className="flex justify-end border-t border-line pt-4">
              <Btn variant="neon" onClick={() => { void navigator.clipboard.writeText(link.linkAutorizacion ?? ""); toast("Enlace de autorización copiado."); }}>
                <Copy size={15} /> Copiar enlace
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ════════ VECINOS ════════ */
export function ModuloVecinos({ datos, recargar }: { datos: DatosComunidad; recargar: () => Promise<void> }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", rol: "PROPIETARIO" as "PROPIETARIO" | "ARRENDATARIO" | "COMITE" | "ADMIN", unidad: "", password: "vecino123", telefono: "" });
  const [busy, setBusy] = useState(false);
  const [datosDe, setDatosDe] = useState<Usuario | null>(null);

  const miembros = datos.miembros.filter((m) => (m.usuario.nombre + " " + m.usuario.email).toLowerCase().includes(q.toLowerCase()));

  const crear = async () => {
    if (!form.nombre.trim() || !form.email.includes("@")) { toast("Nombre y correo válido son obligatorios.", "warn"); return; }
    if ((form.rol === "PROPIETARIO" || form.rol === "ARRENDATARIO") && !form.unidad.trim()) { toast("Indica la parcela o unidad (ej: P-14).", "warn"); return; }
    setBusy(true);
    try {
      await crearVecino(datos.comunidad.id, { ...form, unidad: form.unidad.trim() || undefined, telefono: form.telefono.trim() || undefined });
      await recargar();
      setModal(false);
      setForm({ nombre: "", email: "", rol: "PROPIETARIO", unidad: "", password: "vecino123", telefono: "" });
      toast("Vecino creado. Recibirá un correo para confirmar su cuenta.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo crear.", "warn");
    }
    setBusy(false);
  };

  return (
    <div className="fade-swap space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-ink">Vecinos</h3>
          <p className="text-[13px] text-ink3">{datos.miembros.length} personas con acceso a la comunidad</p>
        </div>
        <div className="ml-auto flex gap-2.5">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
            <input className="field h-10! w-56! pl-9 text-[13px]" placeholder="Buscar vecino…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Btn onClick={() => setModal(true)}><Users size={15} /> Nuevo vecino</Btn>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {miembros.map((m, i) => (
          <div key={m.usuario.id} className="card-in flex items-center gap-3.5 rounded-2xl border border-line bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift" style={{ ["--ci-delay" as never]: Math.min(i, 8) * 50 + "ms" }}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pine font-display text-[15px] font-bold text-neon">
              {m.usuario.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-ink">{m.usuario.nombre}</p>
              <p className="truncate font-mono text-[10.5px] text-ink3">{m.usuario.email}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <RolTag rol={m.rol} label={ROL_LABEL[m.rol]} />
                {m.unidad && <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-pine">{m.unidad}</span>}
              </div>
            </div>
            <button
              onClick={() => setDatosDe(m.usuario)}
              title="Ver datos del vecino"
              aria-label={"Ver datos de " + m.usuario.nombre}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-paper text-ink2 transition-all hover:-translate-y-0.5 hover:border-pine hover:text-pine hover:shadow-soft active:scale-95"
            >
              <Eye size={15} />
            </button>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo vecino">
        <div className="space-y-4">
          <Field label="Nombre completo"><input className="field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Camila Órdenes" /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Correo electrónico"><input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vecino@correo.cl" /></Field>
            <Field label="Teléfono de contacto" hint="opcional"><input className="field" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+56 9 1234 5678" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rol">
              <select className="field" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as typeof form.rol })}>
                <option value="PROPIETARIO">Propietario</option>
                <option value="ARRENDATARIO">Arrendatario</option>
                <option value="COMITE">Comité</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </Field>
            <Field label="Parcela / unidad" hint="opcional para comité">
              <input className="field" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value.toUpperCase() })} placeholder="P-14" />
            </Field>
          </div>
          <Field label="Contraseña inicial"><input className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <p className="rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink2">
            <Mail size={13} className="mr-1 inline text-pine2" /> Al crearlo, recibirá un <strong className="text-ink">correo de confirmación</strong> para activar su cuenta.
          </p>
          <div className="flex justify-end gap-2.5 border-t border-line pt-4">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn variant="neon" onClick={() => void crear()} disabled={busy}>{busy ? <Spinner /> : <>Crear vecino</>}</Btn>
          </div>
        </div>
      </Modal>

      {datosDe && <ModalDatosVecino usuario={datosDe} onClose={() => setDatosDe(null)} />}
    </div>
  );
}

/* ── Ver datos del vecino: contacto + contraseña (ver / restablecer) ── */
function ModalDatosVecino({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const [pass, setPass] = useState<{ texto: string | null; cargando: boolean }>({ texto: null, cargando: false });
  const [viendo, setViendo] = useState(false);
  const [reset, setReset] = useState<{ clave: string | null; cargando: boolean }>({ clave: null, cargando: false });

  const ver = async () => {
    setViendo(true);
    try {
      const r = await verPassword(usuario.id);
      setPass({ texto: r.disponible ? r.password_temporal : null, cargando: false });
    } catch {
      setPass({ texto: null, cargando: false });
    }
    setViendo(false);
  };

  const restablecer = async () => {
    setReset({ clave: null, cargando: true });
    try {
      const r = await restablecerPassword(usuario.id);
      setReset({ clave: r.password_temporal, cargando: false });
      setPass({ texto: null, cargando: false });
      toast("Contraseña restablecida. Se envió por correo a " + usuario.email + ".");
    } catch (e) {
      setReset({ clave: null, cargando: false });
      toast(e instanceof Error ? e.message : "No se pudo restablecer.", "warn");
    }
  };

  const fila = (label: string, valor: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 last:border-0">
      <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink3">{label}</span>
      <span className="min-w-0 truncate text-right text-[13.5px] font-medium text-ink">{valor}</span>
    </div>
  );

  return (
    <Modal open onClose={onClose} title={"Datos · " + usuario.nombre}>
      <div className="space-y-1">
        {fila("Correo", usuario.email)}
        {fila("Teléfono", usuario.telefono || "—")}
        {fila("Cuenta", usuario.activo
          ? <span className="inline-flex items-center gap-1.5 text-pine"><CheckCircle2 size={13} /> activa</span>
          : <span className="inline-flex items-center gap-1.5 text-signal"><XCircle size={13} /> suspendida</span>)}
        {fila("Alta", fmtFecha(usuario.creado))}
      </div>

      <div className="mt-4 rounded-xl border border-line bg-paper p-4">
        <p className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink3">
          <KeyRound size={12} className="text-pine2" /> Contraseña
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="min-w-[90px] font-mono text-[15px] font-semibold tracking-[0.15em] text-ink">
            {reset.clave ? reset.clave : pass.texto ? pass.texto : "••••••••"}
          </span>
          {reset.clave && (
            <button onClick={() => { void navigator.clipboard.writeText(reset.clave ?? ""); toast("Contraseña copiada."); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink2 transition-colors hover:border-pine hover:text-pine">
              <Copy size={11} /> Copiar
            </button>
          )}
          <span className="ml-auto flex gap-2">
            <button onClick={() => void ver()} disabled={viendo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pine2/50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-pine2 transition-colors hover:bg-pine2 hover:text-white disabled:opacity-60">
              {viendo ? <Spinner className="h-3 w-3" /> : <Eye size={12} />} Ver
            </button>
            <button onClick={() => void restablecer()} disabled={reset.cargando}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber/60 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-[#8a6114] transition-colors hover:bg-amber hover:text-white disabled:opacity-60">
              {reset.cargando ? <Spinner className="h-3 w-3" /> : <RefreshCw size={12} />} Restablecer
            </button>
          </span>
        </div>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink3">
          {pass.texto === null && !reset.clave
            ? "«Ver» muestra la clave temporal generada por el sistema (si existe). Por seguridad, las contraseñas se guardan cifradas y no son reversibles."
            : "Al restablecer se genera una clave temporal y se envía por correo al vecino."}
        </p>
      </div>

      <div className="flex justify-end border-t border-line pt-4">
        <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
      </div>
    </Modal>
  );
}

/* ════════ BITÁCORA DE ACCESO ════════ */
export function ModuloBitacora({ datos, recargar }: { datos: DatosComunidad; recargar: () => Promise<void> }) {
  const [form, setForm] = useState({ visitante: "", tipo: "VISITA" as "VISITA" | "PROVEEDOR", unidad: "" });
  const [busy, setBusy] = useState(false);
  const [saliendo, setSaliendo] = useState<string | null>(null);

  const registrar = async () => {
    if (!form.visitante.trim()) { toast("Escribe el nombre de la visita o proveedor.", "warn"); return; }
    setBusy(true);
    await registrarAcceso(datos.comunidad.id, form);
    await recargar();
    setBusy(false);
    setForm({ visitante: "", tipo: "VISITA", unidad: "" });
    toast("Ingreso registrado en la bitácora.");
  };

  return (
    <div className="fade-swap space-y-5">
      <div className="rounded-2xl border border-line bg-card p-5 shadow-soft">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink"><DoorOpen size={19} className="text-pine2" /> Registrar ingreso</h3>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-[1fr_150px_130px_auto]">
          <input className="field" placeholder="Nombre de la visita o proveedor" value={form.visitante} onChange={(e) => setForm({ ...form, visitante: e.target.value })} />
          <select className="field" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "VISITA" | "PROVEEDOR" })}>
            <option value="VISITA">Visita</option>
            <option value="PROVEEDOR">Proveedor</option>
          </select>
          <input className="field" placeholder="Unidad" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value.toUpperCase() })} />
          <Btn variant="neon" onClick={() => void registrar()} disabled={busy}>{busy ? <Spinner /> : <>Registrar</>}</Btn>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card shadow-soft">
        <div className="border-b border-line px-5 py-3.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink3">Historial de accesos</div>
        {datos.bitacora.length === 0 ? (
          <div className="p-6"><Empty title="Sin registros" sub="Los ingresos y salidas aparecerán aquí." /></div>
        ) : (
          <ul className="divide-y divide-line/70">
            {datos.bitacora.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-paper/70">
                <span className={"grid h-9 w-9 place-items-center rounded-xl " + (r.tipo === "PROVEEDOR" ? "bg-teal/15 text-teal" : "bg-amber/15 text-[#8a6114]")}>
                  <DoorOpen size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{r.visitante}</p>
                  <p className="font-mono text-[10.5px] uppercase tracking-wide text-ink3">{r.tipo} · {r.unidad || "general"}</p>
                </div>
                <div className="text-right font-mono text-[11px] text-ink2">
                  <p>Entró · {new Date(r.entrada).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  {r.salida
                    ? <p className="text-ink3">Salió · {new Date(r.salida).toLocaleString("es-CL", { hour: "2-digit", minute: "2-digit" })}</p>
                    : <button
                        disabled={saliendo === r.id}
                        onClick={async () => {
                          setSaliendo(r.id);
                          await marcarSalida(datos.comunidad.id, r.id);
                          await recargar();
                          setSaliendo(null);
                          toast("Salida registrada.");
                        }}
                        className="mt-0.5 rounded-md bg-pine px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-pine2"
                      >
                        {saliendo === r.id ? "…" : "Marcar salida"}
                      </button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ════════ INFORME DE FINANZAS Y TRANSPARENCIA (PDF + correo) ════════ */
export function ModuloInforme({ datos, recargar }: { datos: DatosComunidad; recargar: () => Promise<void> }) {
  const [periodo, setPeriodo] = useState(periodoActual());
  const [descargando, setDescargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [autoEnvio, setAutoEnvio] = useState(datos.comunidad.informe_auto);
  const [guardandoAuto, setGuardandoAuto] = useState(false);

  const periodos = useMemo(() => {
    const s = new Set<string>(datos.movimientos.map((m) => m.fecha.slice(0, 7)));
    s.add(periodoActual());
    return [...s].sort().reverse();
  }, [datos.movimientos]);

  const construir = async (): Promise<InformeAPI> => informe(datos.comunidad.id, periodo);

  const descargar = async () => {
    setDescargando(true);
    try {
      const inf = await construir();
      generarInformePDF({
        comunidad: inf.comunidad, periodo: inf.periodo, resumen: inf.resumen,
        movimientos: inf.movimientos, cobros: inf.cobros,
      }).save("informe-" + datos.comunidad.nombre.toLowerCase().replace(/\s+/g, "-") + "-" + periodo + ".pdf");
      toast("Informe PDF descargado.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo generar el informe.", "warn");
    }
    setDescargando(false);
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      const inf = await construir();
      const resumenHtml =
        "<p>Resumen de " + fmtMes(inf.periodo) + ":</p><ul>" +
        "<li><strong>Ingresos:</strong> " + fmtCLP(inf.resumen.ingresos) + "</li>" +
        "<li><strong>Gastos:</strong> " + fmtCLP(inf.resumen.gastos) + "</li>" +
        "<li><strong>Saldo:</strong> " + fmtCLP(inf.resumen.saldo) + "</li>" +
        "<li><strong>Cobrado del mes:</strong> " + fmtCLP(inf.resumen.cobrado) + "</li>" +
        "</p><p>Adjunta el PDF descargado desde el panel para el detalle completo.</p>";
      await enviarInforme(datos.comunidad.id, periodo, resumenHtml);
      toast("Informe enviado por correo a propietarios y arrendatarios.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo enviar el informe.", "warn");
    }
    setEnviando(false);
  };

  const toggleAuto = async () => {
    setGuardandoAuto(true);
    const nuevo = !autoEnvio;
    await setInformeAuto(datos.comunidad.id, nuevo);
    setAutoEnvio(nuevo);
    await recargar();
    setGuardandoAuto(false);
    toast(nuevo ? "Envío automático mensual activado." : "Envío automático mensual desactivado.", nuevo ? "ok" : "warn");
  };

  return (
    <div className="fade-swap space-y-6">
      <div className="rounded-2xl border border-line bg-card p-6 shadow-soft">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pine/10 text-pine"><FileDown size={22} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[22px] font-bold tracking-tight text-ink">Informe de finanzas y transparencia</h3>
            <p className="mt-1 max-w-2xl text-[13.5px] text-ink2">
              Genera el informe mensual en PDF con ingresos, gastos, saldo y estado de cobros, o envíalo por correo a toda la comunidad.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[180px_auto_auto] sm:items-end">
          <Field label="Periodo">
            <select className="field" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              {periodos.map((p) => <option key={p} value={p}>{fmtMes(p)}</option>)}
            </select>
          </Field>
          <Btn variant="primary" onClick={() => void descargar()} disabled={descargando}>
            {descargando ? <Spinner /> : <><FileDown size={15} /> Descargar PDF</>}
          </Btn>
          <Btn variant="neon" onClick={() => void enviar()} disabled={enviando}>
            {enviando ? <Spinner /> : <><Mail size={15} /> Enviar por correo</>}
          </Btn>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-pine2/40 bg-pine/[0.04] p-5">
        <div>
          <p className="font-display text-lg font-bold text-ink">Envío automático mensual</p>
          <p className="mt-0.5 text-[13px] text-ink2">Cada mes se enviará el informe por correo a propietarios y arrendatarios, sin que tengas que hacerlo manualmente.</p>
        </div>
        <button
          onClick={() => void toggleAuto()}
          disabled={guardandoAuto}
          aria-pressed={autoEnvio}
          className={"relative h-8 w-14 shrink-0 rounded-full transition-colors " + (autoEnvio ? "bg-pine" : "bg-line")}
        >
          <span className={"absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all " + (autoEnvio ? "left-7" : "left-1")} />
        </button>
      </div>
    </div>
  );
}


