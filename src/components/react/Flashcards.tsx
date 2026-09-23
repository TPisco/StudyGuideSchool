import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import type { StudyCard } from '../../lib/content';
import { addCustomCard, cardKey, removeCustomCard, touchStreak, update } from '../../lib/progress';
import type { CardState } from '../../lib/progress';
import { GRADES, buildQueue, formatInterval, newCard, previewIntervals, queueCounts, review } from '../../lib/srs';
import { useHydrated, useProgress } from '../../lib/useProgress';
import { cx } from '../../lib/utils';
import MathText from './MathText';

interface Props {
  cards: StudyCard[];
  courses: { id: string; title: string; code: string }[];
  /** Deep link target: "<courseId>:<cardId>". */
  focusKey?: string;
}

export default function Flashcards({ cards, courses, focusKey }: Props) {
  const hydrated = useHydrated();
  const state = useProgress();

  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [session, setSession] = useState<string[] | null>(null);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [graded, setGraded] = useState<{ again: number; good: number }>({ again: 0, good: 0 });
  const [adding, setAdding] = useState(false);

  /** Authored + concept-derived cards, plus anything the learner added. */
  const allCards: StudyCard[] = useMemo(() => {
    const custom: StudyCard[] = state.customCards.map((c) => {
      const course = courses.find((x) => x.id === c.courseId);
      return {
        id: c.id,
        key: cardKey(c.courseId || 'perso', c.id),
        courseId: c.courseId,
        courseTitle: course?.title ?? 'Cartes personnelles',
        chapterSlug: '',
        chapterNumber: 0,
        chapterTitle: 'Ajoutée par moi',
        objectiveId: c.objectiveId,
        front: c.front,
        back: c.back,
        origin: 'authored' as const,
      };
    });
    return [...cards, ...custom];
  }, [cards, state.customCards, courses]);

  const pool = useMemo(
    () => (courseFilter === 'all' ? allCards : allCards.filter((c) => c.courseId === courseFilter)),
    [allCards, courseFilter],
  );

  const byKey = useMemo(() => new Map(allCards.map((c) => [c.key, c] as const)), [allCards]);
  const counts = useMemo(
    () => queueCounts(pool.map((c) => ({ item: c, key: c.key })), state.cards),
    [pool, state.cards],
  );

  /* ---------------- session lifecycle ---------------- */

  const startSession = useCallback(
    (keys?: string[]) => {
      const queue = keys ?? buildQueue(pool.map((c) => ({ item: c, key: c.key })), state.cards).map((q) => q.key);
      setSession(queue);
      setPosition(0);
      setRevealed(false);
      setGraded({ again: 0, good: 0 });
    },
    [pool, state.cards],
  );

  // A deep link from search (/revision?carte=<courseId>:<cardId>) opens that
  // one card straight away.
  useEffect(() => {
    if (!hydrated || session) return;
    const wanted = focusKey ?? new URLSearchParams(window.location.search).get('carte') ?? undefined;
    if (wanted && byKey.has(wanted)) startSession([wanted]);
  }, [hydrated, focusKey, session, byKey, startSession]);

  const currentKey = session?.[position];
  const current = currentKey ? byKey.get(currentKey) : undefined;
  const currentState: CardState = (currentKey ? state.cards[currentKey] : undefined) ?? newCard();
  const previews = useMemo(() => previewIntervals(currentState), [currentState]);

  const gradeCard = useCallback(
    (grade: number) => {
      if (!currentKey || !session) return;
      const before = state.cards[currentKey] ?? newCard();
      const after = review(before, grade);

      update((d) => {
        d.cards[currentKey] = after;
        touchStreak(d);
      });

      setGraded((g) => (grade < 3 ? { ...g, again: g.again + 1 } : { ...g, good: g.good + 1 }));

      // A lapsed card goes to the back of the queue instead of being dropped.
      const nextQueue = grade < 3 ? [...session, currentKey] : session;
      if (nextQueue !== session) setSession(nextQueue);

      setRevealed(false);
      setPosition((p) => p + 1);
    },
    [currentKey, session, state.cards],
  );

  /* ---------------- keyboard ---------------- */

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        return;
      }
      if (!revealed) return;
      const g = GRADES.find((x) => x.key === e.key);
      if (g) {
        e.preventDefault();
        gradeCard(g.grade);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, revealed, gradeCard]);

  /* ================================================================ */

  if (!hydrated) {
    return (
      <div className="card p-8 text-center" style={{ color: 'var(--text-faint)' }}>
        Chargement de la file de révision…
      </div>
    );
  }

  /* ---------------- session finished / not started ---------------- */

  if (!session || position >= session.length) {
    const done = session !== null;
    return (
      <div className="space-y-5">
        {done && (
          <div className="card p-6 text-center">
            <p className="text-3xl">✓</p>
            <h2 className="mt-2 text-xl font-semibold">Session terminée</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {graded.good + graded.again} révision{graded.good + graded.again > 1 ? 's' : ''} ·{' '}
              <span style={{ color: 'var(--ok)' }}>{graded.good} retenue(s)</span> ·{' '}
              <span style={{ color: 'var(--bad)' }}>{graded.again} à revoir</span>
            </p>
          </div>
        )}

        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">File de révision</h2>
            {courses.length > 1 && (
              <select
                className="field w-auto py-1.5 text-sm"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                aria-label="Filtrer par cours"
              >
                <option value="all">Tous les cours</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="À réviser" value={counts.due} tone={counts.due > 0 ? 'warn' : 'ok'} />
            <Stat label="Nouvelles" value={counts.fresh} tone="info" />
            <Stat label="Acquises" value={counts.learned} tone="ok" />
            <Stat label="Total" value={counts.total} />
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={counts.due + counts.fresh === 0}
              onClick={() => startSession()}
            >
              {counts.due + counts.fresh === 0
                ? 'Rien à réviser aujourd’hui'
                : `Réviser ${Math.min(counts.due + counts.fresh, counts.due + Math.min(counts.fresh, 20))} carte(s)`}
            </button>
            <button type="button" className="btn" onClick={() => setAdding((a) => !a)}>
              + Ajouter une carte
            </button>
          </div>

          {counts.due + counts.fresh === 0 && counts.total > 0 && (
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              Toutes les cartes dues sont faites. Les prochaines reviendront d’elles-mêmes —
              c’est le principe de la répétition espacée.
            </p>
          )}

          {counts.upcoming.length > 0 && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                Prochaines échéances
              </p>
              <div className="flex items-end gap-1" style={{ height: '48px' }}>
                {counts.upcoming.map((u) => {
                  const max = Math.max(...counts.upcoming.map((x) => x.count), 1);
                  return (
                    <div
                      key={u.day}
                      className="flex-1 rounded-t"
                      title={`${u.day} : ${u.count} carte(s)`}
                      style={{
                        height: `${Math.max(8, (u.count / max) * 100)}%`,
                        background: 'var(--accent)',
                        opacity: 0.55,
                      }}
                    />
                  );
                })}
              </div>
              <p className="mt-1 text-[0.7rem]" style={{ color: 'var(--text-faint)' }}>
                {counts.upcoming[0]?.day} → {counts.upcoming[counts.upcoming.length - 1]?.day}
              </p>
            </div>
          )}
        </div>

        {adding && <AddCardForm courses={courses} onDone={() => setAdding(false)} />}

        {state.customCards.length > 0 && (
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold">Mes cartes ({state.customCards.length})</h3>
            <ul className="space-y-2">
              {state.customCards.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border p-2.5 text-sm" style={{ borderColor: 'var(--border)' }}>
                  <div className="min-w-0">
                    <p className="font-medium"><MathText text={c.front} /></p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-faint)' }}>
                      {c.back}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost shrink-0"
                    onClick={() => removeCustomCard(c.id)}
                    aria-label={`Supprimer la carte « ${c.front} »`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  /* ---------------- reviewing ---------------- */

  if (!current) return null;
  const remaining = session.length - position;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {remaining} carte{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          {currentState.reps === 0 ? (
            <span className="chip chip-info">nouvelle</span>
          ) : (
            <span className="chip">
              vue {currentState.reps}× · facilité {currentState.ease.toFixed(2)}
            </span>
          )}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSession(null)}>
            Arrêter
          </button>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${(position / session.length) * 100}%`, background: 'var(--accent)' }}
        />
      </div>

      <article className="card min-h-[15rem] p-6 sm:p-8">
        <p className="mb-3 text-xs" style={{ color: 'var(--text-faint)' }}>
          {current.courseTitle}
          {current.chapterNumber > 0 && ` · Ch. ${current.chapterNumber} — ${current.chapterTitle}`}
        </p>

        <p className="whitespace-pre-wrap text-lg font-medium leading-relaxed"><MathText text={current.front} /></p>

        {!revealed ? (
          <div className="mt-8 text-center">
            <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)}>
              Afficher la réponse
            </button>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-faint)' }}>
              Essayer de répondre <em>avant</em> de retourner la carte — c’est l’effort de rappel qui fixe la mémoire.
            </p>
          </div>
        ) : (
          <div className="mt-5 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
            <p className="whitespace-pre-wrap text-[1.02rem] leading-relaxed"><MathText text={current.back} /></p>
            {current.extra && (
              <p className="mt-3 whitespace-pre-wrap text-[0.88rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {current.extra}
              </p>
            )}
            {current.source && (
              <p className="mt-4 text-xs" style={{ color: 'var(--text-faint)' }}>
                Source&nbsp;: {current.source.file}
                {current.source.page !== undefined && `, p. ${current.source.page}`}
              </p>
            )}
          </div>
        )}
      </article>

      {revealed && (
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g) => (
              <button
                key={g.grade}
                type="button"
                onClick={() => gradeCard(g.grade)}
                className={cx('btn flex-col !items-stretch !py-2.5 text-left')}
                style={{
                  borderColor: `color-mix(in srgb, var(--${g.tone === 'bad' ? 'bad' : g.tone === 'warn' ? 'warn' : g.tone === 'ok' ? 'ok' : 'info'}) 45%, transparent)`,
                }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{g.label}</span>
                  <kbd className="text-[0.65rem] opacity-50">{g.key}</kbd>
                </span>
                <span className="text-[0.7rem] font-normal" style={{ color: 'var(--text-faint)' }}>
                  {previews[g.grade]}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs" style={{ color: 'var(--text-faint)' }}>
            Prochaine révision si « Correct »&nbsp;: {formatInterval(review(currentState, 4))}
          </p>
        </div>
      )}

      {!revealed && (
        <p className="text-center text-xs" style={{ color: 'var(--text-faint)' }}>
          <kbd>Espace</kbd> pour retourner · <kbd>1</kbd>–<kbd>4</kbd> pour noter
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' | 'info' }) {
  const color = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : tone === 'info' ? 'var(--info)' : 'var(--text)';
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
      <dt className="text-xs" style={{ color: 'var(--text-faint)' }}>
        {label}
      </dt>
      <dd className="mt-0.5 text-2xl font-semibold tabular-nums" style={{ color }}>
        {value}
      </dd>
    </div>
  );
}

function AddCardForm({ courses, onDone }: { courses: { id: string; code: string }[]; onDone: () => void }) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? 'perso');

  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    addCustomCard({ courseId, objectiveId: 'perso', front: front.trim(), back: back.trim() });
    setFront('');
    setBack('');
    onDone();
  };

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <h3 className="text-sm font-semibold">Nouvelle carte</h3>
      <div>
        <label htmlFor="card-front" className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
          Recto (la question)
        </label>
        <input id="card-front" className="field" value={front} onChange={(e) => setFront(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="card-back" className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
          Verso (la réponse)
        </label>
        <textarea id="card-back" className="field" rows={3} value={back} onChange={(e) => setBack(e.target.value)} required />
      </div>
      {courses.length > 1 && (
        <div>
          <label htmlFor="card-course" className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
            Cours
          </label>
          <select id="card-course" className="field" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm">
          Ajouter
        </button>
        <button type="button" className="btn btn-sm" onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}
