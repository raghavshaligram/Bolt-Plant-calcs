import { useState } from 'react'
import { formatDate, type ISODate } from '../calc/dates.ts'
import { SEASON_LABEL, seasonFor } from '../calc/schedule.ts'
import type { Agenda, Task } from '../calc/tasks.ts'
import { markDone } from '../data/actions.ts'
import type { Store } from '../data/schema.ts'
import { Empty, TaskRow, Why } from './common.tsx'
import { Leaf, Sun } from './icons.tsx'

/**
 * The screen the app opens on.
 *
 * It answers one question — what needs doing — and it is ordered so that a
 * person who does only the first section has done the things that matter. Late
 * first, then today, then the week. "Later" is deliberately not on this screen
 * at all: a list that shows everything shows nothing.
 */
export function Today({
  store,
  agenda,
  today,
  update,
}: {
  store: Store
  agenda: Agenda
  today: ISODate
  update: (fn: (s: Store) => Store) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const season = seasonFor(store.settings.zone, today)
  const nothing = agenda.late.length + agenda.today.length + agenda.soon.length === 0

  const done = (t: Task) => update((s) => markDone(s, t.plant.id, t.care, today))

  const key = (t: Task) => `${t.plant.id}:${t.care}`

  const section = (title: string, tasks: Task[], note?: string) =>
    tasks.length ? (
      <>
        {title ? (
          <div className="section-title">
            <h2>{title}</h2>
            <span className="muted small">{tasks.length}</span>
            {note ? <span className="muted tiny">{note}</span> : null}
          </div>
        ) : null}
        <div className="card">
          {tasks.map((t) => (
            <TaskRow
              key={key(t)}
              task={t}
              today={today}
              onDone={() => done(t)}
              whyOpen={open === key(t)}
              onWhy={() => setOpen(open === key(t) ? null : key(t))}
            >
              {open === key(t) ? (
                <>
                  <Why interval={t.interval} days={t.interval.days} />
                  {t.overridden ? (
                    <p className="tiny muted" style={{ margin: '-4px 0 8px' }}>
                      You set this one by hand, so the figure above is yours. The reasoning is what the app would have
                      said if you had not.
                    </p>
                  ) : null}
                </>
              ) : null}
            </TaskRow>
          ))}
        </div>
      </>
    ) : null

  return (
    <>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="body row" style={{ gap: 14 }}>
          <div className="care" style={{ padding: 0, border: 0 }}>
            <div className="icon" style={{ width: 40, height: 40 }}>
              <Sun size={21} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>
              <b>{formatDate(today)}</b>
            </div>
            <div className="small muted">
              Zone {store.settings.zone} · {SEASON_LABEL[season]} ·{' '}
              {store.plants.filter((p) => !p.archived).length} plants
            </div>
          </div>
        </div>
      </div>

      {nothing ? (
        <Empty title="Nothing needs doing today">
          {agenda.later.length
            ? `Next job is ${agenda.later[0].plant.name} — ${formatDate(agenda.later[0].due!)}.`
            : 'Add a plant and the schedule fills itself in.'}
        </Empty>
      ) : null}

      {section('Late', agenda.late)}
      {section('Today', agenda.today)}

      {/*
        "This week" folds itself away whenever there is something to do now.
        A person opening this app at 8am wants the four things that are late,
        not those four plus ten more they cannot usefully do yet — and on a
        phone the ten push the four off the screen entirely. When nothing is
        late and nothing is due, the week is the answer, so it opens.
      */}
      {agenda.soon.length ? (
        <details className="section" open={agenda.late.length + agenda.today.length === 0}>
          <summary>
            <b>This week</b>
            <span className="muted small">
              {agenda.soon.length} in the next {store.settings.lookAheadDays} days
            </span>
          </summary>
          <div style={{ marginTop: 7 }}>{section('', agenda.soon)}</div>
        </details>
      ) : null}

      {/*
        Folded away on purpose.
        A new file has one of these for every plant and every job — twenty rows
        of "never recorded" above four rows of things that are actually due, and
        the screen that is supposed to answer "what needs doing" answers "quite
        a lot, apparently". None of it is overdue and none of it is urgent, so it
        sits behind one line of text until somebody asks for it.
      */}
      {agenda.never.length ? (
        <details style={{ marginTop: 22 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--bark-600)', fontSize: 13.5 }}>
            {agenda.never.length} {agenda.never.length === 1 ? 'job has' : 'jobs have'} no history yet — nothing here is
            overdue
          </summary>
          <div className="notice info" style={{ margin: '10px 0' }}>
            <Leaf size={18} />
            <div>
              These have never been recorded, so there is nothing to count from. Marking one done today starts its
              clock.
            </div>
          </div>
          <div className="card">
            {agenda.never.map((t) => (
              <TaskRow key={key(t)} task={t} today={today} onDone={() => done(t)} />
            ))}
          </div>
        </details>
      ) : null}
    </>
  )
}
