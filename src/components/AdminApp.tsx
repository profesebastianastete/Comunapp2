import {
  Activity, Building2, CheckCheck, Copy, CreditCard, ExternalLink, Eye, EyeOff, KeyRound,
  Layers, Link2, Pencil, PlugZap, PlusCircle, Power, RefreshCw, Settings2, Trash2, TrendingUp, UserCog, UserPlus, Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actualizarPlan, calcularComision, cobrarFacturaMP, configurarMPPlataforma, crearComunidadSaaS,
  crearPlan, crearUsuarioSaaS, desvincularMPPlataforma, eliminarPlan, fmtCLP, fmtFecha, fmtMes,
  generarCobroMP, generarFacturasMes, listadoSaaS, marcarFacturaPagada, probarMPPlataforma,
  ROL_LABEL, setPasswordUsuario, suscribirFacturaMP, toggleEstadoComunidad, toggleUsuarioActivo,
  usuarioActual,
  type CobroFacturaMP, type CobroMP, type MPPlataforma, type Plan, type PlanId, type RolCondo, type Sesion, type Suscripcion,
} from "../lib/store";
import { Btn, CountUp, Empty, EstadoTag, Field, Modal, ModalCambiarPassword, Spinner, toast } from "./ui";

/* Nombre de plan: prioriza la lista dinámica, cae a las etiquetas clásicas. */
const FALLBACK_PLAN: Record<string, string> = { COMITE: "Comité", PARCELAS: "Comunidad de Parcelas", CUSTOM: "Personalizado" };
const planNombre = (planes: Plan[] | undefined, id: string) =>
  planes?.find((p) => p.id === id)?.nombre ?? FALLBACK_PLAN[id] ?? id;

type Tab = "metricas" | "comunidades" | "usuarios" | "planes" | "suscripciones" | "cobrosmp" | "facturacion" | "config" | "ajustes" | "actividad";

interface SaaSData {
  comunidades: {
    id: string; nombre: string; direccion: string; ciudad: string; unidades: number;
    plan: PlanId; creada: string; estado: "ACTIVA" | "SUSPENDIDA";
    usuarios: number; cobrosMes: number; recaudado: number;
    vinculacion: {
      conectada: boolean;
      email?: string;
      modo?: "sandbox" | "produccion";
      accessToken?: string;
    };
  }[];
  usuarios: {
    id: string; nombre: string; email: string; activo: boolean;
    rolGlobal: "SUPERADMIN" | null;
    membresias: { comunidadId: string; rol: RolCondo; unidad?: string }[];
  }[];
  facturas: { id: string; comunidadId: string; periodo: string; plan: string; monto: number; estado: string; fecha: string }[];
  seriePagos: { dia: string; monto: number; pagos: number }[];
  eventos: { id: string; fecha: string; texto: string }[];
  planes: Plan[];
  mpPlataforma: MPPlataforma;
}

export default function AdminApp({ sesion, salir }: { sesion: Sesion; salir: () => void }) {
  const [tab, setTab] = useState<Tab>("metricas");
  const [data, setData] = useState<SaaSData | null>(null);
  const [modalNueva, setModalNueva] = useState(false);
  const [modalPass, setModalPass] = useState(false);
  const yo = usuarioActual(sesion);

  const refetch = useCallback(async () => {
    setData(await listadoSaaS() as unknown as SaaSData);
  }, []);
  useEffect(() => { void refetch(); }, [refetch]);

  const kpis = useMemo(() => {
    if (!data) return null;
    const precioDe = (planId: string) =>
      data.planes.find((p) => p.id === planId)?.precio ??
      ({ COMITE: 0, PARCELAS: 29900, CUSTOM: 89000 } as Record<PlanId, number>)[planId as PlanId] ?? 0;
    const mrr = data.comunidades.filter((c) => c.estado === "ACTIVA").reduce((a, c) => a + precioDe(c.plan), 0);
    const volumen = data.seriePagos.reduce((a, d) => a + d.monto, 0);
    const pagos = data.seriePagos.reduce((a, d) => a + d.pagos, 0);
    return { mrr, volumen, pagos, comunidades: data.comunidades.length, usuarios: data.usuarios.length };
  }, [data]);

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: "metricas", label: "Métricas", icon: Activity },
    { id: "comunidades", label: "Tenants", icon: Building2 },
    { id: "usuarios", label: "Usuarios", icon: UserCog },
    { id: "planes", label: "Planes", icon: Layers },
    { id: "suscripciones", label: "Suscripciones", icon: RefreshCw },
    { id: "cobrosmp", label: "Cobros MP", icon: PlugZap },
    { id: "facturacion", label: "Facturación", icon: CreditCard },
    { id: "config", label: "Cuenta MP", icon: Settings2 },
    { id: "ajustes", label: "Ajustes", icon: Pencil },
    { id: "actividad", label: "Eventos", icon: TrendingUp },
  ];

  return (
    <div className="dotgrid-dark min-h-screen bg-deep text-white">
      {/* topbar austero */}
      <header className="border-b border-white/10 bg-deep/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-5 md:px-8">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-neon font-display text-[15px] font-bold text-deep">C</span>
          <span className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-white">ComunApp <span className="text-neon">/ ops</span></span>
          <span className="hidden rounded-full border border-neon/40 px-2.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-neon sm:inline">superadmin · acceso restringido</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-[11px] uppercase tracking-wide text-white/50 md:inline">ruta /adminapp · sin enlaces públicos</span>
            <button
              onClick={() => setModalPass(true)}
              title="Cambiar contraseña"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/20 text-white/70 transition-colors hover:border-neon hover:text-neon"
            >
              <KeyRound size={15} />
            </button>
            <button onClick={salir} className="rounded-lg border border-white/20 px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wide text-white/80 transition-colors hover:border-signal hover:text-signal">Salir</button>
          </div>
        </div>
      </header>

      <ModalCambiarPassword open={modalPass} onClose={() => setModalPass(false)} usuario={yo?.nombre ?? "Superadmin"} />

      <div className="mx-auto grid max-w-[1400px] gap-7 px-5 py-8 md:px-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 px-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.24em] text-white/40">Consola SaaS</p>
          <nav className="flex gap-1.5 overflow-x-auto lg:flex-col">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "flex shrink-0 items-center gap-2.5 rounded-lg border px-3.5 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.1em] transition-all " +
                  (tab === t.id ? "border-neon/60 bg-neon text-deep" : "border-white/10 text-white/60 hover:border-white/30 hover:text-white")
                }
              >
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </nav>
          <p className="mt-5 hidden rounded-lg border border-white/10 p-3 font-mono text-[10px] leading-relaxed text-white/40 lg:block">
            Panel interno para los dueños de ComunApp. Gestiona tenants, facturación global y métricas de uso.
          </p>
        </aside>

        <main className="min-w-0">
          {!data || !kpis ? (
            <div className="flex items-center justify-center gap-3 py-28 text-white/60">
              <Spinner className="h-5 w-5" /> <span className="font-mono text-[12px] uppercase tracking-[0.16em]">Cargando métricas…</span>
            </div>
          ) : tab === "metricas" ? (
            <Metricas data={data} kpis={kpis} />
          ) : tab === "comunidades" ? (
            <Tenants data={data} refetch={refetch} nueva={() => setModalNueva(true)} />
          ) : tab === "usuarios" ? (
            <UsuariosSaaS data={data} comunidades={data.comunidades} refetch={refetch} />
          ) : tab === "planes" ? (
            <Planes planes={data.planes} refetch={refetch} />
          ) : tab === "suscripciones" ? (
            <SuscripcionesSaaS data={data} refetch={refetch} />
          ) : tab === "cobrosmp" ? (
            <CobrosMP data={data} refetch={refetch} />
          ) : tab === "facturacion" ? (
            <Facturacion data={data} kpis={kpis} refetch={refetch} />
          ) : tab === "config" ? (
            <ConfigMPPlataforma mp={data.mpPlataforma} refetch={refetch} />
          ) : tab === "ajustes" ? (
            <Ajustes planes={data.planes} refetch={refetch} />
          ) : (
            <Actividad data={data} />
          )}
        </main>
      </div>

      {modalNueva && <ModalNuevaComunidad onClose={() => setModalNueva(false)} onSaved={async () => { setModalNueva(false); await refetch(); }} />}
    </div>
  );
}

/* ── métricas ── */
function Metricas({ data, kpis }: { data: SaaSData; kpis: { mrr: number; volumen: number; pagos: number; comunidades: number; usuarios: number } }) {
  const maxDia = Math.max(...data.seriePagos.map((d) => d.monto), 1);
  return (
    <div className="fade-swap space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { l: "MRR", v: <CountUp to={kpis.mrr} prefix="$" />, s: "ingreso mensual recurrente", neon: true },
          { l: "Volumen 14d", v: <CountUp to={kpis.volumen} prefix="$" />, s: "transado por comunidades" },
          { l: "Pagos 14d", v: <CountUp to={kpis.pagos} />, s: "pagos procesados" },
          { l: "Tenants", v: <CountUp to={kpis.comunidades} />, s: "comunidades en producción" },
          { l: "Usuarios", v: <CountUp to={kpis.usuarios} />, s: "cuentas registradas" },
        ].map((k, i) => (
          <div key={k.l} className={"card-in rounded-xl border p-4.5 p-5 " + (k.neon ? "border-neon/50 bg-neon/10" : "border-white/10 bg-white/[0.03]")} style={{ ["--ci-delay" as never]: i * 60 + "ms" }}>
            <p className={"font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] " + (k.neon ? "text-neon" : "text-white/40")}>{k.l}</p>
            <p className="tnum mt-2 font-display text-[26px] font-bold leading-none text-white">{k.v}</p>
            <p className="mt-1.5 text-[11px] text-white/40">{k.s}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/50">Volumen procesado · últimos 14 días</p>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-neon"><Activity size={12} /> en vivo</span>
        </div>
        <div className="mt-6 flex h-40 items-end gap-2">
          {data.seriePagos.map((d, i) => (
            <div key={d.dia} className="group flex flex-1 flex-col items-center gap-1.5" title={d.dia + " · " + fmtCLP(d.monto) + " · " + d.pagos + " pagos"}>
              <span className="tnum font-mono text-[9px] text-white/0 transition-colors group-hover:text-neon">{d.pagos > 0 ? fmtCLP(d.monto) : ""}</span>
              <div className="bar-up w-full rounded-t-md bg-white/15 transition-colors group-hover:bg-neon" style={{ height: Math.max(4, (d.monto / maxDia) * 100) + "%", animationDelay: i * 40 + "ms" }} />
              <span className="font-mono text-[8.5px] text-white/30">{d.dia}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/50">Top tenants por volumen</p>
          <div className="mt-4 space-y-3.5">
            {[...data.comunidades].sort((a, b) => b.recaudado - a.recaudado).map((c, i) => {
              const max = Math.max(...data.comunidades.map((x) => x.recaudado), 1);
              return (
                <div key={c.id}>
                  <div className="mb-1 flex justify-between text-[12.5px]">
                    <span className="font-semibold text-white">{c.nombre}</span>
                    <span className="tnum font-mono text-white/60">{fmtCLP(c.recaudado)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="bar-x h-full rounded-full bg-neon" style={{ width: (c.recaudado / max) * 100 + "%", animationDelay: i * 100 + "ms" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/50">Salud de la cartera</p>
          <ul className="mt-4 space-y-3">
            {[
              { l: "Tenants con cobranza online (Mercado Pago)", v: data.comunidades.filter((c) => c.vinculacion.conectada).length + " de " + data.comunidades.length },
              { l: "Cuentas activas", v: data.usuarios.filter((u) => u.activo).length + " de " + data.usuarios.length },
              { l: "Facturas al día", v: data.facturas.filter((f) => f.estado === "PAGADA").length + " de " + data.facturas.length },
              { l: "Plan dominante", v: "Comunidad de Parcelas" },
            ].map((x) => (
              <li key={x.l} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 text-[13px] last:border-0">
                <span className="text-white/60">{x.l}</span>
                <span className="tnum shrink-0 font-mono font-bold text-neon">{x.v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── cobros vía Mercado Pago (superadmin) ── */
function CobrosMP({ data, refetch }: { data: SaaSData; refetch: () => Promise<void> }) {
  const conectadas = data.comunidades.filter((c) => c.vinculacion.conectada);
  const [comunidadId, setComunidadId] = useState(conectadas[0]?.id ?? "");
  const [form, setForm] = useState({ monto: 55000, concepto: "Pagos del mes", unidad: "", emailPagador: "" });
  const [busy, setBusy] = useState(false);
  const [ultimo, setUltimo] = useState<CobroMP | null>(null);
  const [historial, setHistorial] = useState<(CobroMP & { comunidad: string; modo?: string })[]>([]);
  const [error, setError] = useState<string | null>(null);

  const comuSel = conectadas.find((c) => c.id === comunidadId);

  const generar = async () => {
    if (!comunidadId) return;
    if (form.monto <= 0) { setError("El monto debe ser mayor a 0."); return; }
    setError(null);
    setBusy(true);
    try {
      const r = await generarCobroMP(comunidadId, {
        monto: form.monto,
        concepto: form.concepto.trim() || "Pagos del mes",
        unidad: form.unidad.trim() || undefined,
        emailPagador: form.emailPagador.trim() || undefined,
      });
      setUltimo(r);
      setHistorial((h) => [{ ...r, comunidad: comuSel?.nombre ?? "", modo: r.modo }, ...h].slice(0, 12));
      toast("Punto de pago creado vía Mercado Pago (" + (r.modo ?? "sandbox") + ").");
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mercado Pago rechazó la solicitud.");
    }
    setBusy(false);
  };

  const copiar = async (texto: string, etiqueta: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast(etiqueta + " copiado al portapapeles.");
    } catch {
      toast("No se pudo copiar. Selecciona el texto manualmente.", "warn");
    }
  };

  const enmascarar = (t?: string) => (t ? t.slice(0, 7) + "••••" + t.slice(-4) : "—");

  return (
    <div className="fade-swap space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-white">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-deep"><PlugZap size={18} /></span>
            Cobros vía Mercado Pago
          </h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-white/40">
            Checkout Pro · cada cobro usa las credenciales reales de la comunidad elegida
          </p>
        </div>
        <a href="https://www.mercadopago.cl/developers/panel" target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 font-mono text-[10.5px] font-bold uppercase tracking-wide text-white/70 transition-colors hover:border-neon hover:text-neon">
          <ExternalLink size={13} /> Credenciales MP
        </a>
      </div>

      {conectadas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-10 text-center">
          <PlugZap size={30} className="mx-auto text-white/25" />
          <p className="mt-3 font-display text-lg font-bold text-white">Ninguna comunidad tiene Mercado Pago configurado</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-white/50">
            Pide a un administrador de comunidad que entre a <strong className="text-neon">Cobros en línea → Configurar Mercado Pago</strong> y cargue su Access Token y Public Key. Después podrás generar puntos de pago desde aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          {/* generador */}
          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/50">Nuevo punto de pago</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Comunidad (tenant)">
                  <select className="field" value={comunidadId} onChange={(e) => setComunidadId(e.target.value)}>
                    {conectadas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </Field>
                <Field label="Modo de la cuenta">
                  <div className="flex h-[42px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5">
                    <span className={"h-2 w-2 shrink-0 rounded-full " + (comuSel?.vinculacion.modo === "produccion" ? "bg-neon" : "bg-amber")} />
                    <span className="font-mono text-[11.5px] font-bold uppercase tracking-wide text-white/80">
                      {comuSel?.vinculacion.modo === "produccion" ? "Producción · dinero real" : "Sandbox · prueba"}
                    </span>
                  </div>
                </Field>
                <Field label="Monto (CLP)">
                  <input className="field" type="number" min={1} step={500} value={form.monto || ""} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} />
                </Field>
                <Field label="Concepto">
                  <input className="field" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Pagos del mes" />
                </Field>
                <Field label="Unidad (opcional)">
                  <input className="field" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value.toUpperCase() })} placeholder="P-14" />
                </Field>
                <Field label="Correo del pagador (opcional)">
                  <input className="field" type="email" value={form.emailPagador} onChange={(e) => setForm({ ...form, emailPagador: e.target.value })} placeholder="vecino@correo.cl" />
                </Field>
              </div>
              {form.monto > 0 && (
                <DesgloseComision
                  base={form.monto}
                  comisionApp={calcularComision(form.monto).comisionApp}
                  comisionMP={calcularComision(form.monto).comisionMP}
                  total={calcularComision(form.monto).total}
                />
              )}
              {error && <p className="mt-4 rounded-lg border border-signal/50 bg-signal/10 px-3.5 py-2.5 text-[13px] font-medium text-signal">{error}</p>}
              <Btn variant="neon" size="lg" className="mt-5 w-full" onClick={() => void generar()} disabled={busy}>
                {busy ? <Spinner /> : <><PlugZap size={16} /> Generar cobro con Mercado Pago</>}
              </Btn>
            </div>

            {ultimo && (
              <div className="pop-in rounded-xl border border-neon/50 bg-neon/10 p-6">
                <p className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-neon">
                  <CheckCircle2MP /> Punto de pago listo · {ultimo.modo ?? "sandbox"}
                </p>
                <p className="tnum mt-3 font-display text-3xl font-bold text-white">{fmtCLP(ultimo.total)}</p>
                <p className="mt-0.5 text-[13px] text-white/60">{ultimo.concepto}{ultimo.unidad ? " · " + ultimo.unidad : ""}</p>
                <DesgloseComision base={ultimo.monto} comisionApp={ultimo.comisionApp} comisionMP={ultimo.comisionMP} total={ultimo.total} />
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/15 bg-deep px-3.5 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/70">{ultimo.puntoDePago}</span>
                  <button onClick={() => void copiar(ultimo.puntoDePago, "Punto de pago")} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/20 text-white/70 transition-colors hover:border-neon hover:text-neon" title="Copiar enlace">
                    <Copy size={13} />
                  </button>
                  <a href={ultimo.puntoDePago} target="_blank" rel="noreferrer" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/20 text-white/70 transition-colors hover:border-neon hover:text-neon" title="Abrir punto de pago">
                    <ExternalLink size={13} />
                  </a>
                </div>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-white/35">
                  id preferencia {ultimo.id} · el webhook concilia el pago automáticamente al aprobarse
                </p>
              </div>
            )}

            {historial.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03]">
                <p className="border-b border-white/10 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Generados en esta sesión</p>
                <ul>
                  {historial.map((h, i) => (
                    <li key={i} className="flex items-center gap-3 border-b border-white/5 px-5 py-3 last:border-0">
                      <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + (h.modo === "produccion" ? "bg-neon" : "bg-amber")} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white">{h.concepto}{h.unidad ? " · " + h.unidad : ""}</p>
                        <p className="font-mono text-[10px] uppercase tracking-wide text-white/35">{h.comunidad} · {new Date(h.creado).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <span className="tnum shrink-0 font-mono text-[13px] font-bold text-white">{fmtCLP(h.monto)}</span>
                      <button onClick={() => void copiar(h.puntoDePago, "Punto de pago")} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/15 text-white/50 transition-colors hover:border-neon hover:text-neon" title="Copiar">
                        <Copy size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* credenciales por tenant */}
          <aside className="space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Credenciales por tenant</p>
            {data.comunidades.map((c) => {
              const v = c.vinculacion;
              return (
                <div key={c.id} className={"rounded-xl border p-4 transition-colors " + (v.conectada ? "border-neon/30 bg-neon/[0.06]" : "border-white/10 bg-white/[0.02]")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13.5px] font-bold text-white">{c.nombre}</p>
                    {v.conectada
                      ? <span className={"shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide " + (v.modo === "produccion" ? "bg-neon/20 text-neon" : "bg-amber/20 text-amber")}>{v.modo === "produccion" ? "producción" : "sandbox"}</span>
                      : <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-white/40">sin configurar</span>}
                  </div>
                  <dl className="mt-3 space-y-1.5 font-mono text-[10.5px]">
                    <div className="flex justify-between gap-3"><dt className="text-white/35">cuenta</dt><dd className="truncate text-white/70">{v.conectada ? v.email : "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-white/35">access token</dt><dd className="truncate text-white/70">{v.conectada ? enmascarar(v.accessToken) : "—"}</dd></div>
                  </dl>
                </div>
              );
            })}
            <p className="rounded-lg border border-white/10 p-3 font-mono text-[10px] leading-relaxed text-white/35">
              El Access Token solo lo usa el backend para llamar a Mercado Pago. El webhook <span className="text-neon">/api/mp/webhook</span> concilia los pagos aprobados.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function CheckCircle2MP() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/* Desglose de la comisión del 5% (3% app + 2% MP) que se suma al cobro */
function DesgloseComision({ base, comisionApp, comisionMP, total }: {
  base: number; comisionApp: number; comisionMP: number; total: number;
}) {
  const fila = (l: string, v: number, cls = "text-white/70") => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/45">{l}</span>
      <span className={"tnum font-mono font-semibold " + cls}>{v === 0 ? "—" : fmtCLP(v)}</span>
    </div>
  );
  return (
    <div className="mt-4 space-y-1.5 rounded-lg border border-white/10 bg-deep/60 px-4 py-3 text-[12.5px]">
      {fila("Monto base", base, "text-white")}
      {fila("Comisión ComunApp (3%)", comisionApp, "text-neon")}
      {fila("Comisión Mercado Pago (2%)", comisionMP, "text-neon")}
      <div className="my-1.5 border-t border-dashed border-white/15" />
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-white">Total a cobrar (5% incl.)</span>
        <span className="tnum font-mono text-[15px] font-bold text-neon">{fmtCLP(total)}</span>
      </div>
    </div>
  );
}

/* ── usuarios (gestión de accesos y contraseñas · superadmin) ── */
function UsuariosSaaS({ data, comunidades, refetch }: {
  data: SaaSData; comunidades: SaaSData["comunidades"]; refetch: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [passDe, setPassDe] = useState<SaaSData["usuarios"][number] | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const nombreComu = (id: string) => comunidades.find((c) => c.id === id)?.nombre ?? id.slice(0, 6);

  const filtrados = data.usuarios.filter((u) =>
    (u.nombre + " " + u.email).toLowerCase().includes(q.toLowerCase()));

  const toggle = async (u: SaaSData["usuarios"][number]) => {
    setBusy(u.id);
    const activo = await toggleUsuarioActivo(u.id);
    await refetch();
    setBusy(null);
    toast(u.nombre + (activo ? " activado." : " suspendido."), activo ? "ok" : "warn");
  };

  return (
    <div className="fade-swap space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-white">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-deep"><UserCog size={18} /></span>
            Usuarios de la plataforma
          </h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-white/40">
            {data.usuarios.length} cuentas · redefine contraseñas y activa o suspende accesos
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="relative">
            <input
              className="field h-10! w-56! border-white/15 bg-white/[0.05] pl-9 text-[13px] text-white placeholder:text-white/30"
              placeholder="Buscar por nombre o correo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          </div>
          <Btn variant="neon" onClick={() => setNuevo(true)}><UserPlus size={15} /> Nuevo usuario</Btn>
        </div>
      </div>

      <div className="dark-scroll overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
              <th className="px-5 py-3.5">Usuario</th>
              <th className="px-5 py-3.5">Roles</th>
              <th className="px-5 py-3.5">Estado</th>
              <th className="px-5 py-3.5 text-right">Contraseña / acceso</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((u) => (
              <tr key={u.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.04]">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neon/15 font-display text-[13px] font-bold text-neon">
                      {u.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0">
                      <p className={"truncate text-[13.5px] font-semibold " + (u.activo ? "text-white" : "text-white/40 line-through")}>{u.nombre}</p>
                      <p className="truncate font-mono text-[10.5px] text-white/40">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {u.rolGlobal === "SUPERADMIN" && (
                      <span className="rounded-full bg-neon/20 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-neon">Superadmin</span>
                    )}
                    {u.membresias.map((m, i) => (
                      <span key={i} className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-white/70">
                        {ROL_LABEL[m.rol]} · {nombreComu(m.comunidadId)}{m.unidad ? " · " + m.unidad : ""}
                      </span>
                    ))}
                    {u.rolGlobal !== "SUPERADMIN" && u.membresias.length === 0 && (
                      <span className="font-mono text-[10px] text-white/30">sin rol asignado</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4"><EstadoTag estado={u.activo ? "ACTIVA" : "SUSPENDIDA"} /></td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setPassDe(u)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neon/50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-neon transition-colors hover:bg-neon hover:text-deep"
                    >
                      <KeyRound size={12} /> Contraseña
                    </button>
                    <button
                      disabled={busy === u.id}
                      onClick={() => void toggle(u)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white/70 transition-colors hover:border-signal hover:text-signal disabled:opacity-50"
                    >
                      {busy === u.id ? <Spinner className="h-3 w-3" /> : <Power size={12} />}
                      {u.activo ? "Suspender" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center font-mono text-[12px] text-white/40">Sin resultados para “{q}”.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {passDe && (
        <ModalSetPassword
          usuario={passDe}
          onClose={() => setPassDe(null)}
          onSaved={async () => { setPassDe(null); await refetch(); }}
        />
      )}
      {nuevo && (
        <ModalNuevoUsuario
          comunidades={comunidades}
          onClose={() => setNuevo(false)}
          onSaved={async () => { setNuevo(false); await refetch(); }}
        />
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ModalSetPassword({ usuario, onClose, onSaved }: {
  usuario: SaaSData["usuarios"][number]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const guardar = async () => {
    if (nueva.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (nueva !== confirmar) return setError("La confirmación no coincide.");
    setError(null);
    setBusy(true);
    try {
      await setPasswordUsuario(usuario.id, nueva);
      toast("Contraseña de " + usuario.nombre + " actualizada.");
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
    setBusy(false);
  };

  return (
    <Modal open onClose={onClose} title={"Contraseña · " + usuario.nombre}>
      <div className="space-y-4">
        <p className="rounded-xl border border-line bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink2">
          Estás redefiniendo la contraseña de <strong className="text-ink">{usuario.email}</strong>.
          La próxima vez que entre deberá usar la nueva.
        </p>
        <Field label="Nueva contraseña" hint="mín. 6 caracteres">
          <div className="relative">
            <input className="field pr-11" type={ver ? "text" : "password"} value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setVer((v) => !v)} aria-label="Mostrar contraseña"
              className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-ink3 transition-all hover:bg-paper hover:text-pine">
              {ver ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Confirmar nueva contraseña">
          <input className="field" type={ver ? "text" : "password"} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="••••••••" />
        </Field>
        {error && <p className="rounded-xl border border-signal/40 bg-signal/10 px-3.5 py-2.5 text-[13px] font-medium text-signal">{error}</p>}
        <div className="flex justify-end gap-2.5 border-t border-line pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="neon" onClick={() => void guardar()} disabled={busy}>
            {busy ? <Spinner /> : <><CheckCheck size={15} /> Guardar contraseña</>}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function ModalNuevoUsuario({ comunidades, onClose, onSaved }: {
  comunidades: SaaSData["comunidades"]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({ nombre: "", email: "", password: "", esSuper: false, comunidadId: comunidades[0]?.id ?? "", rol: "ADMIN" as RolCondo, unidad: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const crear = async () => {
    if (!form.nombre.trim() || !form.email.includes("@")) return setError("Completa nombre y un correo válido.");
    if (form.password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    setError(null);
    setBusy(true);
    try {
      await crearUsuarioSaaS({
        nombre: form.nombre.trim(), email: form.email.trim(), password: form.password,
        rolGlobal: form.esSuper,
        membresias: form.esSuper ? [] : [{ comunidadId: form.comunidadId, rol: form.rol, unidad: form.unidad.trim() || undefined }],
      });
      toast("Usuario creado: " + form.nombre + " ya puede iniciar sesión.");
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear.");
    }
    setBusy(false);
  };

  return (
    <Modal open onClose={onClose} title="Nuevo usuario" wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo"><input className="field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Tomás Vidal" /></Field>
          <Field label="Correo electrónico"><input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@dominio.cl" /></Field>
        </div>
        <Field label="Contraseña inicial" hint="mín. 6 caracteres">
          <input className="field" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="ej: bienvenido123" />
        </Field>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3">
          <input type="checkbox" checked={form.esSuper} onChange={(e) => setForm({ ...form, esSuper: e.target.checked })} className="h-4 w-4 accent-pine" />
          <span className="text-[13px] text-ink2">Es <strong className="text-ink">Superadmin</strong> (acceso al panel interno, sin comunidad asignada)</span>
        </label>
        {!form.esSuper && (
          <div className="grid gap-4 sm:grid-cols-[1fr_150px_120px]">
            <Field label="Comunidad">
              <select className="field" value={form.comunidadId} onChange={(e) => setForm({ ...form, comunidadId: e.target.value })}>
                {comunidades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Rol">
              <select className="field" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as RolCondo })}>
                {(["ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO"] as RolCondo[]).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
              </select>
            </Field>
            <Field label="Unidad" hint="opcional">
              <input className="field" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value.toUpperCase() })} placeholder="P-14" />
            </Field>
          </div>
        )}
        {error && <p className="rounded-xl border border-signal/40 bg-signal/10 px-3.5 py-2.5 text-[13px] font-medium text-signal">{error}</p>}
        <div className="flex justify-end gap-2.5 border-t border-line pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="neon" onClick={() => void crear()} disabled={busy}>
            {busy ? <Spinner /> : <><UserPlus size={15} /> Crear usuario</>}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ── planes (crear / editar / eliminar) ── */
function Planes({ planes, refetch }: { planes: Plan[]; refetch: () => Promise<void> }) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState(29900);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Plan | null>(null);
  const [borrar, setBorrar] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const crear = async () => {
    if (!nombre.trim()) { toast("Escribe un nombre para el plan.", "warn"); return; }
    setCreando(true);
    try {
      await crearPlan({ nombre, precio });
      toast("Plan creado: " + nombre + " · " + fmtCLP(precio) + "/mes.");
      setNombre(""); setPrecio(29900);
      await refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo crear el plan.", "warn");
    }
    setCreando(false);
  };

  const toggle = async (p: Plan) => {
    setBusy(p.id);
    await actualizarPlan(p.id, { activa: !p.activa });
    await refetch();
    setBusy(null);
    toast("Plan " + p.nombre + (p.activa ? " desactivado." : " activado."), p.activa ? "warn" : "ok");
  };

  return (
    <div className="fade-swap space-y-6">
      <div>
        <h2 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-deep"><Layers size={18} /></span>
          Planes de la plataforma
        </h2>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-white/40">
          {planes.length} planes · el precio se aplica a la facturación mensual
        </p>
      </div>

      {/* crear plan */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <Field label="Nombre del plan">
          <input className="field w-64" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Comunidad Grande" />
        </Field>
        <Field label="Precio mensual (CLP)">
          <input className="field w-40" type="number" min={0} step={1000} value={precio || ""} onChange={(e) => setPrecio(Number(e.target.value))} />
        </Field>
        <Btn variant="neon" onClick={() => void crear()} disabled={creando}>
          {creando ? <Spinner /> : <><PlusCircle size={15} /> Crear plan</>}
        </Btn>
      </div>

      {/* listado */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {planes.map((p) => (
          <div key={p.id} className={"card-in rounded-xl border p-5 transition-all " + (p.activa ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.01] opacity-60")}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-white">{p.nombre}</h3>
              <EstadoTag estado={p.activa ? "ACTIVA" : "SUSPENDIDA"} />
            </div>
            <p className="tnum mt-2 font-display text-[30px] font-bold text-neon">
              {p.precio === 0 ? "Gratis" : fmtCLP(p.precio)}
              {p.precio > 0 && <span className="ml-1 font-mono text-[11px] font-normal text-white/40">/ mes</span>}
            </p>
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-wide text-white/30">id {p.id} · creado {fmtFecha(p.creada)}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setEditando(p)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white/70 transition-colors hover:border-neon hover:text-neon">
                <Pencil size={12} /> Editar
              </button>
              <button disabled={busy === p.id} onClick={() => void toggle(p)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white/70 transition-colors hover:border-amber hover:text-amber disabled:opacity-50">
                {busy === p.id ? <Spinner className="h-3 w-3" /> : <Power size={12} />} {p.activa ? "Pausar" : "Activar"}
              </button>
              <button onClick={() => setBorrar(p)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-white/20 text-white/60 transition-colors hover:border-signal hover:text-signal" title="Eliminar">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editando && <ModalEditarPlan plan={editando} onClose={() => setEditando(null)} onSaved={async () => { setEditando(null); await refetch(); }} />}

      <Modal open={!!borrar} onClose={() => setBorrar(null)} title="¿Eliminar plan?">
        <p className="text-[14px] leading-relaxed text-ink2">
          Se eliminará <strong className="text-ink">{borrar?.nombre}</strong>. Si hay comunidades usándolo, no podrá borrarse.
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Btn variant="ghost" size="sm" onClick={() => setBorrar(null)}>Cancelar</Btn>
          <Btn
            variant="danger" size="sm" disabled={busy === borrar?.id}
            onClick={async () => {
              if (!borrar) return;
              setBusy(borrar.id);
              try {
                await eliminarPlan(borrar.id);
                toast("Plan eliminado: " + borrar.nombre, "warn");
                setBorrar(null);
                await refetch();
              } catch (e) {
                toast(e instanceof Error ? e.message : "No se pudo eliminar.", "warn");
              }
              setBusy(null);
            }}
          >
            {busy === borrar?.id ? <Spinner /> : <><Trash2 size={13} /> Eliminar</>}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

function ModalEditarPlan({ plan, onClose, onSaved }: { plan: Plan; onClose: () => void; onSaved: () => Promise<void> }) {
  const [nombre, setNombre] = useState(plan.nombre);
  const [precio, setPrecio] = useState(plan.precio);
  const [busy, setBusy] = useState(false);

  const guardar = async () => {
    if (!nombre.trim()) { toast("El nombre no puede quedar vacío.", "warn"); return; }
    setBusy(true);
    await actualizarPlan(plan.id, { nombre, precio });
    toast("Plan actualizado.");
    setBusy(false);
    await onSaved();
  };

  return (
    <Modal open onClose={onClose} title={"Editar plan · " + plan.nombre}>
      <div className="space-y-4">
        <Field label="Nombre"><input className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <Field label="Precio mensual (CLP)"><input className="field" type="number" min={0} step={1000} value={precio || ""} onChange={(e) => setPrecio(Number(e.target.value))} /></Field>
        <div className="flex justify-end gap-2.5 border-t border-line pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="neon" onClick={() => void guardar()} disabled={busy}>{busy ? <Spinner /> : "Guardar"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ── suscripciones SaaS (pago automático de cuentas con tarjeta) ── */
function SuscripcionesSaaS({ data, refetch }: { data: SaaSData; refetch: () => Promise<void> }) {
  const pendientes = data.facturas.filter((f) => f.estado === "PENDIENTE" && f.monto > 0);
  const [autorizando, setAutorizando] = useState<string | null>(null);
  const [link, setLink] = useState<CobroMP | null>(null);
  const [error, setError] = useState<string | null>(null);

  const crearSuscripcion = async (facturaId: string) => {
    setError(null);
    setAutorizando(facturaId);
    try {
      const r = await suscribirFacturaMP(facturaId);
      setLink(r);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la suscripción.");
    }
    setAutorizando(null);
  };

  return (
    <div className="fade-swap space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-white">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-deep"><RefreshCw size={18} /></span>
            Suscripciones de pago automático
          </h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-white/40">
            La comunidad autoriza con <strong className="text-neon">tarjeta de crédito</strong> y su cuenta se paga sola cada mes
          </p>
        </div>
        <a href="https://www.mercadopago.cl/developers/panel" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 font-mono text-[10.5px] font-bold uppercase tracking-wide text-white/70 transition-colors hover:border-neon hover:text-neon">
          <ExternalLink size={13} /> Mercado Pago
        </a>
      </div>

      {!data.mpPlataforma.conectada && (
        <div className="rounded-xl border border-amber/40 bg-amber/10 px-5 py-4">
          <p className="text-[13px] text-white/80">
            <strong className="text-amber">Configura primero la cuenta Mercado Pago de la plataforma</strong> (pestaña «Cuenta MP»).
            Sin ella no se pueden crear suscripciones de cobro automático.
          </p>
        </div>
      )}

      {error && <p className="rounded-lg border border-signal/50 bg-signal/10 px-4 py-3 text-[13px] font-medium text-signal">{error}</p>}

      {pendientes.length === 0 ? (
        <Empty title="Sin facturas pendientes" sub="Genera la facturación mensual desde la pestaña «Facturación» y aquí podrás convertir cada cuenta en una suscripción." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
                <th className="px-5 py-3.5">Comunidad</th>
                <th className="px-5 py-3.5">Periodo</th>
                <th className="px-5 py-3.5">Monto</th>
                <th className="px-5 py-3.5">Con comisión (5%)</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((f) => {
                const c = data.comunidades.find((x) => x.id === f.comunidadId);
                const com = calcularComision(f.monto);
                return (
                  <tr key={f.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.04]">
                    <td className="px-5 py-4">
                      <p className="text-[13.5px] font-semibold text-white">{c?.nombre ?? f.comunidadId}</p>
                      <p className="font-mono text-[10px] uppercase text-white/35">{f.plan}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-[12px] text-white/70">{fmtMes(f.periodo)}</td>
                    <td className="tnum px-5 py-4 font-mono text-[13px] text-white/70">{fmtCLP(f.monto)}</td>
                    <td className="tnum px-5 py-4 font-mono text-[13px] font-bold text-neon">{fmtCLP(com.total)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        disabled={autorizando === f.id || !data.mpPlataforma.conectada}
                        onClick={() => void crearSuscripcion(f.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neon/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-neon transition-colors hover:bg-neon hover:text-deep disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {autorizando === f.id ? <Spinner className="h-3 w-3" /> : <RefreshCw size={12} />} Crear suscripción
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {link && (
        <Modal open onClose={() => setLink(null)} title="Suscripción creada · autorizar con tarjeta" wide>
          <div className="space-y-4">
            <p className="rounded-xl border border-pine/30 bg-pine/5 px-4 py-3 text-[13px] leading-relaxed text-ink2">
              Envía este enlace a la comunidad. Al abrirlo, Mercado Pago le pedirá <strong className="text-ink">autorizar el cargo automático con su tarjeta de crédito</strong>.
              A partir de ahí, la cuenta se cobra sola cada mes (con la comisión del 5% incluida).
            </p>
            <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-5 py-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink3">Cargo mensual autorizado</p>
                <p className="tnum mt-1 font-display text-3xl font-bold text-pine">{fmtCLP(link.total)}</p>
              </div>
              <span className={"rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide " + (link.modo === "produccion" ? "bg-pine text-neon" : "bg-amber/20 text-[#8a6114]")}>
                {link.modo === "produccion" ? "Producción" : "Sandbox"}
              </span>
            </div>
            <DesgloseComision base={link.monto} comisionApp={link.comisionApp} comisionMP={link.comisionMP} total={link.total} />
            <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-3.5 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink2">{link.puntoDePago}</span>
              <button onClick={() => { void navigator.clipboard.writeText(link.puntoDePago); toast("Enlace copiado."); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-ink2 transition-colors hover:border-pine hover:text-pine" title="Copiar">
                <Copy size={13} />
              </button>
              <a href={link.puntoDePago} target="_blank" rel="noreferrer" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-ink2 transition-colors hover:border-pine hover:text-pine" title="Abrir">
                <ExternalLink size={13} />
              </a>
            </div>
            <div className="flex justify-end border-t border-line pt-4">
              <Btn variant="neon" onClick={() => { void navigator.clipboard.writeText(link.puntoDePago); toast("Enlace de autorización copiado."); }}>
                <Copy size={15} /> Copiar enlace de autorización
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── cuenta Mercado Pago de la plataforma (minimalista) ── */
function ConfigMPPlataforma({ mp, refetch }: { mp: MPPlataforma; refetch: () => Promise<void> }) {
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [email, setEmail] = useState("");
  const [ver, setVer] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!accessToken.trim() || !publicKey.trim()) { setError("El Access Token (API) y la Public Key son obligatorios."); return; }
    if (!email.includes("@")) { setError("Escribe el correo de la cuenta Mercado Pago."); return; }
    setError(null);
    setGuardando(true);
    const r = await configurarMPPlataforma({ accessToken: accessToken.trim(), publicKey: publicKey.trim(), email: email.trim() });
    setGuardando(false);
    if (r.ok) {
      toast("Cuenta Mercado Pago de la plataforma configurada.");
      setAccessToken(""); setPublicKey(""); setEmail("");
      await refetch();
    } else {
      setError(r.mensaje);
    }
  };

  const probar = async () => {
    setProbando(true);
    const r = await probarMPPlataforma();
    setProbando(false);
    toast(r.mensaje + (r.cuenta ? " · " + r.cuenta : ""), r.ok ? "ok" : "warn");
  };

  return (
    <div className="fade-swap max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-deep"><Settings2 size={18} /></span>
          Cuenta Mercado Pago de la plataforma
        </h2>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-white/40">
          Recibe las comisiones (3% app + 2% MP) y procesa las suscripciones de las comunidades
        </p>
      </div>

      {mp.conectada ? (
        <div className="rounded-xl border border-neon/40 bg-neon/[0.06] p-6">
          <div className="flex items-center gap-2.5">
            <CheckCheck size={18} className="text-neon" />
            <p className="font-display text-lg font-bold text-white">Conectada · {mp.email}</p>
            {mp.fecha && <span className="ml-auto font-mono text-[10px] uppercase text-white/40">desde {fmtFecha(mp.fecha)}</span>}
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-deep px-4 py-3">
              <p className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/40"><KeyRound size={11} /> Access Token (API)</p>
              <p className="mt-1 truncate font-mono text-[12px] text-white/80">{mp.accessToken ?? "••••••"}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-deep px-4 py-3">
              <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/40">Public Key</p>
              <p className="mt-1 truncate font-mono text-[12px] text-white/80">{mp.publicKey ?? "••••••"}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Btn variant="neon" onClick={() => void probar()} disabled={probando}>
              {probando ? <Spinner /> : <><PlugZap size={15} /> Probar conexión</>}
            </Btn>
            <button
              onClick={async () => { await desvincularMPPlataforma(); toast("Cuenta desconectada.", "warn"); await refetch(); }}
              className="rounded-lg border border-signal/50 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wide text-signal transition-colors hover:bg-signal hover:text-white"
            >
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-white/60">
            <CreditCard size={16} className="mt-0.5 shrink-0 text-neon" />
            Pega las credenciales de tu cuenta Mercado Pago de producción. El <strong className="text-white">Access Token</strong> (API) lo usa el servidor para cobrar;
            la <strong className="text-white">Public Key</strong> identifica tu cuenta en los puntos de pago.
          </p>
          <Field label="Access Token (API)">
            <div className="relative">
              <input className="field pr-11 font-mono text-[12.5px]" type={ver ? "text" : "password"} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="APP_USR-…" />
              <button type="button" onClick={() => setVer((v) => !v)} aria-label="Mostrar" className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-ink3 hover:text-pine">
                {ver ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <Field label="Public Key">
            <input className="field font-mono text-[12.5px]" type={ver ? "text" : "password"} value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="APP_USR-…" />
          </Field>
          <Field label="Correo de la cuenta">
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pagos@comunapp.cl" />
          </Field>
          {error && <p className="rounded-lg border border-signal/50 bg-signal/10 px-3.5 py-2.5 text-[13px] font-medium text-signal">{error}</p>}
          <Btn variant="neon" size="lg" className="w-full" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? <Spinner /> : <><Link2 size={16} /> Conectar cuenta</>}
          </Btn>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">¿Cómo se divide cada cobro?</p>
        <p className="mt-2 text-[13px] leading-relaxed text-white/60">
          A cada pago se le suma un <strong className="text-neon">5%</strong>: <strong className="text-white">3%</strong> de comisión de aplicación (ComunApp)
          + <strong className="text-white">2%</strong> de Mercado Pago. El desglose se muestra siempre antes de cobrar.
        </p>
      </div>
    </div>
  );
}

/* ── tenants ── */
function Tenants({ data, refetch, nueva }: { data: SaaSData; refetch: () => Promise<void>; nueva: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="fade-swap space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">Comunidades (tenants)</h2>
          <p className="font-mono text-[11px] uppercase tracking-wide text-white/40">esquema aislado por comunidad · RLS en PostgreSQL</p>
        </div>
        <Btn variant="neon" className="ml-auto" onClick={nueva}><PlusCircle size={15} /> Onboardear tenant</Btn>
      </div>

      <div className="dark-scroll overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
              <th className="px-5 py-3.5">Tenant</th>
              <th className="px-5 py-3.5">Plan</th>
              <th className="px-5 py-3.5">Usuarios</th>
              <th className="px-5 py-3.5">Cobros del mes</th>
              <th className="px-5 py-3.5">Volumen total</th>
              <th className="px-5 py-3.5">MP</th>
              <th className="px-5 py-3.5">Estado</th>
              <th className="px-5 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {data.comunidades.map((c) => (
              <tr key={c.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.04]">
                <td className="px-5 py-4">
                  <p className="text-[13.5px] font-semibold text-white">{c.nombre}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-white/35">{c.ciudad} · {c.unidades} unid. · id {c.id}</p>
                </td>
                <td className="px-5 py-4"><span className="rounded-md border border-neon/30 bg-neon/10 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-neon">{planNombre(data.planes, c.plan)}</span></td>
                <td className="tnum px-5 py-4 font-mono text-[13px] text-white/80">{c.usuarios}</td>
                <td className="tnum px-5 py-4 font-mono text-[13px] text-white/80">{c.cobrosMes}</td>
                <td className="tnum px-5 py-4 font-mono text-[13px] font-bold text-white">{fmtCLP(c.recaudado)}</td>
                <td className="px-5 py-4">
                  {c.vinculacion.conectada
                    ? <span className="rounded-full bg-neon/20 px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase text-neon">online</span>
                    : <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase text-white/40">offline</span>}
                </td>
                <td className="px-5 py-4"><EstadoTag estado={c.estado} /></td>
                <td className="px-5 py-4 text-right">
                  <button
                    disabled={busy === c.id}
                    onClick={async () => {
                      setBusy(c.id);
                      const nuevo = await toggleEstadoComunidad(c.id);
                      await refetch();
                      setBusy(null);
                      toast(c.nombre + (nuevo === "SUSPENDIDA" ? " suspendida." : " reactivada."), nuevo === "SUSPENDIDA" ? "warn" : "ok");
                    }}
                    className={
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wide transition-colors " +
                      (c.estado === "ACTIVA" ? "border-signal/50 text-signal hover:bg-signal hover:text-white" : "border-neon/50 text-neon hover:bg-neon hover:text-deep")
                    }
                  >
                    {busy === c.id ? <Spinner className="h-3 w-3" /> : <Power size={12} />}
                    {c.estado === "ACTIVA" ? "Suspender" : "Reactivar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── facturación ── */
function Facturacion({ data, kpis, refetch }: { data: SaaSData; kpis: { mrr: number }; refetch: () => Promise<void> }) {
  const porMes = useMemo(() => {
    const m = new Map<string, number>();
    data.facturas.forEach((f) => m.set(f.periodo, (m.get(f.periodo) ?? 0) + f.monto));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data.facturas]);
  const maxMes = Math.max(...porMes.map(([, v]) => v), 1);

  // últimos 6 periodos (el actual primero)
  const periodos = useMemo(() => {
    const out: string[] = [];
    const d = new Date();
    for (let i = 0; i < 6; i++) { out.push(d.toISOString().slice(0, 7)); d.setMonth(d.getMonth() - 1); }
    return out;
  }, []);
  const [mes, setMes] = useState(periodos[0]);
  const [generando, setGenerando] = useState(false);
  const [cobrando, setCobrando] = useState<string | null>(null);
  const [puntoMP, setPuntoMP] = useState<CobroFacturaMP | null>(null);

  const generar = async () => {
    setGenerando(true);
    const r = await generarFacturasMes(mes);
    await refetch();
    setGenerando(false);
    toast(
      r.creadas > 0
        ? "Facturación de " + fmtMes(mes) + " generada: " + r.creadas + " de " + r.total + " comunidades."
        : "Ese periodo ya está facturado para todas las comunidades activas.",
      r.creadas > 0 ? "ok" : "warn",
    );
  };

  const cobrarMP = async (facturaId: string) => {
    setCobrando(facturaId);
    try {
      const r = await cobrarFacturaMP(facturaId);
      setPuntoMP(r);
      toast("Punto de pago creado para " + r.comunidad + " (con 5% de comisiones).");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo crear el cobro.", "warn");
    }
    setCobrando(null);
  };

  const marcarPagada = async (facturaId: string, nombre: string) => {
    await marcarFacturaPagada(facturaId);
    await refetch();
    toast("Factura de " + nombre + " marcada como pagada.");
  };

  return (
    <div className="fade-swap space-y-6">
      {/* generar facturación del mes (cobro a las comunidades) */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-neon/30 bg-neon/[0.06] px-6 py-5">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-neon text-deep"><CreditCard size={20} /></span>
        <div className="min-w-[220px] flex-1">
          <p className="font-display text-lg font-bold text-white">Generar cobro a las comunidades</p>
          <p className="text-[12.5px] text-white/55">Crea la factura mensual del plan para cada comunidad activa. No duplica periodos ya facturados.</p>
        </div>
        <div className="flex items-end gap-3">
          <Field label="Periodo">
            <select className="field w-44" value={mes} onChange={(e) => setMes(e.target.value)}>
              {periodos.map((p) => <option key={p} value={p}>{fmtMes(p)}</option>)}
            </select>
          </Field>
          <Btn variant="neon" onClick={() => void generar()} disabled={generando}>
            {generando ? <Spinner /> : <><PlusCircle size={15} /> Generar facturación</>}
          </Btn>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neon/50 bg-neon/10 p-5">
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-neon">MRR actual</p>
          <p className="tnum mt-2 font-display text-[30px] font-bold text-white">{fmtCLP(kpis.mrr)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/40">Facturado 6 meses</p>
          <p className="tnum mt-2 font-display text-[30px] font-bold text-white">{fmtCLP(porMes.reduce((a, [, v]) => a + v, 0))}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/40">Por cobrar este mes</p>
          <p className="tnum mt-2 font-display text-[30px] font-bold text-amber">{fmtCLP(data.facturas.filter((f) => f.estado === "PENDIENTE").reduce((a, f) => a + f.monto, 0))}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/50">Ingresos SaaS por mes</p>
        <div className="mt-6 flex h-36 items-end gap-4">
          {porMes.map(([per, v], i) => (
            <div key={per} className="flex flex-1 flex-col items-center gap-2">
              <span className="tnum font-mono text-[10px] text-white/60">{fmtCLP(v)}</span>
              <div className="bar-up w-full max-w-[70px] rounded-t-md bg-neon/80" style={{ height: Math.max(6, (v / maxMes) * 100) + "%", animationDelay: i * 70 + "ms" }} />
              <span className="font-mono text-[9.5px] uppercase text-white/35">{fmtMes(per).split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dark-scroll overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
              <th className="px-5 py-3.5">Factura</th><th className="px-5 py-3.5">Tenant</th><th className="px-5 py-3.5">Plan</th>
              <th className="px-5 py-3.5">Periodo</th><th className="px-5 py-3.5">Monto</th><th className="px-5 py-3.5">Estado</th>
              <th className="px-5 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {[...data.facturas].sort((a, b) => b.periodo.localeCompare(a.periodo)).map((f) => {
              const tenant = data.comunidades.find((c) => c.id === f.comunidadId);
              const pendiente = f.estado !== "PAGADA";
              return (
                <tr key={f.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.04]">
                  <td className="px-5 py-3.5 font-mono text-[11.5px] text-white/60">F-{f.id.slice(3).toUpperCase()}</td>
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-white">{tenant?.nombre ?? f.comunidadId}</td>
                  <td className="px-5 py-3.5 text-[12.5px] text-white/60">{f.plan}</td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-white/60">{fmtMes(f.periodo)}</td>
                  <td className="tnum px-5 py-3.5 font-mono text-[13px] font-bold text-white">{f.monto === 0 ? "Gratis" : fmtCLP(f.monto)}</td>
                  <td className="px-5 py-3.5"><EstadoTag estado={f.estado === "PAGADA" ? "PAGADO" : f.estado === "PENDIENTE" ? "PENDIENTE" : "VENCIDO"} /></td>
                  <td className="px-5 py-3.5">
                    {pendiente ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={cobrando === f.id}
                          onClick={() => void cobrarMP(f.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neon/50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-neon transition-colors hover:bg-neon hover:text-deep disabled:opacity-50"
                        >
                          {cobrando === f.id ? <Spinner className="h-3 w-3" /> : <PlugZap size={12} />} Cobrar con MP
                        </button>
                        <button
                          onClick={() => void marcarPagada(f.id, tenant?.nombre ?? "la comunidad")}
                          className="rounded-lg border border-white/15 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white/50 transition-colors hover:border-white/40 hover:text-white"
                          title="Marcar como pagada manualmente"
                        >
                          Pagada
                        </button>
                      </div>
                    ) : (
                      <span className="block text-right font-mono text-[10px] uppercase text-white/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* punto de pago de Mercado Pago para una factura */}
      {puntoMP && (
        <Modal open onClose={() => setPuntoMP(null)} title={"Cobro a " + puntoMP.comunidad} wide>
          <div className="space-y-4">
            <p className="rounded-xl border border-pine/30 bg-pine/5 px-4 py-3 text-[13px] leading-relaxed text-ink2">
              Envía este <strong className="text-ink">punto de pago</strong> a la comunidad. Al aprobarse en Mercado Pago,
              el webhook lo registra y puedes marcar la factura como pagada.
            </p>
            <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-5 py-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink3">Total a cobrar</p>
                <p className="tnum mt-1 font-display text-3xl font-bold text-pine">{fmtCLP(puntoMP.total)}</p>
              </div>
              <span className={"rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide " + (puntoMP.modo === "produccion" ? "bg-pine text-neon" : "bg-amber/20 text-[#8a6114]")}>
                {puntoMP.modo === "produccion" ? "Producción" : "Sandbox"}
              </span>
            </div>
            <DesgloseComision base={puntoMP.monto} comisionApp={puntoMP.comisionApp} comisionMP={puntoMP.comisionMP} total={puntoMP.total} />
            <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-3.5 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink2">{puntoMP.puntoDePago}</span>
              <button
                onClick={() => { void navigator.clipboard.writeText(puntoMP.puntoDePago); toast("Punto de pago copiado."); }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-ink2 transition-colors hover:border-pine hover:text-pine" title="Copiar enlace"
              >
                <Copy size={13} />
              </button>
              <a href={puntoMP.puntoDePago} target="_blank" rel="noreferrer" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-ink2 transition-colors hover:border-pine hover:text-pine" title="Abrir punto de pago">
                <ExternalLink size={13} />
              </a>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-line pt-4">
              <Btn variant="ghost" onClick={() => setPuntoMP(null)}>Cerrar</Btn>
              <Btn variant="neon" onClick={() => { void navigator.clipboard.writeText(puntoMP.puntoDePago); toast("Punto de pago copiado al portapapeles."); }}>
                <Copy size={15} /> Copiar enlace de pago
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── actividad ── */
function Actividad({ data }: { data: SaaSData }) {
  return (
    <div className="fade-swap">
      <h2 className="font-display text-2xl font-bold tracking-tight text-white">Eventos de la plataforma</h2>
      <p className="mb-5 font-mono text-[11px] uppercase tracking-wide text-white/40">trazabilidad de acciones críticas</p>
      {data.eventos.length === 0 ? (
        <Empty title="Sin eventos" sub="Las acciones de los tenants aparecerán aquí." />
      ) : (
        <ul className="rounded-xl border border-white/10 bg-white/[0.03]">
          {data.eventos.map((e) => (
            <li key={e.id} className="flex items-start gap-3.5 border-b border-white/5 px-5 py-3.5 last:border-0">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neon" />
              <p className="flex-1 text-[13px] leading-snug text-white/80">{e.texto}</p>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-white/35">{fmtFecha(e.fecha)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── modal nueva comunidad ── */
function ModalNuevaComunidad({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ nombre: "", direccion: "", ciudad: "", unidades: 20, plan: "PARCELAS" as PlanId, emailAdmin: "", nombreAdmin: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async () => {
    if (!form.nombre.trim() || !form.ciudad.trim() || !form.emailAdmin.includes("@") || !form.nombreAdmin.trim()) {
      setError("Completa todos los campos obligatorios (correo válido).");
      return;
    }
    setError(null);
    setBusy(true);
    await crearComunidadSaaS(form);
    toast("Tenant onboarded: " + form.nombre + " · admin provisorio creado (contraseña: comunidad123).");
    await onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Onboardear nuevo tenant" wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la comunidad"><input className="field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Bosques de Quilén" /></Field>
          <Field label="Ciudad"><input className="field" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} placeholder="Valdivia" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_130px_190px]">
          <Field label="Dirección"><input className="field" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Ruta T-350 km 8" /></Field>
          <Field label="Unidades"><input className="field" type="number" min={1} value={form.unidades} onChange={(e) => setForm({ ...form, unidades: Number(e.target.value) })} /></Field>
          <Field label="Plan">
            <select className="field" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as PlanId })}>
              <option value="COMITE">Comité (gratis)</option>
              <option value="PARCELAS">Comunidad de Parcelas</option>
              <option value="CUSTOM">Personalizado</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del administrador"><input className="field" value={form.nombreAdmin} onChange={(e) => setForm({ ...form, nombreAdmin: e.target.value })} placeholder="Ej: Tomás Vidal" /></Field>
          <Field label="Correo del administrador"><input className="field" type="email" value={form.emailAdmin} onChange={(e) => setForm({ ...form, emailAdmin: e.target.value })} placeholder="admin@comunidad.cl" /></Field>
        </div>
        {error && <p className="rounded-xl border border-signal/40 bg-signal/10 px-3.5 py-2.5 text-[13px] font-medium text-signal">{error}</p>}
        <div className="flex justify-end gap-2.5 border-t border-line pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="neon" onClick={() => void crear()} disabled={busy}>
            {busy ? <Spinner /> : <><Users size={15} /> Crear tenant y admin</>}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ── ajustes: precio de la tarjeta "Comunidades" de la landing ── */
function Ajustes({ planes, refetch }: { planes: Plan[]; refetch: () => Promise<void> }) {
  // La tarjeta "Comunidades" de la landing muestra el plan con ese nombre (o el plan de parcelas).
  const planTarjeta = useMemo(() => {
    const porNombre = planes.find((p) => p.nombre.toLowerCase().includes("comunidad"));
    return porNombre ?? planes.find((p) => p.id === "PARCELAS") ?? planes[0] ?? null;
  }, [planes]);

  const [precio, setPrecio] = useState<number | "">(planTarjeta?.precio ?? "");
  const [guardando, setGuardando] = useState(false);

  // Sincroniza el input si cambia el plan seleccionado
  useEffect(() => { setPrecio(planTarjeta?.precio ?? ""); }, [planTarjeta]);

  if (!planTarjeta) {
    return (
      <div className="fade-swap rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <p className="font-display text-lg font-bold text-white">No hay planes creados</p>
        <p className="mt-1 text-[13px] text-white/50">Crea un plan en la pestaña «Planes» para poder editar su precio aquí.</p>
      </div>
    );
  }

  const guardar = async () => {
    if (precio === "" || Number(precio) < 0) { toast("Escribe un precio válido.", "warn"); return; }
    setGuardando(true);
    await actualizarPlan(planTarjeta.id, { precio: Number(precio) });
    await refetch();
    setGuardando(false);
    toast("Precio actualizado. La tarjeta «Comunidades» de la landing lo mostrará.");
  };

  return (
    <div className="fade-swap space-y-6">
      <div>
        <h2 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-deep"><Pencil size={18} /></span>
          Ajustes de presentación
        </h2>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-white/40">
          Lo que cambies aquí se refleja en la página de inicio (landing).
        </p>
      </div>

      <div className="max-w-xl rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/50">Tarjeta «Comunidades» de la landing</p>
        <p className="mt-3 text-[13.5px] text-white/70">
          Plan: <strong className="text-white">{planTarjeta.nombre}</strong>
        </p>
        <div className="mt-4 flex items-end gap-3">
          <Field label="Precio mensual (CLP)">
            <input className="field w-44" type="number" min={0} step={500} value={precio === "" ? "" : precio} onChange={(e) => setPrecio(e.target.value === "" ? "" : Number(e.target.value))} />
          </Field>
          <Btn variant="neon" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? <Spinner /> : <><CheckCheck size={15} /> Guardar precio</>}
          </Btn>
        </div>
        <p className="mt-4 rounded-lg border border-neon/20 bg-neon/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-white/60">
          Vista previa en la landing: <span className="font-display text-[16px] font-bold text-neon">desde {fmtCLP(Number(precio) || 0)}</span> /mes
        </p>
      </div>
    </div>
  );
}


