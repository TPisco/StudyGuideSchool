import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise } from '../../lib/schemas';
import { exerciseKey, setExerciseState } from '../../lib/progress';
import { useHydrated, useProgress } from '../../lib/useProgress';
import { EXERCISE_MODE_LABELS, cx } from '../../lib/utils';
import { RUNTIME_LABELS, disposeRunners, isRunnable, run, type RunResult } from '../../lib/runners';
import MathText from './MathText';

interface Props {
  exercise: Exercise;
  courseId: string;
}

const LANG_LABELS: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  sql: 'SQL',
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  asm: 'Assembleur ARMv8',
  pseudocode: 'Pseudo-code',
  text: 'Texte',
};

export default function ExerciseRunner({ exercise: ex, courseId }: Props) {
  const hydrated = useHydrated();
  const progress = useProgress();
  const key = exerciseKey(courseId, ex.id);
  const saved = progress.exercises[key];

  const runnable = ex.mode === 'run' && isRunnable(ex.language);

  const [code, setCode] = useState(ex.starterCode);
  const [answer, setAnswer] = useState('');
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const restored = useRef(false);

  // Restore saved work once hydration has produced the real state.
  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    if (saved?.code !== undefined) {
      if (runnable) setCode(saved.code);
      else setAnswer(saved.code);
    }
    if (saved?.hintsRevealed) setHints(saved.hintsRevealed);
    if (saved?.status === 'revealed') setShowSolution(true);
  }, [hydrated, saved, runnable]);

  useEffect(() => () => disposeRunners(), []);

  const visibleTests = useMemo(() => ex.tests.filter((t) => !t.hidden), [ex.tests]);
  const hiddenCount = ex.tests.length - visibleTests.length;

  const persist = (patch: Parameters<typeof setExerciseState>[1]) => setExerciseState(key, patch);

  /* ---------------- run ---------------- */

  const execute = async () => {
    setBusy(true);
    setResult(null);
    setStatus(`Chargement de l’environnement ${LANG_LABELS[ex.language]}…`);

    const res = await run(ex.language as 'python' | 'javascript' | 'typescript' | 'sql', {
      code,
      tests: ex.tests,
      setupSql: ex.setupSql,
      }, { onReady: () => setStatus('Exécution…') });

    setResult(res);
    setBusy(false);
    setStatus('');

    const allPassed = res.tests.length > 0 && res.tests.every((t) => t.passed) && !res.error;
    persist({ code, status: allPassed ? 'solved' : 'attempted', hintsRevealed: hints });
  };

  /* ---------------- self-assessed ---------------- */

  const selfAssess = (verdict: 'ok' | 'partial' | 'no') => {
    persist({ code: answer, status: verdict === 'ok' ? 'solved' : 'attempted', selfAssessed: verdict, hintsRevealed: hints });
  };

  const revealSolution = () => {
    setShowSolution(true);
    persist({ code: runnable ? code : answer, status: saved?.status === 'solved' ? 'solved' : 'revealed', hintsRevealed: hints });
  };

  const revealHint = () => {
    const n = Math.min(hints + 1, ex.hints.length);
    setHints(n);
    persist({ code: runnable ? code : answer, hintsRevealed: n });
  };

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: t, value } = el;
    const next = `${value.slice(0, s)}    ${value.slice(t)}`;
    setCode(next);
    requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
  };

  const solved = saved?.status === 'solved';
  const passedCount = result?.tests.filter((t) => t.passed).length ?? 0;

  return (
    <article
      id={`exercice-${ex.id}`}
      className="card scroll-mt-24 overflow-hidden"
      style={solved ? { borderColor: 'color-mix(in srgb, var(--ok) 45%, transparent)' } : undefined}
    >
      {/* header */}
      <header className="border-b px-4 py-3.5 sm:px-5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip chip-accent">{LANG_LABELS[ex.language] ?? ex.language}</span>
          <span className="chip">{EXERCISE_MODE_LABELS[ex.mode] ?? ex.mode}</span>
          <span className="chip" title={`Difficulté ${ex.difficulty} sur 3`}>
            {'●'.repeat(ex.difficulty)}
            <span style={{ opacity: 0.3 }}>{'●'.repeat(3 - ex.difficulty)}</span>
          </span>
          {hydrated && solved && <span className="chip chip-ok">✓ réussi</span>}
          {hydrated && saved?.selfAssessed === 'partial' && <span className="chip chip-warn">à revoir</span>}
        </div>
        <h3 className="mt-2 text-lg font-semibold tracking-tight">{ex.title}</h3>
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed"><MathText text={ex.statement} /></p>

        {!runnable && (
          <p
            className="rounded-lg border p-3 text-[0.85rem]"
            style={{ borderColor: 'color-mix(in srgb, var(--info) 35%, transparent)', background: 'var(--info-soft)' }}
          >
            <strong>{LANG_LABELS[ex.language] ?? ex.language}</strong> ne s’exécute pas dans un navigateur.
            Cet exercice se résout par le raisonnement, puis s’auto-évalue contre la correction détaillée —
            plutôt qu’avec un faux bouton « Exécuter ».
          </p>
        )}

        {/* ------------- runnable ------------- */}
        {runnable ? (
          <>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor={`editor-${ex.id}`} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {ex.language === 'sql' ? 'Votre requête' : 'Votre code'}
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setCode(ex.starterCode);
                    setResult(null);
                  }}
                >
                  Réinitialiser
                </button>
              </div>
              <textarea
                id={`editor-${ex.id}`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={onEditorKeyDown}
                onBlur={() => persist({ code, hintsRevealed: hints })}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                rows={Math.min(22, Math.max(7, code.split('\n').length + 2))}
                className="w-full resize-y rounded-lg border p-3 font-mono text-[0.82rem] leading-relaxed"
                style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border-strong)', color: 'var(--text)' }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-primary" onClick={execute} disabled={busy}>
                {busy ? 'Exécution…' : '▶ Exécuter les tests'}
              </button>
              {busy && status && (
                <span className="text-xs" style={{ color: 'var(--text-faint)' }} role="status">
                  {status}
                </span>
              )}
              {!busy && result && (
                <span
                  className="chip tabular-nums"
                  style={
                    result.error
                      ? { color: 'var(--bad)', borderColor: 'var(--bad)' }
                      : passedCount === result.tests.length
                        ? { color: 'var(--ok)', borderColor: 'var(--ok)' }
                        : { color: 'var(--warn)', borderColor: 'var(--warn)' }
                  }
                >
                  {result.error ? 'erreur' : `${passedCount} / ${result.tests.length} tests`} · {result.durationMs} ms
                </span>
              )}
            </div>

            {result && <RunOutput result={result} />}

            {!result && ex.tests.length > 0 && (
              <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                <p className="mb-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Tests qui seront exécutés
                </p>
                <ul className="space-y-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                  {visibleTests.map((t) => (
                    <li key={t.name}>· {t.name}</li>
                  ))}
                  {hiddenCount > 0 && <li>· et {hiddenCount} test(s) caché(s)</li>}
                </ul>
                <p className="mt-2 text-[0.7rem]" style={{ color: 'var(--text-faint)' }}>
                  {RUNTIME_LABELS[ex.language as 'python']} — téléchargé au premier lancement.
                </p>
              </div>
            )}
          </>
        ) : (
          /* ------------- reasoning exercise ------------- */
          <>
            {ex.starterCode && (
              <div>
                <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {ex.language === 'text' ? 'Données' : 'Code à analyser'}
                </p>
                <pre
                  className="overflow-x-auto rounded-lg border p-3.5 font-mono text-[0.82rem] leading-relaxed"
                  style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}
                >
                  <code>{ex.starterCode}</code>
                </pre>
              </div>
            )}

            <div>
              <label htmlFor={`answer-${ex.id}`} className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {ex.mode === 'predict-output'
                  ? 'Ce que le programme affiche'
                  : ex.mode === 'find-bug'
                    ? 'La ligne fautive, le symptôme et la correction'
                    : ex.mode === 'trace'
                      ? 'Votre trace'
                      : 'Votre réponse'}
              </label>
              <textarea
                id={`answer-${ex.id}`}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onBlur={() => persist({ code: answer, hintsRevealed: hints })}
                spellCheck={false}
                rows={6}
                placeholder="Écrire la réponse ici avant de révéler la correction — c’est l’effort de rappel qui fait apprendre."
                className="w-full resize-y rounded-lg border p-3 font-mono text-[0.82rem] leading-relaxed"
                style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border-strong)', color: 'var(--text)' }}
              />
            </div>
          </>
        )}

        {/* ------------- hints ------------- */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-sm" onClick={revealHint} disabled={hints >= ex.hints.length}>
              {hints === 0 ? '💡 Un indice' : hints >= ex.hints.length ? 'Tous les indices sont affichés' : `💡 Indice ${hints + 1} / ${ex.hints.length}`}
            </button>
            {!showSolution && (
              <button type="button" className="btn btn-sm" onClick={revealSolution}>
                Voir la correction
              </button>
            )}
          </div>

          {hints > 0 && (
            <ol className="mt-3 space-y-2">
              {ex.hints.slice(0, hints).map((h, i) => (
                <li
                  key={i}
                  className="rounded-lg border p-3 text-[0.88rem] leading-relaxed"
                  style={{ borderColor: 'color-mix(in srgb, var(--warn) 30%, transparent)', background: 'var(--warn-soft)' }}
                >
                  <span className="font-semibold" style={{ color: 'var(--warn)' }}>
                    Indice {i + 1}.{' '}
                  </span>
                  <MathText text={h} />
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* ------------- solution ------------- */}
        {showSolution && (
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-sunken)' }}>
            <h4 className="mb-2 text-sm font-semibold" style={{ color: 'var(--ok)' }}>
              Correction
            </h4>

            {ex.expectedOutput ? (
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[0.82rem] leading-relaxed">
                <MathText text={ex.expectedOutput} />
              </pre>
            ) : (
              <pre className="overflow-x-auto font-mono text-[0.82rem] leading-relaxed">
                <code>{ex.solution}</code>
              </pre>
            )}

            {ex.expectedOutput && ex.solution && ex.mode !== 'predict-output' && ex.mode !== 'trace' && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs" style={{ color: 'var(--text-muted)' }}>
                  Réponse attendue en une ligne
                </summary>
                <pre className="mt-2 overflow-x-auto font-mono text-[0.82rem]">
                  <code>{ex.solution}</code>
                </pre>
              </details>
            )}

            {ex.solutionExplanation && (
              <p className="mt-3 border-t pt-3 text-[0.88rem] leading-relaxed" style={{ borderColor: 'var(--border)' }}>
                <MathText text={ex.solutionExplanation} />
              </p>
            )}

            {!runnable && (
              <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Auto-évaluation — comparer honnêtement avec ce que vous aviez écrit&nbsp;:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cx('btn btn-sm', saved?.selfAssessed === 'ok' && 'chip-ok')}
                    onClick={() => selfAssess('ok')}
                  >
                    ✓ J’avais juste
                  </button>
                  <button
                    type="button"
                    className={cx('btn btn-sm', saved?.selfAssessed === 'partial' && 'chip-warn')}
                    onClick={() => selfAssess('partial')}
                  >
                    ~ En partie
                  </button>
                  <button
                    type="button"
                    className={cx('btn btn-sm', saved?.selfAssessed === 'no' && 'chip-bad')}
                    onClick={() => selfAssess('no')}
                  >
                    ✗ Je n’avais pas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {ex.source && (
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Source&nbsp;: {ex.source.file}
            {ex.source.page !== undefined && `, p. ${ex.source.page}`}
            {ex.source.locator && ` · ${ex.source.locator}`}
          </p>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */

function RunOutput({ result }: { result: RunResult }) {
  return (
    <div className="space-y-3">
      {result.error && (
        <div
          className="rounded-lg border p-3"
          style={{ borderColor: 'color-mix(in srgb, var(--bad) 45%, transparent)', background: 'var(--bad-soft)' }}
        >
          <p className="mb-1 text-xs font-semibold" style={{ color: 'var(--bad)' }}>
            {result.runtimeUnavailable ? 'Environnement indisponible' : 'Erreur'}
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[0.78rem] leading-relaxed">
            {result.error}
          </pre>
        </div>
      )}

      {result.output.trim() && (
        <div>
          <p className="mb-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Sortie
          </p>
          <pre
            className="max-h-64 overflow-auto rounded-lg border p-3 font-mono text-[0.78rem] leading-relaxed"
            style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}
          >
            {result.output}
          </pre>
        </div>
      )}

      {result.tests.length > 0 && (
        <ul className="space-y-1.5">
          {result.tests.map((t, i) => (
            <li
              key={i}
              className="rounded-lg border p-2.5 text-[0.85rem]"
              style={{
                borderColor: t.passed
                  ? 'color-mix(in srgb, var(--ok) 40%, transparent)'
                  : 'color-mix(in srgb, var(--bad) 40%, transparent)',
                background: t.passed ? 'var(--ok-soft)' : 'var(--bad-soft)',
              }}
            >
              <div className="flex items-start gap-2">
                <span aria-hidden="true" style={{ color: t.passed ? 'var(--ok)' : 'var(--bad)' }}>
                  {t.passed ? '✓' : '✗'}
                </span>
                <div className="min-w-0 flex-1">
                  <p>
                    {t.name}
                    {t.hidden && (
                      <span className="chip ml-2" style={{ fontSize: '0.62rem' }}>
                        caché
                      </span>
                    )}
                  </p>
                  {!t.passed && (
                    <div className="mt-1 space-y-0.5 font-mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
                      {!t.hidden && <p>appel&nbsp;: {t.call}</p>}
                      <p>attendu&nbsp;: {t.expected}</p>
                      <p>obtenu&nbsp;: {t.error ? `erreur — ${t.error}` : t.actual || '(rien)'}</p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
