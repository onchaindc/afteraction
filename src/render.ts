// Browser-side rendering: Hyper Elements' render() runs in the page, so previews are live with no server.
import { useDeferredValue, useEffect, useState } from "react";
import { render } from "@hyper-elements/react";
import { designFor, type FormatKey } from "./outputs";
import type { Incident } from "./model";

export type Diag = { severity: string; code: string; message: string };
export type Rendered = { html: string; text: string; diagnostics: Diag[]; ms: number } | { error: string };

export function useRendered(format: FormatKey, incident: Incident): Rendered | null {
  const deferred = useDeferredValue(incident);
  const [out, setOut] = useState<Rendered | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const t0 = performance.now();
      try {
        const r = await render(designFor(format, deferred, location.origin));
        if (live) setOut({ html: r.html, text: r.text ?? "", diagnostics: r.diagnostics as Diag[], ms: Math.round(performance.now() - t0) });
      } catch (e) {
        if (live) setOut({ error: e instanceof Error ? e.message : String(e) });
      }
    }, 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [format, deferred]);
  return out;
}

export async function exportBlob(kind: "pdf" | "png", incident: Incident, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`/api/export/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(incident), signal });
  if (!res.ok) {
    let msg = `Export failed (${res.status})`;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {
      /* not json */
    }
    throw new Error(msg);
  }
  return res.blob();
}

export function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
