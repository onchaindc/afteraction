import type { ReactNode } from "react";
type ColorValue = string | ReturnType<typeof token>;
import {
  Button, Canvas, Column, Divider, Document, Email, Heading, List, ListItem, Page, PageBreak, PageFooter, PageHeader,
  PageNumber, Row, Section, Span, Table, TableCell, TableRow, Text, token,
} from "@hyper-elements/react";
import {
  Incident, actionKindLabel, actionStatusLabel, derive, fmtDate, fmtDateTime, fmtDuration, fmtTime, kindLabel, statusLabel,
} from "./model";
import { FONT, fontFaces, theme } from "./theme";

const n = (x: number) => x.toLocaleString("en-US");
const ruleLine = { width: 1, style: "solid" as const, color: token("colors.border") };
const doneCount = (i: Incident) => i.actions.filter((a) => a.status === "done").length;
const headline = (i: Incident) => `${statusLabel[i.status]}: ${i.title} (${i.id})`;
export const emailSubject = headline;

// ---------- small shared pieces ----------
const Label = ({ children, color, align, size }: { children: ReactNode; color?: ColorValue; align?: "left" | "right"; size?: number }) => (
  <Text style={{ apply: ["label"], ...(color ? { color } : {}), ...(align ? { textAlign: align } : {}), ...(size ? { fontSize: size } : {}) }}>{children}</Text>
);

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Column style={{ gap: 4 }}>
      <Label>{label}</Label>
      <Text style={{ apply: ["stat"] }}>{value}</Text>
      {note ? <Text style={{ apply: ["small"] }}>{note}</Text> : null}
    </Column>
  );
}

const Rule = () => <Divider style={{ borderTop: ruleLine, padding: [8, 0] }} />;

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <TableRow>
      <TableCell style={{ width: 150, padding: [10, 12, 10, 0], verticalAlign: "top" }}>
        <Span style={{ apply: ["label"] }}>{k}</Span>
      </TableCell>
      <TableCell style={{ padding: [8, 0], verticalAlign: "top" }}>{v}</TableCell>
    </TableRow>
  );
}

// ============================================================ 1. Postmortem (PDF)
export function PostmortemDocument({ i, origin }: { i: Incident; origin: string }) {
  const d = derive(i);
  return (
    <Document
      theme={theme}
      size="Letter"
      margin={{ top: 64, right: 64, bottom: 72, left: 64 }}
      title={`Postmortem ${i.id}: ${i.title}`}
      lang="en"
      fonts={fontFaces(origin)}
      style={{ fontSize: 14, lineHeight: 1.55, gap: 14 }}
    >
      <PageHeader style={{ padding: [0, 0, 10, 0], border: { bottom: ruleLine } }}>
        <Row stackOnMobile={false} style={{ alignItems: "center" }}>
          <Label>{i.org} · Postmortem</Label>
          <Label align="right">{i.id} · Confidential</Label>
        </Row>
      </PageHeader>
      <PageFooter style={{ padding: [10, 0, 0, 0], border: { top: ruleLine } }}>
        <Row stackOnMobile={false} style={{ alignItems: "center" }}>
          <Text style={{ apply: ["small"], fontSize: 11 }}>Prepared by {i.commander}. All times UTC.</Text>
          <Text style={{ apply: ["small"], fontSize: 11, textAlign: "right" }}>
            Page <PageNumber />
          </Text>
        </Row>
      </PageFooter>

      <Document.Page>
        <Column style={{ padding: [14, 0, 0, 0], gap: 14 }}>
        <Label color={token("colors.accent")}>
          {i.severity} · {statusLabel[i.status]}
        </Label>
        <Heading level={1} style={{ fontSize: 34 }}>{i.title}</Heading>
        <Text style={{ apply: ["small"] }}>
          {fmtDate(i.startedAt)} · {fmtTime(i.startedAt)} to {fmtTime(i.resolvedAt)} · Incident commander {i.commander}
        </Text>
        <Rule />
        <Heading level={2}>Summary</Heading>
        <Text>{i.summary}</Text>
        <Heading level={2}>Impact</Heading>
        <Row style={{ gap: 24, padding: [8, 0] }}>
          <Stat label="Duration" value={fmtDuration(i.impact.durationMinutes)} note="Start to resolution" />
          <Stat label="Customers" value={n(i.impact.usersAffected)} note="Affected" />
          <Stat label="Traffic" value={`${i.impact.percentOfTraffic}%`} note="Of checkout requests" />
        </Row>
        <Text>{i.impact.description}</Text>
        <Text style={{ apply: ["small"] }}>Affected services: {i.services.join(", ")}.</Text>
      </Column>
      </Document.Page>

      <Document.Page>
        <Column style={{ padding: [14, 0, 0, 0], gap: 14 }}>
        <Heading level={2}>Timeline</Heading>
        <Table style={{ width: "100%", cellPadding: [8, 10, 8, 0], rowBorder: ruleLine, borderCollapse: "collapse" }}>
          <TableRow header>
            <TableCell style={{ width: 90 }}>Time</TableCell>
            <TableCell style={{ width: 90 }}>Type</TableCell>
            <TableCell>Event</TableCell>
          </TableRow>
          {i.timeline.map((e) => (
            <TableRow key={e.id}>
              <TableCell style={{ verticalAlign: "top" }}>
                <Span style={{ apply: ["mono"] }}>{fmtTime(e.at).replace(" UTC", "")}</Span>
              </TableCell>
              <TableCell style={{ verticalAlign: "top" }}>
                <Span style={{ apply: ["label"], color: e.kind === "detected" || e.kind === "change" ? token("colors.accent") : token("colors.muted") }}>
                  {kindLabel[e.kind]}
                </Span>
              </TableCell>
              <TableCell style={{ verticalAlign: "top" }}>{e.text}</TableCell>
            </TableRow>
          ))}
        </Table>
        <Heading level={2}>Detection and response</Heading>
        <Row style={{ gap: 24, padding: [8, 0] }}>
          <Stat label="Time to detect" value={fmtDuration(d.ttd)} note={`Impact ${fmtTime(i.startedAt)}, alert ${fmtTime(i.detectedAt)}`} />
          <Stat label="Time to mitigate" value={fmtDuration(d.ttm)} note={`Mitigated ${fmtTime(i.mitigatedAt)}`} />
          <Stat label="Time to resolve" value={fmtDuration(d.ttr)} note={`Closed ${fmtTime(i.resolvedAt)}`} />
        </Row>
        <Text>{i.detection}</Text>
      </Column>
      </Document.Page>

      <Document.Page>
        <Column style={{ padding: [14, 0, 0, 0], gap: 14 }}>
        <Heading level={2}>Root cause</Heading>
        <Text style={{ apply: ["small"] }}>Trigger: {i.trigger}</Text>
        <Text>{i.rootCause}</Text>
        <Heading level={2}>Corrective actions</Heading>
        <Table style={{ width: "100%", cellPadding: [8, 10, 8, 0], rowBorder: ruleLine, borderCollapse: "collapse" }}>
          <TableRow header>
            <TableCell>Action</TableCell>
            <TableCell style={{ width: 64 }}>Type</TableCell>
            <TableCell style={{ width: 92 }}>Owner</TableCell>
            <TableCell style={{ width: 84 }}>Due</TableCell>
            <TableCell style={{ width: 96 }}>Status</TableCell>
          </TableRow>
          {i.actions.map((a) => (
            <TableRow key={a.id}>
              <TableCell style={{ verticalAlign: "top" }}>{a.title}</TableCell>
              <TableCell style={{ verticalAlign: "top" }}>{actionKindLabel[a.kind]}</TableCell>
              <TableCell style={{ verticalAlign: "top" }}>{a.owner}</TableCell>
              <TableCell style={{ verticalAlign: "top" }}>
                <Span style={{ apply: ["mono"], fontSize: 12 }}>{a.due}</Span>
              </TableCell>
              <TableCell style={{ verticalAlign: "top" }}>{actionStatusLabel[a.status]}</TableCell>
            </TableRow>
          ))}
        </Table>
        <Text style={{ apply: ["small"] }}>
          {doneCount(i)} of {i.actions.length} actions complete as of this report.
        </Text>
        <Rule />
        <Row style={{ gap: 40, padding: [24, 0, 0, 0] }}>
          <Column style={{ gap: 6 }}>
            <Label>Incident commander</Label>
            <Text>{i.commander}</Text>
            <Divider style={{ borderTop: { width: 1, style: "solid", color: token("colors.foreground") }, padding: [18, 0, 0, 0] }} />
            <Text style={{ apply: ["small"], fontSize: 11 }}>Signature and date</Text>
          </Column>
          <Column style={{ gap: 6 }}>
            <Label>Reviewed by</Label>
            <Text> </Text>
            <Divider style={{ borderTop: { width: 1, style: "solid", color: token("colors.foreground") }, padding: [18, 0, 0, 0] }} />
            <Text style={{ apply: ["small"], fontSize: 11 }}>Signature and date</Text>
          </Column>
        </Row>
      </Column>
      </Document.Page>
    </Document>
  );
}

// ============================================================ 2. Public status page
export function StatusPage({ i, origin }: { i: Incident; origin: string }) {
  const d = derive(i);
  const resolved = i.status === "resolved";
  const events = [...i.timeline].reverse();
  return (
    <Page theme={theme} width={920} title={`${i.title} | ${i.org} status`} description={i.summary.slice(0, 150)} lang="en" fonts={fontFaces(origin)} style={{ gap: 0 }}>
      <Section style={{ backgroundColor: token("colors.primary"), padding: [22, 28], color: token("colors.primaryForeground") }}>
        <Row stackOnMobile={false} style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: FONT.serif, fontSize: 20, fontWeight: 700, color: token("colors.primaryForeground") }}>{i.org}</Text>
          <Text style={{ apply: ["label"], color: "#B9C2D0", textAlign: "right" }}>System status</Text>
        </Row>
      </Section>

      <Section style={{ padding: [44, 28, 28, 28], gap: 14 }}>
        <Label color={resolved ? token("colors.ok") : token("colors.accent")}>
          {statusLabel[i.status]} · {i.severity} · {i.id}
        </Label>
        <Heading level={1}>{i.title}</Heading>
        <Text style={{ fontSize: 18, lineHeight: 1.55 }}>{i.summary}</Text>
        <Rule />
        <Row style={{ gap: 20, padding: [6, 0] }}>
          <Stat label="Started" value={fmtTime(i.startedAt).replace(" UTC", "")} note={`${fmtDate(i.startedAt)} UTC`} />
          <Stat label="Duration" value={fmtDuration(i.impact.durationMinutes)} note={resolved ? `Resolved ${fmtTime(i.resolvedAt)}` : "Ongoing"} />
          <Stat label="Traffic affected" value={`${i.impact.percentOfTraffic}%`} note={`About ${n(i.impact.usersAffected)} customers`} />
        </Row>
      </Section>

      <Section style={{ padding: [20, 28, 36, 28] }}>
        <Row style={{ gap: 44, alignItems: "start" }}>
          <Column style={{ flex: 2, gap: 6 }}>
            <Heading level={2}>Updates</Heading>
            {events.map((e) => (
              <Row key={e.id} stackOnMobile={false} style={{ gap: 16, padding: [12, 0], border: { top: ruleLine }, alignItems: "start" }}>
                <Column style={{ width: 92, flex: "none", gap: 3 }}>
                  <Text style={{ apply: ["mono"] }}>{fmtTime(e.at).replace(" UTC", "")}</Text>
                  <Label color={e.kind === "detected" || e.kind === "change" ? token("colors.accent") : token("colors.muted")}>{kindLabel[e.kind]}</Label>
                </Column>
                <Text style={{ flex: 1 }}>{e.text}</Text>
              </Row>
            ))}
          </Column>
          <Column style={{ flex: 1, gap: 10 }}>
            <Heading level={2}>Affected services</Heading>
            <List style={{ gap: 4 }}>
              {i.services.map((s) => (
                <ListItem key={s}>{s}</ListItem>
              ))}
            </List>
            <Heading level={2} style={{ padding: [14, 0, 0, 0] }}>Impact</Heading>
            <Text style={{ apply: ["small"] }}>{i.impact.description}</Text>
          </Column>
        </Row>
      </Section>

      <Section style={{ padding: [28, 28, 36, 28], backgroundColor: "#EFE8DB", gap: 12 }}>
        <Heading level={2}>What caused it, and what changes</Heading>
        <Text>{i.rootCause}</Text>
        <Table style={{ width: "100%", cellPadding: [9, 10, 9, 0], rowBorder: ruleLine, borderCollapse: "collapse" }}>
          <TableRow header>
            <TableCell>Follow-up</TableCell>
            <TableCell style={{ width: 90 }}>Due</TableCell>
            <TableCell style={{ width: 100 }}>Status</TableCell>
          </TableRow>
          {i.actions.map((a) => (
            <TableRow key={a.id}>
              <TableCell style={{ verticalAlign: "top" }}>{a.title}</TableCell>
              <TableCell style={{ verticalAlign: "top" }}>
                <Span style={{ apply: ["mono"], fontSize: 12 }}>{a.due}</Span>
              </TableCell>
              <TableCell style={{ verticalAlign: "top", color: a.status === "done" ? token("colors.ok") : token("colors.foreground") }}>
                {actionStatusLabel[a.status]}
              </TableCell>
            </TableRow>
          ))}
        </Table>
        <Text style={{ apply: ["small"] }}>
          Detected after {fmtDuration(d.ttd)}, mitigated after {fmtDuration(d.ttm)}, resolved after {fmtDuration(d.ttr)}.
        </Text>
      </Section>

      <Section style={{ padding: [28, 28, 44, 28], gap: 10 }}>
        <Text style={{ apply: ["small"] }}>Questions about this incident? Write to {i.contactEmail}. Incident commander: {i.commander}.</Text>
        <Button href={`mailto:${i.contactEmail}?subject=${encodeURIComponent(i.id)}`}>Contact the incident team</Button>
      </Section>
    </Page>
  );
}

// ============================================================ 3. Stakeholder email
export function StakeholderEmail({ i }: { i: Incident }) {
  const d = derive(i);
  const resolved = i.status === "resolved";
  return (
    <Email theme={theme} width={600} title={headline(i)} previewText={`${i.impact.percentOfTraffic}% of traffic affected for ${fmtDuration(i.impact.durationMinutes)}. ${resolved ? "Fully resolved." : "Work continues."}`} lang="en" style={{ gap: 0 }}>
      <Section style={{ backgroundColor: token("colors.primary"), padding: [22, 32] }}>
        <Row stackOnMobile={false} style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, fontWeight: 700, color: token("colors.primaryForeground") }}>{i.org}</Text>
          <Text style={{ apply: ["label"], color: "#B9C2D0", textAlign: "right" }}>{i.id}</Text>
        </Row>
      </Section>
      <Section style={{ padding: [34, 32, 8, 32], gap: 12 }}>
        <Label color={resolved ? token("colors.ok") : token("colors.accent")}>
          Incident {statusLabel[i.status].toLowerCase()} · {i.severity}
        </Label>
        <Heading level={1} style={{ fontSize: 28, lineHeight: 1.18 }}>{i.title}</Heading>
        <Text>{i.summary}</Text>
      </Section>
      <Section style={{ padding: [8, 32, 8, 32] }}>
        <Table style={{ width: "100%", rowBorder: ruleLine, borderCollapse: "collapse", cellPadding: [9, 0] }}>
          <Kv k="Started" v={fmtDateTime(i.startedAt)} />
          <Kv k="Detected" v={`${fmtTime(i.detectedAt)} (${fmtDuration(d.ttd)} after start)`} />
          <Kv k="Mitigated" v={`${fmtTime(i.mitigatedAt)} (${fmtDuration(d.ttm)} after start)`} />
          <Kv k={resolved ? "Resolved" : "Last update"} v={fmtTime(i.resolvedAt)} />
          <Kv k="Duration" v={fmtDuration(i.impact.durationMinutes)} />
          <Kv k="Impact" v={`${i.impact.percentOfTraffic}% of traffic, about ${n(i.impact.usersAffected)} customers`} />
        </Table>
      </Section>
      <Section style={{ padding: [20, 32, 8, 32], gap: 8 }}>
        <Heading level={2} style={{ fontSize: 19 }}>What we are changing</Heading>
        <List type="number" style={{ gap: 6 }}>
          {i.actions.slice(0, 3).map((a) => (
            <ListItem key={a.id}>
              {a.title} ({a.owner}, due {a.due})
            </ListItem>
          ))}
        </List>
      </Section>
      <Section style={{ padding: [20, 32, 30, 32], gap: 14 }}>
        <Button href={i.statusUrl}>Read the full incident report</Button>
        <Text style={{ apply: ["small"] }}>
          Reply to this email or write to {i.contactEmail} with questions. Incident commander: {i.commander}. All times UTC.
        </Text>
      </Section>
    </Email>
  );
}

// ============================================================ 4. Visual incident summary (image)
export function SummaryCanvas({ i, origin }: { i: Incident; origin: string }) {
  const d = derive(i);
  const seg = [Math.max(d.ttd, 1), Math.max(d.detectToMitigate, 1), Math.max(d.mitigateToResolve, 1)];
  const light = "#B9C2D0";
  const paper = token("colors.primaryForeground");
  const Big = ({ label, value }: { label: string; value: string }) => (
    <Column style={{ gap: 8, flex: 1 }}>
      <Label color={light} size={15}>{label}</Label>
      <Text style={{ fontFamily: FONT.serif, fontSize: 84, fontWeight: 700, lineHeight: 1, color: paper }}>{value}</Text>
    </Column>
  );
  const Mark = ({ at, caption, share }: { at: string; caption: string; share: number }) => (
    <Column style={{ flex: share, gap: 4 }}>
      <Text style={{ apply: ["mono"], color: paper, fontSize: 26 }}>{fmtTime(at).replace(" UTC", "")}</Text>
      <Label color={light} size={14}>{caption}</Label>
    </Column>
  );
  return (
    <Canvas
      theme={theme}
      width={1600}
      height={900}
      title={`${i.id} incident summary`}
      lang="en"
      fonts={fontFaces(origin)}
      style={{ backgroundColor: token("colors.primary"), padding: [60, 76], justifyContent: "space-between", color: paper }}
    >
      <Row stackOnMobile={false} style={{ alignItems: "center" }}>
        <Label color="#E6A08F" size={16}>
          {i.severity} · {statusLabel[i.status]} · {i.id}
        </Label>
        <Text style={{ fontFamily: FONT.serif, fontSize: 30, fontWeight: 700, color: paper, textAlign: "right" }}>{i.org}</Text>
      </Row>
      <Column style={{ gap: 38 }}>
        <Heading level={1} fit={{ sizes: [92, 84, 76, 68, 60, 52], maxLines: 3 }} style={{ color: paper, maxWidth: 1300 }}>
          {i.title}
        </Heading>
        <Row stackOnMobile={false} style={{ gap: 40 }}>
          <Big label="Duration" value={fmtDuration(i.impact.durationMinutes)} />
          <Big label="Customers" value={n(i.impact.usersAffected)} />
          <Big label="Traffic" value={`${i.impact.percentOfTraffic}%`} />
          <Big label="Detected after" value={fmtDuration(d.ttd)} />
        </Row>
      </Column>
      <Column style={{ gap: 22 }}>
        <Column style={{ gap: 12 }}>
          <Row stackOnMobile={false} style={{ gap: 5, height: 22 }}>
            <Column style={{ flex: seg[0], backgroundColor: token("colors.accent"), height: 22 }} />
            <Column style={{ flex: seg[1], backgroundColor: paper, height: 22 }} />
            <Column style={{ flex: seg[2], backgroundColor: "#5E6978", height: 22 }} />
          </Row>
          <Row stackOnMobile={false} style={{ gap: 5 }}>
            <Mark at={i.startedAt} caption={`Undetected · ${fmtDuration(d.ttd)}`} share={seg[0]} />
            <Mark at={i.detectedAt} caption={`To mitigate · ${fmtDuration(d.detectToMitigate)}`} share={seg[1]} />
            <Mark at={i.mitigatedAt} caption={`To resolve · ${fmtDuration(d.mitigateToResolve)}`} share={seg[2]} />
          </Row>
        </Column>
        <Row stackOnMobile={false} style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 22, color: light, flex: 2 }}>
            {doneCount(i)} of {i.actions.length} corrective actions complete. Resolved {fmtDate(i.resolvedAt)}, {fmtTime(i.resolvedAt)}.
          </Text>
          <Text style={{ apply: ["mono"], fontSize: 18, color: light, textAlign: "right" }}>{i.statusUrl.replace(/^https?:\/\//, "")}</Text>
        </Row>
      </Column>
    </Canvas>
  );
}

export const FORMATS = [
  { key: "pdf", label: "Postmortem PDF", short: "PDF" },
  { key: "page", label: "Status page", short: "Page" },
  { key: "email", label: "Stakeholder email", short: "Email" },
  { key: "visual", label: "Visual summary", short: "Image" },
] as const;
export type FormatKey = (typeof FORMATS)[number]["key"];

export function designFor(key: FormatKey, i: Incident, origin: string) {
  switch (key) {
    case "pdf": return <PostmortemDocument i={i} origin={origin} />;
    case "page": return <StatusPage i={i} origin={origin} />;
    case "email": return <StakeholderEmail i={i} />;
    case "visual": return <SummaryCanvas i={i} origin={origin} />;
  }
}
