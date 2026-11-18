# AFTERACTION

Incident communications studio.

Enter an incident once. Generate four coordinated outputs from the same data:

1. **Postmortem** — print-ready document (PDF via Hyper Elements `Document`)
2. **Status page** — public incident page (`Page`)
3. **Stakeholder email** — notification (`Email`)
4. **Visual summary** — shareable card (`Canvas`)

All four use [`@hyper-elements/react`](https://www.hyperelements.dev) rendering APIs — not static mockups.

## Run

```bash
npm install
npm run dev
```

## Design

Editorial and restrained: deep navy, warm off-white, muted orange-red accent, strong typography, precise timestamps. No generic dashboard chrome.

## Validation

The editor runs a consistency check on dates, timeline order, required fields, and status/resolution alignment. Errors and warnings surface in the left panel before you ship.

## Stack

Vite · React · TypeScript · `@hyper-elements/react`
