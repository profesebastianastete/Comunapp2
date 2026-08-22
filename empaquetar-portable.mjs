#!/usr/bin/env node
/**
 * ComunApp — Empaquetador a un solo archivo
 * -----------------------------------------
 * Toma el resultado del build (carpeta dist/) y genera un único archivo
 * "ComunApp-portable.html" con todo el CSS y el JavaScript incrustados,
 * listo para abrir con doble clic en cualquier navegador o subir a
 * cualquier hosting estático.
 *
 * Uso:
 *   1) npm run build
 *   2) node empaquetar-portable.mjs
 *   3) abre ComunApp-portable.html
 *
 * Nota: las tipografías se cargan desde Google Fonts; sin internet la app
 * funciona igual, con letras de respaldo del sistema.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(fileURLToPath(import.meta.url));
const dist = join(raiz, "dist");
const entrada = join(dist, "index.html");

if (!existsSync(entrada)) {
  console.error("✗ No se encontró dist/index.html.");
  console.error("  Ejecuta primero:  npm run build");
  process.exit(1);
}

let html = readFileSync(entrada, "utf8");
let cssSum = 0;
let jsSum = 0;

// 1) Incrustar hojas de estilo -------------------------------------------
for (const m of [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]) {
  const tag = m[0];
  const href = tag.match(/href="([^"]+)"/)?.[1];
  if (!href || /^https?:/.test(href)) continue;
  const ruta = join(dist, href.replace(/^\//, ""));
  if (!existsSync(ruta)) continue;
  const css = readFileSync(ruta, "utf8");
  cssSum += css.length;
  html = html.replace(tag, "<style>" + css + "</style>");
  console.log("  + CSS incrustado:", href);
}

// 2) Quitar precargas de módulos (ya van incrustados) ---------------------
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, "");

// 3) Incrustar los scripts -----------------------------------------------
for (const m of [...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*>\s*<\/script>/g)]) {
  const [tag, src] = m;
  if (/^https?:/.test(src)) continue;
  const ruta = join(dist, src.replace(/^\//, ""));
  if (!existsSync(ruta)) continue;
  let js = readFileSync(ruta, "utf8");
  // Evitar que un "</script>" dentro del bundle cierre la etiqueta antes de tiempo
  js = js.split("</" + "script>").join("<\\/" + "script>");
  jsSum += js.length;
  html = html.replace(tag, '<script type="module">' + js + "</" + "script>");
  console.log("  + JS incrustado: ", src);
}

const salida = join(raiz, "ComunApp-portable.html");
writeFileSync(salida, html, "utf8");

const kb = (n) => (n / 1024).toFixed(0);
console.log("");
console.log("✓ Listo: ComunApp-portable.html");
console.log("  Tamaño total: " + kb(html.length) + " KB  (CSS " + kb(cssSum) + " KB · JS " + kb(jsSum) + " KB)");
console.log("  Ábrelo con doble clic o súbelo a cualquier hosting estático.");
