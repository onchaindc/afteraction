// The one incident data model. Every output (PDF, status page, email, visual summary) reads this and nothing else.

export type Severity = "SEV1" | "SEV2" | "SEV3";
export type Status = "investigating" | "identified" | "monitoring" | "resolved";
export type EventKind = "change" | "detected" | "update" | "mitigated" | "resolved";
export type ActionKind = "prevent" | "detect" | "respond";
export type ActionStatus = "open" | "in-progress" | "done";

export type TimelineEvent = { id: string; at: string; kind: EventKind; text: string };
export type Action = { id: string; title: string; kind: ActionKind; owner: string; due: string; status: ActionStatus };

export type Incident = {
  id: string;
  title: string;
  org: string;
  severity: Severity;
  status: Status;
  commander: string;
  contactEmail: string;
  statusUrl: string;
  startedAt: string; // ISO 8601, UTC
  detectedAt: string;
  mitigatedAt: string;
  resolvedAt: string;
  summary: string;
  services: string[];
  impact: { usersAffected: number; percentOfTraffic: number; durationMinutes: number; description: string };
  trigger: string;
  rootCause: string;
  detection: string;
  timeline: TimelineEvent[];
  actions: Action[];
};

export const sampleIncident: Incident = {
  id: "INC-2026-1112",
  title: "Payment authorizations failed for 11% of checkout traffic",
  org: "Larkspur Pay",
  severity: "SEV2",
  status: "resolved",
  commander: "Elena Voss",
  contactEmail: "incidents@larkspurpay.example",
  statusUrl: "https://status.larkspurpay.example/incidents/INC-2026-1112",
  startedAt: "2026-11-12T13:52:00Z",
  detectedAt: "2026-11-12T14:07:00Z",
  mitigatedAt: "2026-11-12T14:41:00Z",
  resolvedAt: "2026-11-12T15:19:00Z",
  summary:
    "A configuration change to the EU-West payment gateway lowered an upstream timeout far below normal response times. For 87 minutes, 11% of checkout traffic saw failed card authorizations. No funds were lost or double charged. Failed attempts were replayed after the rollback.",
  services: ["Card authorizations", "Checkout API", "EU-West gateway"],
  impact: {
    usersAffected: 18400,
    percentOfTraffic: 11,
    durationMinutes: 87,
    description:
      "Customers paying through merchants routed to EU-West saw a generic payment failure. Merchants outside EU-West were not affected. Roughly 6,200 failed attempts were replayed successfully after the fix.",
  },
  trigger: "Configuration release 2026.11.12-3, rolled out to the EU-West gateway at 13:52 UTC.",
  rootCause:
    "The release changed the gateway's upstream timeout from 8 seconds to 800 milliseconds. Normal card network responses take 1 to 3 seconds, so most authorizations timed out. The configuration schema accepted the value because it only checked that the timeout was a positive number, and the canary stage did not include EU-West.",
  detection:
    "An automated alert on authorization error rate paged the on-call engineer 15 minutes after impact began. The alert threshold of 5% for five minutes delayed detection, and no merchant report arrived before the page.",
  timeline: [
    { id: "t1", at: "2026-11-12T13:52:00Z", kind: "change", text: "Configuration release 2026.11.12-3 reaches the EU-West gateway. Error rate begins to climb." },
    { id: "t2", at: "2026-11-12T14:07:00Z", kind: "detected", text: "Alert fires: authorization error rate above 5% for five minutes. Payments on-call is paged." },
    { id: "t3", at: "2026-11-12T14:15:00Z", kind: "update", text: "Incident declared SEV2. Gateway team joins. Elena Voss takes incident command." },
    { id: "t4", at: "2026-11-12T14:22:00Z", kind: "update", text: "Failures traced to timeouts in EU-West only. The new timeout value is identified as the likely cause." },
    { id: "t5", at: "2026-11-12T14:29:00Z", kind: "update", text: "Decision to roll back rather than patch forward. Rollback begins." },
    { id: "t6", at: "2026-11-12T14:41:00Z", kind: "mitigated", text: "Rollback complete. Authorization success rate returns above 99%." },
    { id: "t7", at: "2026-11-12T15:19:00Z", kind: "resolved", text: "Failed attempts replayed, merchants notified, monitoring clean for 30 minutes. Incident closed." },
  ],
  actions: [
    { id: "a1", title: "Add EU-West to the configuration canary stage", kind: "prevent", owner: "Priya Nair", due: "2026-11-26", status: "in-progress" },
    { id: "a2", title: "Reject timeout values below 2 seconds in the configuration schema", kind: "prevent", owner: "Tomás Reyes", due: "2026-12-03", status: "open" },
    { id: "a3", title: "Alert on authorization error rate above 2% for two minutes", kind: "detect", owner: "Priya Nair", due: "2026-11-24", status: "done" },
    { id: "a4", title: "Write a rollback runbook for gateway configuration", kind: "respond", owner: "Aiko Tanaka", due: "2026-12-10", status: "open" },
    { id: "a5", title: "Publish a merchant notification template for payment incidents", kind: "respond", owner: "Elena Voss", due: "2026-11-30", status: "in-progress" },
  ],
};

// ---------- time helpers (everything is UTC) ----------
const ms = (iso: string) => Date.parse(iso);
const valid = (iso: string) => Number.isFinite(ms(iso));
export const minutesBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 60000);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => String(n).padStart(2, "0");
export function fmtTime(iso: string): string {
  if (!valid(iso)) return "invalid time";
  const d = new Date(iso);
  return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())} UTC`;
}
export function fmtDate(iso: string): string {
  if (!valid(iso)) return "invalid date";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export const fmtDateTime = (iso: string) => `${fmtDate(iso)}, ${fmtTime(iso)}`;
export function fmtDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) return "unknown";
  const m = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  const s = h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
  return totalMinutes < 0 ? `-${s}` : s;
}

export function derive(i: Incident) {
  const ttd = minutesBetween(i.startedAt, i.detectedAt);
  const ttm = minutesBetween(i.startedAt, i.mitigatedAt);
  const ttr = minutesBetween(i.startedAt, i.resolvedAt);
  return { ttd, ttm, ttr, detectToMitigate: minutesBetween(i.detectedAt, i.mitigatedAt), mitigateToResolve: minutesBetween(i.mitigatedAt, i.resolvedAt) };
}

export const statusLabel: Record<Status, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};
export const kindLabel: Record<EventKind, string> = { change: "Change", detected: "Detected", update: "Update", mitigated: "Mitigated", resolved: "Resolved" };
export const actionKindLabel: Record<ActionKind, string> = { prevent: "Prevent", detect: "Detect", respond: "Respond" };
export const actionStatusLabel: Record<ActionStatus, string> = { open: "Open", "in-progress": "In progress", done: "Done" };

// ---------- consistency engine ----------
export type Issue = { level: "error" | "warn"; field: string; message: string };

const URL_OK = /^https?:\/\/[^\s]+$/i;
const MAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkIncident(i: Incident, now: Date = new Date()): Issue[] {
  const out: Issue[] = [];
  const err = (field: string, message: string) => out.push({ level: "error", field, message });
  const warn = (field: string, message: string) => out.push({ level: "warn", field, message });

  // required details
  if (!i.title.trim()) err("title", "Title is required.");
  if (!i.id.trim()) err("id", "Incident ID is required.");
  if (!i.org.trim()) err("org", "Organisation is required.");
  if (!i.commander.trim()) warn("commander", "No incident commander named.");
  if (!MAIL_OK.test(i.contactEmail)) err("contactEmail", "Contact email is not a valid address.");
  if (!URL_OK.test(i.statusUrl)) err("statusUrl", "Status URL must start with http:// or https://.");
  if (!i.summary.trim()) err("summary", "Summary is required.");
  if (!i.rootCause.trim()) err("rootCause", "Root cause is required.");

  // the four anchor times
  const anchors: [keyof Incident, string][] = [
    ["startedAt", "Started"],
    ["detectedAt", "Detected"],
    ["mitigatedAt", "Mitigated"],
    ["resolvedAt", "Resolved"],
  ];
  let allValid = true;
  for (const [k, label] of anchors) {
    if (!valid(i[k] as string)) {
      err(k, `${label} time is not a valid date and time.`);
      allValid = false;
    }
  }
  if (allValid) {
    if (ms(i.detectedAt) < ms(i.startedAt)) err("detectedAt", "Detected before the incident started.");
    if (ms(i.mitigatedAt) < ms(i.detectedAt)) err("mitigatedAt", "Mitigated before it was detected.");
    if (ms(i.resolvedAt) < ms(i.mitigatedAt)) err("resolvedAt", "Resolved before it was mitigated.");

    const computed = minutesBetween(i.startedAt, i.resolvedAt);
    if (Math.abs(computed - i.impact.durationMinutes) > 1)
      err("impact.durationMinutes", `Stated duration is ${i.impact.durationMinutes} min but start to resolution is ${computed} min (${fmtDuration(computed)}).`);

    if (i.status === "resolved" && ms(i.resolvedAt) > now.getTime()) warn("resolvedAt", "Marked resolved, but the resolved time is in the future.");
    if (i.status !== "resolved" && ms(i.resolvedAt) <= now.getTime())
      warn("status", `Status is "${statusLabel[i.status]}" but a resolved time in the past is set.`);
  }

  // impact
  if (i.impact.percentOfTraffic < 0 || i.impact.percentOfTraffic > 100) err("impact.percentOfTraffic", "Traffic affected must be between 0 and 100.");
  if (i.impact.usersAffected < 0) err("impact.usersAffected", "Users affected cannot be negative.");
  if (i.severity === "SEV1" && i.impact.percentOfTraffic < 5) warn("severity", "SEV1 with under 5% of traffic affected. Check the severity.");
  if (i.severity === "SEV3" && i.impact.percentOfTraffic > 25) warn("severity", "SEV3 with over 25% of traffic affected. Check the severity.");

  // the narrative must agree with the numbers
  const pcts = [...i.summary.matchAll(/(\d+(?:\.\d+)?)\s?%/g)].map((m) => Number(m[1]));
  if (pcts.length > 0 && !pcts.includes(i.impact.percentOfTraffic))
    warn("summary", `Summary says ${pcts.join("%, ")}% but impact says ${i.impact.percentOfTraffic}% of traffic.`);
  const mins = [...i.summary.matchAll(/(\d+)\s?minutes?/gi)].map((m) => Number(m[1]));
  if (mins.length > 0 && !mins.includes(i.impact.durationMinutes))
    warn("summary", `Summary mentions ${mins.join(", ")} minutes but the stated duration is ${i.impact.durationMinutes}.`);
  if (i.services.length === 0) warn("services", "No affected services listed.");

  // timeline
  if (i.timeline.length === 0) err("timeline", "The timeline is empty.");
  const T = i.timeline;
  T.forEach((e, n) => {
    const f = `timeline.${n}.at`;
    if (!valid(e.at)) return err(f, "Event time is not a valid date and time.");
    if (!e.text.trim()) warn(`timeline.${n}.text`, "Event has no description.");
    if (n > 0 && valid(T[n - 1].at) && ms(e.at) < ms(T[n - 1].at)) warn(f, "Out of order: earlier than the event above it.");
    if (allValid && e.kind !== "change" && ms(e.at) < ms(i.startedAt)) warn(f, "Happens before the incident started.");
    if (allValid && ms(e.at) > ms(i.resolvedAt) + 60000) warn(f, "Happens after the resolved time.");
  });
  const anchorEvent = (kind: EventKind, field: keyof Incident, label: string) => {
    const idx = T.findIndex((e) => e.kind === kind);
    if (idx === -1) return warn("timeline", `No "${kindLabel[kind]}" event in the timeline.`);
    if (valid(T[idx].at) && valid(i[field] as string) && Math.abs(minutesBetween(T[idx].at, i[field] as string)) > 1)
      err(`timeline.${idx}.at`, `${label} event is at ${fmtTime(T[idx].at)} but the ${label.toLowerCase()} time is ${fmtTime(i[field] as string)}.`);
  };
  anchorEvent("detected", "detectedAt", "Detected");
  anchorEvent("mitigated", "mitigatedAt", "Mitigated");
  anchorEvent("resolved", "resolvedAt", "Resolved");

  // corrective actions
  if (i.actions.length === 0) warn("actions", "No corrective actions yet.");
  else if (!i.actions.some((a) => a.kind === "prevent")) warn("actions", "No action prevents a repeat. Add at least one Prevent action.");
  i.actions.forEach((a, n) => {
    if (!a.title.trim()) warn(`actions.${n}.title`, "Action has no title.");
    if (!a.owner.trim()) warn(`actions.${n}.owner`, "Action has no owner.");
    if (!valid(`${a.due}T00:00:00Z`)) return err(`actions.${n}.due`, "Due date is not valid.");
    if (valid(i.startedAt) && ms(`${a.due}T00:00:00Z`) < ms(i.startedAt) - 86400000) warn(`actions.${n}.due`, "Due before the incident started.");
    if (a.status !== "done" && ms(`${a.due}T23:59:59Z`) < now.getTime()) warn(`actions.${n}.due`, "Overdue and not done.");
  });

  return out;
}

export const uid = () => Math.random().toString(36).slice(2, 8);
