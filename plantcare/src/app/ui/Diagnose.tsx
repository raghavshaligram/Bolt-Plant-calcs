import { useEffect, useRef, useState } from 'react'
import { DIAGNOSIS_TREES, type DiagnosisTree } from '../data/ported/diagnosis.ts'
import { speciesById } from '../data/ported/species.ts'
import { logEntry } from '../data/actions.ts'
import type { ScreenProps } from './common.tsx'
import { Back, Check, Stethoscope, Warning } from './icons.tsx'

/**
 * The same decision trees as the diagnostic quizzes on harvestmath.com.
 *
 * Ported, not rewritten — scripts/verify-data.mjs re-reads both the site's MDX
 * and this copy and fails if a single prompt, option or outcome has drifted. A
 * buyer who followed one of those quizzes on the site and then bought the app
 * should get the same answer from both, and "roughly the same advice" is not
 * the same thing.
 *
 * The answers are recorded to the journal, with the path taken. Six months
 * later "what did I decide was wrong with it in March, and what did I try" is
 * the question, and a bare result label does not answer it.
 */
export function Diagnose({ store, today, update }: ScreenProps) {
  const [tree, setTree] = useState<DiagnosisTree | null>(null)
  const living = store.plants.filter((p) => !p.archived)
  const [plantId, setPlantId] = useState<string>(living[0]?.id ?? '')

  if (!tree) {
    return (
      <>
        <div className="section-title">
          <h2>What is it doing?</h2>
        </div>
        <p className="small muted" style={{ marginBottom: 14 }}>
          Pick the symptom you can see. A few questions later you get the likely cause and what to do about it — the
          same walkthroughs as the guides on harvestmath.com, working offline.
        </p>
        {living.length ? (
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="body row" style={{ flexWrap: 'wrap' }}>
              <label className="small" htmlFor="dx-plant">
                Which plant?
              </label>
              <select id="dx-plant" value={plantId} onChange={(e) => setPlantId(e.target.value)} style={{ width: 'auto', flex: 1 }}>
                {living.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="">Not about a particular plant</option>
              </select>
            </div>
            <div className="body tiny muted" style={{ paddingTop: 0 }}>
              The result and the answers you gave are written to that plant's journal when you get there — six months
              from now, "what did I decide was wrong with it in March" is the question, and it needs the working, not
              just the verdict.
            </div>
          </div>
        ) : null}

        <div className="card">
          {DIAGNOSIS_TREES.map((t) => (
            <button key={t.id} className="species-row" onClick={() => setTree(t)}>
              <span className="glyph">
                <Stethoscope size={18} />
              </span>
              <span className="names">
                <span className="common">{t.label}</span>
                <br />
                <span className="tiny muted">{t.questions.length} questions at most</span>
              </span>
            </button>
          ))}
        </div>
      </>
    )
  }

  return (
    <Walkthrough
      tree={tree}
      store={store}
      today={today}
      update={update}
      plantId={plantId}
      onBack={() => setTree(null)}
    />
  )
}

function Walkthrough({
  tree,
  store,
  today,
  update,
  plantId,
  onBack,
}: ScreenProps & { tree: DiagnosisTree; plantId: string; onBack: () => void }) {
  const [at, setAt] = useState(tree.questions[0]?.id ?? '')
  const [path, setPath] = useState<{ question: string; answer: string }[]>([])
  const [savedTo, setSavedTo] = useState<string | null>(null)
  const logged = useRef<string | null>(null)

  const question = tree.questions.find((q) => q.id === at)
  const result = tree.results[at]

  /*
   * Written to the journal on arrival, not on a button.
   *
   * The brief says diagnoses are logged automatically and it is right: the
   * moment somebody has an answer they go and act on it, and a "save this?"
   * prompt is the thing they close. The ref guards against React running this
   * effect twice in development, which would otherwise put every diagnosis in
   * the journal in duplicate.
   */
  useEffect(() => {
    if (!result || !plantId) return
    const key = `${tree.id}:${at}:${plantId}`
    if (logged.current === key) return
    logged.current = key
    update((s) =>
      logEntry(s, {
        plantId,
        date: today,
        kind: 'diagnosis',
        text: `${tree.label} — ended at: ${result.label}`,
        diagnosis: path,
      })
    )
    setSavedTo(plantId)
  }, [result, plantId, at, tree.id, tree.label, today, path, update])

  const restart = () => {
    setAt(tree.questions[0]?.id ?? '')
    setPath([])
    setSavedTo(null)
    logged.current = null
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn ghost" onClick={onBack}>
          <Back size={17} /> Other symptoms
        </button>
        <div className="spacer" />
        {path.length ? (
          <button className="btn ghost small" onClick={restart}>
            Start again
          </button>
        ) : null}
      </div>

      <div className="section-title">
        <h2>{tree.label}</h2>
      </div>

      {path.length ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="body">
            <ol style={{ margin: 0, paddingLeft: 18 }} className="small muted">
              {path.map((p, i) => (
                <li key={i}>
                  {p.question} — <b style={{ color: 'var(--bark-800)' }}>{p.answer}</b>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}

      {question ? (
        <div className="card">
          <div className="head">
            <h3>{question.prompt}</h3>
          </div>
          {question.options.map((o) => (
            <button
              key={o.label}
              className="species-row"
              onClick={() => {
                setPath([...path, { question: question.prompt, answer: o.label }])
                setAt(o.next)
              }}
            >
              <span className="names">
                <span className="common">{o.label}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="card">
            <div className="head">
              <Warning size={19} />
              <h3>{result.label}</h3>
            </div>
            <div className="body">
              <p className="small">{result.blurb}</p>
              <p className="tiny muted" style={{ marginTop: 10 }}>
                The full write-up is the <b>{tree.label.toLowerCase()}</b> guide on harvestmath.com
                {result.anchor ? `, under "${result.anchor.replace(/^#/, '').replace(/-/g, ' ')}"` : ''}. The app does not
                open it for you — it has no internet connection, on purpose.
              </p>
            </div>
          </div>

          <div className="section-title">
            <h3>{savedTo ? 'Saved to the journal' : 'Keep this?'}</h3>
          </div>
          <div className="card">
            {savedTo ? (
              <div className="body small">
                <span className="pill safe">
                  <Check size={13} /> Written to {store.plants.find((p) => p.id === savedTo)?.name ?? 'that plant'}
                </span>
                <div className="muted" style={{ marginTop: 8 }}>
                  Both the outcome and every answer you gave on the way here. You can remove it from the Journal screen
                  if it was the wrong plant.
                </div>
              </div>
            ) : store.plants.filter((p) => !p.archived).length === 0 ? (
              <div className="body muted small">No plants to attach it to yet.</div>
            ) : (
              <>
                <div className="body small muted">
                  You started this without picking a plant. Choose one and it goes into that plant's journal.
                </div>
                {store.plants
                  .filter((p) => !p.archived)
                  .map((p) => {
                    const sp = speciesById(p.speciesId)
                    return (
                      <button
                        key={p.id}
                        className="species-row"
                        onClick={() => {
                          update((s) =>
                            logEntry(s, {
                              plantId: p.id,
                              date: today,
                              kind: 'diagnosis',
                              text: `${tree.label} — ended at: ${result.label}`,
                              diagnosis: path,
                            })
                          )
                          setSavedTo(p.id)
                        }}
                      >
                        <span className="names">
                          <span className="common">{p.name}</span>
                          <br />
                          <span className="tiny muted">{sp?.common ?? p.speciesId}</span>
                        </span>
                      </button>
                    )
                  })}
              </>
            )}
          </div>
        </>
      ) : null}

      {!question && !result ? (
        <div className="notice warn">
          <Warning size={18} />
          <div>
            This walkthrough points at a step called <code>{at}</code> that does not exist. That is a bug in the app,
            not something you did.
          </div>
        </div>
      ) : null}
    </>
  )
}
