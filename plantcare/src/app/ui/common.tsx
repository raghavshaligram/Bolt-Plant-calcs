import type { ReactNode } from 'react'
import { formatDate, humanInterval, relativeDay, type ISODate } from '../calc/dates.ts'
import { CARE_LABEL, type Factor, type Interval } from '../calc/schedule.ts'
import type { Species } from '../data/ported/species.ts'
import { toxicityNote } from '../data/ported/toxicity.ts'
import type { Plant, Store } from '../data/schema.ts'
import type { Task } from '../calc/tasks.ts'
import { CARE_ICON, Check, GroupGlyph, Paw, Question } from './icons.tsx'

export interface ScreenProps {
  store: Store
  today: ISODate
  update: (fn: (s: Store) => Store) => void
}

/**
 * The pet-safety badge.
 *
 * Three states, and the third one is the point. "Unknown" is not a failure to
 * look something up — it means this plant is not on the ASPCA list, and the
 * honest thing to tell somebody with a cat is that nobody checked it, rather
 * than showing nothing and letting the absence read as safety.
 */
export function ToxicityPill({ species }: { species: Species }) {
  const t = species.toxicity
  const cls = t.verdict === 'toxic' ? 'toxic' : t.verdict === 'non-toxic' ? 'safe' : 'unknown'
  const label =
    t.verdict === 'toxic'
      ? t.via === 'genus-sibling'
        ? 'Likely toxic to cats'
        : 'Toxic to cats'
      : t.verdict === 'non-toxic'
        ? t.via === 'genus-sibling'
          ? 'Likely safe for cats'
          : 'Safe for cats'
        : 'Not on the list'
  return (
    <span className={`pill ${cls}`} title={toxicityNote(t)}>
      <Paw size={13} />
      {label}
    </span>
  )
}

/** The full sentence, with the ASPCA row it came from. Shown on detail screens. */
export function ToxicityNote({ species }: { species: Species }) {
  const t = species.toxicity
  return (
    <div className="small muted">
      {toxicityNote(t)}
      {t.matched ? (
        <>
          {' '}
          <span className="tiny">
            (ASPCA row: <span className="botanical">{t.matched}</span>
            {t.cultivarOf ? `, through the parent species` : ''})
          </span>
        </>
      ) : null}
    </div>
  )
}

/**
 * Why the interval is what it is.
 *
 * Every factor, including the ones that changed nothing — a person wondering
 * why their plant is on a 14-day cycle is served better by seeing that pot size
 * was considered and came out neutral than by seeing it omitted.
 */
export function Why({ interval, days }: { interval: Interval; days: number | null }) {
  if (interval.days === null && interval.skipped) {
    return (
      <div className="why">
        <div className="small">{interval.skipped}</div>
      </div>
    )
  }
  return (
    <div className="why">
      <div className="small">
        <b>{days} days</b> between, working from the plant's own base figure and the {interval.season === 'growing' ? 'growing season' : interval.season === 'shoulder' ? 'shoulder season' : 'dormant season'} here.
      </div>
      <ul>
        {interval.factors.map((f: Factor, i) => (
          <li key={i}>
            <span className={`factor ${f.factor > 1 ? 'up' : ''}`}>
              {f.factor === 1 ? '—' : `×${f.factor.toFixed(2).replace(/0$/, '')}`}
            </span>
            <span>{f.why}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PlantAvatar({ plant, species, size = 46 }: { plant: Plant; species: Species; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {plant.photo ? <img src={plant.photo} alt="" /> : <GroupGlyph group={species.group} size={Math.round(size * 0.55)} />}
    </div>
  )
}

/**
 * One job, with the button that marks it done.
 *
 * The date is always spelled out beside the relative phrase. "3 days late" is
 * what a person acts on; "since 9 September" is what they check it against when
 * they think the app is wrong, and they are sometimes right.
 */
export function TaskRow({
  task,
  today,
  onDone,
  showPlant = true,
  onWhy,
  whyOpen,
  children,
}: {
  task: Task
  today: ISODate
  onDone: () => void
  showPlant?: boolean
  /** Omit to leave the row without a reasoning toggle. */
  onWhy?: () => void
  whyOpen?: boolean
  children?: ReactNode
}) {
  const Icon = CARE_ICON[task.care]
  const late = task.daysUntil !== null && task.daysUntil < 0
  const label = CARE_LABEL[task.care]
  const when = task.neverDone
    ? `not started · ${humanInterval(task.interval.days ?? 1)}`
    : `${relativeDay(task.due!, today)}${task.heldForSpring ? ' · held for spring' : ''}`

  return (
    <div className={`care ${task.care} ${late ? 'late' : ''}`}>
      <div className="icon">
        <Icon size={16} />
      </div>
      <div className="what">
        {/*
          One line, not three. The date used to sit on its own row under the
          name and the reasoning link under that, which made a list of twenty
          jobs three thousand pixels long — a screen you scroll rather than
          read. The exact date moved into the title attribute: it is the thing
          people check when they think the app is wrong, not the thing they read
          twenty times on the way down the page.
        */}
        <div className="line" title={task.due ? `due ${formatDate(task.due)}` : undefined}>
          <span className="title">
            <b>{label}</b>
            {showPlant ? <> · {task.plant.name}</> : null}
            {task.overridden ? <span className="tiny muted"> · yours</span> : null}
          </span>
          <span className="when">{when}</span>
        </div>
        {children}
      </div>
      {onWhy ? (
        <button
          className="iconbtn"
          onClick={onWhy}
          aria-expanded={whyOpen}
          aria-label={`Why is ${label.toLowerCase()} due this often for ${task.plant.name}?`}
          title="why this often?"
        >
          <Question size={16} />
        </button>
      ) : null}
      <button className="btn small" onClick={onDone} aria-label={`Mark ${label} done for ${task.plant.name}`}>
        <Check size={15} />
        <span className="btn-label">Done</span>
      </button>
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <GroupGlyph group="foliage" size={54} className="mark" />
      <h2>{title}</h2>
      <div className="small">{children}</div>
    </div>
  )
}
