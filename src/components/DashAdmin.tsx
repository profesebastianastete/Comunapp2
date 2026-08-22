import {
  AlertTriangle, Building2, CheckCircle2, Coins, DoorOpen, FileSpreadsheet, Link2,
  PlusCircle, Search, UploadCloud, Users, Wallet,
} from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  crearMovimiento, crearVecino, desvincularMP, fmtCLP, fmtFecha, fmtMes, generarMes,
  importarCSV, marcarSalida, periodoActual, registrarAcceso, registrarPagoVecino, ROL_LABEL, vincularMP,
  type DatosComunidad, type FilaCSV, type Sesion,
} from "../lib/store";
import { Btn, Empty, EstadoTag, Field, Modal, RolTag, Spinner, StatCard, toast } from "./ui";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ════════ PAGOS DEL MES (cobranza) ════════ */
export function ModuloPagosMes({ datos, sesion, recargar }: { datos: DatosComunidad; sesion: Sesion; recargar: () => Promise<void> }) {
  const esAdmin = sesion.rol === "ADMIN";
  const [periodo, setPeriodo] = useState(periodoActual());
  const [fEstado, setFEstado] = useState("todos");
  const [generando, setGenerando] = useState(false);
  const [montoMes, setMontoMes] = useState(55000);
  const [registrando, setRegistrando] = useState<string | null>(null);

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
    const r = await generarMes(datos.comunidad.id, periodo, montoMes);
    await recargar();
    setGenerando(false);
    toast(r.creados > 0
      ? "Pagos del mes generados para " + r.creados + " unidades."
      : "Este mes ya está generado. No se duplicaron cobros.", r.creados > 0 ? "ok" : "warn");
  };

  const registrarPago = async (cobroId: string) => {
    setRegistrando(cobroId);
    await registrarPagoVecino(datos.comunidad.id, cobroId, "Efectivo / caja");
    await recargar();
    setRegistrando(null);
    toast("Pago registrado. El estado de cuenta del vecino se actualizó.");
  };

  return (
    <div className="fade-swap space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={"Cobrado · " + fmtMes(periodo)} value={fmtCLP(cobrado)} icon={<Wallet size={18} />} accent delay={0} />
        <StatCard label="Por cobrar" value={fmtCLP(total - cobrado)} sub={pendientes + " pagos pendientes"} icon={<Coins size={18} />} delay={70} />
        <StatCard label="Recaudación" value={pct + "%"} sub="del total del mes" icon={<CheckCircle2 size={18} />} delay={140} />
        <StatCard label="Unidades" value={datos.comunidad.unidades} sub={delPeriodo.length + " cobros este mes"} icon={<Building2 size={18} />} delay={210} />
      </div>

      <div className="rounded-2xl border border-line bg-card shadow-soft">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-xl font-bold text-ink">Cobros del mes</h3>
            <p className="text-[12.5px] text-ink3">Pagos del mes, cuotas y multas por unidad</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            <select className="field h-10! w-auto! text-[13px]" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              {periodos.map((p) => <option key={p} value={p}>{fmtMes(p)}</option>)}
            </select>
            <select className="field h-10! w-auto! text-[13px]" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="PAGADO">Pagados</option>
              <option value="VENCIDO">Vencidos</option>
            </select>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div className="p-6"><Empty title="Sin cobros en este periodo" sub={esAdmin ? "Genera los pagos del mes para todas las unidades." : "El administrador aún no genera este mes."} /></div>
        ) : (
          <div className="code-scroll overflow-x-auto">
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
                      <td className="px-5 py-3 text-right">
                        {c.estado !== "PAGADO" ? (
                          <button onClick={() => void registrarPago(c.id)} disabled={registrando === c.id} className="inline-flex items-center gap-1.5 rounded-lg bg-pine px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-pine2 disabled:opacity-60">
                            {registrando === c.id ? <Spinner className="h-3 w-3" /> : <><Coins size={12} /> Registrar pago</>}
                          </button>
                        ) : (
                          <span className="font-mono text-[10.5px] uppercase text-ink3">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {esAdmin && (
        <div className="rounded-2xl border border-dashed border-pine2/40 bg-pine/[0.04] p-6">
          <h4 className="flex items-center gap-2 font-display text-lg font-bold text-ink"><PlusCircle size={19} className="text-pine2" /> Generar pagos del mes</h4>
          <p className="mt-1 max-w-xl text-[13px] text-ink2">Crea el cobro de «Pagos del mes» para todas las unidades en el periodo elegido. Si ya existe, no se duplica.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Periodo">
              <select className="field w-48" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                {periodos.map((p) => <option key={p} value={p}>{fmtMes(p)}</option>)}
              </select>
            </Field>
            <Field label="Monto por unidad">
              <input className="field w-40" type="number" min={0} step={1000} value={montoMes} onChange={(e) => setMontoMes(Number(e.target.value))} />
            </Field>
            <Btn variant="neon" onClick={() => void generar()} disabled={generando || montoMes <= 0}>
              {generando ? <Spinner /> : <>Generar para todas las unidades</>}
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
    if (!descripcion.trim() || monto <= 0) {
      toast("Escribe una descripción y un monto válido.", "warn");
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
        <Field label="Descripción"><input className="field" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={tipo === "GASTO" ? "Ej: Reparación de luminarias" : "Ej: Recaudación parcial del mes"} /></Field>
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
  const [modalMP, setModalMP] = useState(false);
  const [email, setEmail] = useState("");
  const [conectando, setConectando] = useState(false);

  const vincular = async () => {
    if (!email.includes("@")) { toast("Escribe el correo de tu cuenta de Mercado Pago.", "warn"); return; }
    setConectando(true);
    await vincularMP(datos.comunidad.id, email);
    await recargar();
    setConectando(false);
    setModalMP(false);
    toast("¡Listo! Tu comunidad ya puede recibir pagos del mes en línea.");
  };

  return (
    <div className="fade-swap space-y-6">
      {/* vinculación mercado pago */}
      <div className={"relative overflow-hidden rounded-2xl border p-7 shadow-soft " + (v.conectada ? "border-neon2/70 bg-neon/10" : "border-line bg-card")}>
        <div className="flex flex-wrap items-start gap-5">
          <span className={"grid h-14 w-14 shrink-0 place-items-center rounded-2xl " + (v.conectada ? "bg-pine text-neon" : "bg-paper text-pine border border-line")}>
            <Link2 size={26} />
          </span>
          <div className="min-w-[240px] flex-1">
            <h3 className="font-display text-[22px] font-bold tracking-tight text-ink">Cobros en línea con Mercado Pago</h3>
            <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink2">
              {v.conectada
                ? "Tu comunidad ya recibe los pagos del mes de propietarios y arrendatarios desde la aplicación. Cada pago queda registrado y conciliado."
                : "Vincula tu cuenta de Mercado Pago para que los propietarios y arrendatarios paguen el mes desde su teléfono. Es la forma más simple de mantener la recaudación al día."}
            </p>
            {v.conectada && (
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full bg-pine px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-neon">
                  <CheckCircle2 size={13} /> Conectada · {v.email}
                </span>
                {v.fecha && <span className="font-mono text-[11px] uppercase tracking-wide text-ink3">desde el {fmtFecha(v.fecha)}</span>}
                <button onClick={async () => { await desvincularMP(datos.comunidad.id); await recargar(); toast("Cuenta desconectada. Los vecinos ya no pueden pagar en línea.", "warn"); }} className="font-mono text-[11px] font-bold uppercase tracking-wide text-signal underline-offset-4 hover:underline">
                  Desvincular
                </button>
              </div>
            )}
          </div>
          {!v.conectada && (
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <Btn variant="neon" size="lg" onClick={() => setModalMP(true)}><Link2 size={17} /> Vincular cuenta</Btn>
              <span className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">Toma menos de 1 minuto</span>
            </div>
          )}
        </div>
      </div>

      {/* importación CSV */}
      <ImportarComunidad datos={datos} recargar={recargar} />
    </div>
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

/* ════════ VECINOS ════════ */
export function ModuloVecinos({ datos, recargar }: { datos: DatosComunidad; recargar: () => Promise<void> }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", rol: "PROPIETARIO" as "PROPIETARIO" | "ARRENDATARIO" | "COMITE" | "ADMIN", unidad: "", password: "vecino123" });
  const [busy, setBusy] = useState(false);

  const miembros = datos.miembros.filter((m) => (m.usuario.nombre + " " + m.usuario.email).toLowerCase().includes(q.toLowerCase()));

  const crear = async () => {
    if (!form.nombre.trim() || !form.email.includes("@")) { toast("Nombre y correo válido son obligatorios.", "warn"); return; }
    if ((form.rol === "PROPIETARIO" || form.rol === "ARRENDATARIO") && !form.unidad.trim()) { toast("Indica la parcela o unidad (ej: P-14).", "warn"); return; }
    setBusy(true);
    try {
      await crearVecino(datos.comunidad.id, { ...form, unidad: form.unidad.trim() || undefined });
      await recargar();
      setModal(false);
      setForm({ nombre: "", email: "", rol: "PROPIETARIO", unidad: "", password: "vecino123" });
      toast("Vecino creado. Ya puede entrar con su correo y contraseña.");
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
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo vecino">
        <div className="space-y-4">
          <Field label="Nombre completo"><input className="field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Camila Órdenes" /></Field>
          <Field label="Correo electrónico"><input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vecino@correo.cl" /></Field>
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
          <div className="flex justify-end gap-2.5 border-t border-line pt-4">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn variant="neon" onClick={() => void crear()} disabled={busy}>{busy ? <Spinner /> : <>Crear vecino</>}</Btn>
          </div>
        </div>
      </Modal>
    </div>
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


