import { useMemo } from 'react';
import type { ObjectiveIndexEntry } from '../../lib/mastery';
import { nextStep, weakTopics } from '../../lib/mastery';
import { queueCounts } from '../../lib/srs';
import { useHydrated, useProgress } from '../../lib/useProgress';
import { pct } from '../../lib/utils';
import { scoreColor } from './QuizEngine';

interface Props {
  courses: {
    id: string;
    code: string;
    title: string;
    accent: string;
    chapters: { slug: string; number: number; title: string; objectiveIds: string[] }[];
  }[];
  objectives: ObjectiveIndexEntry[];
  cardKeys: { key: string; courseId: string }[];
  base: string;
}

/** The "what do I do right now" panel on the home page. */
export default function HomePanel({ courses, objectives, cardKeys, base }: Props) {
  const hydrated = useHydrated();
  const state = useProgress();

  const cards = useMemo(
    () => queueCounts(cardKeys.map((c) => ({ item: c, key: c.key })), state.cards),
    [cardKeys, state.cards],
  );
  const weak = useMemo(() => weakTopics(state, objectives, { limit: 3, base }), [state, objectives, base]);
  const steps = useMemo(
    () => (hydrated ? courses.map((c) => ({ course: c, step: nextStep(state, c.id, c.chapters, objectives, base) })) : []),
    [hydrated, courses, state, objectives, base],
  );

  if (!hydrated) {
    return <div className="card h-40 animate-pulse" aria-hidden="true" />;
  }

  const totalDue = cards.due + cards.fresh;
  const started = state.attempts.length > 0 || Object.keys(state.chapters).length > 0;

  return (
    <div className="space-y-4">
      {/* streak + review */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Série
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: state.streak.current > 0 ? 'var(--warn)' : 'var(--text-faint)' }}>
            {state.streak.current} j
          </p>
          <p className="text-[0.7rem]" style={{ color: 'var(--text-faint)' }}>
            record&nbsp;: {state.streak.longest} j
          </p>
        </div>

        <a href={`${base}/revision`} className="card p-4 transition-colors hover:border-[var(--accent)] sm:col-span-2">
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Révision du jour
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: totalDue > 0 ? 'var(--accent)' : 'var(--ok)' }}>
            {totalDue > 0 ? `${totalDue} carte${totalDue > 1 ? 's' : ''}` : 'À jour ✓'}
          </p>
          <p className="text-[0.7rem]" style={{ color: 'var(--text-faint)' }}>
            {cards.due} à revoir · {cards.fresh} nouvelle(s) · {cards.learned}/{cards.total} acquises
          </p>
        </a>
      </div>

      {/* next step per course */}
      <section className="card p-5">
        <h2 className="mb-3 text-base font-semibold tracking-tight">Quoi étudier maintenant</h2>
        <ul className="space-y-2.5">
          {steps.map(({ course, step }) => (
            <li key={course.id} data-accent={course.accent}>
              <a
                href={step.href}
                className="block rounded-xl border p-3.5 transition-colors hover:border-[var(--accent)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="chip chip-accent">{course.code}</span>
                  {step.kind === 'weak' && <span className="chip chip-bad">sujet faible</span>}
                  {step.kind === 'test' && <span className="chip chip-warn">test à passer</span>}
                  {step.kind === 'done' && <span className="chip chip-ok">terminé</span>}
                </div>
                <p className="font-medium leading-snug">{step.title}</p>
                <p className="mt-0.5 text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>
                  {step.reason}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {weak.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-1 text-base font-semibold tracking-tight">Sujets faibles détectés</h2>
          <p className="mb-3 text-xs" style={{ color: 'var(--text-faint)' }}>
            Objectifs sous 70 % de maîtrise. Chaque lien mène directement à la section concernée.
          </p>
          <ul className="space-y-2">
            {weak.map((w) => (
              <li key={w.objectiveId}>
                <a
                  href={w.href}
                  className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm transition-colors hover:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="min-w-0 flex-1">{w.label}</span>
                  <span className="chip shrink-0 tabular-nums" style={{ color: scoreColor(w.mastery), borderColor: scoreColor(w.mastery) }}>
                    {pct(w.mastery)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!started && (
        <p className="text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          Rien n’a encore été étudié. Ouvrir un chapitre ci-dessous pour démarrer le suivi.
        </p>
      )}
    </div>
  );
}
