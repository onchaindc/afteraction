import { Canvas, Column, Heading, Text } from '@hyper-elements/react'
import type { Incident } from '../types/incident'
import { formatDuration, formatTs } from '../lib/validateIncident'
import { colors, fonts } from './tokens'

export function SummaryCanvas({ incident }: { incident: Incident }) {
  const duration = formatDuration(incident.startedAt, incident.resolvedAt)

  return (
    <Canvas
      width={1200}
      height={630}
      style={{
        backgroundColor: colors.navy,
        padding: 56,
        gap: 28,
        fontFamily: fonts.sans,
        color: colors.white,
        justifyContent: 'space-between'
      }}
    >
      <Column style={{ gap: 16 }}>
        <Text style={{ fontSize: 18, color: colors.accent, fontFamily: fonts.mono, fontWeight: 500 }}>
          {incident.id} · {incident.severity.toUpperCase()}
        </Text>
        <Heading level={1} style={{ fontSize: 42, fontFamily: fonts.serif, color: colors.white }}>
          {incident.title}
        </Heading>
        <Text style={{ fontSize: 20, color: '#94A3B8' }}>
          {incident.service} · {duration}
        </Text>
      </Column>

      <Column style={{ gap: 12 }}>
        <Text style={{ fontSize: 18, color: '#CBD5E1', lineHeight: 1.4 }}>
          {incident.summary.length > 160 ? incident.summary.slice(0, 157) + '…' : incident.summary}
        </Text>
        <Text style={{ fontSize: 16, color: colors.accentSoft, fontFamily: fonts.mono }}>
          {formatTs(incident.startedAt)}
          {incident.resolvedAt ? `  →  ${formatTs(incident.resolvedAt)}` : ''}
        </Text>
        <Text style={{ fontSize: 14, color: '#64748B' }}>
          {incident.organization}
        </Text>
      </Column>
    </Canvas>
  )
}
