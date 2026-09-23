import { useEffect, useMemo } from 'react';
import type { Objective } from '../../lib/schemas';
import { chapterProgress, objectiveStats } from '../../lib/mastery';
import { openChapter, setChapterStatus } from '../../lib/progress';
import { useHydrated, useProgress } from '../../lib/useProgress';
import { STATUS_LABELS, cx, pct } from '../../lib/utils';
import { scoreColor } from './QuizEngine';
import MathText from './MathText';

interface Props {
  chapterKey: string;
  objectives: Objective[];
  /** Marks the chapter as opened on mount — the reading itself is progress. */
  trackOpen?: boolean;
}

/**
 * Sits at the top of a chapter: status control plus per-objective mastery, so
 * the objectives double as an anchor target for weak-topic links.
 */
export default function ChapterTools({ chapterKey, objectives, trackOpen = false }: Props) {
  const hydrated = useHydrated();
  const state = useProgress();

  useEffect(() => {
    if (trackOpen) openChapter(chapterKey);
  }, [trackOpen, chapterKey]);

  const stats = useMemo(() => objectiveStats(state), [state]);
  const progress = useMemo(
    () => chapterProgress(state, chapterKey, objectives.map((o) => o.id)),
    [state, chapterKey, objectives],
  );

  const status = state.chapters[chapterKey]?.status ?? 'not-started';

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Objectifs d’apprentissage
        </h2>
        {hydrated && (
          <div className="flex flex-wrap items-center gap-1.5">
            {progress.bestTestScore !== null && (
              <span
                className="chip tabular-nums"
                style={{ color: scoreColor(progress.bestTestScore), borderColor: scoreColor(progress.bestTestScore) }}
                title="Meilleur score au test du chapitre"
              >
                test {pct(progress.bestTestScore)}
              </span>
            )}
            <select
              className="field w-auto py-1 text-xs"
              value={status}
              onChange={(e) => setChapterStatus(chapterKey, e.target.value as 'not-started')}
              aria-label="Statut du chapitre"
            >
              <option value="not-started">{STATUS_LABELS['not-started']}</option>
              <option value="in-progress">{STATUS_LABELS['in-progress']}</option>
              <option value="mastered">{STATUS_LABELS.mastered}</option>
            </select>
          </div>
        )}
      </div>

      <ul className="space-y-2.5">
        {objectives.map((o) => {
          const s = stats.get(o.id);
          return (
            <li key={o.id} id={`objectif-${o.id}`} className="scroll-mt-24">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[0.92rem] leading-snug"><MathText text={o.text} /></p>
                {hydrated && (
                  <span
                    className={cx('chip shrink-0 tabular-nums')}
                    style={
                      s && !s.unproven
                        ? { color: scoreColor(s.mastery), borderColor: scoreColor(s.mastery) }
                        : undefined
                    }
                    title={s ? `${s.correct} bonnes réponses sur ${s.answered}` : 'Jamais évalué'}
                  >
                    {s ? pct(s.mastery) : '—'}
                  </span>
                )}
              </div>
              {hydrated && s && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.mastery * 100}%`, background: s.unproven ? 'var(--border-strong)' : scoreColor(s.mastery) }}
                  />
                </div>
              )}
              {hydrated && s?.isWeak && (
                <p className="mt-1 text-[0.72rem]" style={{ color: 'var(--bad)' }}>
                  Sujet faible — {s.correct}/{s.answered} bonnes réponses.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {hydrated && progress.objectivesProven === 0 && (
        <p className="mt-4 border-t pt-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}>
          Aucun objectif encore mesuré. Le quiz du chapitre alimente ces barres.
        </p>
      )}
    </section>
  );
}
