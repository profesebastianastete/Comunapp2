# Actualización ComunApp - Mejoras de Seguridad y Funcionalidad

## Resumen de Cambios

Esta actualización incluye mejoras críticas de seguridad y nuevas funcionalidades solicitadas por los usuarios.

---

## 🔐 Mejoras de Seguridad (CRÍTICAS)

### 1. Eliminación de Credenciales Hardcodeadas
- **Archivo**: `backend/.env.example`
- **Cambio**: Eliminar cualquier credencial de ejemplo del código
- **Acción requerida**: Configurar variables de entorno en Railway

### 2. Validación de Firmas en Webhooks
- **Archivo**: `backend/routers/mp.py`
- **Cambio**: Implementar validación de firma de Mercado Pago
- **Estado**: Pendiente de implementación

### 3. Sanitización de HTML
- **Archivos afectados**: Todos los componentes que renderizan contenido HTML
- **Cambio**: Implementar sanitización antes de renderizar

### 4. Restricción CORS
- **Archivo**: `backend/main.py`
- **Cambio**: Configurar orígenes permitidos específicos

---

## 🎯 Cambios de Funcionalidad

### 1. Renombramiento: "Votaciones" → "Participación"

**Archivos modificados:**
- `src/components/Dashboard.tsx`
- `src/components/Landing.tsx`
- `src/components/Entrar.tsx`

**Cambios realizados:**
- Todas las referencias a "Votaciones" cambiadas a "Participación"
- Icono mantenido (Vote de lucide-react)
- Funcionalidad idéntica, solo cambio de etiqueta

---

### 2. Gestión Documental en Panel "Participación"

**Nuevos endpoints backend (`backend/routers/api.py`):**
```python
POST /api/comunidades/{cid}/documentos       # Subir documento
GET  /api/comunidades/{cid}/documentos       # Listar documentos
DELETE /api/comunidades/{cid}/documentos/{did}  # Eliminar documento
```

**Tipos de documentos soportados:**
- Estatutos (PDF)
- Reglamento (PDF)
- Actas (PDF o Imagen: JPG, PNG)

**Modelo existente:** `DocumentoComunidad` (ya definido en `backend/models.py`)

**Frontend (`src/components/Dashboard.tsx`):**
- Nueva sección "Documentos" dentro del módulo "Participación"
- Drag & drop para subida de archivos
- Visualización de documentos publicados
- Solo roles ADMIN y COMITE pueden subir documentos

---

### 3. Periodo Hábil de Votación

**Modelo actualizado:** `Votacion` en `backend/models.py`
- Campos existentes: `inicio` (datetime), `fin` (datetime)
- Ya están definidos en el modelo

**Backend (`backend/routers/api.py`):**
- Actualizado `VotacionIn` para incluir `inicio` y `fin` opcionales
- Validación: solo se puede votar si `inicio <= now <= fin`

**Frontend (`src/components/Dashboard.tsx`):**
- Formulario de creación de votación incluye:
  - Fecha/hora de inicio
  - Fecha/hora de fin
  - Indicador visual de periodo hábil activo

---

### 4. Nuevo Panel "Generar Cobro"

**Separación de funcionalidades:**

**Panel "Pagos del Mes" (existente):**
- Solo visualización de cobros del mes
- KPIs y estadísticas
- Lista de pagos pendientes/pagados

**Nuevo Panel "Generar Cobro":**
- **Cobro mensual automático**: Programado para día 28 de cada mes
- **Cobro individual a vecino**:
  - Selector de unidad/vecino
  - Campo: fecha de vencimiento
  - Campo: motivo de cobro
  - Campo: monto ($)
  - Botón "Generar cobro"

**Validación de Pago (ventana emergente):**
- Método de pago: Transferencia / Contado
- Campos obligatorios:
  - Fecha de pago
  - Número de folio / referencia
- Campo opcional:
  - Subir boleta (imagen o PDF)

---

### 5. PWA (Progressive Web App)

**Archivos creados:**
- `public/manifest.json`
- `public/sw.js` (Service Worker)
- Actualización de `index.html` con links al manifest

**Configuración PWA:**
- Nombre: ComunApp
- Short name: ComunApp
- Start URL: `/#/entrar`
- Display: standalone
- Theme color: #00ff9d (neon)
- Background color: #0b0f19 (deep)

**Iconos requeridos:**
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

---

## 📋 Archivos Modificados/Creados

### Backend
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `backend/routers/api.py` | Modificado | Endpoints para documentos, votación con periodo, cobro individual |
| `backend/models.py` | Sin cambios | Modelo DocumentoComunidad ya existe |
| `backend/serializers.py` | Modificado | Serializador para documentos |
| `backend/main.py` | Modificado | Configuración CORS restringida |

### Frontend
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `src/components/Dashboard.tsx` | Modificado | "Votaciones" → "Participación", gestión documental, periodo hábil |
| `src/components/DashAdmin.tsx` | Modificado | Nuevo panel "Generar Cobro", validación de pago |
| `src/components/Landing.tsx` | Modificado | Texto "Votaciones" → "Participación" |
| `src/components/Entrar.tsx` | Modificado | Texto "votaciones" → "participación" |
| `src/lib/store.ts` | Modificado | Tipos y funciones para documentos |
| `src/lib/api.ts` | Modificado | Calls a API para documentos |

### PWA
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `public/manifest.json` | Creado | Manifiesto PWA |
| `public/sw.js` | Creado | Service Worker |
| `public/icons/` | Directorio | Iconos de la app |

### Migraciones
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `backend/migrate_documentos.py` | Creado | Migración para asegurar tabla documentos |

---

## 🚀 Instrucciones de Despliegue

### 1. Preparar Base de Datos
```bash
cd backend
python migrate_documentos.py
```

### 2. Configurar Variables de Entorno (Railway)
```bash
# Variables requeridas
DATABASE_URL=postgresql://...
MAIL_USER=...
MAIL_PASSWORD=...
MP_ACCESS_TOKEN_PLATFORM=...
MP_PUBLIC_KEY_PLATFORM=...
CORS_ORIGINS=https://comunapp.up.railway.app
```

### 3. Desplegar Backend
```bash
# Railway detecta automáticamente railway.toml
git push origin main
```

### 4. Desplegar Frontend
```bash
npm run build
# El build se despliega automáticamente en Railway
```

### 5. Verificar PWA
1. Abrir https://comunapp.up.railway.app/#/entrar
2. En Chrome: ícono de instalar en barra de URL
3. En móvil: "Agregar a pantalla de inicio"

---

## ✅ Checklist de Verificación

- [ ] Credenciales hardcodeadas eliminadas
- [ ] Validación de firmas en webhooks implementada
- [ ] CORS configurado con orígenes específicos
- [ ] "Votaciones" renombrado a "Participación" en toda la UI
- [ ] Subida de documentos funcional (Estatutos, Reglamento, Actas)
- [ ] Documentos visibles en panel "Participación"
- [ ] Periodo hábil de votación implementado
- [ ] Panel "Generar Cobro" separado de "Pagos del Mes"
- [ ] Cobro individual a vecino funcional
- [ ] Validación de pago con ventana emergente
- [ ] PWA instalable desde navegador
- [ ] Pruebas en móvil realizadas

---

## 📞 Soporte

Para problemas con esta actualización:
1. Revisar logs en Railway Dashboard
2. Verificar variables de entorno
3. Ejecutar migraciones pendientes
4. Contactar al equipo de desarrollo
