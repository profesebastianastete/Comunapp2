/* Resaltador de sintaxis ligero: python, typescript, prisma, bash, env */

const PY_RE =
  /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(@[\w.]+)|\b(def|class|return|if|elif|else|for|in|while|import|from|as|with|try|except|raise|finally|async|await|lambda|pass|not|and|or|is|None|True|False|self|yield|global|assert)\b|\b(str|int|float|bool|list|dict|set|tuple|Optional|datetime|Decimal|UUID)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_]\w*)(?=\()/g;

const TS_RE =
  /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|for|of|in|while|import|from|export|type|interface|extends|implements|new|async|await|throw|try|catch|class|default|switch|case|break|typeof|keyof|enum|public|private|readonly|static|as|satisfies)\b|\b(string|number|boolean|void|any|unknown|Promise|null|undefined|true|false)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\()/g;

const PRISMA_RE =
  /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|\b(model|enum|datasource|generator|type)\b|\b(String|Int|Boolean|DateTime|Float|Decimal|BigInt|Json|Bytes)\b|(@@[\w.]+|@[\w.]+)|\b(\d+)\b|([A-Z][A-Za-z0-9]*)(?=[\s{])/g;

const BASH_RE = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'[^']*')|(\s--?[\w-]+)|^(\$\s)|\b(pip|uvicorn|python|git|npm|docker|psql|curl|mkdir|cd|export|poetry|alembic|venv)\b/g;

const ENV_RE = /(#[^\n]*)|^([A-Z_][A-Z0-9_]*)?(=)?(.*)$/;

const RE_MAP: Record<string, RegExp> = { py: PY_RE, ts: TS_RE, prisma: PRISMA_RE, bash: BASH_RE };

function classFor(groupIdx: number, lang: string): string {
  // orden de grupos en los regex: 1 comentario, 2 string, 3 decorador/flag, 4 keyword, 5 tipo, 6 número, 7 función
  if (lang === "env") return groupIdx === 1 ? "tk-c" : groupIdx === 2 ? "tk-f" : groupIdx === 3 ? "tk-k" : "tk-s";
  if (lang === "bash") {
    return ["", "tk-c", "tk-s", "tk-d", "tk-n", "tk-k"][groupIdx] ?? "tk-f";
  }
  return ["", "tk-c", "tk-s", "tk-d", "tk-k", "tk-t", "tk-n", "tk-f"][groupIdx] ?? "";
}

function tokenizeLine(line: string, lang: string): { cls: string; text: string }[] {
  if (lang === "env") {
    const m = line.match(ENV_RE);
    if (!m) return [{ cls: "", text: line }];
    const out: { cls: string; text: string }[] = [];
    if (m[1]) out.push({ cls: "tk-c", text: m[1] });
    else {
      if (m[2]) out.push({ cls: "tk-f", text: m[2] });
      if (m[3]) out.push({ cls: "tk-k", text: m[3] });
      if (m[4]) out.push({ cls: "tk-s", text: m[4] });
    }
    return out.length ? out : [{ cls: "", text: line }];
  }
  const re = RE_MAP[lang];
  if (!re) return [{ cls: "", text: line }];
  re.lastIndex = 0;
  const out: { cls: string; text: string }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push({ cls: "", text: line.slice(last, m.index) });
    let cls = "";
    for (let g = 1; g < m.length; g++) {
      if (m[g] !== undefined) {
        cls = classFor(g, lang);
        break;
      }
    }
    out.push({ cls, text: m[0] });
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < line.length) out.push({ cls: "", text: line.slice(last) });
  return out.length ? out : [{ cls: "", text: line }];
}

export function Code({ code, lang, className = "" }: { code: string; lang: string; className?: string }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <pre className={"code-scroll overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.75] " + className}>
      {lines.map((ln, i) => (
        <div key={i} className="flex">
          <span className="w-8 shrink-0 select-none pr-3 text-right text-[10.5px] leading-[1.9] opacity-35">{i + 1}</span>
          <code className="whitespace-pre">
            {tokenizeLine(ln, lang).map((t, j) =>
              t.cls ? (
                <span key={j} className={t.cls}>
                  {t.text}
                </span>
              ) : (
                <span key={j}>{t.text}</span>
              ),
            )}
          </code>
        </div>
      ))}
    </pre>
  );
}
