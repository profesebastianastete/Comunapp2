import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api, fmtCLP, fmtFecha, mesActual, mesLabel, mesAnterior, PERMISOS, ROL_LABEL,
  type Aviso, type Capacidad, type Cobro, type Parcela, type RegistroAcceso, type RolCondo, type Sesion, type TipoAviso, type Usuario,
} from "../lib/store";
import { Btn, Empty, EstadoTag, Field, Icon, Modal, Spinner, StatCard, toast } from "./ui";

type CondoData = Awaited<ReturnType<typeof api.datosCondo>>;
type Tab = "panel" | "cobranza" | "finanzas" | "avisos" | "residentes" | "bitacora";

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default function DashCondo({ sesion, usuario }: { sesion: Sesion; usuario: Usuario }) {
  const rol = sesion.rol as RolCondo;
  const [tab, setTab] = useState<Tab>("panel");
  const [data, setData] = useState<CondoData | null>(null);

  const reload = useCallback(async () => {
    setData(await api.datosCondo(sesion.parcelaId!));
  }, [sesion.parcelaId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const can = (c: Capacidad) => PERMISOS[rol]?.[c] ?? false;

  const tabs: { id: Tab; label: string; icon: string; cap: Capacidad | null }[] = [
    { id: "panel", label: "Panel", icon: "chart", cap: "panel" },
    { id: "cobranza", label: "Cobranza", icon: "coins", cap: "cobranza" },
    { id: "finanzas", label: "Finanzas", icon: "wallet", cap: "finanzas" },
    { id: "avisos", label: "Avisos", icon: "megaphone", cap: "avisos" },
    { id: "residentes", label: "Residentes", icon: "users", cap: "residentes" },
    { id: "bitacora", label: "Bitácora", icon: "gate", cap: null },
  ];

  const irA = (t: Tab, permitido: boolean) => {
    if (!permitido) {
      toast("403 · El rol " + ROL_LABEL[rol] + " no tiene acceso a ese módulo.", "err");
      return;
    }
    setTab(t);
  };

  if (!data)
    return (
      <div className="flex items-center justify-center gap-3 py-28 text-ink2">
        <Spinner /> <span className="font-mono text-[13px] uppercase tracking-wide">Cargando datos del condominio…</span>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-pine">Consola del condominio · tenant {data.parcela.id.slice(0, 8)}</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">{data.parcela.nombre}</h1>
          <p className="mt-1 text-[13.5px] text-ink3">{data.parcela.direccion} · {data.parcela.ciudad} · {data.parcela.unidades} unidades — sesión de {usuario.nombre} ({ROL_LABEL[rol]})</p>
        </div>
        <div className="flex gap-2">
          <span className="border-[1.5px] border-ink bg-card px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink2">{mesLabel(mesActual())}</span>
        </div>
      </div>

      {/* tabs con RBAC visible */}
      <div className="code-scroll mb-7 flex gap-1.5 overflow-x-auto border-b-[1.5px] border-ink pb-px">
        {tabs.map((t) => {
          const permitido = t.cap ? can(t.cap) : true;
          const activo = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => irA(t.id, permitido)}
              title={permitido ? undefined : "Sin acceso para el rol " + ROL_LABEL[rol]}
              className={
                "flex shrink-0 items-center gap-2 border-[1.5px] px-4 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] transition-all " +
                (activo
                  ? "border-ink bg-pine text-lime shadow-[3px_3px_0_0_#1a2521]"
                  : permitido
                    ? "border-transparent text-ink2 hover:border-ink hover:bg-card"
                    : "cursor-not-allowed border-transparent text-ink3/60")
              }
            >
              <Icon name={permitido ? t.icon : "lock"} size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <div key={tab} className="fade-swap">
        {tab === "panel" && <Panel data={data} can={can} />}
        {tab === "cobranza" && <Cobranza data={data} reload={reload} />}
        {tab === "finanzas" && <Finanzas data={data} reload={reload} can={can} />}
        {tab === "avisos" && <Avisos data={data} reload={reload} autor={usuario.nombre + " (" + ROL_LABEL[rol] + ")"} />}
        {tab === "residentes" && can("residentes") && <Residentes data={data} reload={reload} />}
        {tab === "bitacora" && <Bitacora data={data} reload={reload} escribir={can("bitacora_escribir")} />}
      </div>
    </div>
  );
}

/* ── panel ── */
function Panel({ data, can }: { data: CondoData; can: (c: Capacidad) => boolean }) {
  const mes = mesActual();
  const cobradoMes = data.cobros.filter((c) => c.periodo === mes && c.estado === "pagado").reduce((a, c) => a + c.monto, 0);
  const pendiente = data.cobros.filter((c) => c.estado !== "pagado").reduce((a, c) => a + c.monto, 0);
  const morosos = new Set(data.cobros.filter((c) => c.estado !== "pagado").map((c) => c.unidad)).size;
  const unidadesConCobro = new Set(data.cobros.map((c) => c.unidad)).size || 1;
  const ingresos = data.movimientos.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const egresos = data.movimientos.filter((m) => m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);

  const meses = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push({ key: x.toISOString().slice(0, 7), label: x.toLocaleDateString("es-CL", { month: "short" }) });
    }
    return out;
  }, []);
  const serie = meses.map((m) => ({
    ...m,
    ing: data.movimientos.filter((x) => x.tipo === "ingreso" && x.fecha.slice(0, 7) === m.key).reduce((a, x) => a + x.monto, 0),
    egr: data.movimientos.filter((x) => x.tipo === "egreso" && x.fecha.slice(0, 7) === m.key).reduce((a, x) => a + x.monto, 0),
  }));
  const maxSerie = Math.max(...serie.map((s) => Math.max(s.ing, s.egr)), 1);

  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={"Cobrado " + mesLabel(mes).split(" ")[0]} value={fmtCLP(cobradoMes)} icon="coins" accent />
        <StatCard label="Por cobrar" value={fmtCLP(pendiente)} icon="receipt" sub={morosos + " unidades con deuda"} />
        <StatCard label="Morosidad" value={Math.round((morosos / unidadesConCobro) * 100) + "%"} icon="alert" sub={morosos + " de " + unidadesConCobro + " unidades"} />
        <StatCard label="Resultado acumulado" value={fmtCLP(ingresos - egresos)} icon="chart" sub="ingresos − egresos" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="border-[1.5px] border-ink bg-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">Flujo de caja · 6 meses</h3>
            <span className="flex items-center gap-4 font-mono text-[10.5px] uppercase tracking-wide text-ink3">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-pine" /> ingresos</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-signal" /> egresos</span>
            </span>
          </div>
          <div className="grid grid-cols-6 items-end gap-3 border-b-[1.5px] border-ink pb-0" style={{ height: 190 }}>
            {serie.map((s, i) => (
              <div key={s.key} className="group flex h-full items-end justify-center gap-1.5">
                {[
                  { v: s.ing, c: "bg-pine" },
                  { v: s.egr, c: "bg-signal" },
                ].map((b, j) => (
                  <div key={j} className="relative flex w-5 flex-col justify-end md:w-7" style={{ height: "100%" }} title={fmtCLP(b.v)}>
                    <div
                      className={"bar-up w-full " + b.c + " transition-all group-hover:opacity-80"}
                      style={{ height: Math.max(3, (b.v / maxSerie) * 100) + "%", animationDelay: i * 70 + j * 40 + "ms" }}
                    />
                    <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] text-ink3 opacity-0 transition-opacity group-hover:opacity-100">
                      {Math.round(b.v / 1000) + "k"}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-6 gap-3 text-center font-mono text-[10.5px] uppercase tracking-wide text-ink3">
            {serie.map((s) => <span key={s.key}>{s.label}</span>)}
          </div>
        </section>

        <div className="space-y-6">
          <section className="border-[1.5px] border-ink bg-card p-5">
            <h3 className="mb-3 font-display text-lg font-bold text-ink">Cobros pendientes</h3>
            {data.cobros.filter((c) => c.estado !== "pagado").length === 0 ? (
              <p className="py-4 text-center font-mono text-[12px] text-ok">✓ Comunidad 100% al día</p>
            ) : (
              <ul>
                {data.cobros.filter((c) => c.estado !== "pagado").slice(0, 5).map((c) => (
                  <li key={c.id} className="ledger flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">{c.unidad} · {c.concepto}</p>
                      <p className="font-mono text-[10.5px] uppercase text-ink3">{mesLabel(c.periodo)}</p>
                    </div>
                    <span className="flex items-center gap-2.5">
                      <span className="tnum font-mono text-[13px] font-bold text-ink">{fmtCLP(c.monto)}</span>
                      <EstadoTag estado={c.estado} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-[1.5px] border-ink bg-card p-5">
            <h3 className="mb-3 font-display text-lg font-bold text-ink">Últimos avisos</h3>
            {data.avisos.slice(0, 3).map((a) => (
              <div key={a.id} className="ledger flex items-start gap-2.5 py-2.5 last:border-0">
                <Icon name={a.tipo === "emergencia" ? "alert" : a.tipo === "mantencion" ? "clock" : "megaphone"} size={15} className={"mt-0.5 " + (a.tipo === "emergencia" ? "text-signal" : a.tipo === "mantencion" ? "text-amber" : "text-pine")} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{a.titulo}</p>
                  <p className="font-mono text-[10.5px] uppercase text-ink3">{a.autor} · {fmtFecha(a.fecha)}</p>
                </div>
              </div>
            ))}
            {can("avisos") && <p className="mt-2 font-mono text-[10.5px] text-ink3">Publica desde la pestaña Avisos →</p>}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── cobranza ── */
function Cobranza({ data, reload }: { data: CondoData; reload: () => Promise<void> }) {
  const [fEstado, setFEstado] = useState("todos");
  const [fPeriodo, setFPeriodo] = useState("todos");
  const [modalGen, setModalGen] = useState(false);
  const [modalMulta, setModalMulta] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const periodos = useMemo(() => Array.from(new Set(data.cobros.map((c) => c.periodo))).sort().reverse(), [data.cobros]);
  const filtrados = data.cobros
    .filter((c) => (fEstado === "todos" || c.estado === fEstado) && (fPeriodo === "todos" || c.periodo === fPeriodo))
    .sort((a, b) => b.periodo.localeCompare(a.periodo) || a.unidad.localeCompare(b.unidad));

  const recordatorios = async () => {
    setBusy("rec");
    const n = await api.enviarRecordatorios(data.parcela.id);
    toast("Recordatorios enviados a " + n + " unidades con deuda (correo + push).");
    await reload();
    setBusy(null);
  };

  const pagoManual = async (c: Cobro) => {
    setBusy(c.id);
    await api.registrarPagoManual(c.id);
    toast("Pago registrado manualmente para " + c.unidad + " · " + fmtCLP(c.monto));
    await reload();
    setBusy(null);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <Btn onClick={() => setModalGen(true)}><Icon name="coins" size={15} /> Generar cobros del mes</Btn>
        <Btn variant="paper" onClick={() => setModalMulta(true)}><Icon name="alert" size={14} /> Aplicar multa</Btn>
        <Btn variant="ghost" onClick={recordatorios} disabled={busy === "rec"}>
          {busy === "rec" ? <Spinner /> : <Icon name="send" size={14} />} Enviar recordatorios
        </Btn>
        <div className="ml-auto flex gap-2">
          <select className="field h-10! w-auto! text-[13px]" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
            <option value="todos">Estado: todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="vencido">Vencidos</option>
            <option value="pagado">Pagados</option>
          </select>
          <select className="field h-10! w-auto! text-[13px]" value={fPeriodo} onChange={(e) => setFPeriodo(e.target.value)}>
            <option value="todos">Periodo: todos</option>
            {periodos.map((p) => <option key={p} value={p}>{mesLabel(p)}</option>)}
          </select>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <Empty icon="coins" title="Sin cobros para este filtro" sub="Genera los cobros del mes para crear el cargo de gastos comunes a cada propietario." />
      ) : (
        <div className="code-scroll overflow-x-auto border-[1.5px] border-ink bg-card">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b-[1.5px] border-ink bg-paper2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink2">
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3">Vence</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b border-line transition-colors last:border-0 hover:bg-paper2/60">
                  <td className="px-4 py-3 font-mono text-[13px] font-bold text-pine">{c.unidad}</td>
                  <td className="px-4 py-3">
                    <p className="text-[13.5px] font-medium text-ink">{c.concepto}</p>
                    {c.recordatorio && (
                      <p className="flex items-center gap-1 font-mono text-[10px] uppercase text-teal"><Icon name="send" size={10} /> recordatorio {fmtFecha(c.recordatorio)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11.5px] capitalize text-ink3">{mesLabel(c.periodo)}</td>
                  <td className="tnum px-4 py-3 text-right font-mono text-[13.5px] font-bold text-ink">{fmtCLP(c.monto)}</td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-ink3">{fmtFecha(c.vencimiento)}</td>
                  <td className="px-4 py-3"><EstadoTag estado={c.estado} /></td>
                  <td className="px-4 py-3 text-right">
                    {c.estado !== "pagado" ? (
                      <Btn variant="paper" size="sm" onClick={() => pagoManual(c)} disabled={busy === c.id}>
                        {busy === c.id ? <Spinner className="h-3.5 w-3.5" /> : <><Icon name="check" size={13} /> Registrar pago</>}
                      </Btn>
                    ) : (
                      <span className="font-mono text-[10.5px] uppercase text-ink3">pagado {c.pagadoEl ? fmtFecha(c.pagadoEl) : ""}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalGen && <ModalGenerarCobros parcela={data.parcela} onClose={() => setModalGen(false)} onDone={async () => { setModalGen(false); await reload(); }} />}
      {modalMulta && <ModalMulta data={data} onClose={() => setModalMulta(false)} onDone={async () => { setModalMulta(false); await reload(); }} />}
    </div>
  );
}

function ModalGenerarCobros({ parcela, onClose, onDone }: { parcela: Parcela; onClose: () => void; onDone: () => Promise<void> }) {
  const [periodo, setPeriodo] = useState(mesActual());
  const [monto, setMonto] = useState(86400);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title="Generar cobros mensuales">
      <p className="mb-4 text-[13.5px] leading-relaxed text-ink2">
        Se creará un cargo de <strong className="text-ink">gastos comunes</strong> a cada propietario de <strong className="text-ink">{parcela.nombre}</strong>.
        Es idempotente: si el periodo ya fue generado, no se duplica.
      </p>
      <div className="space-y-4">
        <Field label="Periodo"><input className="field" type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></Field>
        <Field label="Monto por unidad (CLP)"><input className="field" type="number" min={1000} step={500} value={monto} onChange={(e) => setMonto(Number(e.target.value))} /></Field>
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn
          variant="lime" disabled={busy || !periodo || monto <= 0}
          onClick={async () => {
            setBusy(true);
            const n = await api.generarCobros(parcela.id, periodo, monto);
            toast(n > 0 ? n + " cobros generados para " + mesLabel(periodo) + "." : "Ese periodo ya estaba generado — sin duplicados.", n > 0 ? "ok" : "warn");
            await onDone();
          }}
        >
          {busy ? <Spinner /> : <><Icon name="coins" size={15} /> Generar</>}
        </Btn>
      </div>
    </Modal>
  );
}

function ModalMulta({ data, onClose, onDone }: { data: CondoData; onClose: () => void; onDone: () => Promise<void> }) {
  const unidades = useMemo(
    () => data.miembros.flatMap((u) => u.membresias.filter((m) => m.parcelaId === data.parcela.id && m.unidad).map((m) => m.unidad!)),
    [data],
  );
  const [unidad, setUnidad] = useState(unidades[0] ?? "");
  const [concepto, setConcepto] = useState("Multa · estacionamiento de visitas");
  const [monto, setMonto] = useState(22000);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title="Aplicar multa a unidad">
      <div className="space-y-4">
        <Field label="Unidad">
          <select className="field" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
            {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Concepto"><input className="field" value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
        <Field label="Monto (CLP)"><input className="field" type="number" min={1000} step={1000} value={monto} onChange={(e) => setMonto(Number(e.target.value))} /></Field>
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn
          variant="danger" disabled={busy || !unidad || !concepto.trim() || monto <= 0}
          onClick={async () => {
            setBusy(true);
            await api.crearMulta(data.parcela.id, unidad, concepto.trim(), monto);
            toast("Multa aplicada a " + unidad + " por " + fmtCLP(monto) + ".", "warn");
            await onDone();
          }}
        >
          {busy ? <Spinner /> : <><Icon name="alert" size={14} /> Aplicar multa</>}
        </Btn>
      </div>
    </Modal>
  );
}

/* ── finanzas ── */
function Finanzas({ data, reload, can }: { data: CondoData; reload: () => Promise<void>; can: (c: Capacidad) => boolean }) {
  const [modalMov, setModalMov] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const mes = mesActual();
  const ingMes = data.movimientos.filter((m) => m.tipo === "ingreso" && m.fecha.slice(0, 7) === mes).reduce((a, m) => a + m.monto, 0);
  const egrMes = data.movimientos.filter((m) => m.tipo === "egreso" && m.fecha.slice(0, 7) === mes).reduce((a, m) => a + m.monto, 0);
  const fondo = data.movimientos.filter((m) => m.categoria === "Fondo de reserva").reduce((a, m) => a + (m.tipo === "egreso" ? m.monto : -m.monto), 0);
  const movs = [...data.movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingresos del mes" value={fmtCLP(ingMes)} icon="chart" accent />
        <StatCard label="Egresos del mes" value={fmtCLP(egrMes)} icon="wallet" />
        <StatCard label="Resultado del mes" value={fmtCLP(ingMes - egrMes)} icon="coins" />
        <StatCard label="Fondo de reserva" value={fmtCLP(fondo)} icon="shield" sub="acumulado histórico" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="border-[1.5px] border-ink bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b-[1.5px] border-ink px-5 py-4">
            <h3 className="font-display text-lg font-bold text-ink">Libro de movimientos</h3>
            {can("finanzas_escribir") && (
              <Btn size="sm" variant="paper" className="ml-auto" onClick={() => setModalMov(true)}>
                <Icon name="plus" size={13} /> Registrar movimiento
              </Btn>
            )}
          </div>
          <div className="code-scroll overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">
                  <th className="px-5 py-2.5">Fecha</th>
                  <th className="px-5 py-2.5">Concepto</th>
                  <th className="px-5 py-2.5 text-right">Monto</th>
                  <th className="px-5 py-2.5 text-center">{can("conciliar") ? "Conciliado" : "Banco"}</th>
                </tr>
              </thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-paper2/60">
                    <td className="px-5 py-2.5 font-mono text-[11px] text-ink3">{fmtFecha(m.fecha)}</td>
                    <td className="px-5 py-2.5">
                      <p className="text-[13px] font-medium text-ink">{m.concepto}</p>
                      <p className="font-mono text-[10px] uppercase text-ink3">{m.categoria}</p>
                    </td>
                    <td className={"tnum px-5 py-2.5 text-right font-mono text-[13px] font-bold " + (m.tipo === "ingreso" ? "text-ok" : "text-signal")}>
                      {m.tipo === "ingreso" ? "+" : "−"}{fmtCLP(m.monto)}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <button
                        onClick={async () => {
                          if (!can("conciliar")) {
                            toast("403 · La conciliación bancaria es exclusiva del administrador.", "err");
                            return;
                          }
                          setBusy(m.id);
                          await api.toggleConciliado(m.id);
                          await reload();
                          setBusy(null);
                        }}
                        className={
                          "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] font-bold uppercase transition-all " +
                          (m.conciliado ? "border-ok/60 bg-ok/15 text-[#1d6b45]" : "border-ink/30 text-ink3 hover:border-ink")
                        }
                        title={can("conciliar") ? "Marcar conciliación bancaria" : "Solo lectura para el comité"}
                      >
                        {busy === m.id ? <Spinner className="h-3 w-3" /> : <Icon name={m.conciliado ? "check" : "clock"} size={11} />}
                        {m.conciliado ? "sí" : "no"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="border-[1.5px] border-ink bg-pine p-5 text-paper">
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-lime">Reporte mensual</p>
            <h3 className="mt-1 font-display text-xl font-bold capitalize">{mesLabel(mes)}</h3>
            <dl className="mt-4 space-y-0">
              {[
                { l: "Ingresos", v: fmtCLP(ingMes) },
                { l: "Egresos", v: "−" + fmtCLP(egrMes) },
              ].map((r) => (
                <div key={r.l} className="ledger-dark flex justify-between py-2.5">
                  <dt className="text-[13.5px] text-paper/75">{r.l}</dt>
                  <dd className="tnum font-mono text-[13.5px] font-bold">{r.v}</dd>
                </div>
              ))}
              <div className="flex justify-between py-3">
                <dt className="font-display text-[15px] font-bold">Resultado</dt>
                <dd className={"tnum font-display text-[19px] font-bold " + (ingMes - egrMes >= 0 ? "text-lime" : "text-signal")}>{fmtCLP(ingMes - egrMes)}</dd>
              </div>
            </dl>
            <Btn
              variant="lime" className="mt-2 w-full"
              onClick={() => {
                api.exportarReporte(data.parcela.id);
                toast("Reporte CSV descargado con " + data.movimientos.length + " movimientos.");
              }}
            >
              <Icon name="download" size={15} /> Exportar CSV
            </Btn>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wide text-paper/50">Se comparte con la comunidad en Transparencia</p>
          </section>

          <section className="border-[1.5px] border-ink bg-card p-5">
            <h3 className="font-display text-lg font-bold text-ink">Conciliación</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink2">
              {data.movimientos.filter((m) => m.conciliado).length} de {data.movimientos.length} movimientos conciliados con la cuenta bancaria del condominio.
            </p>
            <div className="mt-3 h-2.5 border border-ink bg-paper2">
              <div className="h-full bg-ok transition-all" style={{ width: (data.movimientos.filter((m) => m.conciliado).length / Math.max(1, data.movimientos.length)) * 100 + "%" }} />
            </div>
          </section>
        </div>
      </div>

      {modalMov && <ModalMovimiento parcelaId={data.parcela.id} onClose={() => setModalMov(false)} onDone={async () => { setModalMov(false); await reload(); }} />}
    </div>
  );
}

function ModalMovimiento({ parcelaId, onClose, onDone }: { parcelaId: string; onClose: () => void; onDone: () => Promise<void> }) {
  const [tipo, setTipo] = useState<"ingreso" | "egreso">("egreso");
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("Mantención");
  const [monto, setMonto] = useState(150000);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title="Registrar movimiento contable">
      <div className="space-y-4">
        <Field label="Tipo">
          <div className="grid grid-cols-2 gap-2">
            {(["ingreso", "egreso"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={"border-[1.5px] px-3 py-2.5 font-mono text-[12px] font-bold uppercase tracking-wide transition-all " + (tipo === t ? "border-ink bg-pine text-lime" : "border-ink bg-card text-ink2 hover:bg-paper2")}>
                {t === "ingreso" ? "+ ingreso" : "− egreso"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Concepto"><input className="field" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Reparación portón eléctrico" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoría">
            <select className="field" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {["Gastos comunes", "Multas", "Personal", "Servicios", "Mantención", "Seguros", "Fondo de reserva", "Otros"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Monto (CLP)"><input className="field" type="number" min={1} value={monto} onChange={(e) => setMonto(Number(e.target.value))} /></Field>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn
          variant="lime" disabled={busy || !concepto.trim() || monto <= 0}
          onClick={async () => {
            setBusy(true);
            await api.crearMovimiento({ parcelaId, tipo, concepto: concepto.trim(), categoria, monto });
            toast((tipo === "ingreso" ? "Ingreso" : "Egreso") + " registrado: " + fmtCLP(monto));
            await onDone();
          }}
        >
          {busy ? <Spinner /> : <><Icon name="check" size={15} /> Guardar</>}
        </Btn>
      </div>
    </Modal>
  );
}

/* ── avisos ── */
function Avisos({ data, reload, autor }: { data: CondoData; reload: () => Promise<void>; autor: string }) {
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const estilos: Record<TipoAviso, { cls: string; icon: string; label: string }> = {
    emergencia: { cls: "border-signal bg-signal/10", icon: "alert", label: "Emergencia" },
    mantencion: { cls: "border-amber bg-amber/10", icon: "clock", label: "Mantención" },
    noticia: { cls: "border-pine bg-pine/5", icon: "megaphone", label: "Noticia" },
  };
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Muro digital</h2>
          <p className="text-[13px] text-ink3">Todo lo publicado notifica al instante a los residentes</p>
        </div>
        <Btn className="ml-auto" onClick={() => setModal(true)}><Icon name="plus" size={15} /> Publicar aviso</Btn>
      </div>

      {data.avisos.length === 0 ? (
        <Empty icon="megaphone" title="El muro está vacío" sub="Publica la primera noticia del condominio." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.avisos.map((a) => {
            const e = estilos[a.tipo];
            return (
              <article key={a.id} className={"border-[1.5px] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#1a2521] " + e.cls}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink2">
                    <Icon name={e.icon} size={14} /> {e.label}
                  </span>
                  <button
                    onClick={async () => {
                      setBusy(a.id);
                      await api.eliminarAviso(a.id);
                      toast("Aviso eliminado del muro.", "warn");
                      await reload();
                      setBusy(null);
                    }}
                    className="grid h-7 w-7 place-items-center border border-ink/30 text-ink3 transition-colors hover:border-signal hover:bg-signal hover:text-paper"
                    aria-label="Eliminar aviso"
                  >
                    {busy === a.id ? <Spinner className="h-3 w-3" /> : <Icon name="trash" size={13} />}
                  </button>
                </div>
                <h3 className="mt-3 font-display text-xl font-bold leading-tight text-ink">{a.titulo}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink2">{a.cuerpo}</p>
                <p className="mt-3 font-mono text-[10.5px] uppercase tracking-wide text-ink3">{a.autor} · {fmtFecha(a.fecha)}</p>
              </article>
            );
          })}
        </div>
      )}

      {modal && <ModalAviso parcelaId={data.parcela.id} autor={autor} onClose={() => setModal(false)} onDone={async () => { setModal(false); await reload(); }} />}
    </div>
  );
}

function ModalAviso({ parcelaId, autor, onClose, onDone }: { parcelaId: string; autor: string; onClose: () => void; onDone: () => Promise<void> }) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoAviso>("noticia");
  const [cuerpo, setCuerpo] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title="Publicar en el muro">
      <div className="space-y-4">
        <Field label="Título"><input className="field" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Corte de agua programado" /></Field>
        <Field label="Tipo de aviso">
          <div className="grid grid-cols-3 gap-2">
            {(["noticia", "mantencion", "emergencia"] as TipoAviso[]).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={"border-[1.5px] px-2 py-2 font-mono text-[11px] font-bold uppercase tracking-wide transition-all " + (tipo === t ? "border-ink bg-pine text-lime" : "border-ink bg-card text-ink2 hover:bg-paper2")}>
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Contenido"><textarea className="field" rows={4} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} placeholder="Detalla el aviso para la comunidad…" /></Field>
        {tipo === "emergencia" && (
          <p className="flex items-center gap-2 border-[1.5px] border-signal bg-signal/10 px-3 py-2 text-[12.5px] font-medium text-[#a03526]">
            <Icon name="alert" size={14} /> Se enviará notificación push urgente a todos los residentes.
          </p>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn
          variant="lime" disabled={busy || !titulo.trim() || !cuerpo.trim()}
          onClick={async () => {
            setBusy(true);
            await api.crearAviso({ parcelaId, titulo: titulo.trim(), cuerpo: cuerpo.trim(), tipo, autor });
            toast("Aviso publicado" + (tipo === "emergencia" ? " — notificación urgente enviada." : "."));
            await onDone();
          }}
        >
          {busy ? <Spinner /> : <><Icon name="send" size={14} /> Publicar</>}
        </Btn>
      </div>
    </Modal>
  );
}

/* ── residentes ── */
function Residentes({ data, reload }: { data: CondoData; reload: () => Promise<void> }) {
  const [modal, setModal] = useState(false);
  const miembros = data.miembros
    .map((u) => ({ u, m: u.membresias.find((x) => x.parcelaId === data.parcela.id)! }))
    .sort((a, b) => a.m.rol.localeCompare(b.m.rol));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Residentes</h2>
          <p className="text-[13px] text-ink3">{miembros.length} miembros con acceso a este condominio</p>
        </div>
        <Btn className="ml-auto" onClick={() => setModal(true)}><Icon name="plus" size={15} /> Agregar miembro</Btn>
      </div>

      <div className="code-scroll overflow-x-auto border-[1.5px] border-ink bg-card">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="border-b-[1.5px] border-ink bg-paper2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink2">
              <th className="px-4 py-3">Persona</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3">Rol en el condominio</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {miembros.map(({ u, m }) => (
              <tr key={u.id} className="border-b border-line transition-colors last:border-0 hover:bg-paper2/60">
                <td className="px-4 py-3">
                  <p className="text-[13.5px] font-semibold text-ink">{u.nombre}</p>
                  <p className="font-mono text-[11px] text-ink3">{u.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-[13px] font-bold text-pine">{m.unidad ?? "—"}</td>
                <td className="px-4 py-3">
                  <select
                    className="field h-9! w-auto! text-[12.5px]"
                    value={m.rol}
                    onChange={async (e) => {
                      await api.cambiarRolMiembro(u.id, data.parcela.id, e.target.value as RolCondo);
                      toast("Rol de " + u.nombre + " actualizado a " + ROL_LABEL[e.target.value as RolCondo] + ".");
                      await reload();
                    }}
                  >
                    {(["ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO"] as RolCondo[]).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3"><EstadoTag estado={u.activo ? "activa" : "inactiva"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <ModalMiembro data={data} onClose={() => setModal(false)} onDone={async () => { setModal(false); await reload(); }} />}
    </div>
  );
}

function ModalMiembro({ data, onClose, onDone }: { data: CondoData; onClose: () => void; onDone: () => Promise<void> }) {
  const candidatos = data.todosUsuarios.filter((u) => !u.rolGlobal && !u.membresias.some((m) => m.parcelaId === data.parcela.id));
  const [usuarioId, setUsuarioId] = useState(candidatos[0]?.id ?? "");
  const [rol, setRol] = useState<RolCondo>("PROPIETARIO");
  const [unidad, setUnidad] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title="Agregar miembro al condominio">
      {candidatos.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-ink2">
          No hay usuarios disponibles: todos ya pertenecen a <strong className="text-ink">{data.parcela.nombre}</strong>.
          Crea un usuario nuevo desde la consola de plataforma.
        </p>
      ) : (
        <div className="space-y-4">
          <Field label="Usuario existente">
            <select className="field" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
              {candidatos.map((u) => <option key={u.id} value={u.id}>{u.nombre} — {u.email}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rol">
              <select className="field" value={rol} onChange={(e) => setRol(e.target.value as RolCondo)}>
                {(["ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO"] as RolCondo[]).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
              </select>
            </Field>
            <Field label="Unidad">
              <input className="field" placeholder="A-42" value={unidad} onChange={(e) => setUnidad(e.target.value.toUpperCase())} disabled={rol === "ADMIN" || rol === "COMITE"} />
            </Field>
          </div>
          {error && <p className="border-[1.5px] border-signal bg-signal/10 px-3 py-2.5 text-[13px] font-medium text-[#a03526]">{error}</p>}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2.5">
        <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
        {candidatos.length > 0 && (
          <Btn
            variant="lime" disabled={busy}
            onClick={async () => {
              if ((rol === "PROPIETARIO" || rol === "ARRENDATARIO") && !unidad.trim()) return setError("Indica la unidad (ej: A-42).");
              setBusy(true);
              try {
                await api.agregarMiembro(usuarioId, data.parcela.id, rol, rol === "PROPIETARIO" || rol === "ARRENDATARIO" ? unidad.trim() : undefined);
                toast("Miembro agregado con rol " + ROL_LABEL[rol] + ".");
                await onDone();
              } catch (e) {
                setError(e instanceof Error ? e.message : "No se pudo agregar.");
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner /> : <><Icon name="check" size={15} /> Agregar</>}
          </Btn>
        )}
      </div>
    </Modal>
  );
}

/* ── bitácora ── */
function Bitacora({ data, reload, escribir }: { data: CondoData; reload: () => Promise<void>; escribir: boolean }) {
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Control de acceso</h2>
          <p className="text-[13px] text-ink3">Bitácora digital de conserjería · visitas y proveedores</p>
        </div>
        {escribir ? (
          <Btn className="ml-auto" onClick={() => setModal(true)}><Icon name="plus" size={15} /> Registrar entrada</Btn>
        ) : (
          <span className="ml-auto flex items-center gap-2 border border-dashed border-ink/40 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-ink3">
            <Icon name="eye" size={13} /> modo lectura — rol comité
          </span>
        )}
      </div>

      {data.accesos.length === 0 ? (
        <Empty icon="gate" title="Sin registros hoy" sub="Cada visita queda con hora de entrada, destino y salida." />
      ) : (
        <div className="code-scroll overflow-x-auto border-[1.5px] border-ink bg-card">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b-[1.5px] border-ink bg-paper2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink2">
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Persona / empresa</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Entrada</th>
                <th className="px-4 py-3">Salida</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.accesos.map((a: RegistroAcceso) => (
                <tr key={a.id} className="border-b border-line transition-colors last:border-0 hover:bg-paper2/60">
                  <td className="px-4 py-3">
                    <span className={"border px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase " + (a.tipo === "proveedor" ? "border-teal/60 bg-teal/10 text-teal" : "border-ink/30 bg-paper2 text-ink2")}>{a.tipo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[13.5px] font-semibold text-ink">{a.nombre}</p>
                    <p className="font-mono text-[11px] text-ink3">{a.documento}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink2">{a.destino}</td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-ink3">{fmtFecha(a.entrada)} · {hora(a.entrada)}</td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-ink3">{a.salida ? fmtFecha(a.salida) + " · " + hora(a.salida) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {a.salida ? (
                      <EstadoTag estado="salida" />
                    ) : escribir ? (
                      <Btn
                        variant="paper" size="sm" disabled={busy === a.id}
                        onClick={async () => {
                          setBusy(a.id);
                          await api.registrarSalida(a.id);
                          toast("Salida registrada: " + a.nombre);
                          await reload();
                          setBusy(null);
                        }}
                      >
                        {busy === a.id ? <Spinner className="h-3.5 w-3.5" /> : "Registrar salida"}
                      </Btn>
                    ) : (
                      <EstadoTag estado="dentro" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <ModalAcceso parcelaId={data.parcela.id} onClose={() => setModal(false)} onDone={async () => { setModal(false); await reload(); }} />}
    </div>
  );
}

function ModalAcceso({ parcelaId, onClose, onDone }: { parcelaId: string; onClose: () => void; onDone: () => Promise<void> }) {
  const [tipo, setTipo] = useState<"visita" | "proveedor">("visita");
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [destino, setDestino] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title="Registrar entrada en conserjería">
      <div className="space-y-4">
        <Field label="Tipo">
          <div className="grid grid-cols-2 gap-2">
            {(["visita", "proveedor"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={"border-[1.5px] px-3 py-2.5 font-mono text-[12px] font-bold uppercase tracking-wide transition-all " + (tipo === t ? "border-ink bg-pine text-lime" : "border-ink bg-card text-ink2 hover:bg-paper2")}>
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label={tipo === "visita" ? "Nombre del visitante" : "Empresa / técnico"}>
          <input className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={tipo === "visita" ? "Ej: Camila Órdenes" : "Ej: TecnoAscensores SpA"} />
        </Field>
        <Field label="Documento / RUT"><input className="field" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="12.345.678-9" /></Field>
        <Field label="Destino"><input className="field" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Depto. A-42 / Torres A y B" /></Field>
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn
          variant="lime" disabled={busy || !nombre.trim() || !destino.trim()}
          onClick={async () => {
            setBusy(true);
            await api.registrarAcceso({ parcelaId, tipo, nombre: nombre.trim(), documento: documento.trim() || "s/d", destino: destino.trim() });
            toast("Entrada registrada: " + nombre + " → " + destino);
            await onDone();
          }}
        >
          {busy ? <Spinner /> : <><Icon name="gate" size={15} /> Registrar entrada</>}
        </Btn>
      </div>
    </Modal>
  );
}
