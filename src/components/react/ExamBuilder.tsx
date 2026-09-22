import { useMemo, useState } from 'react';
import type { PoolQuestion } from '../../lib/content';
import { objectiveStats, WEAK_THRESHOLD } from '../../lib/mastery';
import { useHydrated, useProgress } from '../../lib/useProgress';
import { mulberry32, pct, shuffle } from '../../lib/utils';
import QuizEngine, { type EngineQuestion } from './QuizEngine';

interface Props {
  courseId: string;
  courseTitle: string;
  questions: PoolQuestion[];
  chapters: { slug: string; number: number; title: string }[];
  /** Straight from course.json — see courseSchema.exam. */
  defaults: {
    defaultMinutes: number;
    defaultQuestionCount: number;
    mirrorsPastExam: boolean;
    formatNote?: string;
  };
  homeHref: string;
}

export default function ExamBuilder({
  courseId,
  courseTitle,
  questions,
  chapters,
  defaults,
  homeHref,
}: Props) {
  const hydrated = useHydrated();
  const state = useProgress();

  const [count, setCount] = useState(Math.min(defaults.defaultQuestionCount, questions.length));
  const [minutes, setMinutes] = useState(defaults.defaultMinutes);
  const [included, setIncluded] = useState<Set<number>>(new Set(chapters.map((c) => c.number)));
  const [weightWeak, setWeightWeak] = useState(true);
  const [started, setStarted] = useState<EngineQuestion[] | null>(null);

  const stats = useMemo(() => objectiveStats(state, courseId), [state, courseId]);

  const available = useMemo(
    () => questions.filter((q) => included.has(q.chapterNumber)),
    [questions, included],
  );

  const weakIds = useMemo(
    () => new Set([...stats.values()].filter((s) => s.isWeak).map((s) => s.objectiveId)),
    [stats],
  );

  /**
   * Weighted draw without replacement. Questions on weak objectives get a
   * 3× ticket count, never-assessed ones 1.6× — so an exam leans on what is
   * shaky without becoming a single-topic drill.
   */
  const draw = (): EngineQuestion[] => {
    const rng = mulberry32(Math.floor(Math.random() * 2 ** 31));
    const remaining = [...available];
    const weightOf = (q: PoolQuestion) => {
      if (!weightWeak) return 1;
      if (weakIds.has(q.objectiveId)) return 3;
      const s = stats.get(q.objectiveId);
      if (!s) return 1.6;
      if (s.mastery < 0.85) return 1.3;
      return 1;
    };

    const picked: PoolQuestion[] = [];
    const target = Math.min(count, remaining.length);
    while (picked.length < target && remaining.length) {
      const weights = remaining.map(weightOf);
      const total = weights.reduce((a, b) => a + b, 0);
      let r = rng() * total;
      let idx = 0;
      for (; idx < remaining.length; idx++) {
        r -= weights[idx]!;
        if (r <= 0) break;
      }
      const [chosen] = remaining.splice(Math.min(idx, remaining.length - 1), 1);
      if (chosen) picked.push(chosen);
    }

    return shuffle(picked, rng).map((q) => ({ ...q }));
  };

  if (started) {
    return (
      <QuizEngine
        courseId={courseId}
        mode="exam"
        title={`Examen blanc — ${courseTitle}`}
        questions={started}
        timeLimitMinutes={minutes}
        homeHref={homeHref}
      />
    );
  }

  const weakCount = available.filter((q) => weakIds.has(q.objectiveId)).length;

  return (
    <div className="card p-5 sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight">Examen blanc</h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        Chronométré, sans aucun retour avant la remise. La correction complète, avec les explications,
        arrive d’un coup à la fin.
      </p>

      {!defaults.mirrorsPastExam && (
        <p
          className="mt-4 rounded-lg border p-3 text-[0.85rem]"
          style={{ borderColor: 'color-mix(in srgb, var(--warn) 38%, transparent)', background: 'var(--warn-soft)' }}
        >
          <strong>Format inventé par la plateforme.</strong>{' '}
          {defaults.formatNote ??
            'Aucun examen antérieur n’a été fourni pour ce cours : ce format ne reproduit pas celui d’un vrai examen et ne prédit rien de ce qui sera évalué.'}
        </p>
      )}

      <div className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="exam-count" className="mb-1.5 block text-sm font-medium">
              Nombre de questions&nbsp;: <span className="tabular-nums">{count}</span>
            </label>
            <input
              id="exam-count"
              type="range"
              min={5}
              max={Math.max(5, available.length)}
              value={Math.min(count, Math.max(5, available.length))}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
              {available.length} question(s) disponibles dans les chapitres retenus
            </p>
          </div>

          <div>
            <label htmlFor="exam-minutes" className="mb-1.5 block text-sm font-medium">
              Durée&nbsp;: <span className="tabular-nums">{minutes} min</span>
            </label>
            <input
              id="exam-minutes"
              type="range"
              min={5}
              max={180}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
              ≈ {(minutes / Math.max(1, count)).toFixed(1)} min par question
            </p>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Chapitres inclus</legend>
          <div className="flex flex-wrap gap-1.5">
            {chapters.map((c) => {
              const on = included.has(c.number);
              return (
                <button
                  key={c.number}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  style={on ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}
                  onClick={() =>
                    setIncluded((prev) => {
                      const next = new Set(prev);
                      if (next.has(c.number)) {
                        if (next.size > 1) next.delete(c.number);
                      } else next.add(c.number);
                      return next;
                    })
                  }
                >
                  Ch. {c.number} — {c.title.length > 30 ? `${c.title.slice(0, 30)}…` : c.title}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3" style={{ borderColor: weightWeak ? 'var(--accent)' : 'var(--border)' }}>
          <input type="checkbox" checked={weightWeak} onChange={(e) => setWeightWeak(e.target.checked)} className="mt-1" />
          <span className="text-sm">
            <strong>Pondérer vers mes sujets faibles</strong>
            <span className="mt-0.5 block text-xs" style={{ color: 'var(--text-muted)' }}>
              {hydrated && weakIds.size > 0
                ? `${weakIds.size} objectif(s) sous ${pct(WEAK_THRESHOLD)} — les ${weakCount} question(s) correspondantes seront tirées 3× plus souvent.`
                : 'Aucun sujet faible détecté pour l’instant : le tirage restera uniforme, avec une légère priorité aux objectifs jamais évalués.'}
            </span>
          </span>
        </label>
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={available.length === 0}
          onClick={() => setStarted(draw())}
        >
          Démarrer l’examen ({Math.min(count, available.length)} questions · {minutes} min)
        </button>
        <a href={homeHref} className="btn">
          Retour au cours
        </a>
      </div>
    </div>
  );
}
