import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Incident, Issue, EventKind, ActionKind, ActionStatus, Severity, Status, actionKindLabel, actionStatusLabel, checkIncident, derive,
  fmtDuration, kindLabel, minutesBetween, sampleIncident, statusLabel, uid,
} from "./model";
import { FORMATS, emailSubject, type FormatKey } from "./outputs";
import { download, exportBlob, useRendered } from "./render";

const STORE = "afteraction.incident.v1";

function load(): Incident {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const v = JSON.parse(raw);
      if (v && Array.isArray(v.timeline) && Array.isArray(v.actions) && v.impact) return v;
    }
  } catch {
    /* fall through to the sample */
  }
  return structuredClone(sampleIncident);
}

function setIn<T>(obj: T, path: string, value: unknown): T {
  const next = structuredClone(obj) as Record<string, unknown>;
  const parts = path.split(".");
  let cur: Record<string, unknown> = next;
  for (let k = 0; k < parts.length - 1; k++) cur = cur[parts[k]] as Record<string, unknown>;
  cur[parts[parts.length - 1]] = value;
  return next as T;
}

const idOf = (path: string) => `f-${path.replace(/\./g, "-")}`;

// ---------------------------------------------------------------- field primitives
type Ctx = { inc: Incident; set: (path: string, v: unknown) => void; issues: Issue[] };

function Notes({ issues, field }: { issues: Issue[]; field: string }) {
  const here = issues.filter((i) => i.field === field);
  return (
    <>
      {here.map((i, n) => (
        <p key={n} className={`note ${i.level}`} role={i.level === "error" ? "alert" : undefined}>
          {i.message}
        </p>
      ))}
    </>
  );
}
const flag = (issues: Issue[], field: string) => (issues.some((i) => i.field === field) ? (issues.some((i) => i.field === field && i.level === "error") ? " bad" : " odd") : "");

function Field({ label, path, ctx, children, wide }: { label: string; path: string; ctx: Ctx; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`field${wide ? " wide" : ""}${flag(ctx.issues, path)}`}>
      <label htmlFor={idOf(path)}>{label}</label>
      {children}
      <Notes issues={ctx.issues} field={path} />
    </div>
  );
}

const get = (obj: unknown, path: string): any => path.split(".").reduce((o: any, k) => (o == null ? o : o[k]), obj);

function Text({ label, path, ctx, wide, type = "text" }: { label: string; path: string; ctx: Ctx; wide?: boolean; type?: string }) {
  return (
    <Field label={label} path={path} ctx={ctx} wide={wide}>
      <input id={idOf(path)} type={type} value={get(ctx.inc, path) ?? ""} onChange={(e) => ctx.set(path, e.target.value)} />
    </Field>
  );
}

function Area({ label, path, ctx, rows = 3 }: { label: string; path: string; ctx: Ctx; rows?: number }) {
  return (
    <Field label={label} path={path} ctx={ctx} wide>
      <textarea id={idOf(path)} rows={rows} value={get(ctx.inc, path) ?? ""} onChange={(e) => ctx.set(path, e.target.value)} />
    </Field>
  );
}

function Num({ label, path, ctx, suffix }: { label: string; path: string; ctx: Ctx; suffix?: string }) {
  return (
    <Field label={label} path={path} ctx={ctx}>
      <div className="with-suffix">
        <input id={idOf(path)} type="number" inputMode="decimal" value={Number.isFinite(get(ctx.inc, path)) ? get(ctx.inc, path) : ""} onChange={(e) => ctx.set(path, e.target.value === "" ? 0 : Number(e.target.value))} />
        {suffix ? <span>{suffix}</span> : null}
      </div>
    </Field>
  );
}

function Pick<T extends string>({ label, path, ctx, options }: { label: string; path: string; ctx: Ctx; options: Record<T, string> }) {
  return (
    <Field label={label} path={path} ctx={ctx}>
      <select id={idOf(path)} value={get(ctx.inc, path)} onChange={(e) => ctx.set(path, e.target.value)}>
        {(Object.keys(options) as T[]).map((k) => (
          <option key={k} value={k}>
            {options[k]}
          </option>
        ))}
      </select>
    </Field>
  );
}

const toLocal = (iso: string) => (Number.isFinite(Date.parse(iso)) ? new Date(iso).toISOString().slice(0, 16) : "");
function When({ label, path, ctx }: { label: string; path: string; ctx: Ctx }) {
  return (
    <Field label={label} path={path} ctx={ctx}>
      <input id={idOf(path)} type="datetime-local" step={60} value={toLocal(get(ctx.inc, path))} onChange={(e) => ctx.set(path, e.target.value ? `${e.target.value}:00Z` : "")} />
    </Field>
  );
}

function Services({ ctx }: { ctx: Ctx }) {
  const [text, setText] = useState(ctx.inc.services.join(", "));
  useEffect(() => setText(ctx.inc.services.join(", ")), [ctx.inc.services.join("|")]);
  return (
    <Field label="Affected services (comma separated)" path="services" ctx={ctx} wide>
      <input
        id={idOf("services")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => ctx.set("services", text.split(",").map((s) => s.trim()).filter(Boolean))}
      />
    </Field>
  );
}

function Section({ n, title, hint, children }: { n: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="block">
      <h2>
        <span className="num">{n}</span>
        {title}
      </h2>
      {hint ? <p className="hint">{hint}</p> : null}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- checks
function Checks({ issues, onDemo, onReset }: { issues: Issue[]; onDemo: () => void; onReset: () => void }) {
  const errors = issues.filter((i) => i.level === "error").length;
  const warns = issues.length - errors;
  const jump = (field: string) => {
    const el = document.getElementById(idOf(field)) ?? document.getElementById(idOf(field.split(".").slice(0, 1).join(".")));
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    (el as HTMLElement | null)?.focus?.({ preventScroll: true });
  };
  return (
    <section className={`block checks ${errors ? "has-errors" : warns ? "has-warns" : "clean"}`} aria-live="polite">
      <h2>
        <span className="num">{errors ? "!" : warns ? "?" : "✓"}</span>Consistency
      </h2>
      {issues.length === 0 ? (
        <p className="all-clear">Dates, durations and details agree across every output.</p>
      ) : (
        <>
          <p className="tally">
            {errors > 0 ? `${errors} conflict${errors > 1 ? "s" : ""}` : null}
            {errors > 0 && warns > 0 ? " · " : null}
            {warns > 0 ? `${warns} to review` : null}
          </p>
          <ul>
            {issues.map((i, n) => (
              <li key={n} className={i.level}>
                <button type="button" onClick={() => jump(i.field)}>
                  <span className="dot" aria-hidden>{i.level === "error" ? "●" : "○"}</span>
                  {i.message}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="demo">
        <button type="button" className="link" onClick={onDemo}>Break a date to see a conflict flagged</button>
        <span aria-hidden> · </span>
        <button type="button" className="link" onClick={onReset}>Restore sample</button>
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- the editor
function Editor({ ctx, issues, setInc, onDemo, onReset }: { ctx: Ctx; issues: Issue[]; setInc: (f: (p: Incident) => Incident) => void; onDemo: () => void; onReset: () => void }) {
  const { inc } = ctx;
  const d = derive(inc);
  const computed = minutesBetween(inc.startedAt, inc.resolvedAt);
  const mismatch = Number.isFinite(computed) && Math.abs(computed - inc.impact.durationMinutes) > 1;

  const addEvent = () =>
    setInc((p) => ({ ...p, timeline: [...p.timeline, { id: uid(), at: p.resolvedAt, kind: "update" as EventKind, text: "" }] }));
  const sortEvents = () =>
    setInc((p) => ({ ...p, timeline: [...p.timeline].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)) }));
  const addAction = () =>
    setInc((p) => ({ ...p, actions: [...p.actions, { id: uid(), title: "", kind: "prevent" as ActionKind, owner: "", due: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), status: "open" as ActionStatus }] }));

  return (
    <div className="editor-inner">
      <Checks issues={issues} onDemo={onDemo} onReset={onReset} />

      <Section n="01" title="Incident">
        <div className="grid">
          <Text label="Incident ID" path="id" ctx={ctx} />
          <Text label="Organisation" path="org" ctx={ctx} />
          <Text label="Title" path="title" ctx={ctx} wide />
          <Pick<Severity> label="Severity" path="severity" ctx={ctx} options={{ SEV1: "SEV1 · critical", SEV2: "SEV2 · major", SEV3: "SEV3 · minor" }} />
          <Pick<Status> label="Status" path="status" ctx={ctx} options={statusLabel} />
          <Text label="Incident commander" path="commander" ctx={ctx} />
          <Text label="Contact email" path="contactEmail" ctx={ctx} type="email" />
          <Text label="Public status URL" path="statusUrl" ctx={ctx} wide type="url" />
        </div>
      </Section>

      <Section n="02" title="Key times" hint="All times are UTC to the minute.">
        <div className="grid">
          <When label="Impact started" path="startedAt" ctx={ctx} />
          <When label="Detected" path="detectedAt" ctx={ctx} />
          <When label="Mitigated" path="mitigatedAt" ctx={ctx} />
          <When label="Resolved" path="resolvedAt" ctx={ctx} />
        </div>
        <p className="derived">
          Detect <b>{fmtDuration(d.ttd)}</b> · Mitigate <b>{fmtDuration(d.ttm)}</b> · Resolve <b>{fmtDuration(d.ttr)}</b>
        </p>
      </Section>

      <Section n="03" title="Impact">
        <div className="grid">
          <Num label="Customers affected" path="impact.usersAffected" ctx={ctx} />
          <Num label="Traffic affected" path="impact.percentOfTraffic" ctx={ctx} suffix="%" />
          <Num label="Stated duration" path="impact.durationMinutes" ctx={ctx} suffix="min" />
          <div className="field">
            <label>Computed from times</label>
            <div className="computed">
              {Number.isFinite(computed) ? `${computed} min · ${fmtDuration(computed)}` : "n/a"}
              {mismatch ? (
                <button type="button" className="link" onClick={() => ctx.set("impact.durationMinutes", computed)}>
                  Use this
                </button>
              ) : null}
            </div>
          </div>
          <Services ctx={ctx} />
          <Area label="Who felt it, and how" path="impact.description" ctx={ctx} />
        </div>
      </Section>

      <Section n="04" title="Narrative">
        <div className="grid">
          <Area label="Summary" path="summary" ctx={ctx} rows={4} />
          <Area label="Trigger" path="trigger" ctx={ctx} rows={2} />
          <Area label="Root cause" path="rootCause" ctx={ctx} rows={4} />
          <Area label="How it was detected" path="detection" ctx={ctx} rows={3} />
        </div>
      </Section>

      <Section n="05" title="Timeline">
        <Notes issues={issues} field="timeline" />
        <ol className="rows">
          {inc.timeline.map((e, n) => (
            <li key={e.id} className="row">
              <div className="grid tight">
                <When label="Time (UTC)" path={`timeline.${n}.at`} ctx={ctx} />
                <Pick<EventKind> label="Type" path={`timeline.${n}.kind`} ctx={ctx} options={kindLabel} />
                <Area label="Event" path={`timeline.${n}.text`} ctx={ctx} rows={2} />
              </div>
              <button type="button" className="remove" aria-label={`Remove event ${n + 1}`} onClick={() => setInc((p) => ({ ...p, timeline: p.timeline.filter((x) => x.id !== e.id) }))}>
                Remove
              </button>
            </li>
          ))}
        </ol>
        <div className="row-actions">
          <button type="button" className="btn" onClick={addEvent}>Add event</button>
          <button type="button" className="btn" onClick={sortEvents}>Sort by time</button>
        </div>
      </Section>

      <Section n="06" title="Corrective actions">
        <Notes issues={issues} field="actions" />
        <ol className="rows">
          {inc.actions.map((a, n) => (
            <li key={a.id} className="row">
              <div className="grid tight">
                <Text label="Action" path={`actions.${n}.title`} ctx={ctx} wide />
                <Pick<ActionKind> label="Type" path={`actions.${n}.kind`} ctx={ctx} options={actionKindLabel} />
                <Pick<ActionStatus> label="Status" path={`actions.${n}.status`} ctx={ctx} options={actionStatusLabel} />
                <Text label="Owner" path={`actions.${n}.owner`} ctx={ctx} />
                <Text label="Due" path={`actions.${n}.due`} ctx={ctx} type="date" />
              </div>
              <button type="button" className="remove" aria-label={`Remove action ${n + 1}`} onClick={() => setInc((p) => ({ ...p, actions: p.actions.filter((x) => x.id !== a.id) }))}>
                Remove
              </button>
            </li>
          ))}
        </ol>
        <div className="row-actions">
          <button type="button" className="btn" onClick={addAction}>Add action</button>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- the stage (previews)
function VisualPreview({ inc, onError }: { inc: Incident; onError: (m: string | null) => void }) {
  const deferred = useDeferredValue(inc);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    setBusy(true);
    const t = setTimeout(async () => {
      const t0 = performance.now();
      try {
        const blob = await exportBlob("png", deferred, ctl.signal);
        const next = URL.createObjectURL(blob);
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return next;
        });
        setMs(Math.round(performance.now() - t0));
        onError(null);
        setBusy(false);
      } catch (e) {
        if (ctl.signal.aborted) return;
        onError(e instanceof Error ? e.message : String(e));
        setBusy(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [deferred]);
  return (
    <div className="visual">
      {url ? <img src={url} alt="Visual incident summary, 1600 by 900 pixels" className={busy ? "stale" : ""} /> : <p className="loading">Rendering image…</p>}
      {busy && url ? <p className="loading over">Updating…</p> : null}
      <p className="caption">1600 × 900 PNG, drawn by renderImage(){ms != null ? ` in ${ms} ms` : ""}.</p>
    </div>
  );
}

function Stage({ inc, errors }: { inc: Incident; errors: number }) {
  const [format, setFormat] = useState<FormatKey>("pdf");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [emailView, setEmailView] = useState<"html" | "text">("html");
  const [busy, setBusy] = useState<string | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const [paneW, setPaneW] = useState(900);
  useEffect(() => {
    const el = pane.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPaneW(el.clientWidth));
    ro.observe(el);
    setPaneW(el.clientWidth);
    return () => ro.disconnect();
  }, [format]);
  const SHEET = 880; // the print layout is a fixed page width: scale it down to fit narrow panes
  const scale = format === "pdf" ? Math.min(1, (paneW - 8) / SHEET) : 1;
  const rendered = useRendered(format === "visual" ? "page" : format, inc);
  const html = rendered && "html" in rendered ? rendered : null;
  const slug = inc.id.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const doExport = async (kind: "pdf" | "png") => {
    setBusy(kind);
    setExportErr(null);
    try {
      download(kind === "pdf" ? `${slug}-postmortem.pdf` : `${slug}-summary.png`, await exportBlob(kind, inc));
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const copyHtml = async () => {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setExportErr("Copy was blocked by the browser. Use Download HTML instead.");
    }
  };
  const saveHtml = (name: string) => html && download(name, new Blob([html.html], { type: "text/html" }));

  const diags = html?.diagnostics.filter((d) => d.severity !== "info") ?? [];
  const infos = html?.diagnostics.filter((d) => d.severity === "info") ?? [];
  const phoneable = format === "page" || format === "email";

  return (
    <div className="stage-inner">
      <div className="tabs" role="tablist" aria-label="Output format">
        {FORMATS.map((f, n) => (
          <button key={f.key} role="tab" aria-selected={format === f.key} className={format === f.key ? "on" : ""} onClick={() => { setFormat(f.key); setExportErr(null); }}>
            <span className="tn">{n + 1}</span>
            <span className="tl">{f.label}</span>
            <span className="ts">{f.short}</span>
          </button>
        ))}
      </div>

      {errors > 0 ? (
        <p className="banner" role="status">
          {errors} conflict{errors > 1 ? "s" : ""} in the incident data. Outputs still render, but fix them before anything is sent.
        </p>
      ) : null}

      <div className="toolbar">
        {format === "email" ? (
          <p className="subject">
            <span>Subject</span>
            {emailSubject(inc)}
          </p>
        ) : (
          <p className="subject muted">
            {format === "pdf" && "Letter, 3 pages. Header, footer and page numbers come from the Document."}
            {format === "page" && "A responsive public page, rendered by Page."}
            {format === "visual" && "A fixed-size Canvas, drawn as a PNG with fitted headline text."}
          </p>
        )}
        <div className="actions">
          {phoneable ? (
            <span className="seg" role="group" aria-label="Preview width">
              <button className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>Desktop</button>
              <button className={device === "phone" ? "on" : ""} onClick={() => setDevice("phone")}>Phone</button>
            </span>
          ) : null}
          {format === "email" ? (
            <span className="seg" role="group" aria-label="Email view">
              <button className={emailView === "html" ? "on" : ""} onClick={() => setEmailView("html")}>HTML</button>
              <button className={emailView === "text" ? "on" : ""} onClick={() => setEmailView("text")}>Plain text</button>
            </span>
          ) : null}
          {format === "pdf" ? (
            <>
              <button className="btn primary" onClick={() => doExport("pdf")} disabled={busy === "pdf"}>{busy === "pdf" ? "Building PDF…" : "Download PDF"}</button>
              <button className="btn" onClick={() => frame.current?.contentWindow?.print()}>Print</button>
            </>
          ) : null}
          {format === "visual" ? <button className="btn primary" onClick={() => doExport("png")} disabled={busy === "png"}>{busy === "png" ? "Rendering…" : "Download PNG"}</button> : null}
          {format === "page" || format === "email" ? (
            <>
              <button className="btn primary" onClick={() => saveHtml(`${slug}-${format === "page" ? "status-page" : "stakeholder-email"}.html`)}>Download HTML</button>
              <button className="btn" onClick={copyHtml}>{copied ? "Copied" : "Copy HTML"}</button>
            </>
          ) : null}
        </div>
      </div>
      {exportErr ? (
        <p className="banner bad" role="alert">
          {exportErr} {exportErr.includes("fetch") || exportErr.includes("404") ? "PDF and PNG export need the local dev server: run npm run dev." : ""}
        </p>
      ) : null}

      <div ref={pane} className={`canvas ${format}`}>
        {format === "visual" ? (
          <VisualPreview inc={inc} onError={setExportErr} />
        ) : rendered && "error" in rendered ? (
          <pre className="render-error">{rendered.error}</pre>
        ) : html ? (
          format === "email" && emailView === "text" ? (
            <pre className="plain">{html.text}</pre>
          ) : (
            <iframe
              ref={frame}
              title={`${format} preview`}
              className={device === "phone" && phoneable ? "phone" : ""}
              srcDoc={html.html}
              style={format === "pdf" && scale < 1 ? { width: SHEET, height: `${100 / scale}%`, transform: `scale(${scale})`, transformOrigin: "top left" } : undefined}
            />
          )
        ) : (
          <p className="loading">Rendering…</p>
        )}
      </div>

      <footer className="status">
        <span>
          Built with <b>@hyper-elements/react</b> {__HE_VERSION__}
          {html && format !== "visual" ? ` · render() ${html.ms} ms` : ""}
        </span>
        {format !== "visual" && html ? (
          <details>
            <summary>
              Output checks: {diags.length === 0 ? "no warnings" : `${diags.length} warning${diags.length > 1 ? "s" : ""}`}
              {infos.length ? ` · ${infos.length} note${infos.length > 1 ? "s" : ""}` : ""}
            </summary>
            <ul>
              {[...diags, ...infos].map((d, n) => (
                <li key={n} className={d.severity}>
                  <code>{d.code}</code> {d.message}
                </li>
              ))}
              {diags.length + infos.length === 0 ? <li>The renderer reports nothing to fix in this output.</li> : null}
            </ul>
          </details>
        ) : null}
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------- app
export function App() {
  const [inc, setIncState] = useState<Incident>(load);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(inc));
    } catch {
      /* storage can be unavailable; the editor still works */
    }
  }, [inc]);

  const issues = useMemo(() => checkIncident(inc), [inc]);
  const errors = issues.filter((i) => i.level === "error").length;
  const ctx: Ctx = { inc, set: (path, v) => setIncState((p) => setIn(p, path, v)), issues };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const v = JSON.parse(await file.text());
      if (!v || !Array.isArray(v.timeline) || !Array.isArray(v.actions) || !v.impact || typeof v.title !== "string") throw new Error("That file is not an AFTERACTION incident.");
      setIncState(v);
      setLoadErr(null);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  return (
    <>
      <header className="top">
        <div className="brand">
          <span className="mark">AFTERACTION</span>
          <span className="tag">Incident communications studio</span>
        </div>
        <div className="top-actions">
          <span className={`pill ${errors ? "bad" : issues.length ? "odd" : "ok"}`}>
            {errors ? `${errors} conflict${errors > 1 ? "s" : ""}` : issues.length ? `${issues.length} to review` : "Consistent"}
          </span>
          <button className="btn quiet" onClick={() => download(`${inc.id.toLowerCase()}.json`, new Blob([JSON.stringify(inc, null, 2)], { type: "application/json" }))}><span>Save</span><span className="long"> JSON</span></button>
          <button className="btn quiet" onClick={() => fileRef.current?.click()}><span>Load</span><span className="long"> JSON</span></button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </header>
      {loadErr ? <p className="banner bad" role="alert">{loadErr}</p> : null}

      <nav className="mobile-switch" aria-label="Editor or preview">
        <button className={view === "edit" ? "on" : ""} onClick={() => setView("edit")}>Edit</button>
        <button className={view === "preview" ? "on" : ""} onClick={() => setView("preview")}>Preview{errors ? ` · ${errors}` : ""}</button>
      </nav>

      <div className="shell" data-view={view}>
        <aside className="editor" aria-label="Incident editor">
          <Editor
            ctx={ctx}
            issues={issues}
            setInc={setIncState}
            onDemo={() => setIncState((p) => ({ ...p, detectedAt: "2026-11-12T13:30:00Z", impact: { ...p.impact, durationMinutes: 120 } }))}
            onReset={() => setIncState(structuredClone(sampleIncident))}
          />
        </aside>
        <main className="stage" aria-label="Output preview">
          <Stage inc={inc} errors={errors} />
        </main>
      </div>
    </>
  );
}
