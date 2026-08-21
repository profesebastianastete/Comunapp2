import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api, fmtCLP, fmtFecha, fmtFechaLarga, mesLabel, ROL_LABEL,
  type Cobro, type Pago, type Reserva, type Sesion, type Usuario,
} from "../lib/store";
import { Btn, Empty, EstadoTag, Field, Icon, Modal, Spinner, toast } from "./ui";

type ResData = Awaited<ReturnType<typeof api.datosResidente>>;
type Tab = "cuenta" | "reservas" | "votaciones" | "muro" | "recibos";

const BLOQUES: Reserva["bloque"][] = ["Mañana", "Tarde", "Noche"];

export default function DashResidente({ sesion, usuario }: { sesion: Sesion; usuario: Usuario }) {
  const rol = sesion.rol; // PROPIETARIO | ARRENDATARIO
  const [tab, setTab] = useState<Tab>("cuenta");
  const [data, setData] = useState<ResData | null>(null);
  const [pagar, setPagar] = useState<Cobro | null>(null);

  const reload = useCallback(async () => {
    setData(await api.datosResidente(sesion.parcelaId!, sesion.usuarioId));
  }, [sesion.parcelaId, sesion.usuarioId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!data)
    return (
      <div className="flex items-center justify-center gap-3 py-28 text-ink2">
        <Spinner /> <span className="font-mono text-[13px] uppercase tracking-wide">Cargando tu estado de cuenta…</span>
      </div>
    );

  const pendiente = data.cobros.filter((c) => c.estado !== "pagado").reduce((a, c) => a + c.monto, 0);
  const esPropietario = rol === "PROPIETARIO";

  const tabs: { id: Tab; label: string; icon: string }[] = esPropietario
    ? [
        { id: "cuenta", label: "Mi cuenta", icon: "receipt" },
        { id: "reservas", label: "Reservas", icon: "calendar" },
        { id: "votaciones", label: "Asambleas", icon: "vote" },
        { id: "muro", label: "Muro", icon: "megaphone" },
        { id: "recibos", label: "Recibos", icon: "file" },
      ]
    : [
        { id: "cuenta", label: "Mi cuenta", icon: "receipt" },
        { id: "recibos", label: "Recibos", icon: "file" },
      ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
      {/* saludo */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-pine">
            Portal del residente · {data.parcela.nombre} · unidad {data.membresia.unidad}
          </p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
            Hola, {usuario.nombre.split(" ")[0]} <span className="text-pine">👋</span>
          </h1>
          <p className="mt-1 text-[13.5px] text-ink3">Sesión como {ROL_LABEL[rol]} — {!esPropietario && "tu acceso se limita a estado de cuenta y pagos, según el reglamento."}</p>
        </div>
        <div className={"border-[1.5px] border-ink px-5 py-3.5 " + (pendiente > 0 ? "bg-card hard-sm" : "bg-pine text-paper hard-lime-sm")}>
          <p className={"font-mono text-[10px] font-bold uppercase tracking-[0.2em] " + (pendiente > 0 ? "text-ink3" : "text-lime")}>
            {pendiente > 0 ? "Total pendiente" : "Estado"}
          </p>
          <p className={"tnum font-display text-[30px] font-bold leading-tight " + (pendiente > 0 ? "text-signal" : "text-paper")}>
            {pendiente > 0 ? fmtCLP(pendiente) : "Al día ✓"}
          </p>
        </div>
      </div>

      <div className="code-scroll mb-7 flex gap-1.5 overflow-x-auto border-b-[1.5px] border-ink pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "flex shrink-0 items-center gap-2 border-[1.5px] px-4 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] transition-all " +
              (tab === t.id ? "border-ink bg-pine text-lime shadow-[3px_3px_0_0_#1a2521]" : "border-transparent text-ink2 hover:border-ink hover:bg-card")
            }
          >
            <Icon name={t.icon} size={14} /> {t.label}
          </button>
        ))}
        {!esPropietario && (
          <span className="ml-auto hidden items-center gap-2 self-center pr-2 font-mono text-[10px] uppercase tracking-wide text-ink3 sm:flex">
            <Icon name="lock" size={11} /> reservas y asambleas: solo propietarios
          </span>
        )}
      </div>

      <div key={tab} className="fade-swap">
        {tab === "cuenta" && <Cuenta data={data} onPagar={setPagar} />}
        {tab === "reservas" && esPropietario && <Reservas data={data} usuario={usuario} reload={reload} />}
        {tab === "votaciones" && esPropietario && <Votaciones data={data} usuarioId={usuario.id} reload={reload} />}
        {tab === "muro" && esPropietario && <Muro data={data} />}
        {tab === "recibos" && <Recibos data={data} />}
      </div>

      {pagar && <PayModal cobro={pagar} usuarioId={usuario.id} onClose={() => setPagar(null)} onDone={async () => { setPagar(null); await reload(); }} />}
    </div>
  );
}

/* ── estado de cuenta ── */
function Cuenta({ data, onPagar }: { data: ResData; onPagar: (c: Cobro) => void }) {
  const ordenados = [...data.cobros].sort((a, b) => b.periodo.localeCompare(a.periodo));
  const proximoVenc = data.cobros.filter((c) => c.estado !== "pagado").sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))[0];
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <section className="border-[1.5px] border-ink bg-card">
        <div className="flex items-center justify-between border-b-[1.5px] border-ink px-5 py-4">
          <h3 className="font-display text-lg font-bold text-ink">Estado de cuenta · unidad {data.membresia.unidad}</h3>
          <span className="font-mono text-[10.5px] uppercase tracking-wide text-ink3">{ordenados.length} cargos</span>
        </div>
        {ordenados.length === 0 ? (
          <div className="p-5"><Empty icon="receipt" title="Sin cargos registrados" sub="La administración aún no genera cobros para tu unidad." /></div>
        ) : (
          <div className="code-scroll overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">
                  <th className="px-5 py-2.5">Periodo</th>
                  <th className="px-5 py-2.5">Concepto</th>
                  <th className="px-5 py-2.5 text-right">Monto</th>
                  <th className="px-5 py-2.5">Vence</th>
                  <th className="px-5 py-2.5">Estado</th>
                  <th className="px-5 py-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map((c) => (
                  <tr key={c.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-paper2/60">
                    <td className="px-5 py-3 font-mono text-[11.5px] capitalize text-ink3">{mesLabel(c.periodo)}</td>
                    <td className="px-5 py-3">
                      <p className="text-[13.5px] font-medium text-ink">{c.concepto}</p>
                      {c.tipo === "multa" && <p className="font-mono text-[10px] uppercase text-signal">multa aplicada</p>}
                    </td>
                    <td className="tnum px-5 py-3 text-right font-mono text-[13.5px] font-bold text-ink">{fmtCLP(c.monto)}</td>
                    <td className="px-5 py-3 font-mono text-[11.5px] text-ink3">{fmtFecha(c.vencimiento)}</td>
                    <td className="px-5 py-3"><EstadoTag estado={c.estado} /></td>
                    <td className="px-5 py-3 text-right">
                      {c.estado !== "pagado" ? (
                        <Btn size="sm" variant="lime" onClick={() => onPagar(c)}><Icon name="card" size={13} /> Pagar</Btn>
                      ) : (
                        <span className="font-mono text-[10.5px] uppercase text-ink3">✓ {c.pagadoEl ? fmtFecha(c.pagadoEl) : ""}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="space-y-6">
        <section className="border-[1.5px] border-ink bg-pine p-5 text-paper">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-lime">Resumen</p>
          <dl className="mt-3">
            <div className="ledger-dark flex justify-between py-2.5">
              <dt className="text-[13.5px] text-paper/75">Próximo vencimiento</dt>
              <dd className="font-mono text-[13px] font-semibold">{proximoVenc ? fmtFecha(proximoVenc.vencimiento) : "—"}</dd>
            </div>
            <div className="ledger-dark flex justify-between py-2.5">
              <dt className="text-[13.5px] text-paper/75">Último pago</dt>
              <dd className="font-mono text-[13px] font-semibold">{data.pagos[0] ? fmtFecha(data.pagos[data.pagos.length - 1].fecha) : "sin pagos"}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="font-display text-[15px] font-bold">Deuda total</dt>
              <dd className={"tnum font-display text-[22px] font-bold " + (data.cobros.some((c) => c.estado !== "pagado") ? "text-lime" : "text-paper")}>
                {fmtCLP(data.cobros.filter((c) => c.estado !== "pagado").reduce((a, c) => a + c.monto, 0))}
              </dd>
            </div>
          </dl>
          <p className="border-t border-paper/20 pt-3 text-[12px] leading-relaxed text-paper/65">
            Pagos procesados por <strong className="text-paper">Mercado Pago</strong>. El comprobante queda disponible al instante en Recibos.
          </p>
        </section>

        {data.avisos.filter((a) => a.tipo === "emergencia").slice(0, 1).map((a) => (
          <section key={a.id} className="border-[1.5px] border-signal bg-signal/10 p-5">
            <p className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#a03526]">
              <Icon name="alert" size={14} /> Aviso de emergencia
            </p>
            <h3 className="mt-2 font-display text-lg font-bold leading-tight text-ink">{a.titulo}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink2">{a.cuerpo}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ── pago Mercado Pago (simulado) ── */
function PayModal({ cobro, usuarioId, onClose, onDone }: { cobro: Cobro; usuarioId: string; onClose: () => void; onDone: () => Promise<void> }) {
  const [fase, setFase] = useState<"form" | "processing" | "done">("form");
  const [titular, setTitular] = useState("");
  const [numero, setNumero] = useState("");
  const [venc, setVenc] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pago, setPago] = useState<Pago | null>(null);

  const fmtNumero = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  const fmtVenc = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  };

  const pagar = async () => {
    if (!titular.trim()) return setError("Escribe el nombre del titular.");
    if (numero.replace(/\s/g, "").length !== 16) return setError("El número de tarjeta debe tener 16 dígitos.");
    if (!/^\d{2}\/\d{2}$/.test(venc)) return setError("Vencimiento en formato MM/AA.");
    if (cvv.length !== 3) return setError("CVV de 3 dígitos.");
    setError(null);
    setFase("processing");
    try {
      const p = await api.pagarCobro(cobro.id, usuarioId);
      await new Promise((r) => setTimeout(r, 700));
      setPago(p);
      setFase("done");
      toast("Pago aprobado: " + fmtCLP(cobro.monto) + " — comprobante " + p.comprobante);
    } catch (e) {
      setError(e instanceof Error ? e.message : "El pago fue rechazado.");
      setFase("form");
    }
  };

  return (
    <Modal open onClose={fase === "processing" ? () => undefined : onClose} title={fase === "done" ? "Pago aprobado" : "Pagar con Mercado Pago"}>
      {fase === "form" && (
        <div>
          <div className="mb-5 flex items-center justify-between border-[1.5px] border-ink bg-card px-4 py-3">
            <div>
              <p className="text-[13.5px] font-semibold text-ink">{cobro.concepto} · {cobro.unidad}</p>
              <p className="font-mono text-[10.5px] uppercase text-ink3">{mesLabel(cobro.periodo)} · vence {fmtFecha(cobro.vencimiento)}</p>
            </div>
            <p className="tnum font-display text-[24px] font-bold text-ink">{fmtCLP(cobro.monto)}</p>
          </div>
          <div className="space-y-4">
            <Field label="Titular de la tarjeta"><input className="field" value={titular} onChange={(e) => setTitular(e.target.value)} placeholder="Como aparece en la tarjeta" /></Field>
            <Field label="Número de tarjeta">
              <div className="relative">
                <input className="field pr-10 font-mono" inputMode="numeric" value={numero} onChange={(e) => setNumero(fmtNumero(e.target.value))} placeholder="4509 9535 6623 3704" />
                <Icon name="card" size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3" />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vencimiento"><input className="field font-mono" inputMode="numeric" value={venc} onChange={(e) => setVenc(fmtVenc(e.target.value))} placeholder="12/28" /></Field>
              <Field label="CVV"><input className="field font-mono" inputMode="numeric" type="password" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="•••" /></Field>
            </div>
          </div>
          {error && (
            <p className="mt-4 flex items-start gap-2 border-[1.5px] border-signal bg-signal/10 px-3 py-2.5 text-[13px] font-medium text-[#a03526]">
              <Icon name="alert" size={15} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
          <button
            onClick={pagar}
            className="mt-6 flex w-full items-center justify-center gap-2.5 border-[1.5px] border-ink bg-[#009ee3] py-3.5 font-bold text-[15px] text-white shadow-[4px_4px_0_0_#1a2521] transition-all hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Pagar {fmtCLP(cobro.monto)} <span className="opacity-80">con</span>
            <span className="font-display italic">mercado pago</span>
          </button>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wide text-ink3">Simulación de checkout · en producción redirige al init_point de la preferencia</p>
        </div>
      )}

      {fase === "processing" && (
        <div className="grid place-items-center py-10 text-center">
          <Spinner className="h-9 w-9 text-pine" />
          <p className="mt-5 font-display text-xl font-bold text-ink">Procesando tu pago…</p>
          <p className="mt-1.5 font-mono text-[12px] uppercase tracking-wide text-ink3">
            autorizando con Mercado Pago<span className="caret-blink">▊</span>
          </p>
        </div>
      )}

      {fase === "done" && pago && (
        <div className="text-center">
          <span className="stamp-in mx-auto grid h-16 w-16 place-items-center border-[3px] border-ok text-ok">
            <Icon name="check" size={30} />
          </span>
          <p className="mt-4 font-display text-2xl font-bold text-ink">¡Pago aprobado!</p>
          <p className="mt-1 text-[13.5px] text-ink2">{cobro.concepto} · unidad {cobro.unidad}</p>
          <div className="mx-auto mt-5 max-w-xs border-[1.5px] border-ink bg-card px-5 py-4 text-left">
            <div className="ledger flex justify-between py-1.5 text-[13px]"><span className="text-ink3">Comprobante</span><span className="font-mono font-bold text-pine">{pago.comprobante}</span></div>
            <div className="ledger flex justify-between py-1.5 text-[13px]"><span className="text-ink3">Monto</span><span className="tnum font-mono font-bold">{fmtCLP(pago.monto)}</span></div>
            <div className="flex justify-between py-1.5 text-[13px]"><span className="text-ink3">Fecha</span><span className="font-mono">{fmtFechaLarga(pago.fecha)}</span></div>
          </div>
          <div className="mt-6 flex justify-center gap-2.5">
            <Btn variant="paper" onClick={() => { api.descargarComprobante(pago); toast("Comprobante " + pago.comprobante + " descargado."); }}>
              <Icon name="download" size={14} /> Recibo
            </Btn>
            <Btn variant="lime" onClick={onDone}><Icon name="check" size={14} /> Listo</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── reservas ── */
function Reservas({ data, usuario, reload }: { data: ResData; usuario: Usuario; reload: () => Promise<void> }) {
  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric" }) };
    });
  }, []);
  const [areaId, setAreaId] = useState(data.areas[0]?.id ?? "");
  const [dia, setDia] = useState(dias[0].key);
  const [confirmar, setConfirmar] = useState<{ bloque: Reserva["bloque"] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const area = data.areas.find((a) => a.id === areaId);
  const ocupado = (bloque: Reserva["bloque"]) => data.reservas.find((r) => r.areaId === areaId && r.fecha === dia && r.bloque === bloque);
  const mias = data.reservas.filter((r) => r.usuarioId === usuario.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="border-[1.5px] border-ink bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          {data.areas.map((a) => (
            <button
              key={a.id}
              onClick={() => setAreaId(a.id)}
              className={
                "border-[1.5px] px-3.5 py-2 font-mono text-[12px] font-semibold uppercase tracking-wide transition-all " +
                (areaId === a.id ? "border-ink bg-pine text-lime shadow-[3px_3px_0_0_#1a2521]" : "border-ink bg-paper text-ink2 hover:bg-paper2")
              }
            >
              {a.nombre}
            </button>
          ))}
          {area && <span className="ml-auto font-mono text-[10.5px] uppercase text-ink3">capacidad {area.capacidad} personas</span>}
        </div>

        <div className="code-scroll mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {dias.map((d) => (
            <button
              key={d.key}
              onClick={() => setDia(d.key)}
              className={
                "shrink-0 border-[1.5px] px-3.5 py-2 font-mono text-[12px] font-semibold capitalize transition-all " +
                (dia === d.key ? "border-ink bg-lime text-pine3 shadow-[3px_3px_0_0_#1a2521]" : "border-ink/25 bg-paper text-ink2 hover:border-ink")
              }
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {BLOQUES.map((b) => {
            const r = ocupado(b);
            const mia = r && r.usuarioId === usuario.id;
            return (
              <div key={b} className={"flex items-center gap-4 border-[1.5px] px-4 py-3.5 transition-all " + (r ? (mia ? "border-pine bg-pine/5" : "border-ink/20 bg-paper2/70") : "border-ink bg-card hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#1a2521]")}>
                <span className="w-20 shrink-0 font-mono text-[12px] font-bold uppercase tracking-wide text-ink2">{b}</span>
                {r ? (
                  <>
                    <span className="flex items-center gap-2 text-[13px] font-medium text-ink2">
                      <Icon name={mia ? "check" : "lock"} size={14} className={mia ? "text-pine" : "text-ink3"} />
                      {mia ? "Reservado por ti" : "Ocupado · " + r.solicitante}
                    </span>
                    {mia && (
                      <Btn
                        variant="ghost" size="sm" className="ml-auto border-signal! text-signal! hover:bg-signal! hover:text-paper!" disabled={busy === r.id}
                        onClick={async () => {
                          setBusy(r.id);
                          await api.cancelarReserva(r.id);
                          toast("Reserva cancelada: " + area?.nombre + " · " + b, "warn");
                          await reload();
                          setBusy(null);
                        }}
                      >
                        {busy === r.id ? <Spinner className="h-3.5 w-3.5" /> : "Cancelar"}
                      </Btn>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-[13px] text-ink3">Disponible</span>
                    <Btn variant="lime" size="sm" className="ml-auto" onClick={() => setConfirmar({ bloque: b })}>
                      <Icon name="plus" size={13} /> Reservar
                    </Btn>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-[1.5px] border-ink bg-card p-5">
        <h3 className="font-display text-lg font-bold text-ink">Mis reservas</h3>
        {mias.length === 0 ? (
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink3">Aún no tienes reservas. Elige un área, un día y un bloque disponibles.</p>
        ) : (
          <ul className="mt-2">
            {mias.map((r) => (
              <li key={r.id} className="ledger flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">{data.areas.find((a) => a.id === r.areaId)?.nombre ?? "Área"}</p>
                  <p className="font-mono text-[10.5px] uppercase text-ink3">{fmtFecha(r.fecha + "T12:00:00")} · {r.bloque}</p>
                </div>
                <button
                  onClick={async () => {
                    setBusy(r.id);
                    await api.cancelarReserva(r.id);
                    toast("Reserva cancelada.", "warn");
                    await reload();
                    setBusy(null);
                  }}
                  className="grid h-8 w-8 place-items-center border border-ink text-ink2 transition-colors hover:bg-signal hover:text-paper"
                  aria-label="Cancelar reserva"
                >
                  {busy === r.id ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="trash" size={14} />}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 border border-dashed border-ink/30 p-3 font-mono text-[10.5px] leading-relaxed text-ink3">
          REGLA: un bloque por área y fecha. Si otro vecino reserva antes, la API devuelve conflicto y nada se duplica.
        </p>
      </section>

      <Modal open={!!confirmar} onClose={() => setConfirmar(null)} title="Confirmar reserva">
        <p className="text-[14px] leading-relaxed text-ink2">
          ¿Reservar <strong className="text-ink">{area?.nombre}</strong> el <strong className="text-ink">{fmtFecha(dia + "T12:00:00")}</strong> en bloque{" "}
          <strong className="text-ink">{confirmar?.bloque}</strong>?
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Btn variant="ghost" onClick={() => setConfirmar(null)}>Volver</Btn>
          <Btn
            variant="lime" disabled={busy === "conf"}
            onClick={async () => {
              if (!confirmar) return;
              setBusy("conf");
              try {
                await api.crearReserva({
                  parcelaId: data.parcela.id, areaId, fecha: dia, bloque: confirmar.bloque,
                  usuarioId: usuario.id, solicitante: usuario.nombre,
                });
                toast("Reserva confirmada: " + area?.nombre + " · " + confirmar.bloque + ". ¡A disfrutar!");
                setConfirmar(null);
                await reload();
              } catch (e) {
                toast(e instanceof Error ? e.message : "No se pudo reservar.", "err");
              }
              setBusy(null);
            }}
          >
            {busy === "conf" ? <Spinner /> : <><Icon name="check" size={15} /> Confirmar</>}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ── votaciones ── */
function Votaciones({ data, usuarioId, reload }: { data: ResData; usuarioId: string; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const abiertas = data.votaciones.filter((v) => v.estado === "abierta");
  const cerradas = data.votaciones.filter((v) => v.estado === "cerrada");

  const Card = ({ v }: { v: (typeof data.votaciones)[number] }) => {
    const miVoto = v.votos[usuarioId];
    const total = Object.keys(v.votos).length || 1;
    const mostrarResultados = !!miVoto || v.estado === "cerrada";
    return (
      <article className="border-[1.5px] border-ink bg-card p-5 transition-all hover:shadow-[5px_5px_0_0_#1a2521]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold leading-tight text-ink">{v.titulo}</h3>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wide text-ink3">
              {v.estado === "abierta" ? "Vence " + fmtFecha(v.vence + "T12:00:00") : "Cerrada el " + fmtFecha(v.vence + "T12:00:00")} · {Object.keys(v.votos).length} votos
            </p>
          </div>
          <EstadoTag estado={v.estado} />
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink2">{v.descripcion}</p>

        <div className="mt-4 space-y-2">
          {v.opciones.map((o) => {
            const votos = Object.values(v.votos).filter((x) => x === o.id).length;
            const pct = Math.round((votos / total) * 100);
            const elegida = miVoto === o.id;
            return mostrarResultados ? (
              <div key={o.id} className={"border-[1.5px] px-3.5 py-2.5 " + (elegida ? "border-pine bg-pine/5" : "border-ink/25")}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                    {elegida && <Icon name="check" size={13} className="text-pine" />} {o.texto}
                  </span>
                  <span className="tnum font-mono text-[12px] font-bold text-ink2">{votos} · {pct}%</span>
                </div>
                <div className="mt-2 h-1.5 border border-ink/30 bg-paper2">
                  <div className="h-full bg-pine transition-all duration-700" style={{ width: pct + "%" }} />
                </div>
              </div>
            ) : (
              <button
                key={o.id}
                disabled={busy === v.id}
                onClick={async () => {
                  setBusy(v.id);
                  try {
                    await api.votar(v.id, usuarioId, o.id);
                    toast("Voto registrado en: " + v.titulo + ".");
                    await reload();
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "No se pudo votar.", "err");
                  }
                  setBusy(null);
                }}
                className="group flex w-full items-center gap-3 border-[1.5px] border-ink/30 px-3.5 py-2.5 text-left text-[13.5px] font-medium text-ink transition-all hover:border-pine hover:bg-pine/5"
              >
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center border-[1.5px] border-ink bg-paper transition-colors group-hover:border-pine group-hover:bg-lime" />
                {o.texto}
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-ink3 opacity-0 transition-opacity group-hover:opacity-100">votar →</span>
              </button>
            );
          })}
        </div>
        {miVoto && v.estado === "abierta" && (
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-ok">
            <Icon name="shield" size={12} /> voto registrado — 1 propietario, 1 voto
          </p>
        )}
      </article>
    );
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 font-display text-2xl font-bold text-ink">Asambleas en curso</h2>
        {abiertas.length === 0 ? (
          <Empty icon="vote" title="No hay votaciones abiertas" sub="Cuando el comité convoque una asamblea, aparecerá aquí." />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">{abiertas.map((v) => <Card key={v.id} v={v} />)}</div>
        )}
      </section>
      {cerradas.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-2xl font-bold text-ink">Histórico</h2>
          <div className="grid gap-5 lg:grid-cols-2">{cerradas.map((v) => <Card key={v.id} v={v} />)}</div>
        </section>
      )}
    </div>
  );
}

/* ── muro ── */
function Muro({ data }: { data: ResData }) {
  if (data.avisos.length === 0) return <Empty icon="megaphone" title="Sin publicaciones" sub="La administración aún no publica avisos." />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.avisos.map((a) => {
        const emergencia = a.tipo === "emergencia";
        return (
          <article key={a.id} className={"border-[1.5px] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#1a2521] " + (emergencia ? "border-signal bg-signal/10" : a.tipo === "mantencion" ? "border-amber bg-amber/10" : "border-ink bg-card")}>
            <p className={"flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] " + (emergencia ? "text-[#a03526]" : a.tipo === "mantencion" ? "text-[#9a6511]" : "text-pine")}>
              <Icon name={emergencia ? "alert" : a.tipo === "mantencion" ? "clock" : "megaphone"} size={14} />
              {emergencia ? "Emergencia" : a.tipo === "mantencion" ? "Mantención" : "Noticia"}
            </p>
            <h3 className="mt-2.5 font-display text-xl font-bold leading-tight text-ink">{a.titulo}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink2">{a.cuerpo}</p>
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-wide text-ink3">{a.autor} · {fmtFecha(a.fecha)}</p>
          </article>
        );
      })}
    </div>
  );
}

/* ── recibos ── */
function Recibos({ data }: { data: ResData }) {
  if (data.pagos.length === 0)
    return <Empty icon="file" title="Sin recibos todavía" sub="Cuando pagues un gasto común, tu comprobante aparecerá aquí para descargar." />;
  return (
    <div className="border-[1.5px] border-ink bg-card">
      <div className="border-b-[1.5px] border-ink px-5 py-4">
        <h3 className="font-display text-lg font-bold text-ink">Comprobantes de pago</h3>
        <p className="text-[12.5px] text-ink3">Documentos emitidos por ComunApp tras cada pago aprobado</p>
      </div>
      <ul>
        {data.pagos.map((p) => (
          <li key={p.id} className="ledger flex flex-wrap items-center gap-3 px-5 py-3.5 last:border-0 hover:bg-paper2/60">
            <span className="grid h-9 w-9 place-items-center border-[1.5px] border-ink bg-lime text-pine3"><Icon name="receipt" size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[13px] font-bold text-pine">{p.comprobante}</p>
              <p className="font-mono text-[10.5px] uppercase text-ink3">{fmtFechaLarga(p.fecha)} · {p.metodo}</p>
            </div>
            <span className="tnum font-mono text-[14px] font-bold text-ink">{fmtCLP(p.monto)}</span>
            <Btn
              variant="paper" size="sm"
              onClick={() => {
                api.descargarComprobante(p);
                toast("Comprobante " + p.comprobante + " descargado.");
              }}
            >
              <Icon name="download" size={13} /> Descargar
            </Btn>
          </li>
        ))}
      </ul>
    </div>
  );
}
