# Escalabilidad y planes de Railway

ComunApp es una aplicación de **gestión**, no de cómputo: las operaciones (pagos, cobros, avisos, reservas) son consultas ligeras a la base. Por eso la CPU y la RAM **no son el límite** en ninguno de los planes; el límite real es el consumo facturable y, más adelante, la base de datos.

## Consumo real por usuario

| Recurso | Consumo típico |
|---|---|
| CPU | ~0.1–0.5 vCPU con cientos de usuarios activos simultáneos |
| RAM | ~300–500 MB para el backend con miles de sesiones |
| Disco por comunidad/mes | ~2–5 KB (cobros, pagos, avisos y votos son filas diminutas) |

## Plan Gratuito (Trial — $5 de crédito)

El tope de hardware (48 vCPU / 48 GB) es un **límite**, no recursos garantizados: pagas por lo que usas y los $5 se agotan.

- Manteniendo un despliegue pequeño (2 servicios en tamaño mínimo 24/7), los $5 duran **entre 3 y 10 días**.
- En ese tiempo el hardware soportaría sin problema **~500–2.000 usuarios** y **~20–100 comunidades**.
- El almacenamiento (5 GB) **no** será el límite: equivale a ~1.000.000 de comunidad-mes.

> El plan gratuito es una prueba. Para mantenerlo en el tiempo usa **Hobby ($5/mes)**, con los mismos topes y un despliegue estable limitado por el consumo, no por hardware.

## Plan Pro

Los topes dejan de importar por completo:

| Métrica | Capacidad realista |
|---|---|
| Comunidades | Decenas de miles (10.000–50.000+) |
| Usuarios | Millones de registros |
| Almacenamiento | 1 TB ≈ cientos de millones de filas |

El límite real pasa a ser:
1. **La factura de consumo** (crece de forma muy gradual para este tipo de app).
2. **La base de datos en un solo nodo:** cómoda hasta ~1–5 millones de filas activas; más allá, se agregan réplicas de lectura o particionado.

## Recomendación por etapa

| Etapa | Plan | Soporta |
|---|---|---|
| Demo / primeros clientes (1–5 comunidades) | Free / Hobby | Sobra capacidad |
| Crecimiento (10–100 comunidades) | Hobby | Estable; vigilar el consumo |
| Tracción real (>100 comunidades, pagos MP en producción) | Pro | Escala sin tocar arquitectura |

## La arquitectura ya está lista para Pro

El diseño multi-tenant (aislamiento por `comunidad_id`, FastAPI asíncrono, índices en PostgreSQL) **escala a Pro sin reescribir nada**. Los únicos cambios al crecer:

- Agregar el plugin PostgreSQL de Railway con **réplicas de lectura**.
- Al llegar a miles de comunidades, considerar **separar la base** en un servicio dedicado.
- Poner un **CDN** delante del frontend (el build es estático, así que es trivial).

No hay cambios de código necesarios para pasar de Hobby a Pro: solo configuración de infraestructura.
