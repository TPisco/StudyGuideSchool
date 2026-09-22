/** Small shared helpers. Kept dependency-free so both React islands and
 *  build-time Astro code can import them. */

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeAnswer(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.;:!?]+$/g, '')
    .trim();
}

/**
 * Open-ended answer comparison.
 *
 * Deliberately forgiving on formatting (accents, case, spacing, thousands
 * separators) and strict on content: we never fuzzy-match on edit distance,
 * because accepting a near-miss would teach the wrong thing.
 */
export function answersMatch(given: string, correct: string, acceptable: string[] = []): boolean {
  const g = normalizeAnswer(given);
  if (!g) return false;

  const candidates = [correct, ...acceptable].map(normalizeAnswer);
  if (candidates.includes(g)) return true;

  // Numbers: ignore spaces, apostrophes and non-breaking spaces used as
  // thousands separators, so "499 500" matches "499500".
  const numeric = (s: string) => s.replace(/[\s'  ]/g, '');
  const gn = numeric(g);
  if (/^-?\d+$/.test(gn) && candidates.some((c) => numeric(c) === gn)) return true;

  // Accept the bare value when the expected answer carries a unit or a word,
  // e.g. "11 itérations" vs "11".
  const stripped = g.replace(/\s+(iterations?|tours?|comparaisons?|lignes?|operations?)$/, '');
  if (candidates.includes(stripped)) return true;

  return false;
}

export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Deterministic PRNG so an exam can be replayed from its seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pct = (v: number): string => `${Math.round(v * 100)} %`;

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return `${m} min ${String(s).padStart(2, '0')} s`;
  return `${s} s`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const RELATIVE = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

export function timeAgo(ts: number, now = Date.now()): string {
  if (!ts) return 'jamais';
  const diff = ts - now;
  const abs = Math.abs(diff);
  if (abs < 60_000) return "à l'instant";
  if (abs < 3_600_000) return RELATIVE.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return RELATIVE.format(Math.round(diff / 3_600_000), 'hour');
  if (abs < 2_592_000_000) return RELATIVE.format(Math.round(diff / 86_400_000), 'day');
  return RELATIVE.format(Math.round(diff / 2_592_000_000), 'month');
}

export function formatDate(ts: number): string {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Join a base path (for GitHub Pages) with a route. */
export function withBase(base: string, path: string): string {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}` || '/';
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export const BLOOM_LABELS: Record<string, string> = {
  recall: 'Restitution',
  understand: 'Compréhension',
  apply: 'Application',
  analyze: 'Analyse',
};

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: 'Choix unique',
  multi: 'Choix multiple',
  'true-false': 'Vrai / Faux',
  'short-answer': 'Réponse courte',
  'code-output': 'Sortie du code',
  'fill-blank': 'Texte à trou',
};

export const EXERCISE_MODE_LABELS: Record<string, string> = {
  run: 'À exécuter',
  'predict-output': 'Prédire la sortie',
  'fill-blank': 'Compléter',
  'find-bug': 'Trouver le bogue',
  trace: 'Tracer l’exécution',
};

export const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Non commencé',
  'in-progress': 'En cours',
  mastered: 'Maîtrisé',
};
