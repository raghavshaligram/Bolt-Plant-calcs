import { useMemo, useState } from 'react'
import { formatDate, type ISODate } from '../calc/dates.ts'
import { CARE_LABEL, type CareType, type Placement } from '../calc/schedule.ts'
import { tasksForPlant, sortTasks, type Task } from '../calc/tasks.ts'
import { addPlant, archivePlant, deletePlant, markDone, setOverride, toggleMuted, updatePlant } from '../data/actions.ts'
import { searchSpecies, speciesById, SPECIES, type Species } from '../data/ported/species.ts'
import { STANDARD_SIZES } from '../data/ported/potsize.ts'
import { ALL_ZONES } from '../data/ported/zones.ts'
import type { Plant, Store } from '../data/schema.ts'
import { Empty, PlantAvatar, ScreenProps, TaskRow, ToxicityNote, ToxicityPill, Why } from './common.tsx'
import { Back, GroupGlyph, Plus, Search, Warning } from './icons.tsx'
import { AVATAR_MAX, PhotoInput } from './PhotoInput.tsx'

export function Plants({ store, today, update }: ScreenProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')

  if (adding) {
    return (
      <AddPlant
        store={store}
        today={today}
        onCancel={() => setAdding(false)}
        onAdd={(p) => {
          update((s) => addPlant(s, p))
          setAdding(false)
        }}
      />
    )
  }

  const plant = selected ? store.plants.find((p) => p.id === selected) : null
  if (plant) {
    return <PlantDetail plant={plant} store={store} today={today} update={update} onBack={() => setSelected(null)} />
  }

  const needle = q.trim().toLowerCase()
  const shown = store.plants
    .filter((p) => !p.archived)
    .filter((p) => {
      if (!needle) return true
      const sp = speciesById(p.speciesId)
      return (
        p.name.toLowerCase().includes(needle) ||
        (p.room ?? '').toLowerCase().includes(needle) ||
        (sp?.common.toLowerCase().includes(needle) ?? false)
      )
    })

  const archived = store.plants.filter((p) => p.archived)

  return (
    <>
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={17} />
          <input type="search" placeholder="Search your plants, or a room" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn primary" onClick={() => setAdding(true)}>
          <Plus size={17} /> Add a plant
        </button>
      </div>

      {shown.length === 0 ? (
        <Empty title={needle ? 'Nothing matches that' : 'No plants yet'}>
          {needle ? 'Try a different word.' : 'Add the first one and the schedule works itself out.'}
        </Empty>
      ) : (
        <div className="plants">
          {shown.map((p) => (
            <PlantCard key={p.id} plant={p} today={today} onOpen={() => setSelected(p.id)} />
          ))}
        </div>
      )}

      {archived.length ? (
        <>
          <div className="section-title">
            <h2>Archived</h2>
            <span className="muted small">{archived.length}</span>
          </div>
          <div className="plants">
            {archived.map((p) => (
              <PlantCard key={p.id} plant={p} today={today} onOpen={() => setSelected(p.id)} />
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}

function PlantCard({ plant, today, onOpen }: { plant: Plant; today: ISODate; onOpen: () => void }) {
  const species = speciesById(plant.speciesId)
  const tasks = useMemo(() => sortTasks(tasksForPlant(plant, today)), [plant, today])
  if (!species) return null
  const late = tasks.filter((t) => t.daysUntil !== null && t.daysUntil < 0)
  const next = tasks.find((t) => t.daysUntil !== null && t.daysUntil >= 0)

  return (
    <button className="plant-card" onClick={onOpen}>
      <PlantAvatar plant={plant} species={species} />
      <div className="who">
        <div className="name">{plant.name}</div>
        <div className="species">
          {species.common}
          {plant.room ? ` · ${plant.room}` : ''}
        </div>
        <div className="badges">
          {late.length ? (
            <span className="pill late">
              {late.length === 1 ? `${CARE_LABEL[late[0].care]} is late` : `${late.length} jobs late`}
            </span>
          ) : next ? (
            <span className="pill">
              {CARE_LABEL[next.care]} {next.daysUntil === 0 ? 'today' : `in ${next.daysUntil} d`}
            </span>
          ) : null}
          {species.toxicity.verdict === 'toxic' ? <ToxicityPill species={species} /> : null}
        </div>
      </div>
    </button>
  )
}

// ---- detail ------------------------------------------------------------------

function PlantDetail({
  plant,
  store,
  today,
  update,
  onBack,
}: {
  plant: Plant
  store: Store
  today: ISODate
  update: (fn: (s: Store) => Store) => void
  onBack: () => void
}) {
  const species = speciesById(plant.speciesId)
  const [editing, setEditing] = useState(false)
  const [openWhy, setOpenWhy] = useState<CareType | null>(null)
  const tasks = useMemo(() => sortTasks(tasksForPlant(plant, today)), [plant, today])
  const entries = store.log.filter((l) => l.plantId === plant.id).slice(0, 8)

  if (!species) {
    return (
      <>
        <button className="btn ghost" onClick={onBack}>
          <Back size={17} /> Back
        </button>
        <div className="notice warn" style={{ marginTop: 14 }}>
          <Warning size={18} />
          <div>
            <b>{plant.name}</b> is recorded as <code>{plant.speciesId}</code>, which is not in this build's plant list.
            Nothing has been lost — the record is still in your file. Pick a species for it to get its schedule back.
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn ghost" onClick={onBack}>
          <Back size={17} /> All plants
        </button>
        <div className="spacer" />
        <button className="btn small" onClick={() => setEditing(!editing)}>
          {editing ? 'Done editing' : 'Edit'}
        </button>
      </div>

      <div className="card">
        <div className="body row" style={{ alignItems: 'flex-start', gap: 14 }}>
          <PlantAvatar plant={plant} species={species} size={58} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 21 }}>{plant.name}</h1>
            <div className="small muted">
              {species.common} · <span className="botanical">{species.botanical}</span>
            </div>
            <div className="badges" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
              <ToxicityPill species={species} />
              <span className="pill">{plant.placement.potDiameterIn} in pot</span>
              <span className="pill">{plant.placement.where === 'indoor' ? 'Indoors' : 'Outdoors'}</span>
              <span className="pill">Zone {plant.placement.zone}</span>
              {plant.room ? <span className="pill">{plant.room}</span> : null}
            </div>
            <div style={{ marginTop: 10 }}>
              <ToxicityNote species={species} />
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <EditPlant plant={plant} store={store} update={update} onArchive={onBack} />
      ) : (
        <>
          <div className="section-title">
            <h2>Care</h2>
          </div>
          <div className="card">
            {tasks.map((t) => (
              <CareLine
                key={t.care}
                task={t}
                today={today}
                open={openWhy === t.care}
                onToggle={() => setOpenWhy(openWhy === t.care ? null : t.care)}
                onDone={() => update((s) => markDone(s, plant.id, t.care, today))}
                onOverride={(days) => update((s) => setOverride(s, plant.id, t.care, days))}
                onMute={() => update((s) => toggleMuted(s, plant.id, t.care))}
              />
            ))}
            {plant.muted?.length ? (
              <div className="care">
                <div className="what small muted">
                  Switched off for this plant: {plant.muted.map((c) => CARE_LABEL[c]).join(', ')}.
                  {plant.muted.map((c) => (
                    <button key={c} className="btn ghost small" onClick={() => update((s) => toggleMuted(s, plant.id, c))}>
                      Turn {CARE_LABEL[c].toLowerCase()} back on
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="section-title">
            <h2>About {species.common}</h2>
          </div>
          <div className="card">
            <div className="body">
              <p className="small">{species.notes}</p>
              <div className="divider" />
              <dl className="kv">
                <dt>Light</dt>
                <dd>{LIGHT_WORDS[species.light]}</dd>
                <dt>Water</dt>
                <dd>{WATER_WORDS[species.water]}</dd>
                <dt>Humidity</dt>
                <dd>{HUMIDITY_WORDS[species.humidity]}</dd>
                <dt>Feeding</dt>
                <dd>{FEED_WORDS[species.feed]}</dd>
                <dt>Size</dt>
                <dd>{species.size}</dd>
                <dt>Repotting</dt>
                <dd>{species.repotYears ? `About every ${species.repotYears} years` : 'Not grown in compost'}</dd>
              </dl>
            </div>
          </div>

          {plant.notes ? (
            <div className="card">
              <div className="body small">{plant.notes}</div>
            </div>
          ) : null}

          {entries.length ? (
            <>
              <div className="section-title">
                <h2>Recent history</h2>
              </div>
              <div className="card">
                {entries.map((l) => (
                  <div className="care" key={l.id}>
                    <div className="what">
                      <div className="small">
                        {l.kind === 'care' && l.care ? <b>{CARE_LABEL[l.care]}</b> : null}
                        {l.text ? <> {l.text}</> : null}
                      </div>
                      <div className="when">{formatDate(l.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </>
  )
}

function CareLine({
  task,
  today,
  open,
  onToggle,
  onDone,
  onOverride,
  onMute,
}: {
  task: Task
  today: ISODate
  open: boolean
  onToggle: () => void
  onDone: () => void
  onOverride: (days: number | null) => void
  onMute: () => void
}) {
  const [draft, setDraft] = useState('')
  return (
    <TaskRow task={task} today={today} onDone={onDone} showPlant={false} whyOpen={open} onWhy={onToggle}>
      {open ? (
        <div>
          <Why interval={task.interval} days={task.interval.days} />
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <span className="small muted">Your own interval:</span>
            <input
              type="number"
              min={1}
              max={365}
              style={{ width: 90 }}
              placeholder={String(task.interval.days ?? '')}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <span className="small muted">days</span>
            <button
              className="btn small"
              disabled={!draft || Number(draft) < 1}
              onClick={() => {
                onOverride(Number(draft))
                setDraft('')
              }}
            >
              Use mine
            </button>
            {task.overridden ? (
              <button className="btn ghost small" onClick={() => onOverride(null)}>
                Go back to the app's figure
              </button>
            ) : null}
            <button className="btn ghost small" onClick={onMute}>
              Don't remind me about this
            </button>
          </div>
        </div>
      ) : null}
    </TaskRow>
  )
}

// ---- add and edit ------------------------------------------------------------

const LIGHT_WORDS = {
  low: 'Copes with a dim corner',
  medium: 'Somewhere with daylight but no direct sun',
  bright: 'Bright, but out of direct sun',
  direct: 'Direct sun for several hours',
} as const

const WATER_WORDS = {
  arid: 'Let it dry out completely',
  'dry-between': 'Let the top third dry between waterings',
  'evenly-moist': 'Keep it evenly damp, never soggy',
  wet: 'Never let it dry out',
} as const

const HUMIDITY_WORDS = { low: 'Ordinary dry room air is fine', average: 'Average room humidity', high: 'Wants humid air' } as const

const FEED_WORDS = {
  none: 'Does better unfed',
  light: 'A light feed now and then in summer',
  average: 'Feed monthly in the growing season',
  heavy: 'Feed fortnightly while it is growing',
} as const

function PlacementFields({ value, onChange }: { value: Placement; onChange: (p: Placement) => void }) {
  return (
    <>
      <div className="grid2">
        <div>
          <label className="field" htmlFor="pot">
            Pot size
          </label>
          <select
            id="pot"
            value={String(value.potDiameterIn)}
            onChange={(e) => onChange({ ...value, potDiameterIn: Number(e.target.value) })}
          >
            {STANDARD_SIZES.map((s) => (
              <option key={s.id} value={s.diameterIn}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field" htmlFor="where">
            Where it lives
          </label>
          <select id="where" value={value.where} onChange={(e) => onChange({ ...value, where: e.target.value as Placement['where'] })}>
            <option value="indoor">Indoors</option>
            <option value="outdoor">Outdoors</option>
          </select>
        </div>
        <div>
          <label className="field" htmlFor="light">
            Light in that spot
          </label>
          <select
            id="light"
            value={value.light ?? ''}
            onChange={(e) => onChange({ ...value, light: (e.target.value || undefined) as Placement['light'] })}
          >
            <option value="">Not sure</option>
            <option value="low">Dim — no direct sun, away from a window</option>
            <option value="medium">Daylight, no direct sun</option>
            <option value="bright">Bright, near a window</option>
            <option value="direct">Direct sun for hours</option>
          </select>
        </div>
        <div>
          <label className="field" htmlFor="drain">
            Soil and pot
          </label>
          <select
            id="drain"
            value={value.drainage ?? 'standard'}
            onChange={(e) => onChange({ ...value, drainage: e.target.value as Placement['drainage'] })}
          >
            <option value="standard">Ordinary compost, pot with a hole</option>
            <option value="free">Gritty, free-draining mix</option>
            <option value="slow">Dense compost, or no drainage hole</option>
          </select>
        </div>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <input
          id="humid"
          type="checkbox"
          style={{ width: 18, height: 18, minHeight: 0 }}
          checked={Boolean(value.humidified)}
          onChange={(e) => onChange({ ...value, humidified: e.target.checked })}
        />
        <label htmlFor="humid" className="small">
          Humidifier, pebble tray or a bathroom
        </label>
      </div>
    </>
  )
}

function AddPlant({
  store,
  today,
  onAdd,
  onCancel,
}: {
  store: Store
  today: ISODate
  onAdd: (p: Omit<Plant, 'id' | 'lastDone'>) => void
  onCancel: () => void
}) {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Species | null>(null)
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [placement, setPlacement] = useState<Placement>({
    potDiameterIn: 6,
    where: store.settings.defaultWhere,
    zone: store.settings.zone,
  })

  const results = useMemo(() => (q.trim() ? searchSpecies(q).slice(0, 40) : SPECIES.slice(0, 24)), [q])

  if (!picked) {
    return (
      <>
        <div className="toolbar">
          <button className="btn ghost" onClick={onCancel}>
            <Back size={17} /> Cancel
          </button>
        </div>
        <div className="section-title">
          <h2>Which plant is it?</h2>
          <span className="muted small">{SPECIES.length} in the book</span>
        </div>
        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input autoFocus type="search" placeholder="Monstera, fern, tomato…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="card">
          {results.map((s) => (
            <SpeciesRow
              key={s.id}
              species={s}
              onClick={() => {
                setPicked(s)
                setName(s.common)
              }}
            />
          ))}
          {results.length === 0 ? <div className="body muted small">Nothing matches that.</div> : null}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn ghost" onClick={() => setPicked(null)}>
          <Back size={17} /> Pick a different plant
        </button>
      </div>
      <div className="card">
        <div className="head">
          <div className="species-row glyph" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center' }}>
            <GroupGlyph group={picked.group} size={19} />
          </div>
          <div>
            <b>{picked.common}</b>
            <div className="tiny muted botanical">{picked.botanical}</div>
          </div>
        </div>
        <div className="body stack">
          <div>
            <label className="field" htmlFor="pname">
              What do you call it?
            </label>
            <input id="pname" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid2">
            <div>
              <label className="field" htmlFor="proom">
                Room (optional)
              </label>
              <input id="proom" type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Kitchen" />
            </div>
            <div>
              <label className="field" htmlFor="pzone">
                Zone
              </label>
              <select id="pzone" value={placement.zone} onChange={(e) => setPlacement({ ...placement, zone: e.target.value })}>
                {ALL_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <PlacementFields value={placement} onChange={setPlacement} />

          <div className="notice info">
            <GroupGlyph group={picked.group} size={18} />
            <div>
              Nothing is marked as done yet, so nothing will show as overdue. The first time you water it, tap Done and
              the schedule starts from there.
            </div>
          </div>

          <div className="row">
            <button
              className="btn primary"
              disabled={!name.trim()}
              onClick={() =>
                onAdd({
                  speciesId: picked.id,
                  name: name.trim(),
                  ...(room.trim() ? { room: room.trim() } : {}),
                  acquired: today,
                  placement,
                })
              }
            >
              Add {name.trim() || 'plant'}
            </button>
            <button className="btn ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export function SpeciesRow({ species, onClick }: { species: Species; onClick: () => void }) {
  return (
    <button className="species-row" onClick={onClick}>
      <span className="glyph">
        <GroupGlyph group={species.group} size={19} />
      </span>
      <span className="names">
        <span className="common">{species.common}</span>
        <br />
        <span className="botanical">{species.botanical}</span>
      </span>
      {species.toxicity.verdict === 'toxic' ? <ToxicityPill species={species} /> : null}
    </button>
  )
}

function EditPlant({
  plant,
  store,
  update,
  onArchive,
}: {
  plant: Plant
  store: Store
  update: (fn: (s: Store) => Store) => void
  onArchive: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="card">
      <div className="body stack">
        <div className="grid2">
          <div>
            <label className="field" htmlFor="ename">
              Name
            </label>
            <input
              id="ename"
              type="text"
              value={plant.name}
              onChange={(e) => update((s) => updatePlant(s, plant.id, (p) => ({ ...p, name: e.target.value })))}
            />
          </div>
          <div>
            <label className="field" htmlFor="eroom">
              Room
            </label>
            <input
              id="eroom"
              type="text"
              value={plant.room ?? ''}
              onChange={(e) => update((s) => updatePlant(s, plant.id, (p) => ({ ...p, room: e.target.value || undefined })))}
            />
          </div>
        </div>

        <PlacementFields
          value={plant.placement}
          onChange={(placement) => update((s) => updatePlant(s, plant.id, (p) => ({ ...p, placement })))}
        />

        <div className="grid2">
          <div>
            <label className="field" htmlFor="eacq">
              Date you got it
            </label>
            <input
              id="eacq"
              type="date"
              value={plant.acquired ?? ''}
              onChange={(e) =>
                update((s) => updatePlant(s, plant.id, (p) => ({ ...p, acquired: e.target.value || undefined })))
              }
            />
          </div>
          <div>
            <label className="field">Photo</label>
            <PhotoInput
              round
              maxEdge={AVATAR_MAX}
              label="Take a photo"
              value={plant.photo}
              onChange={(photo) => update((s) => updatePlant(s, plant.id, (p) => ({ ...p, photo })))}
            />
          </div>
        </div>

        <div>
          <label className="field" htmlFor="enotes">
            Your notes about this plant
          </label>
          <textarea
            id="enotes"
            value={plant.notes ?? ''}
            onChange={(e) => update((s) => updatePlant(s, plant.id, (p) => ({ ...p, notes: e.target.value || undefined })))}
          />
        </div>

        <div className="divider" />

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => { update((s) => archivePlant(s, plant.id, !plant.archived)); onArchive() }}>
            {plant.archived ? 'Bring it back' : 'Archive it'}
          </button>
          {confirming ? (
            <>
              <span className="small muted">Delete {plant.name} and its history for good?</span>
              <button
                className="btn"
                style={{ borderColor: 'var(--clay-400)', color: 'var(--clay-800)' }}
                onClick={() => {
                  update((s) => deletePlant(s, plant.id))
                  onArchive()
                }}
              >
                Yes, delete
              </button>
              <button className="btn ghost" onClick={() => setConfirming(false)}>
                No
              </button>
            </>
          ) : (
            <button className="btn ghost" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )}
        </div>
        <p className="tiny muted">
          Archiving keeps the plant and everything you wrote about it, out of the way. Deleting removes the journal too.
          {store.log.filter((l) => l.plantId === plant.id).length
            ? ` There are ${store.log.filter((l) => l.plantId === plant.id).length} entries for this one.`
            : ''}
        </p>
      </div>
    </div>
  )
}
