import type { Incident, ValidationIssue } from '../types/incident'

function parse(ts: string): number | null {
  const t = Date.parse(ts)
  return Number.isNaN(t) ? null : t
}

export function validateIncident(incident: Incident): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!incident.title.trim()) {
    issues.push({ path: 'title', message: 'Title is required.', severity: 'error' })
  }
  if (!incident.service.trim()) {
    issues.push({ path: 'service', message: 'Service is required.', severity: 'error' })
  }
  if (!incident.summary.trim()) {
    issues.push({ path: 'summary', message: 'Summary is required.', severity: 'error' })
  }

  const started = parse(incident.startedAt)
  const detected = parse(incident.detectedAt)
  const resolved = incident.resolvedAt ? parse(incident.resolvedAt) : null

  if (started === null) {
    issues.push({ path: 'startedAt', message: 'Invalid start time.', severity: 'error' })
  }
  if (detected === null) {
    issues.push({ path: 'detectedAt', message: 'Invalid detection time.', severity: 'error' })
  }

  if (started !== null && detected !== null && detected < started) {
    issues.push({
      path: 'detectedAt',
      message: 'Detection time is before the incident started.',
      severity: 'error'
    })
  }

  if (incident.status === 'resolved' && !incident.resolvedAt) {
    issues.push({
      path: 'resolvedAt',
      message: 'Resolved status requires a resolution timestamp.',
      severity: 'error'
    })
  }

  if (resolved !== null && started !== null && resolved < started) {
    issues.push({
      path: 'resolvedAt',
      message: 'Resolution time is before the incident started.',
      severity: 'error'
    })
  }

  if (resolved !== null && detected !== null && resolved < detected) {
    issues.push({
      path: 'resolvedAt',
      message: 'Resolution time is before detection.',
      severity: 'warning'
    })
  }

  // Timeline order and bounds
  let prev = 0
  incident.timeline.forEach((ev, i) => {
    const t = parse(ev.at)
    if (t === null) {
      issues.push({ path: `timeline[${i}].at`, message: 'Invalid timeline timestamp.', severity: 'error' })
      return
    }
    if (started !== null && t < started - 60_000) {
      issues.push({
        path: `timeline[${i}].at`,
        message: 'Timeline event is more than a minute before incident start.',
        severity: 'warning'
      })
    }
    if (resolved !== null && t > resolved + 60_000) {
      issues.push({
        path: `timeline[${i}].at`,
        message: 'Timeline event is after resolution.',
        severity: 'warning'
      })
    }
    if (t < prev) {
      issues.push({
        path: `timeline[${i}].at`,
        message: 'Timeline events should be in chronological order.',
        severity: 'warning'
      })
    }
    prev = t
    if (!ev.title.trim()) {
      issues.push({ path: `timeline[${i}].title`, message: 'Timeline event needs a title.', severity: 'error' })
    }
  })

  if (!incident.impact.trim()) {
    issues.push({ path: 'impact', message: 'Impact description is recommended.', severity: 'warning' })
  }
  if (!incident.rootCause.trim()) {
    issues.push({ path: 'rootCause', message: 'Root cause is recommended for postmortems.', severity: 'warning' })
  }

  incident.correctiveActions.forEach((a, i) => {
    if (!a.action.trim()) {
      issues.push({ path: `correctiveActions[${i}].action`, message: 'Action text is required.', severity: 'error' })
    }
    if (a.due && parse(a.due) === null) {
      issues.push({ path: `correctiveActions[${i}].due`, message: 'Invalid due date.', severity: 'error' })
    }
  })

  return issues
}

export function formatDuration(startIso: string, endIso: string | null): string {
  const s = parse(startIso)
  const e = endIso ? parse(endIso) : Date.now()
  if (s === null || e === null || e < s) return '—'
  const mins = Math.round((e - s) / 60_000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function formatTs(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}
