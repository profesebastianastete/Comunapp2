/* ============================================================
   Generación de PDF (recibos e informes) con jsPDF.
   ============================================================ */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PINE: [number, number, number] = [12, 59, 46];
const NEON: [number, number, number] = [201, 242, 75];
const INK2: [number, number, number] = [62, 90, 78];
const INK3: [number, number, number] = [123, 145, 134];

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });

function cabecera(doc: jsPDF, titulo: string, sub: string) {
  doc.setFillColor(...PINE);
  doc.rect(0, 0, 210, 30, "F");
  doc.setFillColor(...NEON);
  doc.rect(0, 30, 210, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("ComunApp", 14, 13);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(titulo, 14, 21);
  doc.setFontSize(9);
  doc.setTextColor(201, 242, 75);
  doc.text(sub, 14, 26);
}

function pie(doc: jsPDF) {
  const y = 285;
  doc.setDrawColor(...INK3);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(14, y - 6, 196, y - 6);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(8);
  doc.setTextColor(...INK3);
  doc.text("Documento generado por ComunApp · " + new Date().toLocaleString("es-CL"), 14, y);
  doc.text("comunapp.cl", 196, y, { align: "right" });
}

/* ── Recibo de pago ── */
export interface ReciboData {
  comunidad: string;
  unidad: string;
  residente: string;
  concepto: string;
  monto: number;
  metodo: string;
  referencia: string;
  fecha: string;
  periodo?: string;
}

export function generarReciboPDF(r: ReciboData): jsPDF {
  const doc = new jsPDF();
  cabecera(doc, "Recibo de pago", r.comunidad);

  doc.setTextColor(...INK2);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const fila = (label: string, valor: string, y: number, bold = false) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(valor, 70, y);
  };

  let y = 45;
  fila("Comunidad:", r.comunidad, y); y += 8;
  fila("Unidad:", r.unidad, y); y += 8;
  fila("Titular:", r.residente, y); y += 8;
  if (r.periodo) { fila("Periodo:", r.periodo, y); y += 8; }
  fila("Concepto:", r.concepto, y); y += 8;
  fila("Método:", r.metodo, y); y += 8;
  fila("Referencia:", r.referencia, y); y += 8;
  fila("Fecha:", fechaLarga(r.fecha), y); y += 12;

  // Monto destacado
  doc.setFillColor(244, 248, 241);
  doc.roundedRect(14, y, 182, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK2);
  doc.text("TOTAL PAGADO", 22, y + 14);
  doc.setFontSize(18);
  doc.setTextColor(...PINE);
  doc.text(fmt(r.monto), 188, y + 14, { align: "right" });

  // Sello "PAGADO"
  doc.setTextColor(...NEON);
  doc.setDrawColor(...PINE);
  doc.setLineWidth(1.2);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("PAGADO", 105, y + 55, { align: "center", angle: 0 });

  pie(doc);
  return doc;
}

/* ── Informe de finanzas y transparencia ── */
export interface InformeData {
  comunidad: string;
  periodo: string;
  resumen: { ingresos: number; gastos: number; saldo: number; cobrado: number };
  movimientos: { fecha: string; tipo: string; categoria: string; descripcion: string; monto: number }[];
  cobros: { unidad: string; concepto: string; monto: number; estado: string }[];
}

export function generarInformePDF(d: InformeData): jsPDF {
  const doc = new jsPDF();
  cabecera(doc, "Informe de finanzas y transparencia", d.comunidad + " · " + d.periodo);

  // Tarjetas de resumen
  const cards: [string, string, [number, number, number]][] = [
    ["Ingresos", fmt(d.resumen.ingresos), [31, 125, 114]],
    ["Gastos", fmt(d.resumen.gastos), [201, 79, 56]],
    ["Recaudado", fmt(d.resumen.cobrado), PINE],
    ["Saldo", fmt(d.resumen.saldo), [62, 90, 78]],
  ];
  let x = 14;
  cards.forEach(([label, valor, color]) => {
    doc.setFillColor(244, 248, 241);
    doc.roundedRect(x, 40, 42, 20, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK3);
    doc.text(label.toUpperCase(), x + 3, 47);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(valor, x + 3, 55);
    x += 46;
  });

  // Tabla de movimientos
  autoTable(doc, {
    startY: 68,
    head: [["Fecha", "Tipo", "Categoría", "Descripción", "Monto"]],
    body: d.movimientos.map((m) => [
      fechaLarga(m.fecha),
      m.tipo === "INGRESO" ? "Ingreso" : "Gasto",
      m.categoria,
      m.descripcion,
      fmt(m.monto),
    ]),
    theme: "grid",
    headStyles: { fillColor: PINE, textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 8, textColor: INK2 },
    columnStyles: { 4: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  // Tabla de cobros del periodo
  const yCobros = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PINE);
  doc.text("Estado de cobros del periodo", 14, yCobros);
  autoTable(doc, {
    startY: yCobros + 4,
    head: [["Unidad", "Concepto", "Monto", "Estado"]],
    body: d.cobros.map((c) => [
      c.unidad,
      c.concepto,
      fmt(c.monto),
      c.estado === "PAGADO" ? "Pagado" : c.estado === "VENCIDO" ? "Vencido" : "Pendiente",
    ]),
    theme: "striped",
    headStyles: { fillColor: [31, 125, 114], textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 8, textColor: INK2 },
    columnStyles: { 2: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  pie(doc);
  return doc;
}
