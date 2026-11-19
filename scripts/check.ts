import assert from "node:assert/strict";
import { sampleIncident, checkIncident, derive, type Incident } from "../src/model";

const clone = (): Incident => JSON.parse(JSON.stringify(sampleIncident));
const NOW = new Date("2026-11-18T12:00:00Z");
const has = (issues: ReturnType<typeof checkIncident>, field: string, level?: string) =>
  issues.some((i) => i.field === field && (!level || i.level === level));

// the sample must be clean
assert.deepEqual(checkIncident(sampleIncident, NOW), [], "sample incident should have no issues");
assert.deepEqual(derive(sampleIncident), { ttd: 15, ttm: 49, ttr: 87, detectToMitigate: 34, mitigateToResolve: 38 });

// conflicting dates
let i = clone(); i.detectedAt = "2026-11-12T13:30:00Z";
assert.ok(has(checkIncident(i, NOW), "detectedAt", "error"), "detected before start");

// duration conflict
i = clone(); i.impact.durationMinutes = 120;
assert.ok(has(checkIncident(i, NOW), "impact.durationMinutes", "error"), "duration mismatch");

// timeline vs anchor time
i = clone(); i.timeline[5].at = "2026-11-12T14:55:00Z";
assert.ok(has(checkIncident(i, NOW), "timeline.5.at", "error"), "mitigated event disagrees with mitigated time");

// narrative vs numbers
i = clone(); i.impact.percentOfTraffic = 40;
assert.ok(has(checkIncident(i, NOW), "summary", "warn"), "summary percentage disagrees with impact");

// bad contact details
i = clone(); i.contactEmail = "nope"; i.statusUrl = "ftp://x";
const bad = checkIncident(i, NOW);
assert.ok(has(bad, "contactEmail", "error") && has(bad, "statusUrl", "error"));

// severity sanity
i = clone(); i.severity = "SEV1"; i.impact.percentOfTraffic = 11;
assert.equal(has(checkIncident(i, NOW), "severity"), false, "11% is fine for SEV1");
i.impact.percentOfTraffic = 2; i.summary = i.summary.replace("11%", "2%");
assert.ok(has(checkIncident(i, NOW), "severity", "warn"));

// overdue action
i = clone(); i.actions[0].due = "2026-11-01";
assert.ok(has(checkIncident(i, NOW), "actions.0.due", "warn"));

console.log("check.ts: all consistency checks passed");
