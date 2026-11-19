import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderPdf } from "@hyper-elements/react/pdf";
import { renderImage } from "@hyper-elements/react/image";
import { PostmortemDocument, SummaryCanvas } from "../outputs";
import { fontFiles } from "../theme";
import type { Incident } from "../model";

const fontsDir = join(process.cwd(), "public", "fonts");

function loadFonts() {
  return fontFiles.map((f) => ({
    family: f.family,
    src: readFileSync(join(fontsDir, f.file)),
    weight: f.weight,
    style: f.style,
  }));
}

export async function exportPdf(incident: Incident, origin: string) {
  const fonts = loadFonts();
  const { pdf, diagnostics } = await renderPdf(<PostmortemDocument incident={incident} origin={origin} />, { fonts });
  return { bytes: pdf, diagnostics };
}

export async function exportPng(incident: Incident, origin: string) {
  const fonts = loadFonts();
  const { image, diagnostics } = await renderImage(<SummaryCanvas incident={incident} origin={origin} />, {
    fonts,
    format: "png",
  });
  return { bytes: image, diagnostics };
}
