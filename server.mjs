/**
 * Servidor estático de producción para ComunApp (frontend compilado).
 * Sirve la carpeta dist/ y hace fallback a index.html para las rutas SPA
 * (/dashboard, /adminapp, etc.). Lo usa Railway como startCommand.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "dist");
const port = process.env.PORT ? Number(process.env.PORT) : 4173;

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

    let file = join(root, path);
    let body;
    try {
      body = await readFile(file);
    } catch {
      // Fallback SPA: cualquier ruta desconocida sirve index.html
      body = await readFile(join(root, "index.html"));
      file = "index.html";
    }

    const ext = extname(file).toLowerCase();
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
