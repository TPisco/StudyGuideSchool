import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '../../lib/schemas';
import type { AnswerRecord, AttemptMode } from '../../lib/progress';
import { recordAttempt } from '../../lib/progress';
import { useHydrated, useProgress } from '../../lib/useProgress';
import {
  BLOOM_LABELS,
  QUESTION_TYPE_LABELS,
  answersMatch,
  cx,
  formatClock,
  formatDate,
  formatDuration,
  mulberry32,
  shuffle,
} from '../../lib/utils';
import MathText from './MathText';

export interface EngineQuestion extends Question {
  chapterKey: string;
  chapterSlug?: string;
  chapterNumber?: number;
  chapterTitle?: string;
}

interface Props {
  courseId: string;
  mode: 'quiz' | 'test' | 'exam';
  title: string;
  questions: EngineQuestion[];
  instructions?: string;
  /** Present for chapter quizzes and tests; absent for multi-chapter exams. */
  chapterKey?: string;
  /** Exam only. */
  timeLimitMinutes?: number;
  homeHref: string;
}

type Given = string | string[] | null;
type Phase = 'intro' | 'running' | 'review';

const isOptionType = (t: Question['type']) => t === 'mcq' || t === 'multi' || t === 'true-false';

function grade(q: Question, given: Given): boolean {
  if (given === null) return false;
  if (q.type === 'multi') {
    const want = new Set(Array.isArray(q.correct) ? q.correct : [q.correct]);
    const got = new Set(Array.isArray(given) ? given : [given]);
    if (want.size !== got.size) return false;
    for (const x of want) if (!got.has(x)) return false;
    return true;
  }
  if (isOptionType(q.type)) return given === q.correct;
  return answersMatch(String(given), String(q.correct), q.acceptableAnswers);
}

/* ------------------------------------------------------------------ */

export default function QuizEngine({
  courseId,
  mode,
  title,
  questions: sourceQuestions,
  instructions,
  chapterKey,
  timeLimitMinutes,
  homeHref,
}: Props) {
  const hydrated = useHydrated();
  const state = useProgress();

  const [phase, setPhase] = useState<Phase>('intro');
  const [seed, setSeed] = useState(1);
  const [runMode, setRunMode] = useState<AttemptMode>(mode);
  const [pool, setPool] = useState<EngineQuestion[]>(sourceQuestions);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<Record<string, Given>>({});
  const [validated, setValidated] = useState<Record<string, boolean>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [finishedAt, setFinishedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const liveRef = useRef<HTMLDivElement>(null);

  /** Exams withhold all feedback until submission. */
  const immediateFeedback = runMode !== 'exam';

  // Option order is shuffled per attempt so positions cannot be memorised.
  const prepared = useMemo(
    () =>
      pool.map((q) => ({
        ...q,
        options: q.options ? shuffle(q.options, mulberry32(seed + q.id.length + q.id.charCodeAt(0))) : undefined,
      })),
    [pool, seed],
  );

  const current = prepared[index];
  const total = prepared.length;
  const answeredCount = prepared.filter((q) => given[q.id] != null && given[q.id] !== '').length;

  /* ---------------- timer ---------------- */
  useEffect(() => {
    if (phase !== 'running' || !timeLimitMinutes) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase, timeLimitMinutes]);

  const remainingMs = timeLimitMinutes ? startedAt + timeLimitMinutes * 60_000 - now : 0;

  const finish = useCallback(
    (whenPool: EngineQuestion[], answers: Record<string, Given>, started: number, usedMode: AttemptMode) => {
      const end = Date.now();
      const records: AnswerRecord[] = whenPool.map((q) => ({
        questionId: q.id,
        objectiveId: q.objectiveId,
        chapterKey: q.chapterKey,
        correct: grade(q, answers[q.id] ?? null),
        bloomLevel: q.bloomLevel,
        difficulty: q.difficulty,
        answeredAt: end,
      }));
      const correct = records.filter((r) => r.correct).length;

      recordAttempt({
        courseId,
        chapterKey: usedMode === 'exam' ? undefined : chapterKey,
        mode: usedMode,
        startedAt: started,
        finishedAt: end,
        durationMs: end - started,
        answers: records,
        score: whenPool.length ? correct / whenPool.length : 0,
      });

      setFinishedAt(end);
      setPhase('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [courseId, chapterKey],
  );

  // Auto-submit when the exam clock runs out.
  useEffect(() => {
    if (phase !== 'running' || !timeLimitMinutes) return;
    if (remainingMs > 0) return;
    finish(prepared, given, startedAt, runMode);
  }, [remainingMs, phase, timeLimitMinutes, prepared, given, startedAt, runMode, finish]);

  /* ---------------- actions ---------------- */

  const start = (questions: EngineQuestion[], usedMode: AttemptMode) => {
    const nextSeed = Math.floor(Math.random() * 2 ** 31);
    setSeed(nextSeed);
    const ordered = usedMode === 'exam' ? shuffle(questions, mulberry32(nextSeed)) : questions;
    setPool(ordered);
    setRunMode(usedMode);
    setGiven({});
    setValidated({});
    setFlagged({});
    setIndex(0);
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
    setFinishedAt(0);
    setPhase('running');
  };

  const setAnswer = (qid: string, value: Given) => {
    if (validated[qid]) return;
    setGiven((g) => ({ ...g, [qid]: value }));
  };

  const validate = () => {
    if (!current) return;
    setValidated((v) => ({ ...v, [current.id]: true }));
    const ok = grade(current, given[current.id] ?? null);
    if (liveRef.current) liveRef.current.textContent = ok ? 'Bonne réponse.' : 'Réponse incorrecte.';
  };

  const next = () => {
    if (index + 1 < total) {
      setIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      finish(prepared, given, startedAt, runMode);
    }
  };

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    if (phase !== 'running' || !current) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (immediateFeedback && !validated[current.id]) validate();
        else next();
      }
      if (isOptionType(current.type) && /^[1-9]$/.test(e.key) && !validated[current.id]) {
        const opt = current.options?.[Number(e.key) - 1];
        if (!opt) return;
        e.preventDefault();
        if (current.type === 'multi') {
          const prev = (given[current.id] as string[] | undefined) ?? [];
          setAnswer(current.id, prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]);
        } else {
          setAnswer(current.id, opt.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current, validated, given, immediateFeedback, index, total]);

  /* ---------------- history ---------------- */
  const history = useMemo(() => {
    if (!hydrated) return [];
    return state.attempts
      .filter((a) => a.courseId === courseId && (chapterKey ? a.chapterKey === chapterKey : a.mode === 'exam'))
      .filter((a) => (chapterKey ? a.mode === mode || a.mode === 'retry' : true))
      .slice(-8)
      .reverse();
  }, [state.attempts, courseId, chapterKey, mode, hydrated]);

  /* ================================================================= */
  /* INTRO                                                             */
  /* ================================================================= */

  if (phase === 'intro') {
    const byBloom = sourceQuestions.reduce<Record<string, number>>((acc, q) => {
      acc[q.bloomLevel] = (acc[q.bloomLevel] ?? 0) + 1;
      return acc;
    }, {});
    const byType = sourceQuestions.reduce<Record<string, number>>((acc, q) => {
      acc[q.type] = (acc[q.type] ?? 0) + 1;
      return acc;
    }, {});

    return (
      <div className="card p-5 sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {instructions && (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            {instructions}
          </p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Questions" value={String(sourceQuestions.length)} />
          <Stat
            label="Durée estimée"
            value={timeLimitMinutes ? `${timeLimitMinutes} min` : `~${Math.max(5, Math.round(sourceQuestions.length * 1.2))} min`}
          />
          <Stat label="Formats" value={String(Object.keys(byType).length)} />
          <Stat label="Niveaux" value={String(Object.keys(byBloom).length)} />
        </dl>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {Object.entries(byBloom).map(([k, v]) => (
            <span key={k} className="chip">
              {BLOOM_LABELS[k] ?? k} · {v}
            </span>
          ))}
        </div>

        {runMode === 'exam' && (
          <p
            className="mt-5 rounded-lg border p-3 text-sm"
            style={{
              borderColor: 'color-mix(in srgb, var(--warn) 38%, transparent)',
              background: 'var(--warn-soft)',
              color: 'var(--text)',
            }}
          >
            <strong>Conditions d’examen.</strong> Aucun retour avant la remise. Le chronomètre démarre
            immédiatement et la copie est remise automatiquement à la fin du temps.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => start(sourceQuestions, mode)}>
            Commencer
          </button>
          <a href={homeHref} className="btn">
            Retour au chapitre
          </a>
        </div>

        {hydrated && history.length > 0 && (
          <div className="mt-8 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Tentatives précédentes
            </h3>
            <ul className="space-y-1.5">
              {history.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>
                    {formatDate(a.finishedAt)}
                    {a.mode === 'retry' && <span className="chip ml-2">reprise</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-faint)' }}>{formatDuration(a.durationMs)}</span>
                    <ScorePill score={a.score} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  /* ================================================================= */
  /* REVIEW                                                            */
  /* ================================================================= */

  if (phase === 'review') {
    const results = prepared.map((q) => ({ q, ok: grade(q, given[q.id] ?? null) }));
    const correct = results.filter((r) => r.ok).length;
    const score = total ? correct / total : 0;
    const wrong = results.filter((r) => !r.ok).map((r) => r.q);

    const byObjective = new Map<string, { ok: number; total: number }>();
    for (const r of results) {
      const row = byObjective.get(r.q.objectiveId) ?? { ok: 0, total: 0 };
      row.total++;
      if (r.ok) row.ok++;
      byObjective.set(r.q.objectiveId, row);
    }

    return (
      <div className="space-y-6">
        <div className="card p-5 text-center sm:p-7">
          <p className="text-sm uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
            Résultat
          </p>
          <p className="mt-1 text-5xl font-bold tabular-nums" style={{ color: scoreColor(score) }}>
            {Math.round(score * 100)}
            <span className="text-2xl"> %</span>
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {correct} / {total} · {formatDuration(finishedAt - startedAt)}
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {wrong.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={() => start(wrong, 'retry')}>
                Refaire les {wrong.length} erreur{wrong.length > 1 ? 's' : ''}
              </button>
            )}
            <button type="button" className="btn" onClick={() => start(sourceQuestions, mode)}>
              Tout recommencer
            </button>
            <a href={homeHref} className="btn">
              Retour au chapitre
            </a>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold">Par objectif d’apprentissage</h3>
          <ul className="space-y-2.5">
            {[...byObjective.entries()].map(([id, row]) => {
              const ratio = row.ok / row.total;
              return (
                <li key={id}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <code className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {id}
                    </code>
                    <span className="tabular-nums" style={{ color: scoreColor(ratio) }}>
                      {row.ok}/{row.total}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${ratio * 100}%`, background: scoreColor(ratio) }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {[...byObjective.values()].some((r) => r.ok / r.total < 0.7) && (
            <p className="mt-4 text-xs" style={{ color: 'var(--text-faint)' }}>
              Les objectifs sous 70 % sont signalés comme sujets faibles sur le tableau de bord.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Correction détaillée</h3>
          {results.map(({ q, ok }, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              number={i + 1}
              total={total}
              given={given[q.id] ?? null}
              revealed
              correctAnswer={ok}
              onChange={() => {}}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ================================================================= */
  /* RUNNING                                                           */
  /* ================================================================= */

  if (!current) return null;
  const isValidated = !!validated[current.id];
  const answer = given[current.id] ?? null;
  const hasAnswer = answer !== null && answer !== '' && !(Array.isArray(answer) && answer.length === 0);

  return (
    <div className="space-y-4">
      <div ref={liveRef} className="sr-only" role="status" aria-live="polite" />

      {/* progress bar */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <span className="font-medium tabular-nums">
            Question {index + 1} <span style={{ color: 'var(--text-faint)' }}>/ {total}</span>
          </span>
          <div className="flex items-center gap-3">
            {runMode === 'exam' && (
              <>
                <span style={{ color: 'var(--text-faint)' }} className="text-xs">
                  {answeredCount}/{total} répondues
                </span>
                {timeLimitMinutes && (
                  <span
                    className="chip tabular-nums"
                    style={
                      remainingMs < 60_000
                        ? { color: 'var(--bad)', borderColor: 'var(--bad)' }
                        : remainingMs < 300_000
                          ? { color: 'var(--warn)', borderColor: 'var(--warn)' }
                          : undefined
                    }
                  >
                    {formatClock(remainingMs)}
                  </span>
                )}
              </>
            )}
            <button
              type="button"
              className={cx('btn btn-sm btn-ghost', flagged[current.id] && 'chip-warn')}
              onClick={() => setFlagged((f) => ({ ...f, [current.id]: !f[current.id] }))}
              aria-pressed={!!flagged[current.id]}
              title="Marquer cette question pour y revenir"
            >
              {flagged[current.id] ? '★ marquée' : '☆ marquer'}
            </button>
          </div>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${((index + (isValidated ? 1 : 0)) / total) * 100}%`, background: 'var(--accent)' }}
          />
        </div>
      </div>

      <QuestionCard
        question={current}
        number={index + 1}
        total={total}
        given={answer}
        revealed={isValidated}
        correctAnswer={isValidated ? grade(current, answer) : false}
        onChange={(v) => setAnswer(current.id, v)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
          ← Précédente
        </button>

        <div className="flex flex-wrap gap-2">
          {immediateFeedback && !isValidated && (
            <button type="button" className="btn btn-primary" disabled={!hasAnswer} onClick={validate}>
              Valider
            </button>
          )}
          {(!immediateFeedback || isValidated) && (
            <button type="button" className="btn btn-primary" onClick={next}>
              {index + 1 < total ? 'Suivante →' : 'Terminer'}
            </button>
          )}
          {!immediateFeedback && index + 1 < total && (
            <button
              type="button"
              className="btn"
              onClick={() => finish(prepared, given, startedAt, runMode)}
              title="Remettre la copie maintenant"
            >
              Remettre
            </button>
          )}
        </div>
      </div>

      {runMode === 'exam' && (
        <div className="card p-4">
          <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Navigation
          </p>
          <div className="flex flex-wrap gap-1.5">
            {prepared.map((q, i) => {
              const done = given[q.id] != null && given[q.id] !== '';
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Aller à la question ${i + 1}`}
                  aria-current={i === index}
                  className="h-7 w-7 rounded-md text-xs font-medium tabular-nums transition-colors"
                  style={{
                    background: i === index ? 'var(--accent)' : done ? 'var(--accent-soft)' : 'var(--surface-sunken)',
                    color: i === index ? '#0b1020' : done ? 'var(--accent)' : 'var(--text-faint)',
                    border: flagged[q.id] ? '1px solid var(--warn)' : '1px solid transparent',
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-center text-xs" style={{ color: 'var(--text-faint)' }}>
        Raccourcis : <kbd>1</kbd>–<kbd>9</kbd> pour choisir, <kbd>Entrée</kbd> pour valider ou avancer.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Question card                                                       */
/* ------------------------------------------------------------------ */

function QuestionCard({
  question: q,
  number,
  total,
  given,
  revealed,
  correctAnswer,
  onChange,
}: {
  question: Question & { chapterTitle?: string; chapterNumber?: number };
  number: number;
  total: number;
  given: Given;
  revealed: boolean;
  correctAnswer: boolean;
  onChange: (v: Given) => void;
}) {
  const correctIds = Array.isArray(q.correct) ? q.correct : [q.correct];
  const distractorWhy = new Map(q.perDistractorExplanation.map((d) => [d.optionId, d.why] as const));

  return (
    <article
      className="card p-5 sm:p-6"
      style={revealed ? { borderColor: correctAnswer ? 'var(--ok)' : 'var(--bad)' } : undefined}
    >
      <header className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="chip">{number} / {total}</span>
        <span className="chip">{QUESTION_TYPE_LABELS[q.type] ?? q.type}</span>
        <span className="chip">{BLOOM_LABELS[q.bloomLevel] ?? q.bloomLevel}</span>
        <span className="chip" title={`Difficulté ${q.difficulty} sur 3`}>
          {'●'.repeat(q.difficulty)}
          <span style={{ opacity: 0.3 }}>{'●'.repeat(3 - q.difficulty)}</span>
        </span>
        {q.chapterNumber !== undefined && <span className="chip">Ch. {q.chapterNumber}</span>}
        {revealed && (
          <span className={cx('chip', correctAnswer ? 'chip-ok' : 'chip-bad')}>
            {correctAnswer ? '✓ juste' : '✗ faux'}
          </span>
        )}
      </header>

      <p className="whitespace-pre-wrap text-[1.02rem] leading-relaxed"><MathText text={q.prompt} /></p>

      {q.code && (
        <figure className="mt-4">
          <pre
            className="overflow-x-auto rounded-lg border p-3.5 text-[0.82rem] leading-relaxed"
            style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}
          >
            <code>{q.code.value}</code>
          </pre>
          {q.code.caption && (
            <figcaption className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
              {q.code.caption}
            </figcaption>
          )}
        </figure>
      )}

      {/* --- answer input --- */}
      <div className="mt-4 space-y-2">
        {isOptionType(q.type) && q.options ? (
          q.options.map((opt, i) => {
            const selected = Array.isArray(given) ? given.includes(opt.id) : given === opt.id;
            const isCorrect = correctIds.includes(opt.id);
            const showCorrect = revealed && isCorrect;
            const showWrong = revealed && selected && !isCorrect;

            return (
              <div key={opt.id}>
                <button
                  type="button"
                  disabled={revealed}
                  aria-pressed={selected}
                  onClick={() => {
                    if (q.type === 'multi') {
                      const prev = Array.isArray(given) ? given : [];
                      onChange(prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]);
                    } else {
                      onChange(opt.id);
                    }
                  }}
                  className="flex w-full items-start gap-3 rounded-xl border p-3 text-left text-[0.95rem] transition-colors disabled:cursor-default"
                  style={{
                    borderColor: showCorrect
                      ? 'var(--ok)'
                      : showWrong
                        ? 'var(--bad)'
                        : selected
                          ? 'var(--accent)'
                          : 'var(--border)',
                    background: showCorrect
                      ? 'var(--ok-soft)'
                      : showWrong
                        ? 'var(--bad-soft)'
                        : selected
                          ? 'var(--accent-soft)'
                          : 'transparent',
                  }}
                >
                  <span
                    className="mt-px grid h-5 w-5 shrink-0 place-items-center text-[0.7rem] font-bold"
                    style={{
                      borderRadius: q.type === 'multi' ? '0.3rem' : '999px',
                      border: `1.5px solid ${showCorrect ? 'var(--ok)' : showWrong ? 'var(--bad)' : selected ? 'var(--accent)' : 'var(--border-strong)'}`,
                      background: selected || showCorrect ? (showCorrect ? 'var(--ok)' : showWrong ? 'var(--bad)' : 'var(--accent)') : 'transparent',
                      color: selected || showCorrect ? '#0b1020' : 'var(--text-faint)',
                    }}
                    aria-hidden="true"
                  >
                    {showCorrect ? '✓' : showWrong ? '✗' : selected ? '●' : i + 1}
                  </span>
                  <span className="whitespace-pre-wrap"><MathText text={opt.text} /></span>
                </button>

                {revealed && !isCorrect && distractorWhy.has(opt.id) && (
                  <p className="mt-1 pl-11 pr-2 text-[0.85rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--bad)' }}>Pourquoi c’est faux&nbsp;:</span>{' '}
                    <MathText text={distractorWhy.get(opt.id) ?? ''} />
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {q.type === 'code-output' ? 'Sortie affichée' : q.type === 'fill-blank' ? 'Le mot manquant' : 'Votre réponse'}
            </label>
            <input
              type="text"
              className="field"
              autoComplete="off"
              spellCheck={false}
              disabled={revealed}
              value={typeof given === 'string' ? given : ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="…"
              style={
                revealed
                  ? { borderColor: correctAnswer ? 'var(--ok)' : 'var(--bad)', background: correctAnswer ? 'var(--ok-soft)' : 'var(--bad-soft)' }
                  : undefined
              }
            />
            {revealed && !correctAnswer && (
              <p className="mt-2 text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Réponse attendue&nbsp;: </span>
                <code style={{ color: 'var(--ok)' }}><MathText text={String(q.correct)} /></code>
              </p>
            )}
          </div>
        )}
      </div>

      {revealed && (
        <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
            Explication
          </p>
          <p className="text-[0.92rem] leading-relaxed"><MathText text={q.explanation} /></p>
          {q.source && (
            <p className="mt-3 text-xs" style={{ color: 'var(--text-faint)' }}>
              Source&nbsp;: {q.source.file}
              {q.source.page !== undefined && `, p. ${q.source.page}`}
              {q.source.locator && ` · ${q.source.locator}`}
            </p>
          )}
          <p className="mt-2 text-xs" style={{ color: 'var(--text-faint)' }}>
            Objectif évalué&nbsp;: <code>{q.objectiveId}</code>
          </p>
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
      <dt className="text-xs" style={{ color: 'var(--text-faint)' }}>
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function scoreColor(score: number): string {
  if (score >= 0.85) return 'var(--ok)';
  if (score >= 0.7) return 'var(--warn)';
  return 'var(--bad)';
}

function ScorePill({ score }: { score: number }) {
  return (
    <span className="chip tabular-nums" style={{ color: scoreColor(score), borderColor: scoreColor(score) }}>
      {Math.round(score * 100)} %
    </span>
  );
}
