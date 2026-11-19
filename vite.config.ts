import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const heVersion: string = JSON.parse(readFileSync("node_modules/@hyper-elements/react/package.json", "utf8")).version;

// A tiny local endpoint so the app can hand you a REAL PDF and PNG. PDF and image output use Node-only
// libraries (react-pdf, resvg), so they run in the dev server process, not in the browser. Nothing leaves your machine.
function exportApi(): Plugin {
  return {
    name: "afteraction-export",
    configureServer(server) {
      server.middlewares.use("/api/export", async (req, res) => {
        const send = (status: number, type: string, body: string | Buffer) => {
          res.statusCode = status;
          res.setHeader("Content-Type", type);
          res.end(body);
        };
        if (req.method !== "POST") return send(405, "text/plain", "POST only");
        const kind = (req.url ?? "").replace(/^\//, "").split("?")[0];
        try {
          let raw = "";
          for await (const chunk of req) raw += chunk;
          const incident = JSON.parse(raw);
          const origin = `http://${req.headers.host}`;
          const mod = await server.ssrLoadModule("/src/server/exporters.tsx");
          if (kind === "pdf") return send(200, "application/pdf", Buffer.from((await mod.exportPdf(incident, origin)).bytes));
          if (kind === "png") return send(200, "image/png", Buffer.from((await mod.exportPng(incident, origin)).bytes));
          return send(404, "application/json", JSON.stringify({ error: `Unknown export "${kind}"` }));
        } catch (e) {
          server.config.logger.error(String(e));
          return send(500, "application/json", JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), exportApi()],
  define: { __HE_VERSION__: JSON.stringify(heVersion) },
  server: { host: "127.0.0.1" },
});
