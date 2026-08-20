/* Resaltador de sintaxis mínimo (Prisma / TypeScript) → HTML con spans.
   Todo el código fuente proviene de data.ts (confiable), por lo que
   inyectar el HTML resaltado es seguro en este contexto. */

type Rule = { cls: string; re: string };

const RULES: Rule[] = [
  { cls: "tk-cmt", re: "\\/\\/[^\\n]*" },
  { cls: "tk-str", re: "\"(?:[^\"\\\\\\n]|\\\\.)*\"" },
  { cls: "tk-attr", re: "@@?[A-Za-z_][A-Za-z0-9_]*" },
  {
    cls: "tk-kw",
    re:
      "\\b(model|enum|generator|datasource|provider|type|const|let|var|export|import|from|" +
      "return|async|await|function|if|else|for|of|in|new|extends|interface|throw|switch|case|" +
      "default|true|false|null|undefined|this|void)\\b",
  },
  {
    cls: "tk-type",
    re:
      "\\b(String|Int|Boolean|Decimal|DateTime|Json|BigInt|Rol|Parcela|Usuario|MiembroParcela|" +
      "Unidad|Cobro|Pago|Movimiento|CuentaBancaria|FondoReserva|Aviso|Notificacion|AreaComun|" +
      "Reserva|Asamblea|Opcion|Voto|RegistroAcceso|NextRequest|NextResponse|Promise|Record|" +
      "Array|TenantContext|EstadoParcela|TipoCobro|EstadoCobro|MetodoPago|EstadoPago|" +
      "TipoMovimiento|PrioridadAviso|EstadoAsamblea|EstadoReserva|TipoVisitante|TreeNode)\\b",
  },
  { cls: "tk-num", re: "\\b\\d+(?:\\.\\d+)?\\b" },
];

const MASTER = new RegExp(
  RULES.map((r) => "(" + r.re + ")").join("|"),
  "g",
);

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function highlight(code: string): string {
  let out = "";
  let last = 0;
  MASTER.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MASTER.exec(code)) !== null) {
    out += escapeHtml(code.slice(last, m.index));
    let cls = "";
    for (let i = 0; i < RULES.length; i++) {
      if (m[i + 1] !== undefined) {
        cls = RULES[i].cls;
        break;
      }
    }
    out += '<span class="' + cls + '">' + escapeHtml(m[0]) + "</span>";
    last = m.index + m[0].length;
  }
  out += escapeHtml(code.slice(last));
  return out;
}
