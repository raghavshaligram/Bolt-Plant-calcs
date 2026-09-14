import { useMemo, useState } from 'react'
import { COMPANION_PLANTS, companionReason, companionVerdict } from '../data/ported/companion.ts'
import { CATEGORY_INFO, POT_PLANT_GUIDE, STANDARD_SIZES } from '../data/ported/potsize.ts'
import { ALL_ZONES, findZoneForZip, fmtDate, mkDate, REF_YEAR, sanitizeZip, ZONE_FROST_DATA } from '../data/ported/zones.ts'
import { formatTempRangeC, formatTempRangeF, ZONE_TEMP_BANDS } from '../data/ported/zoneTemps.ts'
import { setSettings } from '../data/actions.ts'
import type { Store } from '../data/schema.ts'
import { seasonFor, SEASON_LABEL } from '../calc/schedule.ts'
import { formatDate, today as todayISO } from '../calc/dates.ts'
import { Cloud, Leaf, Search, Warning } from './icons.tsx'
import { LightMeter } from './LightMeter.tsx'
import { PotMeasure } from './PotMeasure.tsx'
import { fetchWeather, READING_MAX_AGE_DAYS, type WeatherConfig } from '../data/weather.ts'

type Tool = 'light' | 'measure' | 'zone' | 'companion' | 'pot' | 'weather' | 'settings'

const TABS: { id: Tool; label: string }[] = [
  { id: 'light', label: 'Light meter' },
  { id: 'measure', label: 'Measure a pot' },
  { id: 'zone', label: 'Zone & frost dates' },
  { id: 'companion', label: 'Companion planting' },
  { id: 'pot', label: 'Pot sizes' },
  { id: 'weather', label: 'Live weather' },
  { id: 'settings', label: 'Settings' },
]

/**
 * The three calculators from the site, offline.
 *
 * These are not new tools. They are the same data behind the same questions
 * people already came to harvestmath.com to ask, in a file that works on a
 * phone in a greenhouse with no signal — which is where the questions actually
 * get asked.
 */
export function ToolsScreen({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  const [tab, setTab] = useState<Tool>('light')
  return (
    <>
      <div className="toolbar">
        {TABS.map((t) => (
          <button key={t.id} className={`btn small ${tab === t.id ? 'primary' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'light' ? <LightMeter store={store} update={update} /> : null}
      {tab === 'measure' ? <PotMeasure store={store} update={update} /> : null}
      {tab === 'zone' ? <ZoneTool store={store} update={update} /> : null}
      {tab === 'companion' ? <CompanionTool /> : null}
      {tab === 'pot' ? <PotTool /> : null}
      {tab === 'weather' ? <WeatherTool store={store} update={update} /> : null}
      {tab === 'settings' ? <SettingsTool store={store} update={update} /> : null}
    </>
  )
}

function ZoneTool({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  const [zip, setZip] = useState('')
  const found = useMemo(() => {
    const clean = sanitizeZip(zip)
    return clean.length >= 5 ? findZoneForZip(clean) : null
  }, [zip])

  const zone = found?.zone ?? store.settings.zone
  const band = ZONE_TEMP_BANDS[zone]
  const frost = ZONE_FROST_DATA[zone.replace(/[a-z]/g, '')]
  const season = seasonFor(zone, todayISO())

  return (
    <>
      <div className="card">
        <div className="body">
          <h2 style={{ marginBottom: 8 }}>Which zone am I in?</h2>
          <p className="small muted">
            The zone is how this app knows when your growing season starts and ends, which is most of why one plant's
            watering interval doubles in January and another's barely moves.
          </p>
          <div className="grid2" style={{ marginTop: 12 }}>
            <div>
              <label className="field" htmlFor="zip">
                US ZIP code
              </label>
              <div className="search-wrap">
                <Search size={17} />
                <input id="zip" type="text" inputMode="numeric" placeholder="60601" value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field" htmlFor="zonesel">
                Or pick it directly
              </label>
              <select id="zonesel" value={store.settings.zone} onChange={(e) => update((s) => setSettings(s, { zone: e.target.value }))}>
                {ALL_ZONES.map((z) => (
                  <option key={z} value={z}>
                    Zone {z}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {found ? (
            <div className="notice info" style={{ marginTop: 12 }}>
              <Leaf size={18} />
              <div>
                That ZIP is in <b>zone {found.zone}</b>, estimated from {found.refCity}.
                {found.zone !== store.settings.zone ? (
                  <>
                    {' '}
                    <button className="btn small" style={{ marginTop: 8 }} onClick={() => update((s) => setSettings(s, { zone: found.zone }))}>
                      Use zone {found.zone} for my plants
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="section-title">
        <h2>Zone {zone}</h2>
        <span className="muted small">{SEASON_LABEL[season]} right now</span>
      </div>
      <div className="card">
        <div className="body">
          <dl className="kv">
            <dt>Coldest winter nights</dt>
            <dd>{band ? `${formatTempRangeF(band)} (${formatTempRangeC(band)})` : 'unknown'}</dd>
            {frost ? (
              <>
                <dt>Last frost, typically</dt>
                <dd>
                  {fmtDate(mkDate(frost.lastFrostStart))} – {fmtDate(mkDate(frost.lastFrostEnd))}
                </dd>
                <dt>First frost, typically</dt>
                <dd>
                  {fmtDate(mkDate(frost.firstFrostStart))} – {fmtDate(mkDate(frost.firstFrostEnd))}
                </dd>
              </>
            ) : null}
          </dl>
          <p className="tiny muted" style={{ marginTop: 12 }}>
            Zone-level estimates, shown as a window rather than a single day because that is what they are. Your own
            garden can differ by a fortnight from the figure for your zone. Dates are shown without a year — {REF_YEAR}{' '}
            is a reference, not a prediction.
          </p>
        </div>
      </div>
    </>
  )
}

/**
 * Pick any two, get good / avoid / neutral and the reason.
 *
 * Neutral is shown as an answer, not as an empty state. Most pairs of plants
 * have no documented relationship, and a chart that implies every pair matters
 * is how companion planting turns into folklore — the site's own table says the
 * same thing with an em dash, and this says it in words.
 *
 * Where the article explains a pair, that sentence is quoted. Where it does not,
 * the app says so rather than assembling something plausible out of the two
 * names. See scripts/port-data.mjs: the reasons are the article's, ported.
 */
function CompanionTool() {
  const [a, setA] = useState(COMPANION_PLANTS[0]?.name ?? '')
  const [b, setB] = useState(COMPANION_PLANTS[9]?.name ?? COMPANION_PLANTS[1]?.name ?? '')

  const verdict = a && b && a !== b ? companionVerdict(a, b) : null
  const reason = verdict ? companionReason(a, b) ?? companionReason(b, a) : null

  const picker = (id: string, value: string, onChange: (v: string) => void, label: string) => (
    <div>
      <label className="field" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {COMPANION_PLANTS.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )

  const row = COMPANION_PLANTS.find((c) => c.name === a)

  return (
    <>
      <div className="card">
        <div className="body">
          <h2 style={{ marginBottom: 6 }}>Can these two go together?</h2>
          <p className="small muted">
            The same 13-plant table as the companion planting guide on the site, and the same reasoning — quoted from
            the article rather than rewritten, so the app and the site cannot drift apart.
          </p>
          <div className="grid2" style={{ marginTop: 10 }}>
            {picker('comp-a', a, setA, 'This')}
            {picker('comp-b', b, setB, 'next to this')}
          </div>

          {a === b ? (
            <p className="small muted" style={{ marginTop: 12 }}>
              Pick two different plants.
            </p>
          ) : verdict ? (
            <div className={`notice ${verdict === 'avoid' ? 'warn' : 'info'}`} style={{ marginTop: 12 }}>
              {verdict === 'avoid' ? <Warning size={18} /> : <Leaf size={18} />}
              <div>
                <b>
                  {verdict === 'good'
                    ? `${a} and ${b} do well together.`
                    : verdict === 'avoid'
                      ? `Keep ${a} and ${b} apart.`
                      : `Nothing recorded either way for ${a} and ${b}.`}
                </b>
                <div style={{ marginTop: 5 }}>
                  {reason ? (
                    <>
                      The article's reason: {reason}.
                    </>
                  ) : verdict === 'neutral' ? (
                    'They neither help nor hinder each other as far as this table goes — which is the honest answer for most pairs of plants, and better than inventing one.'
                  ) : (
                    'The table records this pairing, but the article does not spell out this particular pair, so there is no sourced reason to quote.'
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {row ? (
        <div className="card">
          <div className="body">
            <h3 style={{ marginBottom: 8 }}>Everything about {row.name}</h3>
            <dl className="kv">
              <dt>Plant near</dt>
              <dd>{row.good.length ? row.good.join(', ') : 'No particular friends in this table'}</dd>
              <dt>Keep apart from</dt>
              <dd>{row.avoid.length ? row.avoid.join(', ') : 'Nothing in this table'}</dd>
            </dl>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="body">
          <h3 style={{ marginBottom: 8 }}>The whole table</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={th}>Plant</th>
                  <th style={th}>Good with</th>
                  <th style={th}>Keep apart</th>
                </tr>
              </thead>
              <tbody>
                {COMPANION_PLANTS.map((c) => (
                  <tr key={c.name}>
                    <td style={td}>
                      <b>{c.name}</b>
                    </td>
                    <td style={td}>{c.good.join(', ') || '—'}</td>
                    <td style={{ ...td, color: 'var(--clay-700)' }}>{c.avoid.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '7px 10px',
  borderBottom: '1px solid var(--bark-200)',
  color: 'var(--bark-500)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}
const td: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid var(--bark-100)', verticalAlign: 'top' }

function PotTool() {
  const [pick, setPick] = useState(POT_PLANT_GUIDE[0]?.id ?? '')
  const entry = POT_PLANT_GUIDE.find((p) => p.id === pick)
  const info = entry ? CATEGORY_INFO[entry.cat] : undefined
  return (
    <>
      <div className="card">
        <div className="body">
          <h2 style={{ marginBottom: 8 }}>What size pot does it need?</h2>
          <div style={{ marginTop: 12 }}>
            <label className="field" htmlFor="potplant">
              I am potting
            </label>
            <select id="potplant" value={pick} onChange={(e) => setPick(e.target.value)}>
              {POT_PLANT_GUIDE.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {info ? (
            <div className="notice info" style={{ marginTop: 14 }}>
              <Leaf size={18} />
              <div>
                {info.minGal ? (
                  <>
                    At least <b>{info.minGal} gallons</b>
                    {info.depthIn ? `, ${info.depthIn} in deep` : ''}.
                  </>
                ) : info.diamIn ? (
                  <>
                    About <b>{info.diamIn} in</b> across.
                  </>
                ) : info.depthIn ? (
                  <>
                    At least <b>{info.depthIn} in</b> deep.
                  </>
                ) : null}
                {info.note ? <div style={{ marginTop: 6 }}>{info.note}</div> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="body">
          <h3 style={{ marginBottom: 10 }}>Gallons to inches</h3>
          <p className="small muted" style={{ marginBottom: 10 }}>
            Nursery pots are sold by gallon and measured by inches, and the two do not line up the way people expect —
            a "5 gallon" and a "3 gallon" are the same width.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Pot</th>
                  <th style={th}>Across</th>
                  <th style={th}>Holds</th>
                </tr>
              </thead>
              <tbody>
                {STANDARD_SIZES.map((s) => (
                  <tr key={s.id}>
                    <td style={td}>{s.label}</td>
                    <td style={td}>{s.diameterIn} in</td>
                    <td style={td}>
                      {s.volGal} gal{s.estimated ? <span className="tiny muted"> (approx)</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * The weather panel.
 *
 * Everything a person needs to switch this on themselves, and nothing that
 * switches it on for them. No provider is named, no URL is prefilled, and the
 * button that makes a request is a button — this app never reaches the network
 * without somebody pressing something.
 *
 * The explanation is long because the licensing is the reason the field is
 * empty, and a buyer who finds an empty box with no explanation concludes the
 * feature is broken rather than deliberate.
 */
function WeatherTool({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  const cfg = store.settings.weather
  const reading = store.settings.lastWeather
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (patch: Partial<WeatherConfig>) =>
    update((s) => setSettings(s, { weather: { ...s.settings.weather, ...patch } }))

  const check = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await fetchWeather(cfg, todayISO())
      update((s) => setSettings(s, { lastWeather: r }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card">
        <div className="body">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <input
              id="wx-on"
              type="checkbox"
              style={{ width: 18, height: 18, minHeight: 0, marginTop: 2 }}
              checked={cfg.enabled}
              onChange={(e) => set({ enabled: e.target.checked })}
            />
            <label htmlFor="wx-on" style={{ flex: 1 }}>
              <b>Use live weather to fine-tune watering</b>
              <div className="small muted">
                Off by default, and off in every copy of this app as it ships. With it on, real rainfall pushes an
                outdoor plant's next watering back and a hot spell pulls every plant's forward.
              </div>
            </label>
          </div>

          <div className="notice info" style={{ marginTop: 12 }}>
            <Cloud size={18} />
            <div>
              <b>There is no weather service built into this app, on purpose.</b> The free tiers that weather
              services offer are almost all licensed for personal, non-commercial use, and this is a paid product.
              Bundling one would be us using somebody's free tier commercially, on your behalf, without asking either
              of them or you.
              {/*
                This panel used to say "supply your own address" and stop there,
                because guard 1b refused to ship any provider's name. The guard
                now refuses addresses rather than names — see
                scripts/guards/weather-endpoints.mjs — so the one thing somebody
                actually needs to know can be said here.

                The pasteable URL still is not in this file, on purpose: a
                hostname in the artefact is the thing that can become a call, and
                a page can be corrected when a provider renames a JSON field
                without shipping a new build to every buyer.
              */}
              <div style={{ marginTop: 6 }}>
                So you supply the address. What the app needs is a URL that returns JSON containing two numbers: a
                daily rainfall total in millimetres and a daily maximum temperature in Celsius. Any service will do.
              </div>
              <div style={{ marginTop: 6 }}>
                <b>Open-Meteo is the quickest — no account and no API key at all</b>, and the two field paths below
                already match what it returns, so there is nothing to change but the address itself. The exact URL to
                paste, one that uses a key instead, and what to do if a service refuses the request, are at{' '}
                <a href="https://harvestmath.com/plant-care/weather/" target="_blank" rel="noreferrer">
                  harvestmath.com/plant-care/weather
                </a>
                . About five minutes.
              </div>
              <div style={{ marginTop: 6 }}>
                Everything else in the app works exactly the same with this switched off: the zone and season data
                already covers most of the same ground.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="body stack">
          <div>
            <label className="field" htmlFor="wx-url">
              Your weather service URL, including any key it needs
            </label>
            <input
              id="wx-url"
              type="text"
              placeholder="https://your-provider.example/v1/forecast?lat=…&lon=…&daily=…"
              value={cfg.endpoint}
              onChange={(e) => set({ endpoint: e.target.value })}
              disabled={!cfg.enabled}
              spellCheck={false}
            />
            <p className="tiny muted" style={{ marginTop: 5 }}>
              This is stored in your own plant file and sent nowhere except to the address you typed. If the URL
              contains a personal key, remember it is in that file — which matters if you share the file.
            </p>
          </div>

          <div className="grid2">
            <div>
              <label className="field" htmlFor="wx-rain">
                Where the rainfall number is
              </label>
              <input
                id="wx-rain"
                type="text"
                value={cfg.rainPath}
                onChange={(e) => set({ rainPath: e.target.value })}
                disabled={!cfg.enabled}
                spellCheck={false}
              />
            </div>
            <div>
              <label className="field" htmlFor="wx-temp">
                Where the day's high is
              </label>
              <input
                id="wx-temp"
                type="text"
                value={cfg.tempPath}
                onChange={(e) => set({ tempPath: e.target.value })}
                disabled={!cfg.enabled}
                spellCheck={false}
              />
            </div>
          </div>
          <p className="tiny muted" style={{ marginTop: -4 }}>
            Dotted paths into whatever JSON your provider returns — <code>daily.precipitation_sum.0</code> means "the
            first entry of the precipitation_sum list, inside daily". Rainfall is read as millimetres.
          </p>

          <div>
            <label className="field" htmlFor="wx-unit">
              Temperature unit your provider sends
            </label>
            <select
              id="wx-unit"
              value={cfg.tempUnit}
              onChange={(e) => set({ tempUnit: e.target.value as WeatherConfig['tempUnit'] })}
              disabled={!cfg.enabled}
              style={{ width: 'auto' }}
            >
              <option value="C">Celsius</option>
              <option value="F">Fahrenheit</option>
            </select>
          </div>

          <div className="row">
            <button className="btn primary" onClick={() => void check()} disabled={!cfg.enabled || busy || !cfg.endpoint.trim()}>
              {busy ? 'Asking…' : 'Check the weather now'}
            </button>
            {reading ? (
              <button className="btn ghost small" onClick={() => update((s) => setSettings(s, { lastWeather: undefined }))}>
                Forget the last reading
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="notice warn" role="alert">
              <Warning size={18} />
              <div>{error}</div>
            </div>
          ) : null}

          {reading ? (
            <div className="notice info">
              <Cloud size={18} />
              <div>
                <b>
                  {Math.round(reading.rainMm)} mm of rain, high of {Math.round(reading.maxTempC)}°C
                </b>
                , read on {formatDate(reading.takenOn)}. A reading older than {READING_MAX_AGE_DAYS} days is ignored
                rather than applied — last week's rain is not today's.
              </div>
            </div>
          ) : (
            <p className="small muted">
              Nothing fetched yet. Until you press that button, this app has made no network request of any kind.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

function SettingsTool({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  return (
    <div className="card">
      <div className="body stack">
        <div className="grid2">
          <div>
            <label className="field" htmlFor="szone">
              My zone
            </label>
            <select id="szone" value={store.settings.zone} onChange={(e) => update((s) => setSettings(s, { zone: e.target.value }))}>
              {ALL_ZONES.map((z) => (
                <option key={z} value={z}>
                  Zone {z}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field" htmlFor="slook">
              "This week" means the next
            </label>
            <select
              id="slook"
              value={String(store.settings.lookAheadDays)}
              onChange={(e) => update((s) => setSettings(s, { lookAheadDays: Number(e.target.value) }))}
            >
              {[3, 5, 7, 10, 14].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="notice warn">
          <Warning size={18} />
          <div>
            Changing your zone changes every schedule in the file, because the growing season moves with it. Existing
            plants keep the zone they were set up with until you edit them.
          </div>
        </div>
        <div className="divider" />
        <div className="small muted">
          <b>{store.plants.length}</b> plants, <b>{store.log.length}</b> journal entries, file created{' '}
          {store.createdAt}. Written by {store.writtenBy}, file format version {store.schemaVersion}.
        </div>
      </div>
    </div>
  )
}
