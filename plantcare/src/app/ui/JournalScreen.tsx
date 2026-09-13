import { useMemo, useState } from 'react'
import { formatDate, type ISODate } from '../calc/dates.ts'
import { CARE_LABEL } from '../calc/schedule.ts'
import { logEntry, removeLogEntry } from '../data/actions.ts'
import { speciesById } from '../data/ported/species.ts'
import type { LogEntry, Store } from '../data/schema.ts'
import { Empty, ScreenProps } from './common.tsx'
import { CARE_ICON, Journal, Search, Stethoscope } from './icons.tsx'
import { PhotoInput } from './PhotoInput.tsx'

/**
 * Everything that has happened, newest first.
 *
 * This is the part of the app that is worth more in year three than in week
 * one, and the reason the file format keeps entries rather than only current
 * state. "When did I last repot this" and "what did the brown tips turn out to
 * be last winter" are the questions, and they are unanswerable from a schedule
 * alone.
 */
export function JournalScreen({ store, today, update }: ScreenProps) {
  const [q, setQ] = useState('')
  const [plantId, setPlantId] = useState<string>('')
  const [draft, setDraft] = useState('')
  const [draftPhoto, setDraftPhoto] = useState<string | undefined>(undefined)
  const [draftPlant, setDraftPlant] = useState(store.plants.find((p) => !p.archived)?.id ?? '')

  const names = useMemo(() => new Map(store.plants.map((p) => [p.id, p.name])), [store.plants])

  const entries = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return store.log
      .filter((l) => (plantId ? l.plantId === plantId : true))
      .filter((l) => {
        if (!needle) return true
        return (
          (l.text ?? '').toLowerCase().includes(needle) ||
          (names.get(l.plantId) ?? '').toLowerCase().includes(needle) ||
          (l.care ? CARE_LABEL[l.care].toLowerCase().includes(needle) : false)
        )
      })
      .slice(0, 200)
  }, [store.log, q, plantId, names])

  const byDate = useMemo(() => {
    const groups: { date: ISODate; items: LogEntry[] }[] = []
    for (const e of entries) {
      const last = groups[groups.length - 1]
      if (last && last.date === e.date) last.items.push(e)
      else groups.push({ date: e.date, items: [e] })
    }
    return groups
  }, [entries])

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="body">
          <label className="field" htmlFor="note">
            Write something down
          </label>
          <textarea
            id="note"
            placeholder="New leaf opening. Moved it away from the radiator."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div style={{ marginTop: 10 }}>
            <PhotoInput value={draftPhoto} onChange={setDraftPhoto} label="Add a photo" />
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <select value={draftPlant} onChange={(e) => setDraftPlant(e.target.value)} style={{ width: 'auto' }}>
              {store.plants
                .filter((p) => !p.archived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <button
              className="btn primary"
              disabled={(!draft.trim() && !draftPhoto) || !draftPlant}
              onClick={() => {
                update((s) =>
                  logEntry(s, {
                    plantId: draftPlant,
                    date: today,
                    kind: draftPhoto ? 'photo' : 'note',
                    ...(draft.trim() ? { text: draft.trim() } : {}),
                    ...(draftPhoto ? { photo: draftPhoto } : {}),
                  })
                )
                setDraft('')
                setDraftPhoto(undefined)
              }}
            >
              Add to the journal
            </button>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={17} />
          <input type="search" placeholder="Search the journal" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={plantId} onChange={(e) => setPlantId(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All plants</option>
          {store.plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {entries.length === 0 ? (
        <Empty title={q || plantId ? 'Nothing matches' : 'Nothing written down yet'}>
          {q || plantId ? 'Try a different word, or all plants.' : 'Marking a job done writes a line here by itself.'}
        </Empty>
      ) : (
        byDate.map((g) => (
          <div key={g.date}>
            <div className="section-title">
              <h3>{formatDate(g.date)}</h3>
            </div>
            <div className="card">
              {g.items.map((l) => (
                <Entry key={l.id} entry={l} store={store} onRemove={() => update((s) => removeLogEntry(s, l.id))} />
              ))}
            </div>
          </div>
        ))
      )}
    </>
  )
}

function Entry({ entry, store, onRemove }: { entry: LogEntry; store: Store; onRemove: () => void }) {
  const [open, setOpen] = useState(false)
  const plant = store.plants.find((p) => p.id === entry.plantId)
  const species = plant ? speciesById(plant.speciesId) : undefined
  const Icon = entry.kind === 'diagnosis' ? Stethoscope : entry.care ? CARE_ICON[entry.care] : Journal

  return (
    <div className={`care ${entry.care ?? ''}`}>
      <div className="icon">
        <Icon size={18} />
      </div>
      <div className="what">
        <div className="small">
          {entry.care ? <b>{CARE_LABEL[entry.care]}</b> : null}
          {entry.care && entry.text ? ' · ' : null}
          {entry.text}
        </div>
        <div className="when">
          {plant?.name ?? 'a plant that is no longer in the file'}
          {species ? ` · ${species.common}` : ''}
        </div>
        {entry.photo ? (
          <img
            src={entry.photo}
            alt=""
            style={{
              display: 'block',
              marginTop: 6,
              maxWidth: 260,
              width: '100%',
              borderRadius: 9,
              border: '1px solid var(--bark-200)',
            }}
          />
        ) : null}
        {entry.diagnosis?.length ? (
          <>
            <button className="btn ghost small" style={{ marginTop: 6, marginLeft: -10 }} onClick={() => setOpen(!open)}>
              {open ? 'Hide what you answered' : 'What you answered'}
            </button>
            {open ? (
              <ol className="tiny muted" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {entry.diagnosis.map((d, i) => (
                  <li key={i}>
                    {d.question} — <b style={{ color: 'var(--bark-800)' }}>{d.answer}</b>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        ) : null}
      </div>
      <button className="btn ghost small" onClick={onRemove} aria-label="Remove this entry">
        Remove
      </button>
    </div>
  )
}
