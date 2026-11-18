import { Column, Heading, Page, Section, Text } from '@hyper-elements/react'
import type { Incident } from '../types/incident'
import { formatDuration, formatTs } from '../lib/validateIncident'
import { colors, fonts } from './tokens'

const statusLabel: Record<Incident['status'], string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved'
}

export function StatusPage({ incident }: { incident: Incident }) {
  const duration = formatDuration(incident.startedAt, incident.resolvedAt)
  const isResolved = incident.status === 'resolved'

  return (
    <Page
      width={720}
      title={`${incident.service} status — ${incident.id}`}
      style={{ fontFamily: fonts.sans, backgroundColor: colors.paper, color: colors.ink, gap: 0 }}
    >
      <Section style={{ backgroundColor: colors.navy, padding: [40, 32] }}>
        <Column style={{ gap: 12 }}>
          <Text style={{ fontSize: 12, color: colors.accentSoft, fontFamily: fonts.mono }}>
            {incident.organization.toUpperCase()} STATUS
          </Text>
          <Heading level={1} style={{ fontSize: 32, color: colors.white, fontFamily: fonts.serif }}>
            {incident.title}
          </Heading>
          <Text
            style={{
              fontSize: 14,
              color: isResolved ? '#A7F3D0' : '#FECACA',
              fontFamily: fonts.mono,
              fontWeight: 500
            }}
          >
            {statusLabel[incident.status].toUpperCase()} · {incident.severity.toUpperCase()} · {duration}
          </Text>
        </Column>
      </Section>

      <Section style={{ padding: [32, 32], gap: 28 }}>
        <Column style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: colors.muted }}>CURRENT STATUS</Text>
          <Text style={{ fontSize: 16, lineHeight: 1.55 }}>{incident.summary}</Text>
        </Column>

        <Column style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: colors.muted }}>AFFECTED</Text>
          <Text style={{ fontSize: 15 }}>{incident.service}</Text>
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 1.5 }}>{incident.impact}</Text>
        </Column>

        <Column style={{ gap: 14 }}>
          <Text style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: colors.muted }}>UPDATES</Text>
          {[...incident.timeline].reverse().map((ev) => (
            <Column key={ev.id} style={{ gap: 4, padding: [12, 0, 12, 0] }}>
              <Text style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.accent }}>
                {formatTs(ev.at)}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: 600 }}>{ev.title}</Text>
              <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 1.45 }}>{ev.detail}</Text>
            </Column>
          ))}
        </Column>

        <Column style={{ gap: 4, padding: [24, 0, 0, 0] }}>
          <Text style={{ fontSize: 12, color: colors.muted, fontFamily: fonts.mono }}>
            Started {formatTs(incident.startedAt)}
          </Text>
          {incident.resolvedAt && (
            <Text style={{ fontSize: 12, color: colors.muted, fontFamily: fonts.mono }}>
              Resolved {formatTs(incident.resolvedAt)}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: colors.muted }}>
            Reference {incident.id}
          </Text>
        </Column>
      </Section>
    </Page>
  )
}
