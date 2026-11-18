import { useCallback, useEffect, useMemo, useState } from 'react'
import { render } from '@hyper-elements/react'
import { sampleIncident } from './data/sampleIncident'
import { validateIncident } from './lib/validateIncident'
import type {
  CorrectiveAction,
  Incident,
  OutputFormat,
  TimelineEvent
} from './types/incident'
import { PostmortemDocument } from './templates/PostmortemDocument'
import { StatusPage } from './templates/StatusPage'
import { StakeholderEmail } from './templates/StakeholderEmail'
import { SummaryCanvas } from './templates/SummaryCanvas'

const FORMATS: { id: OutputFormat; label: string }[] = [
  { id: 'postmortem', label: 'Postmortem PDF' },
  { id: 'status', label: 'Status page' },
  { id: 'email', label: 'Stakeholder email' },
  { id: 'summary', label: 'Visual summary' }
]

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export default function App() {
  const [incident, setIncident] = useState<Incident>(sampleIncident)
  const [format, setFormat] = useState<OutputFormat>('postmortem')
  const [html, setHtml] = useState<string>('')
  const [rendering, setRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

  const issues = useMemo(() => validateIncident(incident), [incident])
  const errors = issues.filter((i) => i.severity === 'error')

  const update = useCallback(<K extends keyof Incident>(key: K, value: Incident[K]) => {
    setIncident((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateTimeline = (id: string, patch: Partial<TimelineEvent>) => {
    setIncident((prev) => ({
      ...prev,
      timeline: prev.timeline.map((e) => (e.id === id ? { ...e, ...patch } : e))
    }))
  }

  const addTimeline = () => {
    const last = incident.timeline[incident.timeline.length - 1]
    const at = last?.at ?? incident.startedAt
    setIncident((prev) => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        { id: uid(), at, title: '', detail: '' }
      ]
    }))
  }

  const removeTimeline = (id: string) => {
    setIncident((prev) => ({
      ...prev,
      timeline: prev.timeline.filter((e) => e.id !== id)
    }))
  }

  const updateAction = (id: string, patch: Partial<CorrectiveAction>) => {
    setIncident((prev) => ({
      ...prev,
      correctiveActions: prev.correctiveActions.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      )
    }))
  }

  const addAction = () => {
    setIncident((prev) => ({
      ...prev,
      correctiveActions: [
        ...prev.correctiveActions,
        { id: uid(), action: '', owner: '', due: '', status: 'open' }
      ]
    }))
  }

  const removeAction = (id: string) => {
    setIncident((prev) => ({
      ...prev,
      correctiveActions: prev.correctiveActions.filter((a) => a.id !== id)
    }))
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      setRendering(true)
      setRenderError(null)
      try {
        let element
        switch (format) {
          case 'postmortem':
            element = <PostmortemDocument incident={incident} />
            break
          case 'status':
            element = <StatusPage incident={incident} />
            break
          case 'email':
            element = <StakeholderEmail incident={incident} />
            break
          case 'summary':
            element = <SummaryCanvas incident={incident} />
            break
        }
        const result = await render(element)
        if (!cancelled) {
          setHtml(result.html)
        }
      } catch (err) {
        if (!cancelled) {
          setRenderError(err instanceof Error ? err.message : String(err))
          setHtml('')
        }
      } finally {
        if (!cancelled) setRendering(false)
      }
    }
    const t = setTimeout(run, 180)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [incident, format])

  return (
    <div className="app">
      <aside className="editor">
        <div className="editor-header">
          <h1>AFTERACTION</h1>
          <p>Incident communications studio</p>
        </div>

        <div className="editor-body">
          {issues.length > 0 && (
            <div className="issues">
              <h3>Consistency check</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {issues.map((iss, i) => (
                  <li key={i} className={iss.severity === 'warning' ? 'warn' : ''}>
                    <strong>{iss.path}</strong> — {iss.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="section-label">Incident</div>
            <div className="field">
              <label>ID</label>
              <input value={incident.id} onChange={(e) => update('id', e.target.value)} />
            </div>
            <div className="field">
              <label>Title</label>
              <input value={incident.title} onChange={(e) => update('title', e.target.value)} />
            </div>
            <div className="row-2">
              <div className="field">
                <label>Severity</label>
                <select
                  value={incident.severity}
                  onChange={(e) => update('severity', e.target.value as Incident['severity'])}
                >
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  value={incident.status}
                  onChange={(e) => update('status', e.target.value as Incident['status'])}
                >
                  <option value="investigating">Investigating</option>
                  <option value="identified">Identified</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Service</label>
              <input value={incident.service} onChange={(e) => update('service', e.target.value)} />
            </div>
            <div className="row-2">
              <div className="field">
                <label>Started (ISO)</label>
                <input value={incident.startedAt} onChange={(e) => update('startedAt', e.target.value)} />
              </div>
              <div className="field">
                <label>Detected (ISO)</label>
                <input value={incident.detectedAt} onChange={(e) => update('detectedAt', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Resolved (ISO, empty if open)</label>
              <input
                value={incident.resolvedAt ?? ''}
                onChange={(e) => update('resolvedAt', e.target.value || null)}
              />
            </div>
            <div className="field">
              <label>Organization</label>
              <input
                value={incident.organization}
                onChange={(e) => update('organization', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Author</label>
              <input value={incident.author} onChange={(e) => update('author', e.target.value)} />
            </div>
          </div>

          <div>
            <div className="section-label">Narrative</div>
            <div className="field">
              <label>Summary</label>
              <textarea value={incident.summary} onChange={(e) => update('summary', e.target.value)} />
            </div>
            <div className="field">
              <label>Impact</label>
              <textarea value={incident.impact} onChange={(e) => update('impact', e.target.value)} />
            </div>
            <div className="field">
              <label>Root cause</label>
              <textarea value={incident.rootCause} onChange={(e) => update('rootCause', e.target.value)} />
            </div>
            <div className="field">
              <label>Stakeholders</label>
              <input
                value={incident.stakeholders}
                onChange={(e) => update('stakeholders', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Status page URL</label>
              <input
                value={incident.statusPageUrl}
                onChange={(e) => update('statusPageUrl', e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="section-label">Timeline</div>
            <div className="block-list">
              {incident.timeline.map((ev) => (
                <div className="block" key={ev.id}>
                  <div className="block-head">
                    <span>Event</span>
                    <button type="button" className="remove" onClick={() => removeTimeline(ev.id)}>
                      Remove
                    </button>
                  </div>
                  <div className="field">
                    <label>When (ISO)</label>
                    <input value={ev.at} onChange={(e) => updateTimeline(ev.id, { at: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Title</label>
                    <input
                      value={ev.title}
                      onChange={(e) => updateTimeline(ev.id, { title: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Detail</label>
                    <textarea
                      value={ev.detail}
                      onChange={(e) => updateTimeline(ev.id, { detail: e.target.value })}
                    />
                  </div>
                </div>
              ))}
              <button type="button" className="add-btn" onClick={addTimeline}>
                + Add timeline event
              </button>
            </div>
          </div>

          <div>
            <div className="section-label">Corrective actions</div>
            <div className="block-list">
              {incident.correctiveActions.map((a) => (
                <div className="block" key={a.id}>
                  <div className="block-head">
                    <span>Action</span>
                    <button type="button" className="remove" onClick={() => removeAction(a.id)}>
                      Remove
                    </button>
                  </div>
                  <div className="field">
                    <label>Action</label>
                    <input value={a.action} onChange={(e) => updateAction(a.id, { action: e.target.value })} />
                  </div>
                  <div className="row-2">
                    <div className="field">
                      <label>Owner</label>
                      <input value={a.owner} onChange={(e) => updateAction(a.id, { owner: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Due</label>
                      <input value={a.due} onChange={(e) => updateAction(a.id, { due: e.target.value })} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Status</label>
                    <select
                      value={a.status}
                      onChange={(e) =>
                        updateAction(a.id, {
                          status: e.target.value as CorrectiveAction['status']
                        })
                      }
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
              ))}
              <button type="button" className="add-btn" onClick={addAction}>
                + Add corrective action
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <p style={{ fontSize: 12, color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>
              Fix errors above for production-ready outputs.
            </p>
          )}
        </div>
      </aside>

      <main className="preview">
        <div className="preview-bar">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={format === f.id ? 'active' : ''}
              onClick={() => setFormat(f.id)}
            >
              {f.label}
            </button>
          ))}
          <span className="preview-meta">
            {rendering ? 'Rendering…' : 'Live · Hyper Elements'}
          </span>
        </div>

        <div className={`preview-frame ${format === 'summary' ? 'canvas-frame' : ''}`}>
          {renderError && <div className="preview-error">{renderError}</div>}
          {!renderError && rendering && !html && <div className="preview-loading">Rendering…</div>}
          {!renderError && html && (
            <iframe title="preview" srcDoc={html} sandbox="allow-same-origin" />
          )}
        </div>
      </main>
    </div>
  )
}
