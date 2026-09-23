import { useMemo } from 'react';
import type { ObjectiveIndexEntry } from '../../lib/mastery';
import { courseProgress, nextStep, objectiveStats } from '../../lib/mastery';
import { queueCounts } from '../../lib/srs';
import { useHydrated, useProgress } from '../../lib/useProgress';
import { STATUS_LABELS, cx, pct } from '../../lib/utils';
import { scoreColor } from './QuizEngine';

interface ChapterRow {
  slug: string;
  number: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  objectiveIds: string[];
  counts: { quiz: number; test: number; exercises: number; concepts: number; tables: number };
}

interface Props {
  courseId: string;
  chapters: ChapterRow[];
  objectives: ObjectiveIndexEntry[];
  cardKeys: { key: string; courseId: string }[];
  base: string;
}

export default function CourseOverview({ courseId, chapters, objectives, cardKeys, base }: Props) {
  const hydrated = useHydrated();
  const state = useProgress();

  const stats = useMemo(() => objectiveStats(state, courseId), [state, courseId]);
  const cp = useMemo(() => courseProgress(state, courseId, chapters), [state, courseId, chapters]);
  const cards = useMemo(
    () => queueCounts(cardKeys.map((c) => ({ item: c, key: c.key })), state.cards),
    [cardKeys, state.cards],
  );
  const step = useMemo(
    () => (hydrated ? nextStep(state, courseId, chapters, objectives, base) : null),
    [hydrated, state, courseId, chapters, objectives, base],
  );

  return (
    <div className="space-y-5">
      {hydrated && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Maîtrise du cours
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: cp.overallMastery > 0 ? scoreColor(cp.overallMastery) : 'var(--text-faint)' }}>
                {pct(cp.overallMastery)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Chapitres maîtrisés
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {cp.chaptersMastered}
                <span className="text-base" style={{ color: 'var(--text-faint)' }}>
                  /{cp.chaptersTotal}
                </span>
              </p>
            </div>
            <a href={`${base}/revision`} className="card p-4 transition-colors hover:border-[var(--accent)]">
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Cartes à réviser
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: cards.due + cards.fresh > 0 ? 'var(--accent)' : 'var(--ok)' }}>
                {cards.due + cards.fresh}
              </p>
            </a>
            <div className="card p-4">
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Sujets faibles
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: cp.weakCount ? 'var(--bad)' : 'var(--ok)' }}>
                {cp.weakCount}
              </p>
            </div>
          </div>

          {step && (
            <div
              className="rounded-xl border p-4"
              style={{ borderColor: 'color-mix(in srgb, var(--accent) 45%, transparent)', background: 'var(--accent-soft)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                À faire maintenant
              </p>
              <p className="mt-1 font-medium">{step.title}</p>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                {step.reason}
              </p>
              <a href={step.href} className="btn btn-primary btn-sm mt-3">
                Y aller
              </a>
            </div>
          )}
        </>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Chapitres</h2>
        <ol className="space-y-3">
          {chapters.map((ch) => {
            const key = `${courseId}/${ch.slug}`;
            const status = state.chapters[key]?.status ?? 'not-started';
            const proven = ch.objectiveIds.map((id) => stats.get(id)).filter(Boolean);
            const mastery = ch.objectiveIds.length
              ? ch.objectiveIds.reduce((n, id) => n + (stats.get(id)?.mastery ?? 0), 0) / ch.objectiveIds.length
              : 0;

            return (
              <li key={ch.slug}>
                <article className="card overflow-hidden">
                  <a
                    href={`${base}/cours/${courseId}/chapitre/${ch.slug}`}
                    className="block p-4 transition-colors hover:bg-[var(--accent-soft)] sm:p-5"
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                      >
                        {ch.number}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-[1.05rem] font-semibold leading-snug tracking-tight">{ch.title}</h3>
                          {hydrated && (
                            <span
                              className={cx(
                                'chip shrink-0',
                                status === 'mastered' && 'chip-ok',
                                status === 'in-progress' && 'chip-warn',
                              )}
                            >
                              {STATUS_LABELS[status]}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-[0.9rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {ch.summary}
                        </p>

                        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[0.7rem]">
                          <span className="chip">{ch.estimatedMinutes} min</span>
                          <span className="chip">{ch.counts.concepts} concepts</span>
                          <span className="chip">{ch.counts.quiz + ch.counts.test} questions</span>
                          <span className="chip">{ch.counts.exercises} exercices</span>
                          {ch.counts.tables > 0 && <span className="chip">{ch.counts.tables} tableaux</span>}
                        </div>

                        {hydrated && proven.length > 0 && (
                          <div className="mt-3">
                            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
                              <div
                                className="h-full rounded-full transition-[width]"
                                style={{ width: `${mastery * 100}%`, background: scoreColor(mastery) }}
                              />
                            </div>
                            <p className="mt-1 text-[0.7rem]" style={{ color: 'var(--text-faint)' }}>
                              {pct(mastery)} de maîtrise · {proven.length}/{ch.objectiveIds.length} objectifs évalués
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </a>

                  <div
                    className="no-print flex flex-wrap gap-1.5 border-t px-4 py-2.5 sm:px-5"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <a href={`${base}/cours/${courseId}/chapitre/${ch.slug}/quiz`} className="btn btn-sm">
                      Quiz
                    </a>
                    <a href={`${base}/cours/${courseId}/chapitre/${ch.slug}/test`} className="btn btn-sm">
                      Test
                    </a>
                    <a href={`${base}/cours/${courseId}/chapitre/${ch.slug}/exercices`} className="btn btn-sm">
                      Exercices
                    </a>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
