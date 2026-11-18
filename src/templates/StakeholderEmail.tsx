import { Column, Email, Heading, Text } from '@hyper-elements/react'
import type { Incident } from '../types/incident'
import { formatDuration, formatTs } from '../lib/validateIncident'
import { colors, fonts } from './tokens'

export function StakeholderEmail({ incident }: { incident: Incident }) {
  const duration = formatDuration(incident.startedAt, incident.resolvedAt)
  const subjectStatus = incident.status === 'resolved' ? 'Resolved' : 'Update'

  return (
    <Email
      previewText={`${incident.id}: ${incident.title} — ${subjectStatus}`}
      title={`${incident.id} ${subjectStatus}`}
      style={{
        backgroundColor: colors.paper,
        fontFamily: fonts.sans,
        gap: 0,
        color: colors.ink
      }}
    >
      <Column style={{ backgroundColor: colors.navy, padding: [28, 32], gap: 8 }}>
        <Text style={{ fontSize: 12, color: colors.accentSoft, fontFamily: fonts.mono }}>
          {incident.organization.toUpperCase()} · INCIDENT COMMUNICATION
        </Text>
        <Heading level={1} style={{ fontSize: 22, color: colors.white, fontFamily: fonts.serif }}>
          {incident.title}
        </Heading>
        <Text style={{ fontSize: 13, color: '#CBD5E1', fontFamily: fonts.mono }}>
          {incident.id} · {incident.severity.toUpperCase()} · {duration}
        </Text>
      </Column>

      <Column style={{ backgroundColor: colors.white, padding: [28, 32], gap: 20 }}>
        <Column style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: colors.muted }}>STATUS</Text>
          <Text style={{ fontSize: 15, lineHeight: 1.5 }}>{incident.summary}</Text>
        </Column>

        <Column style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: colors.muted }}>IMPACT</Text>
          <Text style={{ fontSize: 14, lineHeight: 1.5, color: colors.muted }}>{incident.impact}</Text>
        </Column>

        {incident.status === 'resolved' && (
          <Column style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: colors.muted }}>ROOT CAUSE</Text>
            <Text style={{ fontSize: 14, lineHeight: 1.5 }}>{incident.rootCause}</Text>
          </Column>
        )}

        <Column style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: colors.muted }}>NEXT STEPS</Text>
          {incident.correctiveActions.slice(0, 3).map((a) => (
            <Text key={a.id} style={{ fontSize: 14, lineHeight: 1.45 }}>
              · {a.action} ({a.owner})
            </Text>
          ))}
        </Column>

        <Column style={{ gap: 4, padding: [8, 0, 0, 0] }}>
          <Text style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.muted }}>
            Started {formatTs(incident.startedAt)}
          </Text>
          {incident.resolvedAt && (
            <Text style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.muted }}>
              Resolved {formatTs(incident.resolvedAt)}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: colors.muted }}>
            Status page: {incident.statusPageUrl}
          </Text>
        </Column>
      </Column>

      <Column style={{ padding: [20, 32] }}>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Sent to: {incident.stakeholders}
        </Text>
        <Text style={{ fontSize: 11, color: colors.muted, fontFamily: fonts.mono }}>
          {incident.author} · Do not forward outside the organization without approval
        </Text>
      </Column>
    </Email>
  )
}
