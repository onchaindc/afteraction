export type Severity = 'critical' | 'major' | 'minor' | 'low'

export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved'

export interface TimelineEvent {
  id: string
  at: string // ISO datetime
  title: string
  detail: string
}

export interface CorrectiveAction {
  id: string
  action: string
  owner: string
  due: string // ISO date
  status: 'open' | 'in_progress' | 'done'
}

export interface Incident {
  id: string
  title: string
  severity: Severity
  status: IncidentStatus
  service: string
  startedAt: string
  detectedAt: string
  resolvedAt: string | null
  summary: string
  impact: string
  rootCause: string
  timeline: TimelineEvent[]
  correctiveActions: CorrectiveAction[]
  stakeholders: string
  statusPageUrl: string
  author: string
  organization: string
}

export type OutputFormat = 'postmortem' | 'status' | 'email' | 'summary'

export interface ValidationIssue {
  path: string
  message: string
  severity: 'error' | 'warning'
}
