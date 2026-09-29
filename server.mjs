/**
 * Servidor estático de producción para ComunApp (frontend compilado).
 * Sirve la carpeta dist/ y hace fallback a index.html SOLO para rutas de
 * navegación SPA (sin extensión: /dashboard, /adminapp, etc.).
 * Lo usa Railway como startCommand (dist/ se genera con `npm run build`
 * durante el build de despliegue; ver railway.toml).
 *
 * IMPORTANTE (bug histórico): nunca servir index.html como respuesta de
 * un asset faltante (/assets/*.js o *.css). El navegador rechaza ejecutar
 * un <script type="module"> cuyo Content-Type es text/html y muestra:
 * "La carga del módulo ... fue bloqueada debido a un tipo MIME
 * ('text/html') no permitido". Los assets inexistentes devuelven 404 real.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "dist");
const indexFile = join(root, "index.html");
const port = process.env.PORT ? Number(process.env.PORT) : 4173;

// Fail-fast: si alguien corre `node server.mjs` sin haber construido el
// frontend, el error debe ser claro (y visible en los logs de Railway),
// no un 500 silencioso por petición.
if (!existsSync(indexFile)) {
  console.error(
    "[server.mjs] No se encontró dist/index.html.\n" +
      "Ejecutá primero el build: `npm run build` (Railway lo hace solo vía buildCommand)."
  );
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]));
    if (path === "/" || path === "\\") path = "/index.html";

    const file = join(root, path);
    let body;
    let servedHtmlFallback = false;
    try {
      body = await readFile(file);
    } catch (err) {
      // Fallback SPA: SOLO rutas de navegación (sin extensión de archivo)
      // sirven index.html. Un asset con extensión inexistente debe dar 404,
      // nunca HTML (ver comentario del bug MIME arriba).
      const looksLikeAsset = extname(path) !== "";
      if (looksLikeAsset && err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("No encontrado");
        return;
      }
      try {
        body = await readFile(indexFile);
        servedHtmlFallback = true;
      } catch {
        // dist/index.html desapareció a mitad de vuelo (deploy interrumpido):
        // 503 explícito en vez de una respuesta disfrazada.
        res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Servicio en despliegue, reintentá en unos segundos");
        return;
      }
    }

    const ext = servedHtmlFallback ? ".html" : extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Error interno del servidor");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log("ComunApp (frontend) sirviendo en http://0.0.0.0:" + port);
});
