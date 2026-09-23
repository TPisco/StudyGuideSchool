import type { RunRequest, RunResult, RunnerLanguage, TestOutcome } from './types';
import {
  JS_WORKER,
  PYODIDE_INDEX_URL,
  PYTHON_WORKER,
  SQLJS_BASE,
  SQL_WORKER,
} from './workers';

/** Time allowed once the runtime is warm. */
const EXEC_TIMEOUT_MS = 15_000;
/** Pyodide is ~10 MB on first load; this budget covers a slow connection. */
const LOAD_TIMEOUT_MS = 120_000;

interface Pooled {
  worker: Worker;
  url: string;
  warm: boolean;
}

/**
 * One worker per language, reused across runs so Pyodide is downloaded once.
 * It is discarded (and rebuilt) whenever a run times out or crashes, because
 * a killed worker cannot be trusted to hold clean state.
 */
const pool = new Map<RunnerLanguage, Pooled>();

function spawn(lang: RunnerLanguage): Pooled {
  const source = lang === 'python' ? PYTHON_WORKER : lang === 'sql' ? SQL_WORKER : JS_WORKER;
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  return { worker: new Worker(url), url, warm: false };
}

function discard(lang: RunnerLanguage) {
  const p = pool.get(lang);
  if (!p) return;
  p.worker.terminate();
  URL.revokeObjectURL(p.url);
  pool.delete(lang);
}

/** Drop every runtime — used when leaving a page, to free ~100 MB of WASM heap. */
export function disposeRunners() {
  for (const lang of [...pool.keys()]) discard(lang);
}

export function isRuntimeWarm(lang: RunnerLanguage): boolean {
  return pool.get(lang)?.warm ?? false;
}

export interface RunOptions {
  /** Called when the runtime has finished loading and execution begins. */
  onReady?: () => void;
}

/**
 * Execute the learner's code and its tests.
 *
 * Never rejects: every failure mode (syntax error, exception, infinite loop,
 * CDN unreachable) comes back as a RunResult the UI can render.
 */
export function run(
  lang: RunnerLanguage,
  request: RunRequest,
  options: RunOptions = {},
): Promise<RunResult> {
  const started = performance.now();

  return new Promise<RunResult>((resolve) => {
    let settled = false;
    let pooled = pool.get(lang);
    if (!pooled) {
      pooled = spawn(lang);
      pool.set(lang, pooled);
    }
    const { worker } = pooled;

    const finish = (result: Omit<RunResult, 'durationMs'>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.onmessage = null;
      worker.onerror = null;
      resolve({ ...result, durationMs: Math.round(performance.now() - started) });
    };

    const kill = (message: string) => {
      discard(lang);
      finish({ output: '', error: message, tests: [] });
    };

    let timer = setTimeout(
      () => kill(`Le chargement de l’environnement d’exécution a dépassé ${Math.round(LOAD_TIMEOUT_MS / 1000)} s. Vérifier la connexion réseau.`),
      pooled.warm ? EXEC_TIMEOUT_MS : LOAD_TIMEOUT_MS,
    );

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { type: 'ready' }
        | { type: 'result'; output: string; error?: string; tests: TestOutcome[]; runtimeUnavailable?: boolean };

      if (data.type === 'ready') {
        const p = pool.get(lang);
        if (p) p.warm = true;
        clearTimeout(timer);
        // Restart the clock: from here on, slowness is the learner's code.
        timer = setTimeout(
          () => kill(`Exécution interrompue après ${Math.round(EXEC_TIMEOUT_MS / 1000)} s — boucle infinie probable.`),
          EXEC_TIMEOUT_MS,
        );
        options.onReady?.();
        return;
      }

      if (data.type === 'result') {
        if (data.runtimeUnavailable) {
          discard(lang);
          finish({
            output: '',
            error:
              'L’environnement d’exécution n’a pas pu être téléchargé. Une connexion est nécessaire au premier lancement ; le reste du site fonctionne hors ligne.',
            tests: [],
            runtimeUnavailable: true,
          });
          return;
        }
        finish({ output: data.output ?? '', error: data.error, tests: data.tests ?? [] });
      }
    };

    worker.onerror = (e) => {
      kill(`Erreur de l’environnement d’exécution : ${e.message || 'inconnue'}`);
    };

    worker.postMessage({
      code: request.code,
      tests: request.tests,
      setupSql: request.setupSql,
      indexURL: PYODIDE_INDEX_URL,
      base: SQLJS_BASE,
    });
  });
}

/** Languages we can genuinely execute. Anything else gets a reasoning exercise. */
export const RUNNABLE: readonly RunnerLanguage[] = ['python', 'javascript', 'typescript', 'sql'];

export const isRunnable = (lang: string): lang is RunnerLanguage =>
  (RUNNABLE as readonly string[]).includes(lang);

export type { RunResult, RunRequest, TestOutcome, RunnerLanguage } from './types';
export { RUNTIME_LABELS } from './types';
