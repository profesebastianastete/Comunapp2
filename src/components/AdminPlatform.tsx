import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api, fmtFecha, ROL_COLOR, ROL_LABEL,
  type Membresia, type Parcela, type Rol, type RolCondo, type Sesion, type Usuario,
} from "../lib/store";
import { Btn, Empty, EstadoTag, Field, Icon, Modal, RolTag, Spinner, StatCard, toast } from "./ui";

type Tab = "resumen" | "usuarios" | "condominios";

export default function AdminPlatform({ sesion }: { sesion: Sesion }) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[] | null>(null);

  const refetch = useCallback(async () => {
    const [u, p] = await Promise.all([api.usuarios(), api.parcelas()]);
    setUsuarios(u);
    setParcelas(p);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const nombreParcela = useMemo(() => {
    const m = new Map<string, string>();
    parcelas?.forEach((p) => m.set(p.id, p.nombre));
    return m;
  }, [parcelas]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "resumen", label: "Resumen", icon: "chart" },
    { id: "usuarios", label: "Usuarios", icon: "users" },
    { id: "condominios", label: "Condominios", icon: "building" },
  ];

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-[210px_1fr]">
      {/* sidebar */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-2 px-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ink3">Consola de plataforma</p>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "flex shrink-0 items-center gap-2.5 border-[1.5px] px-3.5 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] transition-all " +
                (tab === t.id ? "border-ink bg-pine text-lime shadow-[3px_3px_0_0_#1a2521]" : "border-transparent text-ink2 hover:border-ink hover:bg-card")
              }
            >
              <Icon name={t.icon} size={15} /> {t.label}
            </button>
          ))}
        </nav>
        <p className="mt-4 hidden border border-dashed border-ink/30 p-3 font-mono text-[10.5px] leading-relaxed text-ink3 lg:block">
          Como <strong className="text-ink">superadmin</strong> creas condominios (tenants) y usuarios en todos los roles. Cada cambio queda trazado.
        </p>
      </aside>

      {/* contenido */}
      <div className="min-w-0">
        {!usuarios || !parcelas ? (
          <div className="flex items-center gap-3 py-20 text-ink2"><Spinner /> <span className="font-mono text-[13px] uppercase tracking-wide">Consultando la API…</span></div>
        ) : tab === "resumen" ? (
          <Resumen usuarios={usuarios} parcelas={parcelas} />
        ) : tab === "usuarios" ? (
          <UsuariosTab usuarios={usuarios} parcelas={parcelas} nombreParcela={nombreParcela} sesion={sesion} refetch={refetch} />
        ) : (
          <CondominiosTab parcelas={parcelas} usuarios={usuarios} refetch={refetch} />
        )}
      </div>
    </div>
  );
}

/* ── resumen ── */
function Resumen({ usuarios, parcelas }: { usuarios: Usuario[]; parcelas: Parcela[] }) {
  const porRol = useMemo(() => {
    const conteo: Record<string, number> = { SUPERADMIN: 0, ADMIN: 0, COMITE: 0, PROPIETARIO: 0, ARRENDATARIO: 0 };
    usuarios.forEach((u) => {
      if (u.rolGlobal === "SUPERADMIN") conteo.SUPERADMIN++;
      u.membresias.forEach((m) => conteo[m.rol]++);
    });
    return conteo;
  }, [usuarios]);
  const max = Math.max(...Object.values(porRol), 1);

  return (
    <div className="fade-swap space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Condominios (tenants)" value={parcelas.length} icon="building" accent />
        <StatCard label="Usuarios" value={usuarios.length} icon="users" />
        <StatCard label="Cuentas activas" value={usuarios.filter((u) => u.activo).length} icon="shield" />
        <StatCard label="Roles soportados" value={5} icon="key" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border-[1.5px] border-ink bg-card p-5">
          <h3 className="font-display text-lg font-bold text-ink">Usuarios por rol</h3>
          <p className="mb-4 text-[12.5px] text-ink3">Membresías activas en toda la plataforma</p>
          <div className="space-y-3">
            {Object.entries(porRol).map(([rol, n]) => (
              <div key={rol} className="grid grid-cols-[110px_1fr_30px] items-center gap-3">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ink2">{ROL_LABEL[rol as Rol]}</span>
                <div className="h-5 border border-ink bg-paper">
                  <div className="bar-up h-full" style={{ width: (n / max) * 100 + "%", background: ROL_COLOR[rol as Rol], animationDelay: "0.1s" }} />
                </div>
                <span className="tnum text-right font-mono text-[13px] font-bold text-ink">{n}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-[1.5px] border-ink bg-card p-5">
          <h3 className="font-display text-lg font-bold text-ink">Actividad reciente</h3>
          <p className="mb-4 text-[12.5px] text-ink3">Eventos trazados por la API</p>
          <EventosFeed />
        </section>
      </div>
    </div>
  );
}

export function EventosFeed() {
  const [eventos, setEventos] = useState<{ id: string; fecha: string; texto: string }[]>([]);
  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      const { eventos: ev } = await leerEventos();
      if (vivo) setEventos(ev);
    };
    cargar();
    const id = setInterval(cargar, 2500);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);
  if (!eventos.length) return <p className="font-mono text-[12px] text-ink3">Sin actividad todavía.</p>;
  return (
    <ul className="space-y-0">
      {eventos.slice(0, 7).map((e) => (
        <li key={e.id} className="ledger flex items-start gap-3 py-2.5 last:border-0">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-pine" />
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink2">{e.texto}</p>
          <span className="shrink-0 font-mono text-[10.5px] uppercase text-ink3">{fmtFecha(e.fecha)}</span>
        </li>
      ))}
    </ul>
  );
}

async function leerEventos() {
  await new Promise((r) => setTimeout(r, 120));
  const raw = localStorage.getItem("comunapp_db_v3");
  if (!raw) return { eventos: [] };
  try {
    return { eventos: (JSON.parse(raw) as { eventos: { id: string; fecha: string; texto: string }[] }).eventos ?? [] };
  } catch {
    return { eventos: [] };
  }
}

/* ── usuarios ── */
function UsuariosTab({
  usuarios, parcelas, nombreParcela, sesion, refetch,
}: {
  usuarios: Usuario[]; parcelas: Parcela[]; nombreParcela: Map<string, string>; sesion: Sesion; refetch: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroParcela, setFiltroParcela] = useState("todas");
  const [modal, setModal] = useState<{ abierto: boolean; editando: Usuario | null }>({ abierto: false, editando: null });
  const [borrar, setBorrar] = useState<Usuario | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    return usuarios.filter((u) => {
      const texto = (u.nombre + " " + u.email).toLowerCase();
      if (q && !texto.includes(q.toLowerCase())) return false;
      const roles: string[] = u.rolGlobal ? [u.rolGlobal] : u.membresias.map((m) => m.rol);
      if (filtroRol !== "todos" && !roles.includes(filtroRol)) return false;
      if (filtroParcela !== "todas" && !u.membresias.some((m) => m.parcelaId === filtroParcela)) return false;
      return true;
    });
  }, [usuarios, q, filtroRol, filtroParcela]);

  const toggleActivo = async (u: Usuario) => {
    setBusy(u.id);
    await api.actualizarUsuario(u.id, { activo: !u.activo });
    toast((u.activo ? "Cuenta desactivada: " : "Cuenta reactivada: ") + u.nombre, u.activo ? "warn" : "ok");
    await refetch();
    setBusy(null);
  };

  const confirmarBorrado = async () => {
    if (!borrar) return;
    setBusy(borrar.id);
    await api.eliminarUsuario(borrar.id);
    toast("Usuario eliminado: " + borrar.nombre, "warn");
    setBorrar(null);
    await refetch();
    setBusy(null);
  };

  return (
    <div className="fade-swap">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Usuarios</h2>
          <p className="text-[13px] text-ink3">{usuarios.length} cuentas · crea y asigna roles en cualquier condominio</p>
        </div>
        <Btn className="ml-auto" onClick={() => setModal({ abierto: true, editando: null })}>
          <Icon name="plus" size={15} /> Nuevo usuario
        </Btn>
      </div>

      <div className="mb-4 grid gap-2.5 sm:grid-cols-[1fr_170px_190px]">
        <div className="relative">
          <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
          <input className="field pl-9" placeholder="Buscar por nombre o correo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="field" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
          <option value="todos">Todos los roles</option>
          {Object.entries(ROL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="field" value={filtroParcela} onChange={(e) => setFiltroParcela(e.target.value)}>
          <option value="todas">Todos los condominios</option>
          {parcelas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <Empty icon="users" title="Sin resultados" sub="Ajusta la búsqueda o crea un nuevo usuario para la plataforma." />
      ) : (
        <div className="code-scroll overflow-x-auto border-[1.5px] border-ink bg-card">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b-[1.5px] border-ink bg-paper2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink2">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Roles y condominios</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} className="border-b border-line transition-colors last:border-0 hover:bg-paper2/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center border-[1.5px] border-ink bg-pine font-mono text-[11px] font-bold text-lime">
                        {u.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <div className="min-w-0">
                        <p className={"truncate text-[13.5px] font-semibold " + (u.activo ? "text-ink" : "text-ink3 line-through")}>{u.nombre}</p>
                        <p className="truncate font-mono text-[11px] text-ink3">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.rolGlobal === "SUPERADMIN" && <RolTag rol="SUPERADMIN" label="Plataforma" />}
                      {u.membresias.map((m) => (
                        <RolTag key={m.parcelaId} rol={m.rol} label={(nombreParcela.get(m.parcelaId) ?? "—").split(" ")[0] + " · " + ROL_LABEL[m.rol] + (m.unidad ? " · " + m.unidad : "")} />
                      ))}
                      {u.membresias.length === 0 && !u.rolGlobal && <span className="font-mono text-[11px] text-ink3">sin membresías</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActivo(u)} disabled={busy === u.id || u.id === sesion.usuarioId} title={u.id === sesion.usuarioId ? "No puedes desactivar tu propia cuenta" : "Cambiar estado"}>
                      <EstadoTag estado={u.activo ? "activa" : "inactiva"} />
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-ink3">{fmtFecha(u.creado)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => setModal({ abierto: true, editando: u })} className="grid h-8 w-8 place-items-center border border-ink text-ink2 transition-colors hover:bg-pine hover:text-lime" title="Editar">
                        {busy === u.id ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="edit" size={14} />}
                      </button>
                      <button
                        onClick={() => setBorrar(u)}
                        disabled={u.id === sesion.usuarioId}
                        className="grid h-8 w-8 place-items-center border border-ink text-ink2 transition-colors hover:bg-signal hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
                        title={u.id === sesion.usuarioId ? "No puedes eliminar tu propia cuenta" : "Eliminar"}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.abierto && (
        <UserModal editando={modal.editando} parcelas={parcelas} onClose={() => setModal({ abierto: false, editando: null })} onSaved={async () => { setModal({ abierto: false, editando: null }); await refetch(); }} />
      )}

      <Modal open={!!borrar} onClose={() => setBorrar(null)} title="¿Eliminar usuario?">
        <p className="text-[14px] leading-relaxed text-ink2">
          Se eliminará <strong className="text-ink">{borrar?.nombre}</strong> y todas sus membresías. Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Btn variant="ghost" size="sm" onClick={() => setBorrar(null)}>Cancelar</Btn>
          <Btn variant="danger" size="sm" onClick={confirmarBorrado} disabled={busy === borrar?.id}>
            {busy === borrar?.id ? <Spinner /> : <><Icon name="trash" size={13} /> Eliminar</>}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ── modal crear/editar usuario ── */
function UserModal({ editando, parcelas, onClose, onSaved }: { editando: Usuario | null; parcelas: Parcela[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [nombre, setNombre] = useState(editando?.nombre ?? "");
  const [email, setEmail] = useState(editando?.email ?? "");
  const [password, setPassword] = useState("");
  const [plataforma, setPlataforma] = useState(editando?.rolGlobal === "SUPERADMIN");
  const [membresias, setMembresias] = useState<Membresia[]>(
    editando ? editando.membresias.map((m) => ({ ...m })) : [{ parcelaId: parcelas[0]?.id ?? "", rol: "PROPIETARIO", unidad: "" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setM = (i: number, patch: Partial<Membresia>) =>
    setMembresias((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const guardar = async () => {
    if (!nombre.trim() || !email.includes("@")) {
      setError("Nombre y correo válido son obligatorios.");
      return;
    }
    if (!editando && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!plataforma) {
      if (membresias.length === 0) {
        setError("Agrega al menos un condominio con su rol.");
        return;
      }
      for (const m of membresias) {
        if (!m.parcelaId) return setError("Selecciona el condominio en todas las membresías.");
        if ((m.rol === "PROPIETARIO" || m.rol === "ARRENDATARIO") && !m.unidad?.trim())
          return setError("Propietarios y arrendatarios necesitan una unidad (ej: A-42).");
      }
    }
    setError(null);
    setSaving(true);
    try {
      const data = {
        nombre: nombre.trim(),
        email: email.trim(),
        rolGlobal: plataforma ? ("SUPERADMIN" as Rol) : null,
        membresias: plataforma ? [] : membresias.map((m) => ({ parcelaId: m.parcelaId, rol: m.rol, unidad: m.rol === "PROPIETARIO" || m.rol === "ARRENDATARIO" ? m.unidad : undefined })),
      };
      if (editando) {
        await api.actualizarUsuario(editando.id, password ? { ...data, password } : data);
        toast("Usuario actualizado: " + nombre);
      } else {
        await api.crearUsuario({ ...data, password });
        toast("Usuario creado: " + nombre + " — ya puede iniciar sesión.");
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={editando ? "Editar usuario" : "Nuevo usuario"} wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo"><input className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Camila Órdenes" /></Field>
          <Field label="Correo electrónico"><input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@dominio.cl" /></Field>
        </div>
        <Field label={editando ? "Nueva contraseña (opcional)" : "Contraseña"}>
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editando ? "•••••• (se mantiene la actual)" : "Mínimo 6 caracteres"} />
        </Field>

        <Field label="Tipo de cuenta">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: true, t: "Plataforma", d: "Superadmin global" },
              { v: false, t: "Condominio", d: "Rol por parcela" },
            ].map((o) => (
              <button
                key={o.t} type="button" onClick={() => setPlataforma(o.v)}
                className={"border-[1.5px] px-3.5 py-3 text-left transition-all " + (plataforma === o.v ? "border-ink bg-pine text-paper shadow-[3px_3px_0_0_#c9f04d]" : "border-ink bg-card text-ink hover:bg-paper2")}
              >
                <span className={"block font-display text-[15px] font-bold " + (plataforma === o.v ? "text-lime" : "text-ink")}>{o.t}</span>
                <span className={"block font-mono text-[10.5px] uppercase tracking-wide " + (plataforma === o.v ? "text-paper/70" : "text-ink3")}>{o.d}</span>
              </button>
            ))}
          </div>
        </Field>

        {!plataforma && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink2">Membresías (condominio + rol)</span>
              <button
                type="button"
                onClick={() => setMembresias((xs) => [...xs, { parcelaId: parcelas[0]?.id ?? "", rol: "PROPIETARIO", unidad: "" }])}
                className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wide text-pine hover:underline"
              >
                <Icon name="plus" size={12} /> agregar
              </button>
            </div>
            <div className="space-y-2">
              {membresias.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_84px_36px] items-center gap-2 border border-ink bg-card p-2">
                  <select className="field h-10! text-[13px]" value={m.parcelaId} onChange={(e) => setM(i, { parcelaId: e.target.value })}>
                    {parcelas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <select className="field h-10! text-[13px]" value={m.rol} onChange={(e) => setM(i, { rol: e.target.value as RolCondo })}>
                    {(["ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO"] as RolCondo[]).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                  </select>
                  {(m.rol === "PROPIETARIO" || m.rol === "ARRENDATARIO") ? (
                    <input className="field h-10! text-[13px]" placeholder="A-42" value={m.unidad ?? ""} onChange={(e) => setM(i, { unidad: e.target.value.toUpperCase() })} />
                  ) : (
                    <span className="grid h-10 place-items-center border border-dashed border-line text-center font-mono text-[9px] uppercase text-ink3">sin unidad</span>
                  )}
                  <button type="button" onClick={() => setMembresias((xs) => xs.filter((_, j) => j !== i))} disabled={membresias.length === 1} className="grid h-10 place-items-center border border-ink text-ink2 transition-colors hover:bg-signal hover:text-paper disabled:opacity-40" aria-label="Quitar membresía">
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="flex items-start gap-2 border-[1.5px] border-signal bg-signal/10 px-3 py-2.5 text-[13px] font-medium text-[#a03526]">
            <Icon name="alert" size={15} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex justify-end gap-2.5 border-t border-line pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="lime" onClick={guardar} disabled={saving}>
            {saving ? <Spinner /> : <><Icon name="check" size={15} /> {editando ? "Guardar cambios" : "Crear usuario"}</>}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ── condominios ── */
function CondominiosTab({ parcelas, usuarios, refetch }: { parcelas: Parcela[]; usuarios: Usuario[]; refetch: () => Promise<void> }) {
  const [modalNuevo, setModalNuevo] = useState(false);
  const [editar, setEditar] = useState<Parcela | null>(null);
  const [borrar, setBorrar] = useState<Parcela | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const miembrosDe = (id: string) => usuarios.filter((u) => u.membresias.some((m) => m.parcelaId === id));

  return (
    <div className="fade-swap">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Condominios</h2>
          <p className="text-[13px] text-ink3">Cada condominio es un <strong className="text-ink">tenant</strong> con datos aislados</p>
        </div>
        <Btn className="ml-auto" onClick={() => setModalNuevo(true)}><Icon name="plus" size={15} /> Nuevo condominio</Btn>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {parcelas.map((p) => {
          const miembros = miembrosDe(p.id);
          return (
            <article key={p.id} className="group border-[1.5px] border-ink bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#1a2521]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-[22px] font-bold leading-tight text-ink">{p.nombre}</h3>
                  <p className="mt-0.5 text-[13px] text-ink3">{p.direccion} · {p.ciudad}</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center border-[1.5px] border-ink bg-pine text-lime"><Icon name="building" size={18} /></span>
              </div>
              <dl className="mt-4 grid grid-cols-3 divide-x-[1.5px] divide-ink border-y-[1.5px] border-ink">
                {[
                  { l: "Unidades", v: String(p.unidades) },
                  { l: "Miembros", v: String(miembros.length) },
                  { l: "Tenant ID", v: p.id.slice(0, 8) },
                ].map((x) => (
                  <div key={x.l} className="px-3 py-2.5 first:pl-0">
                    <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink3">{x.l}</dt>
                    <dd className="tnum truncate font-mono text-[14px] font-bold text-pine">{x.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex gap-2">
                <Btn variant="paper" size="sm" onClick={() => setEditar(p)}><Icon name="edit" size={13} /> Editar</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setBorrar(p)} className="border-signal! text-signal! hover:bg-signal! hover:text-paper!"><Icon name="trash" size={13} /></Btn>
              </div>
            </article>
          );
        })}
      </div>

      {(modalNuevo || editar) && (
        <ParcelaModal
          editando={editar}
          onClose={() => { setModalNuevo(false); setEditar(null); }}
          onSaved={async () => { setModalNuevo(false); setEditar(null); await refetch(); }}
        />
      )}

      <Modal open={!!borrar} onClose={() => setBorrar(null)} title="¿Eliminar condominio?">
        <p className="text-[14px] leading-relaxed text-ink2">
          Se eliminará <strong className="text-ink">{borrar?.nombre}</strong> junto con sus cobros, movimientos y membresías. Los usuarios no se borran.
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Btn variant="ghost" size="sm" onClick={() => setBorrar(null)}>Cancelar</Btn>
          <Btn
            variant="danger" size="sm" disabled={busy === borrar?.id}
            onClick={async () => {
              if (!borrar) return;
              setBusy(borrar.id);
              await api.eliminarParcela(borrar.id);
              toast("Condominio eliminado: " + borrar.nombre, "warn");
              setBorrar(null);
              await refetch();
              setBusy(null);
            }}
          >
            {busy === borrar?.id ? <Spinner /> : <><Icon name="trash" size={13} /> Eliminar tenant</>}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

function ParcelaModal({ editando, onClose, onSaved }: { editando: Parcela | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [nombre, setNombre] = useState(editando?.nombre ?? "");
  const [direccion, setDireccion] = useState(editando?.direccion ?? "");
  const [ciudad, setCiudad] = useState(editando?.ciudad ?? "");
  const [unidades, setUnidades] = useState(editando?.unidades ?? 24);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!nombre.trim() || !direccion.trim() || !ciudad.trim()) return setError("Completa nombre, dirección y ciudad.");
    if (unidades < 1) return setError("Debe tener al menos 1 unidad.");
    setError(null);
    setSaving(true);
    try {
      if (editando) {
        await api.actualizarParcela(editando.id, { nombre, direccion, ciudad, unidades });
        toast("Condominio actualizado: " + nombre);
      } else {
        await api.crearParcela({ nombre, direccion, ciudad, unidades });
        toast("Tenant creado: " + nombre + " — ya puedes asignarle usuarios.");
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={editando ? "Editar condominio" : "Nuevo condominio (tenant)"}>
      <div className="space-y-4">
        <Field label="Nombre"><input className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Torres del Parque" /></Field>
        <Field label="Dirección"><input className="field" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Av. Siempre Viva 742" /></Field>
        <div className="grid grid-cols-[1fr_120px] gap-4">
          <Field label="Ciudad"><input className="field" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Santiago" /></Field>
          <Field label="Unidades"><input className="field" type="number" min={1} value={unidades} onChange={(e) => setUnidades(Number(e.target.value))} /></Field>
        </div>
        {error && <p className="border-[1.5px] border-signal bg-signal/10 px-3 py-2.5 text-[13px] font-medium text-[#a03526]">{error}</p>}
        <div className="flex justify-end gap-2.5 border-t border-line pt-4">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="lime" onClick={guardar} disabled={saving}>{saving ? <Spinner /> : <><Icon name="check" size={15} /> {editando ? "Guardar" : "Crear tenant"}</>}</Btn>
        </div>
      </div>
    </Modal>
  );
}


