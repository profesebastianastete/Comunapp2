import {
  Activity, Building2, CheckCheck, Copy, CreditCard, ExternalLink, KeyRound, PlugZap, PlusCircle, Power, TrendingUp, Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  crearComunidadSaaS, fmtCLP, fmtFecha, fmtMes, generarCobroMP, generarFacturasMes, listadoSaaS,
  marcarFacturaPagada, PLAN_LABEL, toggleEstadoComunidad, usuarioActual,
  type CobroMP, type PlanId, type Sesion,
} from "../lib/store";
import { Btn, CountUp, Empty, EstadoTag, Field, Modal, ModalCambiarPassword, Spinner, toast } from "./ui";

type Tab = "metricas" | "comunidades" | "cobrosmp" | "facturacion" | "actividad";

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
  usuarios: { id: string; nombre: string; email: string; activo: boolean }[];
  facturas: { id: string; comunidadId: string; periodo: string; plan: string; monto: number; estado: string; fecha: string }[];
  seriePagos: { dia: string; monto: number; pagos: number }[];
  eventos: { id: string; fecha: string; texto: string }[];
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
    const mrr = data.comunidades.filter((c) => c.estado === "ACTIVA").reduce((a, c) => a + ({ COMITE: 0, PARCELAS: 29900, CUSTOM: 89000 } as Record<PlanId, number>)[c.plan], 0);
    const volumen = data.seriePagos.reduce((a, d) => a + d.monto, 0);
    const pagos = data.seriePagos.reduce((a, d) => a + d.pagos, 0);
    return { mrr, volumen, pagos, comunidades: data.comunidades.length, usuarios: data.usuarios.length };
  }, [data]);

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: "metricas", label: "Métricas", icon: Activity },
    { id: "comunidades", label: "Tenants", icon: Building2 },
    { id: "cobrosmp", label: "Cobros MP", icon: PlugZap },
    { id: "facturacion", label: "Facturación", icon: CreditCard },
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
          ) : tab === "cobrosmp" ? (
            <CobrosMP data={data} refetch={refetch} />
          ) : tab === "facturacion" ? (
            <Facturacion data={data} kpis={kpis} refetch={refetch} />
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
                <p className="tnum mt-3 font-display text-3xl font-bold text-white">{fmtCLP(ultimo.monto)}</p>
                <p className="mt-0.5 text-[13px] text-white/60">{ultimo.concepto}{ultimo.unidad ? " · " + ultimo.unidad : ""}</p>
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
                <td className="px-5 py-4"><span className="rounded-md border border-neon/30 bg-neon/10 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-neon">{PLAN_LABEL[c.plan]}</span></td>
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

  const cobrar = async (facturaId: string, nombre: string) => {
    setCobrando(facturaId);
    await marcarFacturaPagada(facturaId);
    await refetch();
    setCobrando(null);
    toast("Factura cobrada a " + nombre + ".");
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
                  <td className="px-5 py-3.5 text-right">
                    {pendiente ? (
                      <button
                        disabled={cobrando === f.id}
                        onClick={() => void cobrar(f.id, tenant?.nombre ?? "la comunidad")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neon/50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-neon transition-colors hover:bg-neon hover:text-deep disabled:opacity-50"
                      >
                        {cobrando === f.id ? <Spinner className="h-3 w-3" /> : <CheckCheck size={12} />} Cobrar
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] uppercase text-white/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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


