import { useMemo } from 'react';
import type { RoadmapStep } from '../../lib/schemas';
import type { ObjectiveIndexEntry } from '../../lib/mastery';
import { nextStep, objectiveStats } from '../../lib/mastery';
import { useHydrated, useProgress } from '../../lib/useProgress';
import { cx, pct } from '../../lib/utils';
import { scoreColor } from './QuizEngine';

interface Props {
  courseId: string;
  title: string;
  steps: RoadmapStep[];
  chapters: { slug: string; number: number; title: string; objectiveIds: string[] }[];
  objectives: ObjectiveIndexEntry[];
  base: string;
}

type StepStatus = 'locked' | 'available' | 'in-progress' | 'done' | 'external';

/**
 * Rendered as a vertical timeline rather than a free-form node graph: the
 * prerequisite edges are shown as chips on each step, which stays readable on a
 * phone and still makes the dependency structure explicit.
 */
export default function RoadmapView({ courseId, title, steps, chapters, objectives, base }: Props) {
  const hydrated = useHydrated();
  const state = useProgress();

  const chapterByNumber = useMemo(() => new Map(chapters.map((c) => [c.number, c] as const)), [chapters]);
  const stepById = useMemo(() => new Map(steps.map((s) => [s.id, s] as const)), [steps]);

  /** Topological order, stable: prerequisites always appear above dependents. */
  const ordered = useMemo(() => {
    const visited = new Set<string>();
    const out: RoadmapStep[] = [];
    const visit = (s: RoadmapStep) => {
      if (visited.has(s.id)) return;
      visited.add(s.id);
      for (const p of s.prerequisites) {
        const prereq = stepById.get(p);
        if (prereq) visit(prereq);
      }
      out.push(s);
    };
    for (const s of steps) visit(s);
    return out;
  }, [steps, stepById]);

  const stats = useMemo(() => objectiveStats(state, courseId), [state, courseId]);

  const statusOf = (s: RoadmapStep): StepStatus => {
    if (s.external) return 'external';

    if (s.chapter !== undefined) {
      const ch = chapterByNumber.get(s.chapter);
      const key = ch ? `${courseId}/${ch.slug}` : '';
      const st = state.chapters[key]?.status ?? 'not-started';
      if (st === 'mastered') return 'done';
      if (st === 'in-progress') return 'in-progress';
    } else if (s.checkpoint) {
      // A checkpoint is cleared when every chapter it depends on is mastered.
      const deps = s.prerequisites.map((p) => stepById.get(p)).filter(Boolean) as RoadmapStep[];
      const chapterDeps = deps.flatMap((d) =>
        d.chapter !== undefined ? [d] : d.prerequisites.map((p) => stepById.get(p)).filter((x): x is RoadmapStep => !!x && x.chapter !== undefined),
      );
      if (chapterDeps.length) {
        const allMastered = chapterDeps.every((d) => {
          const ch = chapterByNumber.get(d.chapter!);
          return ch && state.chapters[`${courseId}/${ch.slug}`]?.status === 'mastered';
        });
        if (allMastered) return 'done';
      }
    }

    const blocked = s.prerequisites.some((p) => {
      const prereq = stepById.get(p);
      if (!prereq || prereq.external) return false; // external steps never block
      const st = statusOfShallow(prereq);
      return st !== 'done';
    });
    return blocked ? 'locked' : 'available';
  };

  // Shallow variant avoids unbounded recursion on deep chains.
  function statusOfShallow(s: RoadmapStep): StepStatus {
    if (s.external) return 'external';
    if (s.chapter !== undefined) {
      const ch = chapterByNumber.get(s.chapter);
      const key = ch ? `${courseId}/${ch.slug}` : '';
      const st = state.chapters[key]?.status ?? 'not-started';
      return st === 'mastered' ? 'done' : st === 'in-progress' ? 'in-progress' : 'available';
    }
    if (s.checkpoint) {
      const deps = s.prerequisites.map((p) => stepById.get(p)).filter((x): x is RoadmapStep => !!x);
      const chapterDeps = deps.filter((d) => d.chapter !== undefined);
      if (chapterDeps.length) {
        const all = chapterDeps.every((d) => {
          const ch = chapterByNumber.get(d.chapter!);
          return ch && state.chapters[`${courseId}/${ch.slug}`]?.status === 'mastered';
        });
        return all ? 'done' : 'available';
      }
    }
    return 'available';
  }

  const next = useMemo(
    () => (hydrated ? nextStep(state, courseId, chapters, objectives, base) : null),
    [hydrated, state, courseId, chapters, objectives, base],
  );

  const totalMinutes = steps.reduce((n, s) => n + s.estimatedMinutes, 0);
  const externalMinutes = steps.filter((s) => s.external).reduce((n, s) => n + s.estimatedMinutes, 0);
  const doneCount = hydrated ? ordered.filter((s) => statusOf(s) === 'done').length : 0;
  const trackable = ordered.filter((s) => !s.external).length;

  return (
    <div className="space-y-6">
      <header className="card p-5">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {trackable} étape{trackable > 1 ? 's' : ''} du cours · {Math.round(totalMinutes / 60)} h estimées
          {externalMinutes > 0 && ` (dont ${Math.round(externalMinutes / 60)} h de prérequis externes)`}
        </p>

        {hydrated && (
          <>
            <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${trackable ? (doneCount / trackable) * 100 : 0}%`, background: 'var(--accent)' }}
              />
            </div>
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
              {doneCount} / {trackable} étapes franchies
            </p>
          </>
        )}

        {next && (
          <div
            className="mt-5 rounded-xl border p-4"
            style={{ borderColor: 'color-mix(in srgb, var(--accent) 45%, transparent)', background: 'var(--accent-soft)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
              À faire maintenant
            </p>
            <p className="mt-1 font-medium">{next.title}</p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {next.reason}
            </p>
            <a href={next.href} className="btn btn-primary btn-sm mt-3">
              Y aller
            </a>
          </div>
        )}
      </header>

      <ol className="relative space-y-3 pl-7">
        {/* the spine */}
        <div
          className="absolute bottom-3 left-[11px] top-3 w-px"
          style={{ background: 'var(--border-strong)' }}
          aria-hidden="true"
        />

        {ordered.map((s) => {
          const status = hydrated ? statusOf(s) : s.external ? 'external' : 'available';
          const ch = s.chapter !== undefined ? chapterByNumber.get(s.chapter) : undefined;
          const href = ch ? `${base}/cours/${courseId}/chapitre/${ch.slug}` : undefined;

          const mastery =
            ch && hydrated
              ? ch.objectiveIds.reduce((n, id) => n + (stats.get(id)?.mastery ?? 0), 0) / Math.max(1, ch.objectiveIds.length)
              : 0;

          const tone =
            status === 'done'
              ? 'var(--ok)'
              : status === 'in-progress'
                ? 'var(--warn)'
                : status === 'external'
                  ? 'var(--info)'
                  : status === 'locked'
                    ? 'var(--text-faint)'
                    : 'var(--accent)';

          return (
            <li key={s.id} id={`etape-${s.id}`} className="relative scroll-mt-24">
              <span
                aria-hidden="true"
                className="absolute -left-7 top-4 grid h-[22px] w-[22px] place-items-center rounded-full text-[0.62rem] font-bold"
                style={{
                  background: status === 'done' ? tone : 'var(--surface)',
                  border: `2px ${s.external ? 'dashed' : 'solid'} ${tone}`,
                  color: status === 'done' ? '#0b1020' : tone,
                }}
              >
                {status === 'done' ? '✓' : s.checkpoint ? '◆' : s.external ? '↗' : ''}
              </span>

              <div
                className={cx('card p-4', status === 'locked' && 'opacity-60')}
                style={{
                  borderStyle: s.external ? 'dashed' : 'solid',
                  borderColor: status === 'done' || status === 'in-progress' ? `color-mix(in srgb, ${tone} 45%, transparent)` : 'var(--border)',
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      {s.external && <span className="chip chip-info">prérequis externe</span>}
                      {s.checkpoint && <span className="chip chip-accent">point de contrôle</span>}
                      {ch && <span className="chip">Chapitre {ch.number}</span>}
                      <span className="chip">{s.estimatedMinutes} min</span>
                      {hydrated && status === 'done' && <span className="chip chip-ok">franchie</span>}
                      {hydrated && status === 'locked' && <span className="chip">verrouillée</span>}
                    </div>

                    <h3 className="text-[1.02rem] font-semibold tracking-tight">
                      {href ? (
                        <a href={href} className="hover:underline">
                          {s.title}
                        </a>
                      ) : (
                        s.title
                      )}
                    </h3>
                    <p className="mt-1 text-[0.9rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {s.description}
                    </p>

                    {s.external && s.externalNote && (
                      <p
                        className="mt-2.5 rounded-lg border p-2.5 text-[0.82rem]"
                        style={{ borderColor: 'color-mix(in srgb, var(--info) 35%, transparent)', background: 'var(--info-soft)' }}
                      >
                        <strong>Hors de mes documents.</strong> {s.externalNote}
                      </p>
                    )}

                    {s.prerequisites.length > 0 && (
                      <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
                        <span>Après&nbsp;:</span>
                        {s.prerequisites.map((p) => (
                          <a key={p} href={`#etape-${p}`} className="chip hover:border-[var(--accent)]">
                            {stepById.get(p)?.title ?? p}
                          </a>
                        ))}
                      </p>
                    )}
                  </div>

                  {ch && hydrated && mastery > 0 && (
                    <span className="chip tabular-nums shrink-0" style={{ color: scoreColor(mastery), borderColor: scoreColor(mastery) }}>
                      {pct(mastery)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-center text-xs" style={{ color: 'var(--text-faint)' }}>
        Les étapes en pointillés ne sont couvertes par aucun de mes documents et sont listées dans le
        {' '}
        <a href={`${base}/cours/${courseId}/couverture`} className="underline underline-offset-2">
          rapport de couverture
        </a>
        .
      </p>
    </div>
  );
}
