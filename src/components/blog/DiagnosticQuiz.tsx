import { useState } from 'react';

// Reusable branching quiz for the Plant Problem Diagnosis series. Sits
// directly below the prose "Quick Answer" section on every diagnosis
// article -- same questions, click-to-advance instead of read-and-navigate.
// The prose stays as the source of truth for search snippets, AI-answer
// parsing, and accessibility; this is an additive, faster path only.
//
// Standing requirement (Section 9.3, Plant Problem Diagnosis series):
// every new diagnosis article ships with its own <DiagnosticQuiz /> config,
// built from that article's own Quick Answer questions, at build time --
// not retrofitted later. (No in-repo Master Strategy doc exists to log this
// against directly -- flagged to the user to record on their end -- so this
// comment is the durable, in-repo copy of the requirement.)
//
// Contract: each option's `next` is either the `id` of another question
// (branch continues) or a key in `results` (branch ends, leaf reached).
// The two namespaces don't collide by construction, so resolution is a
// simple two-way lookup -- no separate "is this a leaf" flag needed.

interface QuizOption {
  label: string;
  next: string;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

interface QuizResult {
  label: string;
  blurb: string;
  anchor: string; // e.g. "#nitrogen-deficiency" -- must match a real heading id on the page
}

interface DiagnosticQuizProps {
  questions: QuizQuestion[];
  results: Record<string, QuizResult>;
}

export default function DiagnosticQuiz({ questions, results }: DiagnosticQuizProps) {
  const firstId = questions[0]?.id;
  const [stack, setStack] = useState<string[]>(firstId ? [firstId] : []);
  const [resultKey, setResultKey] = useState<string | null>(null);

  if (!firstId) return null;

  function choose(next: string) {
    const isQuestion = questions.some((q) => q.id === next);
    if (isQuestion) {
      setStack((s) => [...s, next]);
      setResultKey(null);
    } else if (results[next]) {
      setResultKey(next);
    }
  }

  function goBack() {
    if (resultKey) {
      setResultKey(null);
      return;
    }
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  function seeSection(anchor: string) {
    const el = document.querySelector(anchor);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const currentQuestion = resultKey ? null : questions.find((q) => q.id === stack[stack.length - 1]);
  const activeResult = resultKey ? results[resultKey] : null;
  const canGoBack = resultKey ? true : stack.length > 1;

  return (
    <div className="not-prose my-6 rounded-2xl border border-moss-200 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full bg-moss-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-moss-800">
          Quick Diagnosis
        </span>
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            className="text-sm font-medium text-moss-700 transition hover:text-moss-900 hover:underline"
          >
            &larr; Back
          </button>
        )}
      </div>

      {activeResult ? (
        <div>
          <p className="text-sm font-medium text-bark-500">Likely cause</p>
          <h3
            className="mt-1 text-lg font-semibold text-bark-900"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {activeResult.label}
          </h3>
          <p className="mt-1 text-sm text-bark-600">{activeResult.blurb}</p>
          <button
            type="button"
            onClick={() => seeSection(activeResult.anchor)}
            className="btn-primary mt-4 w-full sm:w-auto"
          >
            See this section
          </button>
        </div>
      ) : currentQuestion ? (
        <div>
          <p className="text-base font-semibold text-bark-900">{currentQuestion.prompt}</p>
          <div className="mt-3 flex flex-col gap-2">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => choose(opt.next)}
                className="w-full rounded-lg bg-sand-50 px-4 py-2.5 text-left text-sm font-medium text-bark-800 ring-1 ring-inset ring-bark-200 transition hover:bg-moss-50 hover:ring-moss-300"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
