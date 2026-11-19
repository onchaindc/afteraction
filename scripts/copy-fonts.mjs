// Copies the three font families from their @fontsource packages into public/fonts.
// Runs after `npm install`, so the repository itself holds no binary font files.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const files = [
  ["source-serif-4", "source-serif-4-latin-400-normal.woff"],
  ["source-serif-4", "source-serif-4-latin-400-italic.woff"],
  ["source-serif-4", "source-serif-4-latin-700-normal.woff"],
  ["ibm-plex-mono", "ibm-plex-mono-latin-400-normal.woff"],
  ["ibm-plex-mono", "ibm-plex-mono-latin-500-normal.woff"],
  ["inter", "inter-latin-500-normal.woff"],
  ["inter", "inter-latin-600-normal.woff"],
];
const out = resolve("public/fonts");
mkdirSync(out, { recursive: true });
let copied = 0;
for (const [pkg, file] of files) {
  const from = resolve("node_modules/@fontsource", pkg, "files", file);
  if (!existsSync(from)) {
    console.error(`copy-fonts: missing ${from}. Run npm install first.`);
    process.exit(1);
  }
  copyFileSync(from, resolve(out, file));
  copied++;
}
console.log(`copy-fonts: ${copied} font files ready in public/fonts`);
