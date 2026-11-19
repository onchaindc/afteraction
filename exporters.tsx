// Node-only exporters: real PDF and PNG from the same designs the browser previews.
// Used by the dev server (/api/export/*) and by `npm run export`.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { render } from "@hyper-elements/react";
import { renderPdf } from "@hyper-elements/react/pdf";
import { renderImage } from "@hyper-elements/react/image";
import { PostmortemDocument, SummaryCanvas, StakeholderEmail, StatusPage } from "../outputs";
import { fontFiles } from "../theme";
import type { Incident } from "../model";

const fontDir = resolve(process.cwd(), "public/fonts");
async function loadFonts() {
  return Promise.all(
    fontFiles.map(async (f) => ({ family: f.family, weight: f.weight, style: f.style, src: new Uint8Array(await readFile(resolve(fontDir, f.file))) })),
  );
}

export async function exportPdf(i: Incident, origin: string) {
  const { pdf, diagnostics } = await renderPdf(<PostmortemDocument i={i} origin={origin} />, { fonts: await loadFonts() });
  return { bytes: pdf, diagnostics };
}

export async function exportPng(i: Incident, origin: string) {
  const out: any = await renderImage(<SummaryCanvas i={i} origin={origin} />, { fonts: await loadFonts(), format: "png" } as never);
  return { bytes: (out.png ?? out.image ?? out.data ?? out) as Uint8Array, diagnostics: out.diagnostics ?? [] };
}

export async function exportHtml(kind: "page" | "email", i: Incident, origin: string) {
  const r = await render(kind === "page" ? <StatusPage i={i} origin={origin} /> : <StakeholderEmail i={i} />);
  return { html: r.html, text: r.text, diagnostics: r.diagnostics };
}
