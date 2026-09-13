import { useMemo, useState } from 'react'
import { CARE_LABEL, CARE_TYPES, intervalFor, type Placement } from '../calc/schedule.ts'
import { humanInterval } from '../calc/dates.ts'
import { searchSpecies, SPECIES, type Species, type SpeciesGroup } from '../data/ported/species.ts'
import { COMPANION_PLANTS } from '../data/ported/companion.ts'
import { addPlant } from '../data/actions.ts'
import { Empty, ScreenProps, ToxicityNote, ToxicityPill, Why } from './common.tsx'
import { Back, CARE_ICON, GroupGlyph, Search } from './icons.tsx'
import { SpeciesRow } from './Plants.tsx'

const GROUPS: { id: SpeciesGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'foliage', label: 'Foliage' },
  { id: 'vine', label: 'Trailing & climbing' },
  { id: 'succulent', label: 'Succulents & cacti' },
  { id: 'flowering', label: 'Flowering' },
  { id: 'fern', label: 'Ferns' },
  { id: 'palm', label: 'Palms' },
  { id: 'prayer', label: 'Prayer plants' },
  { id: 'tree', label: 'Trees' },
  { id: 'herb', label: 'Herbs' },
  { id: 'vegetable', label: 'Edibles' },
  { id: 'carnivore', label: 'Carnivorous' },
  { id: 'other', label: 'Other' },
]

/**
 * The reference book.
 *
 * Three hundred plants is only useful if finding one is instant, so this is a
 * search box and a flat list rather than a browsable hierarchy. The group
 * filter is there for the other way people arrive — "show me something for a
 * dark room" is a browse, not a search.
 */
export function Library({ store, today, update }: ScreenProps) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<SpeciesGroup | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)

  const results = useMemo(() => {
    const base = q.trim() ? searchSpecies(q) : SPECIES
    return group === 'all' ? base : base.filter((s) => s.group === group)
  }, [q, group])

  const species = open ? SPECIES.find((s) => s.id === open) : null
  if (species) {
    return (
      <SpeciesDetail
        species={species}
        store={store}
        onBack={() => setOpen(null)}
        onAdd={() =>
          update((s) =>
            addPlant(s, {
              speciesId: species.id,
              name: species.common,
              placement: { potDiameterIn: 6, where: s.settings.defaultWhere, zone: s.settings.zone },
              acquired: today,
            })
          )
        }
      />
    )
  }

  return (
    <>
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={17} />
          <input
            type="search"
            placeholder={`Search ${SPECIES.length} plants by name or botanical name`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select value={group} onChange={(e) => setGroup(e.target.value as SpeciesGroup | 'all')} style={{ width: 'auto' }}>
          {GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className="small muted" style={{ marginBottom: 10 }}>
        {results.length} {results.length === 1 ? 'plant' : 'plants'}
        {results.length > 200 ? ' · type a few letters to narrow it down' : ''}
      </div>

      {results.length === 0 ? (
        <Empty title="Nothing matches that">Try the botanical name, or part of it.</Empty>
      ) : (
        <div className="card">
          {results.slice(0, 120).map((s) => (
            <SpeciesRow key={s.id} species={s} onClick={() => setOpen(s.id)} />
          ))}
          {results.length > 120 ? (
            <div className="body muted small">
              {results.length - 120} more. Narrow the search rather than scrolling — it is faster.
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}

function SpeciesDetail({
  species,
  store,
  onBack,
  onAdd,
}: {
  species: Species
  store: { settings: { zone: string; defaultWhere: Placement['where'] } }
  onBack: () => void
  onAdd: () => void
}) {
  const [added, setAdded] = useState(false)
  const [pot, setPot] = useState(6)
  const place: Placement = { potDiameterIn: pot, where: store.settings.defaultWhere, zone: store.settings.zone }
  const todayISO = new Date().toISOString().slice(0, 10)
  const companion = species.companion ? COMPANION_PLANTS.find((c) => c.name === species.companion) : null

  return (
    <>
      <div className="toolbar">
        <button className="btn ghost" onClick={onBack}>
          <Back size={17} /> Back to the list
        </button>
        <div className="spacer" />
        <button
          className="btn primary small"
          disabled={added}
          onClick={() => {
            onAdd()
            setAdded(true)
          }}
        >
          {added ? 'Added to your plants' : 'Add one of these'}
        </button>
      </div>

      <div className="card">
        <div className="body row" style={{ alignItems: 'flex-start', gap: 14 }}>
          <div className="avatar" style={{ width: 54, height: 54 }}>
            <GroupGlyph group={species.group} size={30} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 21 }}>{species.common}</h1>
            <div className="small muted botanical">{species.botanical}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
              <ToxicityPill species={species} />
              <span className="pill">{species.size}</span>
            </div>
            <p className="small" style={{ marginTop: 11 }}>
              {species.notes}
            </p>
            <ToxicityNote species={species} />
          </div>
        </div>
      </div>

      <div className="section-title">
        <h2>What it wants</h2>
      </div>
      <div className="card">
        <div className="body">
          <dl className="kv">
            <dt>Light</dt>
            <dd>{LIGHT_WORDS[species.light]}</dd>
            <dt>Water</dt>
            <dd>{WATER_WORDS[species.water]}</dd>
            <dt>Humidity</dt>
            <dd>{HUMIDITY_WORDS[species.humidity]}</dd>
            <dt>Feeding</dt>
            <dd>{FEED_WORDS[species.feed]}</dd>
            <dt>Misting</dt>
            <dd>{species.mist ? 'Worth doing, if you do it daily' : 'Does nothing useful for this one'}</dd>
            <dt>Repotting</dt>
            <dd>{species.repotYears ? `About every ${species.repotYears} years, in spring` : 'Not grown in compost'}</dd>
          </dl>
        </div>
      </div>

      <div className="section-title">
        <h2>Schedule in your conditions</h2>
        <span className="muted small">zone {store.settings.zone}, today</span>
      </div>
      <div className="card">
        <div className="body">
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="small muted">If it were in a</span>
            <select value={String(pot)} onChange={(e) => setPot(Number(e.target.value))} style={{ width: 'auto' }}>
              {[3, 4, 6, 8.5, 10.5, 12, 14.75].map((d) => (
                <option key={d} value={d}>
                  {d} in pot
                </option>
              ))}
            </select>
          </div>
          {CARE_TYPES.map((care) => {
            const interval = intervalFor(care, species, place, todayISO)
            const Icon = CARE_ICON[care]
            return (
              <div className="care" key={care} style={{ paddingLeft: 0, paddingRight: 0 }}>
                <div className="icon">
                  <Icon size={18} />
                </div>
                <div className="what">
                  <div>
                    <b>{CARE_LABEL[care]}</b>
                    {interval.days ? ` · ${humanInterval(interval.days)}` : ' · not for this plant'}
                  </div>
                  <div className="when">{interval.skipped ?? interval.factors[interval.factors.length - 1]?.why}</div>
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 12 }}>
            <Why interval={intervalFor('water', species, place, todayISO)} days={intervalFor('water', species, place, todayISO).days} />
          </div>
        </div>
      </div>

      {companion ? (
        <>
          <div className="section-title">
            <h2>Growing it with other things</h2>
          </div>
          <div className="card">
            <div className="body">
              <dl className="kv">
                <dt>Plant near</dt>
                <dd>{companion.good.length ? companion.good.join(', ') : 'Nothing in particular'}</dd>
                <dt>Keep apart from</dt>
                <dd>{companion.avoid.length ? companion.avoid.join(', ') : 'Nothing in particular'}</dd>
              </dl>
              <p className="tiny muted" style={{ marginTop: 10 }}>
                The same table as the companion planting guide on harvestmath.com — one source, so the app and the site
                never tell you two different things.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}

const LIGHT_WORDS = {
  low: 'Copes with a dim corner',
  medium: 'Daylight, but no direct sun',
  bright: 'Bright, out of direct sun',
  direct: 'Direct sun for several hours a day',
} as const

const WATER_WORDS = {
  arid: 'Let it dry out completely between waterings',
  'dry-between': 'Let the top third of the compost dry out first',
  'evenly-moist': 'Keep it evenly damp, never soggy',
  wet: 'Never let it dry out',
} as const

const HUMIDITY_WORDS = {
  low: 'Ordinary dry room air is fine',
  average: 'Average room humidity',
  high: 'Wants genuinely humid air',
} as const

const FEED_WORDS = {
  none: 'Does better unfed',
  light: 'A light feed occasionally in summer',
  average: 'Feed monthly through the growing season',
  heavy: 'Feed fortnightly while it is growing',
} as const
