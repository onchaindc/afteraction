import { defineTheme } from "@hyper-elements/react";

// The brand, written once. Every Email, Page, Document and Canvas below takes this theme.
export const FONT = {
  serif: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  sans: "Inter, Arial, Helvetica, sans-serif",
  mono: "'IBM Plex Mono', 'Courier New', monospace",
};

export const theme = defineTheme({
  colors: {
    background: "#F6F1E8", // warm off-white
    foreground: "#17202C",
    primary: "#0F1B2D", // deep navy
    primaryForeground: "#F6F1E8",
    muted: "#5E6978",
    border: "#D8D0C2",
    accent: "#BF4A2F", // muted orange-red
    ok: "#2F6B5A",
  },
  fonts: { body: FONT.serif },
  fontSizes: { body: 16 },
  lineHeights: { body: 1.55 },
  elements: {
    Heading: {
      fontWeight: 700,
      color: "{colors.primary}",
      by: {
        level: {
          1: { fontSize: 36, lineHeight: 1.12, mobile: { fontSize: 28 } },
          2: { fontSize: 22, lineHeight: 1.25 },
          3: { fontSize: 16, lineHeight: 1.3 },
        },
      },
    },
    Button: {
      backgroundColor: "{colors.accent}",
      color: "#FFFFFF",
      borderRadius: 0,
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: 14,
      padding: "13px 24px",
    },
  },
  styles: {
    label: { fontFamily: FONT.sans, fontSize: 11, fontWeight: 600, letterSpacing: 1.6, textTransform: "uppercase", color: "{colors.muted}" },
    mono: { fontFamily: FONT.mono, fontSize: 13, color: "{colors.foreground}" },
    small: { fontSize: 13, lineHeight: 1.5, color: "{colors.muted}" },
    stat: { fontFamily: FONT.serif, fontSize: 40, fontWeight: 700, lineHeight: 1.05, color: "{colors.primary}" },
  },
});

export type FontFaceDef = { family: string; src: string; format: "woff"; weight: number; style?: "normal" | "italic" };
const files: [string, string, number, "normal" | "italic"][] = [
  ["Source Serif 4", "source-serif-4-latin-400-normal.woff", 400, "normal"],
  ["Source Serif 4", "source-serif-4-latin-400-italic.woff", 400, "italic"],
  ["Source Serif 4", "source-serif-4-latin-700-normal.woff", 700, "normal"],
  ["IBM Plex Mono", "ibm-plex-mono-latin-400-normal.woff", 400, "normal"],
  ["IBM Plex Mono", "ibm-plex-mono-latin-500-normal.woff", 500, "normal"],
  ["Inter", "inter-latin-500-normal.woff", 500, "normal"],
  ["Inter", "inter-latin-600-normal.woff", 600, "normal"],
];
export const fontFiles = files.map(([family, file, weight, style]) => ({ family, file, weight, style }));
/** Font faces for a design, pointing at the app's /fonts folder. `origin` is where that folder is served. */
export const fontFaces = (origin: string): FontFaceDef[] =>
  fontFiles.map((f) => ({ family: f.family, src: `${origin}/fonts/${f.file}`, format: "woff" as const, weight: f.weight, style: f.style }));
