export interface TestSpec {
  name: string;
  call: string;
  expected: string;
  hidden: boolean;
}

export interface TestOutcome {
  name: string;
  call: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
  hidden: boolean;
}

export interface RunResult {
  /** Anything the program printed. */
  output: string;
  /** A hard failure: syntax error, exception outside a test, timeout, load failure. */
  error?: string;
  tests: TestOutcome[];
  durationMs: number;
  /** True when the runtime itself could not be loaded (offline, CDN blocked). */
  runtimeUnavailable?: boolean;
}

export type RunnerLanguage = 'python' | 'javascript' | 'typescript' | 'sql';

export interface RunRequest {
  code: string;
  tests: TestSpec[];
  /** SQL only: schema + fixtures executed before the learner's query. */
  setupSql?: string;
}

export const RUNTIME_LABELS: Record<RunnerLanguage, string> = {
  python: 'Pyodide (CPython compilé en WebAssembly)',
  javascript: 'Web Worker isolé',
  typescript: 'Web Worker isolé (types effacés)',
  sql: 'sql.js (SQLite compilé en WebAssembly)',
};
