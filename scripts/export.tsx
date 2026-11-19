// npm run export [incident.json] [outDir]
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkIncident, sampleIncident, type Incident } from "../src/model";
import { exportHtml, exportPdf, exportPng } from "../src/server/exporters";
import { fontFiles } from "../src/theme";
import { emailSubject } from "../src/outputs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const force = process.argv.includes("--force");
const [file, outDir = "out"] = args;
const incident: Incident = file ? JSON.parse(await readFile(file, "utf8")) : sampleIncident;

const issues = checkIncident(incident);
for (const i of issues) console.log(`${i.level === "error" ? "ERROR" : "warn "}  ${i.field}: ${i.message}`);
const errors = issues.filter((i) => i.level === "error").length;
if (errors > 0 && !force) {
  console.error(`\n${errors} conflict(s) in the incident data. Fix them or pass --force to export anyway.`);
  process.exit(1);
}

await mkdir(resolve(outDir, "fonts"), { recursive: true });
for (const f of fontFiles) await copyFile(resolve("public/fonts", f.file), resolve(outDir, "fonts", f.file));

const page = await exportHtml("page", incident, ".");
const email = await exportHtml("email", incident, ".");
const pdf = await exportPdf(incident, ".");
const png = await exportPng(incident, ".");

await writeFile(resolve(outDir, "status-page.html"), page.html);
await writeFile(resolve(outDir, "stakeholder-email.html"), email.html);
await writeFile(resolve(outDir, "stakeholder-email.txt"), `Subject: ${emailSubject(incident)}\n\n${email.text}`);
await writeFile(resolve(outDir, "postmortem.pdf"), pdf.bytes);
await writeFile(resolve(outDir, "incident-summary.png"), png.bytes);
console.log(`\nWrote 5 files to ${outDir}/ for ${incident.id}: postmortem.pdf, status-page.html, stakeholder-email.html/.txt, incident-summary.png`);
