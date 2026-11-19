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
  startedAt: string;
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
  ],
};

export type Issue = { level: "error" | "warn"; field: string; message: string };

const parse = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

const minutesBetween = (a: string, b: string) => {
  const x = parse(a);
  const y = parse(b);
  if (x === null || y === null) return null;
  return Math.round((y - x) / 60000);
};

export function derive(i: Incident) {
  return {
    ttd: minutesBetween(i.startedAt, i.detectedAt),
    ttm: minutesBetween(i.startedAt, i.mitigatedAt),
    ttr: minutesBetween(i.startedAt, i.resolvedAt),
    detectToMitigate: minutesBetween(i.detectedAt, i.mitigatedAt),
    mitigateToResolve: minutesBetween(i.mitigatedAt, i.resolvedAt),
  };
}

export function checkIncident(i: Incident, now = new Date()): Issue[] {
  const issues: Issue[] = [];
  const push = (level: "error" | "warn", field: string, message: string) => issues.push({ level, field, message });

  if (!i.title.trim()) push("error", "title", "Title is required.");
  if (!i.summary.trim()) push("error", "summary", "Summary is required.");
  if (!i.org.trim()) push("error", "org", "Organization is required.");

  const started = parse(i.startedAt);
  const detected = parse(i.detectedAt);
  const mitigated = parse(i.mitigatedAt);
  const resolved = parse(i.resolvedAt);

  if (started === null) push("error", "startedAt", "Invalid start time.");
  if (detected === null) push("error", "detectedAt", "Invalid detection time.");
  if (mitigated === null) push("error", "mitigatedAt", "Invalid mitigation time.");
  if (resolved === null) push("error", "resolvedAt", "Invalid resolution time.");

  if (started !== null && detected !== null && detected < started) push("error", "detectedAt", "Detected before impact started.");
  if (detected !== null && mitigated !== null && mitigated < detected) push("error", "mitigatedAt", "Mitigated before detected.");
  if (mitigated !== null && resolved !== null && resolved < mitigated) push("error", "resolvedAt", "Resolved before mitigated.");

  const ttr = minutesBetween(i.startedAt, i.resolvedAt);
  if (ttr !== null && i.impact.durationMinutes > 0 && Math.abs(ttr - i.impact.durationMinutes) > 2) {
    push("error", "impact.durationMinutes", `Stated duration (${i.impact.durationMinutes}m) disagrees with start-to-resolution (${ttr}m).`);
  }

  i.timeline.forEach((ev, idx) => {
    const t = parse(ev.at);
    if (t === null) push("error", `timeline.${idx}.at`, "Invalid timeline timestamp.");
    if (!ev.text.trim()) push("error", `timeline.${idx}.text`, "Timeline event needs text.");
    if (ev.kind === "detected" && detected !== null && t !== null && Math.abs(t - detected) > 60000) {
      push("error", `timeline.${idx}.at`, "Detected event time disagrees with detectedAt.");
    }
    if (ev.kind === "mitigated" && mitigated !== null && t !== null && Math.abs(t - mitigated) > 60000) {
      push("error", `timeline.${idx}.at`, "Mitigated event time disagrees with mitigatedAt.");
    }
    if (ev.kind === "resolved" && resolved !== null && t !== null && Math.abs(t - resolved) > 60000) {
      push("error", `timeline.${idx}.at`, "Resolved event time disagrees with resolvedAt.");
    }
  });

  const pctMatch = i.summary.match(/(\d+(?:\.\d+)?)%/);
  if (pctMatch && Math.abs(Number(pctMatch[1]) - i.impact.percentOfTraffic) > 0.5) {
    push("warn", "summary", `Summary quotes ${pctMatch[1]}% but impact is ${i.impact.percentOfTraffic}%.");
  }
  const minMatch = i.summary.match(/(\d+)\s*minutes?/i);
  if (minMatch && i.impact.durationMinutes > 0 && Math.abs(Number(minMatch[1]) - i.impact.durationMinutes) > 2) {
    push("warn", "summary", `Summary quotes ${minMatch[1]} minutes but impact duration is ${i.impact.durationMinutes}m.");
  }

  if (i.severity === "SEV1" && i.impact.percentOfTraffic < 5) push("warn", "severity", "SEV1 with under 5% impact looks light.");
  if (i.severity === "SEV3" && i.impact.percentOfTraffic > 20) push("warn", "severity", "SEV3 with over 20% impact looks heavy.");

  if (i.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.contactEmail)) push("error", "contactEmail", "Invalid email.");
  if (i.statusUrl && !/^https?:\/\//i.test(i.statusUrl)) push("error", "statusUrl", "Status URL should start with http(s).");

  i.actions.forEach((a, idx) => {
    if (!a.title.trim()) push("error", `actions.${idx}.title`, "Action needs a title.");
    if (!a.owner.trim()) push("warn", `actions.${idx}.owner`, "Action has no owner.");
    const due = parse(a.due);
    if (due !== null && a.status !== "done" && due < now.getTime()) push("warn", `actions.${idx}.due`, "Action is overdue.");
  });

  return issues;
}

export const newId = () => Math.random().toString(36).slice(2, 8);
