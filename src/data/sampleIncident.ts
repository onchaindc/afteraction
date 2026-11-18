import type { Incident } from '../types/incident'

export const sampleIncident: Incident = {
  id: 'INC-2026-0847',
  title: 'Elevated API latency and partial checkout failures',
  severity: 'major',
  status: 'resolved',
  service: 'Checkout API',
  startedAt: '2026-11-17T14:12:00Z',
  detectedAt: '2026-11-17T14:18:00Z',
  resolvedAt: '2026-11-17T16:41:00Z',
  summary:
    'A misconfigured connection pool on the primary checkout service caused connection exhaustion under normal peak traffic. Approximately 18% of checkout requests returned 503 or timed out for 2 hours 29 minutes.',
  impact:
    'Customers in US-East and EU-West experienced failed or delayed checkouts. Payment capture was not affected for completed sessions. Support volume increased 4× during the window. Estimated revenue impact: $42k.',
  rootCause:
    'A configuration change deployed at 13:58 UTC reduced the maximum pool size from 120 to 40 without a corresponding load test. Under peak concurrent sessions the pool saturated, and retry storms amplified the failure.',
  timeline: [
    {
      id: 't1',
      at: '2026-11-17T13:58:00Z',
      title: 'Config change deployed',
      detail: 'checkout-pool.max_size set to 40 via config service.'
    },
    {
      id: 't2',
      at: '2026-11-17T14:12:00Z',
      title: 'Latency begins rising',
      detail: 'p99 latency crossed 2s; error rate still under 1%.'
    },
    {
      id: 't3',
      at: '2026-11-17T14:18:00Z',
      title: 'Alert fired',
      detail: 'PagerDuty: checkout.error_rate > 5% for 3 minutes.'
    },
    {
      id: 't4',
      at: '2026-11-17T14:27:00Z',
      title: 'Incident declared',
      detail: 'War room opened. Status page updated to Investigating.'
    },
    {
      id: 't5',
      at: '2026-11-17T15:05:00Z',
      title: 'Root cause identified',
      detail: 'Pool saturation confirmed via metrics and recent config diff.'
    },
    {
      id: 't6',
      at: '2026-11-17T15:22:00Z',
      title: 'Mitigation applied',
      detail: 'Pool size restored to 120; retry budget reduced.'
    },
    {
      id: 't7',
      at: '2026-11-17T16:41:00Z',
      title: 'Fully resolved',
      detail: 'Error rate stable <0.2% for 45 minutes. Status page set to Resolved.'
    }
  ],
  correctiveActions: [
    {
      id: 'c1',
      action: 'Require load test gate for any pool or concurrency config change',
      owner: 'Platform',
      due: '2026-12-01',
      status: 'open'
    },
    {
      id: 'c2',
      action: 'Add saturation alerts on connection pool utilization >70%',
      owner: 'Observability',
      due: '2026-11-25',
      status: 'in_progress'
    },
    {
      id: 'c3',
      action: 'Document and rehearse checkout degradation runbook',
      owner: 'On-call',
      due: '2026-12-15',
      status: 'open'
    }
  ],
  stakeholders: 'Engineering leadership, Customer Support, Finance, Account teams for enterprise customers',
  statusPageUrl: 'https://status.example.com/incidents/INC-2026-0847',
  author: 'Incident Commander',
  organization: 'Example Commerce'
}
