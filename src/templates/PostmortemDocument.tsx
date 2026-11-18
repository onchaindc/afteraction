import {
  Column,
  Document,
  Heading,
  PageBreak,
  PageFooter,
  PageHeader,
  PageNumber,
  Text
} from '@hyper-elements/react'
import type { Incident } from '../types/incident'
import { formatDuration, formatTs } from '../lib/validateIncident'
import { colors, fonts } from './tokens'

export function PostmortemDocument({ incident }: { incident: Incident }) {
  const duration = formatDuration(incident.startedAt, incident.resolvedAt)

  return (
    <Document
      size="A4"
      margin={56}
      title={`${incident.id} — Postmortem`}
      style={{ fontFamily: fonts.sans, gap: 20, color: colors.ink }}
    >
      <PageHeader style={{ padding: [0, 0, 12, 0] }}>
        <Text style={{ fontSize: 11, color: colors.muted, fontFamily: fonts.mono }}>
          {incident.organization} · CONFIDENTIAL
        </Text>
      </PageHeader>

      <Column style={{ gap: 8 }}>
        <Text style={{ fontSize: 12, color: colors.accent, fontFamily: fonts.mono, fontWeight: 500 }}>
          {incident.id} · {incident.severity.toUpperCase()}
        </Text>
        <Heading level={1} style={{ fontSize: 28, fontFamily: fonts.serif, color: colors.navy }}>
          {incident.title}
        </Heading>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {incident.service} · Duration {duration} · Prepared by {incident.author}
        </Text>
      </Column>

      <Column style={{ gap: 6, padding: [16, 0, 0, 0] }}>
        <Text style={{ fontSize: 11, fontWeight: 600, color: colors.navy, letterSpacing: 1 }}>SUMMARY</Text>
        <Text style={{ fontSize: 14, lineHeight: 1.55 }}>{incident.summary}</Text>
      </Column>

      <Column style={{ gap: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: 600, color: colors.navy, letterSpacing: 1 }}>IMPACT</Text>
        <Text style={{ fontSize: 14, lineHeight: 1.55 }}>{incident.impact}</Text>
      </Column>

      <Column style={{ gap: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: 600, color: colors.navy, letterSpacing: 1 }}>ROOT CAUSE</Text>
        <Text style={{ fontSize: 14, lineHeight: 1.55 }}>{incident.rootCause}</Text>
      </Column>

      <Column style={{ gap: 10, padding: [8, 0, 0, 0] }}>
        <Text style={{ fontSize: 11, fontWeight: 600, color: colors.navy, letterSpacing: 1 }}>TIMELINE</Text>
        {incident.timeline.map((ev) => (
          <Column key={ev.id} style={{ gap: 2 }}>
            <Text style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.accent }}>
              {formatTs(ev.at)}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: 600 }}>{ev.title}</Text>
            <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 1.45 }}>{ev.detail}</Text>
          </Column>
        ))}
      </Column>

      <PageBreak />

      <Column style={{ gap: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: 600, color: colors.navy, letterSpacing: 1 }}>
          CORRECTIVE ACTIONS
        </Text>
        {incident.correctiveActions.map((a) => (
          <Column key={a.id} style={{ gap: 2, padding: [8, 0] }}>
            <Text style={{ fontSize: 14, fontWeight: 600 }}>{a.action}</Text>
            <Text style={{ fontSize: 12, color: colors.muted, fontFamily: fonts.mono }}>
              Owner: {a.owner} · Due: {a.due} · {a.status.replace('_', ' ')}
            </Text>
          </Column>
        ))}
      </Column>

      <Column style={{ gap: 6, padding: [16, 0, 0, 0] }}>
        <Text style={{ fontSize: 11, fontWeight: 600, color: colors.navy, letterSpacing: 1 }}>
          KEY TIMES
        </Text>
        <Text style={{ fontSize: 13, fontFamily: fonts.mono }}>Started   {formatTs(incident.startedAt)}</Text>
        <Text style={{ fontSize: 13, fontFamily: fonts.mono }}>Detected  {formatTs(incident.detectedAt)}</Text>
        <Text style={{ fontSize: 13, fontFamily: fonts.mono }}>
          Resolved  {incident.resolvedAt ? formatTs(incident.resolvedAt) : '—'}
        </Text>
      </Column>

      <PageFooter>
        <Text style={{ fontSize: 10, color: colors.muted, textAlign: 'right', fontFamily: fonts.mono }}>
          {incident.id} · Page <PageNumber /> of <PageNumber total />
        </Text>
      </PageFooter>
    </Document>
  )
}
