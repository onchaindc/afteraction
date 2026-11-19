import { copyFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "fonts");
mkdirSync(outDir, { recursive: true });

const packages = [
  { pkg: "@fontsource/source-serif-4", files: ["source-serif-4-latin-400-normal.woff", "source-serif-4-latin-400-italic.woff", "source-serif-4-latin-700-normal.woff"] },
  { pkg: "@fontsource/inter", files: ["inter-latin-500-normal.woff", "inter-latin-600-normal.woff"] },
  { pkg: "@fontsource/ibm-plex-mono", files: ["ibm-plex-mono-latin-400-normal.woff", "ibm-plex-mono-latin-500-normal.woff"] },
];

for (const { pkg, files } of packages) {
  let pkgRoot;
  try {
    pkgRoot = dirname(require.resolve(`${pkg}/package.json`));
  } catch {
    console.warn(`[copy-fonts] ${pkg} not installed yet; skip`);
    continue;
  }
  const filesDir = join(pkgRoot, "files");
  for (const file of files) {
    const src = join(filesDir, file);
    if (!existsSync(src)) {
      // some packages nest under latin/
      const alt = readdirSync(filesDir, { recursive: true }).map(String).find((f) => f.endsWith(file));
      if (!alt) {
        console.warn(`[copy-fonts] missing ${file}`);
        continue;
      }
      copyFileSync(join(filesDir, alt), join(outDir, file));
    } else {
      copyFileSync(src, join(outDir, file));
    }
  }
}
console.log("[copy-fonts] fonts ready in public/fonts");
