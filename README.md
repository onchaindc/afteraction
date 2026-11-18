# AFTERACTION

Incident communications studio built on [Hyper Elements](https://www.hyperelements.dev).

Enter an incident once. The same data model drives four coordinated outputs:

| Output | Hyper Elements root | Render API |
|--------|---------------------|------------|
| Postmortem document | `<Document>` | `render()` → print-ready HTML |
| Public status page | `<Page>` | `render()` → responsive HTML |
| Stakeholder email | `<Email>` | `render()` → email-safe HTML + plain text |
| Visual summary card | `<Canvas>` | `render()` → fixed-size HTML preview |

Templates live in `src/templates/`. The editor calls `await render(element)` from `@hyper-elements/react` on every change and shows the result in a live iframe — not static mockups.

## Setup

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

```bash
npm run build   # tsc --noEmit && vite build
npm run preview
```

## How it works

1. **Shared model** — `src/types/incident.ts` and `src/data/sampleIncident.ts` define one incident record (details, timeline, impact, root cause, corrective actions).
2. **Editor** — left panel edits the record; timeline and corrective actions support add/remove.
3. **Validation** — `src/lib/validateIncident.ts` checks required fields, date order, resolved-without-timestamp, and timeline chronology. Issues show in the editor.
4. **Outputs** — tab bar switches format; `App.tsx` builds the matching Hyper Elements tree and re-renders.

### Hyper Elements integration

```ts
import { render } from '@hyper-elements/react'
import { PostmortemDocument } from './templates/PostmortemDocument'
// …
const { html } = await render(<PostmortemDocument incident={incident} />)
```

Components used: `Document`, `Page`, `Email`, `Canvas`, `Section`, `Column`, `Heading`, `Text`, `PageHeader`, `PageFooter`, `PageNumber`, `PageBreak`.

Design tokens in `src/templates/tokens.ts` keep navy / paper / accent consistent across all four roots.

> **PDF & image bytes:** `renderPdf()` and `renderImage()` are Node-only. In the browser we use `render()` so Document is print-ready HTML (Save as PDF) and Canvas is an HTML preview of the card layout.

## Design

Editorial, restrained: deep navy editor, warm off-white preview, muted orange-red accent, IBM Plex Sans / Mono + Libre Baskerville, precise UTC timestamps. No generic SaaS cards or heavy chrome.

## Screenshots

After `npm run dev`:

- **Postmortem** — multi-page document with summary, impact, root cause, timeline, corrective actions, headers/footers.
- **Status page** — public-facing page with status banner and reverse-chronological updates.
- **Stakeholder email** — navy header, status body, next steps, stakeholder line.
- **Visual summary** — 1200×630 style card for sharing.

Switch tabs in the preview bar to compare formats against the same sample incident (major Checkout API outage).

## License

MIT
