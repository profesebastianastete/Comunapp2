# Plan de Implementación - Mejoras de Seguridad y Funcionalidad ComunApp

## 📋 Resumen Ejecutivo

Este documento detalla las mejoras de seguridad y nuevas funcionalidades a implementar en ComunApp, incluyendo:
- Renombramiento de módulo "Votaciones" a "Participación"
- Sistema de gestión documental (Estatutos, Reglamentos, Actas)
- Periodos hábiles para votaciones
- Panel independiente de generación de cobros
- Implementación de PWA

---

## 🔒 1. MEJORAS DE SEGURIDAD PRIORITARIAS

### 1.1 Credenciales Hardcodeadas
**Archivos afectados:** `backend/config.py`, `backend/seed.py`

**Acciones requeridas:**
- Eliminar contraseñas demo del código
- Usar variables de entorno para TODAS las credenciales
- Rotar credenciales expuestas inmediatamente

```python
# ANTES (NO USAR)
SUPERADMIN_EMAIL = "admin@comunapp.cl"
SUPERADMIN_PASS = "1234"  # ❌ HARDCODEADO

# DESPUÉS (CORRECTO)
SUPERADMIN_EMAIL = os.getenv("SUPERADMIN_EMAIL", "admin@comunapp.cl")
SUPERADMIN_PASS = os.getenv("SUPERADMIN_PASS")  # ✅ Desde variable de entorno
```

### 1.2 Validación de Firmas en Webhooks
**Archivo:** `backend/routers/mp.py`

```python
# Agregar validación de firma de Mercado Pago
def validar_firma_mp(request: Request, body: bytes):
    signature = request.headers.get("X-Request-Signature")
    if not signature:
        raise HTTPException(401, "Firma faltante")
    
    # Verificar firma usando tu secret key
    expected = hmac.new(
        settings.MP_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if f"sha256={expected}" != signature:
        raise HTTPException(401, "Firma inválida")
```

### 1.3 Sanitización de HTML
**Archivo:** `backend/routers/api.py`

```python
from bleach import clean

# Al recibir texto de usuarios (avisos, comentarios, etc.)
texto_limpio = clean(
    body.texto,
    tags=[],  # Sin tags HTML permitidos
    strip=True
)
```

### 1.4 Restringir CORS
**Archivo:** `backend/main.py`

```python
# ANTES (PELIGROSO)
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# DESPUÉS (SEGURO)
allowed_origins = [
    "https://comunapp.up.railway.app",
    "https://*.railway.app"  # Si usas subdominios
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

## 📝 2. CAMBIO "VOTACIONES" → "PARTICIPACIÓN"

### Frontend - Dashboard.tsx

**Líneas a modificar:**
```typescript
// Línea 16: Tipo Modulo
type Modulo =
  | "tus-pagos" | "historial" | "transparencia" | "informe" | "avisos" | "reservas" | "participacion"
  | "pagos-mes" | "cobranza" | "suscripciones" | "vecinos" | "bitacora";

// Línea 78: Para residentes propietarios
base.push({ id: "participacion" as Modulo, label: "Participación", icon: Vote });

// Línea 91: Para administradores
{ id: "participacion", label: "Participación", icon: Vote },

// Línea 331: Renderizado del componente
) : modulo === "participacion" ? (
  <ModuloParticipacion datos={datos} sesion={sesion} recargar={recargar} />

// Líneas 871-998: Renombrar función y textos
function ModuloParticipacion({ datos, sesion, recargar }: ...) {
  // ...
  <h2>Asambleas y participación ciudadana</h2>
  <p>Cada unidad vale un voto · resultados en tiempo real</p>
  
  // En modal de creación:
  <Btn>Abrir proceso de participación</Btn>
}
```

### Backend - models.py

**No requiere cambios estructurales**, pero actualizar comentarios:
```python
class Votacion(Base):
    __tablename__ = "votaciones"  # Mantener nombre técnico
    # ... campos existentes ...
    # Nota: La UI lo muestra como "Participación"
```

---

## 📄 3. SISTEMA DE GESTIÓN DOCUMENTAL

### 3.1 Backend - models.py

Agregar nuevo modelo después de línea 178:

```python
class DocumentoComunidad(Base):
    __tablename__ = "documentos_comunidad"
    
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[str] = mapped_column(String(50))  # "ESTATUTOS", "REGLAMENTO", "ACTA"
    titulo: Mapped[str] = mapped_column(String(200))
    descripcion: Mapped[str] = mapped_column(Text, default="")
    url_archivo: Mapped[str] = mapped_column(String(500))  # URL de almacenamiento
    tipo_mime: Mapped[str] = mapped_column(String(50))  # "application/pdf", "image/jpeg", etc.
    tamano_bytes: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    actualizado: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    creado_por_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    
    comunidad: Mapped["Comunidad"] = relationship(back_populates="documentos")
    creador: Mapped["Usuario"] = relationship(back_populates="documentos_creados")

# En clase Comunidad, agregar:
# documentos: Mapped[list["DocumentoComunidad"]] = relationship(back_populates="comunidad", cascade="all, delete-orphan")

# En clase Usuario, agregar:
# documentos_creados: Mapped[list["DocumentoComunidad"]] = relationship(back_populates="creador")
```

### 3.2 Backend - serializers.py

Agregar serializer:
```python
def documento(doc: DocumentoComunidad) -> dict:
    return {
        "id": doc.id,
        "tipo": doc.tipo,
        "titulo": doc.titulo,
        "descripcion": doc.descripcion,
        "url_archivo": doc.url_archivo,
        "tipo_mime": doc.tipo_mime,
        "tamano_bytes": doc.tamano_bytes,
        "version": doc.version,
        "activo": doc.activo,
        "creado": doc.creado.isoformat(),
        "creado_por": doc.creador.nombre if doc.creador else None
    }
```

### 3.3 Backend - routers/api.py

Agregar endpoints después de línea 470:

```python
class DocumentoIn(BaseModel):
    tipo: str
    titulo: str
    descripcion: str = ""
    url_archivo: str
    tipo_mime: str

@router.post("/comunidades/{cid}/documentos", dependencies=[Depends(require_roles(*GESTION))])
def subir_documento(cid: str, body: DocumentoIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    """Subir documento oficial de la comunidad"""
    com = db.get(Comunidad, cid)
    if not com:
        raise HTTPException(404, "Comunidad no encontrada")
    
    doc = DocumentoComunidad(
        comunidad_id=cid,
        tipo=body.tipo.upper(),
        titulo=body.titulo,
        descripcion=body.descripcion,
        url_archivo=body.url_archivo,
        tipo_mime=body.tipo_mime,
        creado_por_id=payload["sub"]
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return sz.documento(doc)

@router.get("/comunidades/{cid}/documentos")
def listar_documentos(cid: str, db: Session = Depends(get_db)):
    """Listar documentos públicos de la comunidad"""
    docs = db.execute(
        select(DocumentoComunidad)
        .where(DocumentoComunidad.comunidad_id == cid, DocumentoComunidad.activo == True)
        .order_by(DocumentoComunidad.tipo, DocumentoComunidad.version.desc())
    ).scalars().all()
    return [sz.documento(d) for d in docs]

@router.delete("/comunidades/{cid}/documentos/{did}", dependencies=[Depends(require_roles("ADMIN"))])
def eliminar_documento(cid: str, did: str, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    """Eliminar documento (soft delete)"""
    doc = db.get(DocumentoComunidad, did)
    if not doc or doc.comunidad_id != cid:
        raise HTTPException(404, "Documento no encontrado")
    doc.activo = False
    db.commit()
    return {"ok": True}
```

### 3.4 Frontend - Componente Documentos

Crear archivo `/workspace/src/components/ModuloDocumentos.tsx`:

```typescript
import { FileText, Upload, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { Btn, Field, Modal, toast } from "./ui";

interface Documento {
  id: string;
  tipo: "ESTATUTOS" | "REGLAMENTO" | "ACTA";
  titulo: string;
  url_archivo: string;
  tipo_mime: string;
  version: number;
  creado: string;
}

export function ModuloDocumentos({ comunidadId, esAdmin }: { comunidadId: string; esAdmin: boolean }) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [modalSubir, setModalSubir] = useState(false);
  const [form, setForm] = useState({ tipo: "ESTATUTOS", titulo: "", descripcion: "" });
  const [archivo, setArchivo] = useState<File | null>(null);

  const tiposDocumento = [
    { valor: "ESTATUTOS", label: "Estatutos", icon: "📜" },
    { valor: "REGLAMENTO", label: "Reglamento", icon: "📋" },
    { valor: "ACTA", label: "Acta", icon: "📝" }
  ];

  const handleSubir = async () => {
    if (!archivo) {
      toast("Selecciona un archivo PDF o imagen", "warn");
      return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("tipo", form.tipo);
    formData.append("titulo", form.titulo);
    formData.append("descripcion", form.descripcion);

    try {
      const res = await fetch(`/api/comunidades/${comunidadId}/documentos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData
      });
      
      if (res.ok) {
        toast("Documento subido exitosamente");
        setModalSubir(false);
        // Recargar lista
      }
    } catch (e) {
      toast("Error al subir documento", "warn");
    }
  };

  return (
    <div className="fade-swap space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">Documentos Oficiales</h2>
          <p className="text-[13px] text-ink2">Estatutos, reglamentos y actas de la comunidad</p>
        </div>
        {esAdmin && (
          <Btn onClick={() => setModalSubir(true)}>
            <Upload size={15} /> Subir documento
          </Btn>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tiposDocumento.map(tipo => {
          const docsTipo = documentos.filter(d => d.tipo === tipo.valor);
          return (
            <article key={tipo.valor} className="card-in rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tipo.icon}</span>
                <h3 className="font-display text-lg font-bold text-ink">{tipo.label}</h3>
              </div>
              
              {docsTipo.length === 0 ? (
                <p className="mt-3 text-[12px] text-ink3">Sin documentos</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {docsTipo.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{doc.titulo}</p>
                        <p className="text-[11px] text-ink3">v{doc.version} · {new Date(doc.creado).toLocaleDateString()}</p>
                      </div>
                      <a 
                        href={doc.url_archivo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-pine/10 text-pine hover:bg-pine/20"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <Modal open={modalSubir} onClose={() => setModalSubir(false)} title="Subir documento oficial">
        <div className="space-y-4">
          <Field label="Tipo de documento">
            <select 
              className="field" 
              value={form.tipo} 
              onChange={(e) => setForm({...form, tipo: e.target.value})}
            >
              {tiposDocumento.map(t => (
                <option key={t.valor} value={t.valor}>{t.icon} {t.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Título">
            <input 
              className="field" 
              value={form.titulo}
              onChange={(e) => setForm({...form, titulo: e.target.value})}
              placeholder="Ej: Estatutos 2024"
            />
          </Field>

          <Field label="Descripción (opcional)">
            <textarea 
              className="field min-h-[60px]"
              value={form.descripcion}
              onChange={(e) => setForm({...form, descripcion: e.target.value})}
            />
          </Field>

          <Field label="Archivo">
            <div className="rounded-lg border-2 border-dashed border-line p-4 text-center">
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                className="block w-full text-sm text-ink2"
              />
              <p className="mt-2 text-[11px] text-ink3">PDF o imagen (máx. 10MB)</p>
            </div>
          </Field>

          <div className="flex justify-end gap-2.5 border-t border-line pt-4">
            <Btn variant="ghost" onClick={() => setModalSubir(false)}>Cancelar</Btn>
            <Btn variant="neon" onClick={handleSubir}>Subir documento</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

### 3.5 Integración en Panel Participación

Modificar `ModuloParticipacion` en `Dashboard.tsx` para incluir documentos:

```typescript
function ModuloParticipacion({ datos, sesion, recargar }: ...) {
  const esGestion = sesion.rol === "ADMIN" || sesion.rol === "COMITE";
  
  return (
    <div className="space-y-8">
      {/* Sección 1: Documentos Oficiales */}
      <section>
        <ModuloDocumentos comunidadId={datos.comunidad.id} esAdmin={esGestion} />
      </section>

      {/* Sección 2: Votaciones/Participación */}
      <section>
        {/* ... código existente de votaciones ... */}
      </section>
    </div>
  );
}
```

---

## 🗳️ 4. PERIODO HÁBIL DE VOTACIÓN

### Backend - routers/api.py

Modificar endpoint `crear_votacion` (línea ~443):

```python
class VotacionIn(BaseModel):
    titulo: str
    pregunta: str
    opciones: list[str]
    inicio: Optional[datetime] = None  # NUEVO
    fin: Optional[datetime] = None      # NUEVO

@router.post("/comunidades/{cid}/votaciones", dependencies=[Depends(require_roles(*GESTION))])
def crear_votacion(cid: str, body: VotacionIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    # Validar fechas si existen
    if body.inicio and body.fin:
        if body.inicio >= body.fin:
            raise HTTPException(400, "La fecha de inicio debe ser anterior al fin")
    
    v = Votacion(
        comunidad_id=cid,
        titulo=body.titulo,
        pregunta=body.pregunta,
        opciones=json.dumps(body.opciones),
        inicio=body.inicio,
        fin=body.fin,
        abierta=True
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return sz.votacion(v)
```

### Frontend - Dashboard.tsx

Modificar formulario de creación de votación:

```typescript
const [form, setForm] = useState({ 
  titulo: "", 
  pregunta: "", 
  opciones: "A favor;En contra;Abstención",
  inicio: "",  // NUEVO
  fin: ""      // NUEVO
});

// En el modal (líneas 923-935):
<Modal open={modalNueva} onClose={() => setModalNueva(false)} title="Abrir proceso de participación">
  <div className="space-y-4">
    <Field label="Título">
      <input className="field" value={form.titulo} onChange={...} />
    </Field>
    
    <Field label="Pregunta">
      <textarea className="field min-h-[70px]" value={form.pregunta} onChange={...} />
    </Field>
    
    <Field label="Opciones" hint="separadas por punto y coma">
      <input className="field" value={form.opciones} onChange={...} />
    </Field>

    {/* NUEVO: Periodo hábil */}
    <div className="grid grid-cols-2 gap-3">
      <Field label="Inicio (opcional)">
        <input 
          type="datetime-local" 
          className="field" 
          value={form.inicio}
          onChange={(e) => setForm({...form, inicio: e.target.value})}
        />
      </Field>
      <Field label="Fin (opcional)">
        <input 
          type="datetime-local" 
          className="field"
          value={form.fin}
          onChange={(e) => setForm({...form, fin: e.target.value})}
        />
      </Field>
    </div>

    <div className="flex justify-end gap-2.5 border-t border-line pt-4">
      <Btn variant="ghost" onClick={() => setModalNueva(false)}>Cancelar</Btn>
      <Btn variant="neon" onClick={() => void crear()} disabled={busy}>
        {busy ? <Spinner /> : <>Abrir participación</>}
      </Btn>
    </div>
  </div>
</Modal>
```

### Validación en Votación

En `VotacionCard`, verificar periodo hábil:

```typescript
function VotacionCard({ v, sesion, votando, onVotar }: ...) {
  const ahora = new Date();
  const inicio = v.inicio ? new Date(v.inicio) : null;
  const fin = v.fin ? new Date(v.fin) : null;
  
  const dentroPeriodo = (!inicio || ahora >= inicio) && (!fin || ahora <= fin);
  const puedeVotar = sesion.rol === "PROPIETARIO" && v.abierta && !yaVote && dentroPeriodo;
  
  // Mostrar mensaje si fuera del periodo
  if (!dentroPeriodo) {
    if (inicio && ahora < inicio) {
      return <p className="text-[12px] text-ink3">Votación abre el {fmtFechaHora(inicio)}</p>;
    }
    if (fin && ahora > fin) {
      return <p className="text-[12px] text-signal">Votación cerrada el {fmtFechaHora(fin)}</p>;
    }
  }
  
  // ... resto del código existente ...
}
```

---

## 💰 5. PANEL "GENERAR COBRO"

### 5.1 Nueva Estructura de Navegación

En `Dashboard.tsx`, modificar navegación para administradores:

```typescript
const nav = useMemo(() => {
  if (esResidente) {
    // ... navegación residente ...
  }
  
  // Navegación administrador ACTUALIZADA
  return [
    { id: "pagos-mes", label: "Pagos del mes", icon: Wallet },
    { id: "generar-cobro", label: "Generar cobro", icon: CreditCard },  // NUEVO
    { id: "transparencia", label: "Transparencia", icon: PieChart },
    { id: "informe", label: "Informe mensual", icon: FileDown },
    { id: "suscripciones", label: "Pagos automáticos", icon: RefreshCw },
    { id: "avisos", label: "Muro de avisos", icon: Megaphone },
    { id: "participacion", label: "Participación", icon: Vote },
    { id: "vecinos", label: "Vecinos", icon: Users },
    { id: "bitacora", label: "Control de acceso", icon: ShieldCheck },
  ];
}, [esResidente, esAdmin, sesion.rol, datos]);
```

### 5.2 Componente GenerarCobro

Crear `/workspace/src/components/ModuloGenerarCobro.tsx`:

```typescript
import { Calendar, CreditCard, PlusCircle, Upload } from "lucide-react";
import { useState } from "react";
import { fmtMes, periodoActual, generarMes, registrarPagoVecino } from "../lib/store";
import { Btn, Field, Modal, Spinner, toast } from "./ui";

export function ModuloGenerarCobro({ comunidadId, recargar }: { comunidadId: string; recargar: () => Promise<void> }) {
  const [tab, setTab] = useState<"mensual" | "individual">("mensual");
  const [periodo, setPeriodo] = useState(periodoActual());
  const [montoMes, setMontoMes] = useState(55000);
  const [motivo, setMotivo] = useState("Pagos del mes");
  const [generando, setGenerando] = useState(false);
  
  // Cobro individual
  const [individual, setIndividual] = useState({
    unidad: "",
    fecha: new Date().toISOString().split("T")[0],
    motivo: "",
    monto: 0
  });
  const [validando, setValidando] = useState<string | null>(null);
  const [modalPago, setModalPago] = useState(false);
  const [pagoData, setPagoData] = useState({ metodo: "transferencia", fecha: "", folio: "", boleta: null });

  const generarCobroMensual = async () => {
    setGenerando(true);
    try {
      const r = await generarMes(comunidadId, periodo, montoMes, motivo.trim() || "Pagos del mes");
      await recargar();
      toast(r.creados > 0 
        ? `Cobro generado para ${r.creados} unidades` 
        : "Este cobro ya existe para el periodo", 
        r.creados > 0 ? "ok" : "warn"
      );
    } catch (e) {
      toast("Error al generar cobro", "warn");
    }
    setGenerando(false);
  };

  const crearCobroIndividual = async () => {
    if (!individual.unidad || !individual.motivo || individual.monto <= 0) {
      toast("Completa todos los campos", "warn");
      return;
    }
    
    setValidando(individual.unidad);
    try {
      // API call para crear cobro individual
      await fetch(`/api/comunidades/${comunidadId}/cobros/individual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(individual)
      });
      
      setModalPago(true);
      await recargar();
      toast("Cobro individual creado");
    } catch (e) {
      toast("Error al crear cobro", "warn");
    }
    setValidando(null);
  };

  const validarPago = async () => {
    if (!pagoData.fecha || !pagoData.folio) {
      toast("Ingresa fecha y número de folio", "warn");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("fecha", pagoData.fecha);
      formData.append("folio", pagoData.folio);
      formData.append("metodo", pagoData.metodo);
      if (pagoData.boleta) {
        formData.append("boleta", pagoData.boleta);
      }

      await fetch(`/api/comunidades/${comunidadId}/cobros/validar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData
      });

      toast("Pago validado exitosamente");
      setModalPago(false);
      setIndividual({ unidad: "", fecha: new Date().toISOString().split("T")[0], motivo: "", monto: 0 });
    } catch (e) {
      toast("Error al validar pago", "warn");
    }
  };

  // Programar cobro automático día 28
  const programarAutomatico = async () => {
    try {
      await fetch(`/api/comunidades/${comunidadId}/cobros/auto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ dia: 28, monto: montoMes })
      });
      toast("Cobro automático programado para el día 28 de cada mes");
    } catch (e) {
      toast("Error al programar cobro automático", "warn");
    }
  };

  return (
    <div className="fade-swap space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-line">
        <button
          onClick={() => setTab("mensual")}
          className={`px-4 py-2 font-mono text-[11px] uppercase tracking-wide ${
            tab === "mensual" 
              ? "border-b-2 border-pine text-pine" 
              : "text-ink3 hover:text-ink"
          }`}
        >
          <Calendar size={14} className="inline mr-2" />
          Cobro Mensual Automático
        </button>
        <button
          onClick={() => setTab("individual")}
          className={`px-4 py-2 font-mono text-[11px] uppercase tracking-wide ${
            tab === "individual" 
              ? "border-b-2 border-pine text-pine" 
              : "text-ink3 hover:text-ink"
          }`}
        >
          <PlusCircle size={14} className="inline mr-2" />
          Cobro Individual
        </button>
      </div>

      {tab === "mensual" ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-card p-6">
            <h3 className="font-display text-xl font-bold text-ink">Generación automática mensual</h3>
            <p className="mt-1 text-[13px] text-ink2">
              Programa el cobro automático para el día 28 de cada mes anterior al periodo
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Periodo">
                <select className="field" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                  {[periodoActual()].map((p) => (
                    <option key={p} value={p}>{fmtMes(p)}</option>
                  ))}
                </select>
              </Field>

              <Field label="Monto mensual">
                <input
                  type="number"
                  className="field"
                  value={montoMes}
                  onChange={(e) => setMontoMes(Number(e.target.value))}
                />
              </Field>

              <Field label="Motivo" className="sm:col-span-2">
                <input
                  className="field"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Gastos comunes ordinarios"
                />
              </Field>
            </div>

            <div className="mt-5 flex gap-3">
              <Btn variant="primary" onClick={generarCobroMensual} disabled={generando}>
                {generando ? <Spinner /> : <><CreditCard size={15} /> Generar cobro ahora</>}
              </Btn>
              <Btn variant="neon" onClick={programarAutomatico}>
                Programar automático (día 28)
              </Btn>
            </div>
          </div>

          <div className="rounded-xl border border-pine/30 bg-pine/[0.04] p-5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-pine">
              ℹ️ Cómo funciona el cobro automático
            </p>
            <p className="mt-2 text-[13px] text-ink2">
              El sistema generará automáticamente los cobros el día 28 del mes anterior. 
              Por ejemplo, el 28 de marzo se generarán los cobros de abril.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-card p-6">
            <h3 className="font-display text-xl font-bold text-ink">Cobro individual a vecino</h3>
            <p className="mt-1 text-[13px] text-ink2">
              Crea un cobro específico para una unidad con fecha, motivo y monto personalizado
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Unidad">
                <input
                  className="field"
                  value={individual.unidad}
                  onChange={(e) => setIndividual({...individual, unidad: e.target.value})}
                  placeholder="Ej: A-101"
                />
              </Field>

              <Field label="Fecha">
                <input
                  type="date"
                  className="field"
                  value={individual.fecha}
                  onChange={(e) => setIndividual({...individual, fecha: e.target.value})}
                />
              </Field>

              <Field label="Motivo del cobro" className="sm:col-span-2">
                <input
                  className="field"
                  value={individual.motivo}
                  onChange={(e) => setIndividual({...individual, motivo: e.target.value})}
                  placeholder="Ej: Multa por ruido, Reposición de llave"
                />
              </Field>

              <Field label="Monto ($)" className="sm:col-span-2">
                <input
                  type="number"
                  className="field"
                  value={individual.monto}
                  onChange={(e) => setIndividual({...individual, monto: Number(e.target.value)})}
                  placeholder="Ej: 15000"
                />
              </Field>
            </div>

            <div className="mt-5">
              <Btn variant="neon" onClick={crearCobroIndividual} disabled={validando}>
                {validando ? <Spinner /> : <><PlusCircle size={15} /> Crear cobro individual</>}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal de validación de pago */}
      <Modal open={modalPago} onClose={() => setModalPago(false)} title="Validar pago">
        <div className="space-y-4">
          <Field label="Método de pago">
            <select
              className="field"
              value={pagoData.metodo}
              onChange={(e) => setPagoData({...pagoData, metodo: e.target.value})}
            >
              <option value="transferencia">Transferencia bancaria</option>
              <option value="contado">Efectivo / Contado</option>
              <option value="cheque">Cheque</option>
            </select>
          </Field>

          <Field label="Fecha de pago">
            <input
              type="date"
              className="field"
              value={pagoData.fecha}
              onChange={(e) => setPagoData({...pagoData, fecha: e.target.value})}
            />
          </Field>

          <Field label="Número de folio / Comprobante">
            <input
              className="field"
              value={pagoData.folio}
              onChange={(e) => setPagoData({...pagoData, folio: e.target.value})}
              placeholder="Ej: FOLIO-123456"
            />
          </Field>

          <Field label="Boleta (opcional)">
            <div className="rounded-lg border-2 border-dashed border-line p-3 text-center">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setPagoData({...pagoData, boleta: e.target.files?.[0] || null})}
                className="block w-full text-sm"
              />
              <p className="mt-1 text-[11px] text-ink3">Sube foto o PDF de la boleta</p>
            </div>
          </Field>

          <div className="flex justify-end gap-2.5 border-t border-line pt-4">
            <Btn variant="ghost" onClick={() => setModalPago(false)}>Cancelar</Btn>
            <Btn variant="primary" onClick={validarPago}>Validar pago</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

### 5.3 Backend - Endpoints de Cobro

En `backend/routers/api.py`, agregar:

```python
@router.post("/comunidades/{cid}/cobros/individual", dependencies=[Depends(require_roles(*GESTION))])
def crear_cobro_individual(cid: str, body: dict, db: Session = Depends(get_db), payload: dict = Depends(usuario_actual)):
    """Crear cobro individual para una unidad específica"""
    com = db.get(Comunidad, cid)
    if not com:
        raise HTTPException(404, "Comunidad no encontrada")
    
    cobro = Cobro(
        comunidad_id=cid,
        periodo=body["fecha"][:7],  # YYYY-MM
        unidad=body["unidad"],
        monto=body["monto"],
        motivo=body["motivo"],
        estado="PENDIENTE",
        tipo="EXTRAORDINARIO"
    )
    db.add(cobro)
    db.commit()
    return {"ok": True, "cobro_id": cobro.id}

@router.post("/comunidades/{cid}/cobros/auto", dependencies=[Depends(require_roles("ADMIN"))])
def programar_cobro_automatico(cid: str, body: dict, db: Session = Depends(get_db)):
    """Programar cobro automático para el día 28"""
    # Guardar configuración en tabla de ajustes
    ajuste = AjusteComunidad(
        comunidad_id=cid,
        clave="cobro_automatico_dia",
        valor=str(body.get("dia", 28))
    )
    db.merge(ajuste)
    db.commit()
    return {"ok": True}
```

---

## 📱 6. IMPLEMENTACIÓN PWA

### 6.1 manifest.json

Crear `/workspace/public/manifest.json`:

```json
{
  "name": "ComunApp - Gestión de Condominios",
  "short_name": "ComunApp",
  "description": "Aplicación para gestión de comunidades y condominios",
  "start_url": "/#/entrar",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5e9",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "utilities"],
  "lang": "es-CL"
}
```

### 6.2 Service Worker

Crear `/workspace/public/sw.js`:

```javascript
const CACHE_NAME = 'comunapp-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### 6.3 Registrar Service Worker

En `index.html`, agregar antes de `</body>`:

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registrado:', registration.scope);
        })
        .catch(error => {
          console.log('SW fallo:', error);
        });
    });
  }
</script>
```

### 6.4 Meta Tags PWA

En `index.html`, en `<head>`:

```html
<meta name="theme-color" content="#0ea5e9">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="ComunApp">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="manifest" href="/manifest.json">
```

### 6.5 vite.config.js

Actualizar configuración Vite:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'ComunApp - Gestión de Condominios',
        short_name: 'ComunApp',
        description: 'Aplicación para gestión de comunidades',
        theme_color: '#0ea5e9',
        start_url: '/#/entrar',
        display: 'standalone'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/comunapp\.up\.railway\.app\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 // 1 day
            }
          }
        }]
      }
    })
  ]
});
```

---

## 📦 7. MIGRACIONES DE BASE DE DATOS

Crear script de migración `/workspace/backend/migrations/add_documentos.py`:

```python
from sqlalchemy import text

def upgrade():
    commands = [
        """CREATE TABLE IF NOT EXISTS documentos_comunidad (
            id VARCHAR(16) PRIMARY KEY,
            comunidad_id VARCHAR(16) NOT NULL REFERENCES comunidades(id) ON DELETE CASCADE,
            tipo VARCHAR(50) NOT NULL,
            titulo VARCHAR(200) NOT NULL,
            descripcion TEXT DEFAULT '',
            url_archivo VARCHAR(500) NOT NULL,
            tipo_mime VARCHAR(50) NOT NULL,
            tamano_bytes INTEGER DEFAULT 0,
            version INTEGER DEFAULT 1,
            activo BOOLEAN DEFAULT TRUE,
            creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            creado_por_id VARCHAR(16) REFERENCES usuarios(id)
        )""",
        """CREATE INDEX idx_documentos_comunidad ON documentos_comunidad(comunidad_id)""",
        """CREATE INDEX idx_documentos_tipo ON documentos_comunidad(tipo)""",
        """ALTER TABLE votaciones ADD COLUMN IF NOT EXISTS inicio TIMESTAMP NULL""",
        """ALTER TABLE votaciones ADD COLUMN IF NOT EXISTS fin TIMESTAMP NULL"""
    ]
    
    for cmd in commands:
        execute(text(cmd))

def downgrade():
    execute(text("DROP TABLE IF EXISTS documentos_comunidad"))
    execute(text("ALTER TABLE votaciones DROP COLUMN IF EXISTS inicio"))
    execute(text("ALTER TABLE votaciones DROP COLUMN IF EXISTS fin"))
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Seguridad Crítica (PRIORIDAD ALTA)
- [ ] Eliminar credenciales hardcodeadas de `config.py` y `seed.py`
- [ ] Implementar validación de firmas en webhooks de Mercado Pago
- [ ] Agregar sanitización de HTML con `bleach`
- [ ] Restringir CORS a dominios específicos
- [ ] Rotar todas las contraseñas demo expuestas

### Fase 2: Módulo Participación
- [ ] Renombrar "Votaciones" a "Participación" en UI
- [ ] Agregar campo de periodo hábil en creación de votaciones
- [ ] Implementar validación de periodo en frontend y backend
- [ ] Actualizar textos y labels

### Fase 3: Gestión Documental
- [ ] Crear modelo `DocumentoComunidad` en backend
- [ ] Implementar endpoints CRUD de documentos
- [ ] Crear componente `ModuloDocumentos.tsx`
- [ ] Integrar en panel Participación
- [ ] Configurar almacenamiento de archivos (S3 o local)

### Fase 4: Panel Generar Cobro
- [ ] Crear nueva ruta de navegación "Generar cobro"
- [ ] Implementar cobro mensual automático (día 28)
- [ ] Implementar cobro individual con validación
- [ ] Agregar modal de validación de pagos
- [ ] Migrar lógica desde `ModuloPagosMes`

### Fase 5: PWA
- [ ] Crear `manifest.json`
- [ ] Implementar service worker
- [ ] Agregar meta tags en `index.html`
- [ ] Configurar plugin vite-plugin-pwa
- [ ] Generar iconos 192x192 y 512x512
- [ ] Testear instalación en móvil

### Fase 6: Testing y Deploy
- [ ] Ejecutar migraciones en base de datos
- [ ] Tests de seguridad (penetration testing básico)
- [ ] Tests de funcionalidad PWA
- [ ] Deploy a Railway
- [ ] Verificar HTTPS y certificados SSL

---

## 🔧 COMANDOS DE IMPLEMENTACIÓN

```bash
# 1. Instalar dependencias PWA
npm install vite-plugin-pwa workbox-window --save-dev

# 2. Crear migraciones
cd backend
alembic revision --autogenerate -m "Add documentos and votacion periods"
alembic upgrade head

# 3. Build y deploy
npm run build
# Subir a Railway

# 4. Variables de entorno en Railway
SUPERADMIN_EMAIL=admin@comunapp.cl
SUPERADMIN_PASS=<generar_seguro>
MP_WEBHOOK_SECRET=<secreto_mp>
DATABASE_URL=postgresql://...
ALLOWED_ORIGINS=https://comunapp.up.railway.app
```

---

## 📞 SOPORTE Y CONTACTO

Para dudas sobre esta implementación:
- Revisar documentación de cada sección
- Consultar issues en GitHub
- Contactar equipo de desarrollo

**Versión del documento:** 1.0  
**Fecha:** $(date +%Y-%m-%d)  
**Autor:** Equipo de Desarrollo ComunApp
