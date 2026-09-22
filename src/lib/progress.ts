/**
 * All progress lives in localStorage. There is no backend, no account and no
 * sync — so this module is the single source of truth, and it has to be
 * defensive: every read is wrapped, every write is best-effort, and the whole
 * state is exportable to JSON so nothing is ever trapped in one browser.
 */
import type { BloomLevel } from './schemas';

export const STORAGE_KEY = 'studyguide.progress.v1';
export const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ChapterStatus = 'not-started' | 'in-progress' | 'mastered';
export type AttemptMode = 'quiz' | 'test' | 'exam' | 'retry';

export interface AnswerRecord {
  questionId: string;
  objectiveId: string;
  /** "<courseId>/<chapterSlug>" — matches the content collection id. */
  chapterKey: string;
  correct: boolean;
  bloomLevel: BloomLevel;
  difficulty: number;
  answeredAt: number;
}

export interface Attempt {
  id: string;
  courseId: string;
  /** Absent for mock exams, which span several chapters. */
  chapterKey?: string;
  mode: AttemptMode;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  answers: AnswerRecord[];
  /** 0..1 */
  score: number;
}

/** SM-2 state for one flashcard. */
export interface CardState {
  ease: number;
  /** Days until the next review. */
  interval: number;
  reps: number;
  lapses: number;
  /** Epoch ms of the next due date (start of day). */
  due: number;
  lastReviewed: number;
  lastGrade: number;
}

export interface ExerciseState {
  status: 'attempted' | 'solved' | 'revealed';
  /** Self-assessment for exercises we cannot execute (C, Java, trace…). */
  selfAssessed?: 'ok' | 'partial' | 'no';
  /** The learner's last editor content, so work survives a reload. */
  code?: string;
  hintsRevealed: number;
  updatedAt: number;
}

export interface ChapterState {
  status: ChapterStatus;
  lastOpenedAt: number;
  /** Set the first time the chapter reached "mastered". */
  masteredAt?: number;
}

export interface ProgressState {
  version: number;
  attempts: Attempt[];
  chapters: Record<string, ChapterState>;
  cards: Record<string, CardState>;
  exercises: Record<string, ExerciseState>;
  streak: { current: number; longest: number; lastDay: string | null };
  /** Flashcards the learner added by hand. */
  customCards: CustomCard[];
  createdAt: number;
  updatedAt: number;
}

export interface CustomCard {
  id: string;
  courseId: string;
  objectiveId: string;
  chapterKey?: string;
  front: string;
  back: string;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Keys                                                                */
/* ------------------------------------------------------------------ */

export const chapterKey = (courseId: string, slug: string) => `${courseId}/${slug}`;
export const cardKey = (courseId: string, cardId: string) => `${courseId}:${cardId}`;
export const exerciseKey = (courseId: string, exerciseId: string) => `${courseId}:${exerciseId}`;

/** Local calendar day as YYYY-MM-DD — streaks must follow the learner's day, not UTC. */
export function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfLocalDay(d: Date = new Date()): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

function daysBetweenDayStrings(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number];
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / 86_400_000);
}

/* ------------------------------------------------------------------ */
/* Defaults + storage                                                  */
/* ------------------------------------------------------------------ */

export function emptyState(): ProgressState {
  const now = Date.now();
  return {
    version: SCHEMA_VERSION,
    attempts: [],
    chapters: {},
    cards: {},
    exercises: {},
    streak: { current: 0, longest: 0, lastDay: null },
    customCards: [],
    createdAt: now,
    updatedAt: now,
  };
}

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

/**
 * Accepts anything and returns a valid state. Unknown fields are dropped,
 * missing fields are defaulted. Used for both localStorage reads and imports,
 * so a hand-edited or truncated file can never crash the app.
 */
export function coerceState(raw: unknown): ProgressState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Partial<ProgressState>;

  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

  const attempts: Attempt[] = Array.isArray(o.attempts)
    ? o.attempts
        .filter((a): a is Attempt => !!a && typeof a === 'object')
        .map((a) => ({
          id: str(a.id) || crypto.randomUUID(),
          courseId: str(a.courseId),
          chapterKey: typeof a.chapterKey === 'string' ? a.chapterKey : undefined,
          mode: (['quiz', 'test', 'exam', 'retry'] as const).includes(a.mode as AttemptMode)
            ? (a.mode as AttemptMode)
            : 'quiz',
          startedAt: num(a.startedAt, 0),
          finishedAt: num(a.finishedAt, 0),
          durationMs: num(a.durationMs, 0),
          score: Math.min(1, Math.max(0, num(a.score, 0))),
          answers: Array.isArray(a.answers)
            ? a.answers
                .filter((x): x is AnswerRecord => !!x && typeof x === 'object')
                .map((x) => ({
                  questionId: str(x.questionId),
                  objectiveId: str(x.objectiveId),
                  chapterKey: str(x.chapterKey),
                  correct: x.correct === true,
                  bloomLevel: (['recall', 'understand', 'apply', 'analyze'] as const).includes(x.bloomLevel)
                    ? x.bloomLevel
                    : 'recall',
                  difficulty: num(x.difficulty, 1),
                  answeredAt: num(x.answeredAt, 0),
                }))
                .filter((x) => x.questionId && x.objectiveId)
            : [],
        }))
        .filter((a) => a.courseId)
    : [];

  const chapters: Record<string, ChapterState> = {};
  if (o.chapters && typeof o.chapters === 'object') {
    for (const [k, v] of Object.entries(o.chapters)) {
      if (!v || typeof v !== 'object') continue;
      const s = (v as ChapterState).status;
      chapters[k] = {
        status: (['not-started', 'in-progress', 'mastered'] as const).includes(s) ? s : 'in-progress',
        lastOpenedAt: num((v as ChapterState).lastOpenedAt, 0),
        masteredAt: typeof (v as ChapterState).masteredAt === 'number' ? (v as ChapterState).masteredAt : undefined,
      };
    }
  }

  const cards: Record<string, CardState> = {};
  if (o.cards && typeof o.cards === 'object') {
    for (const [k, v] of Object.entries(o.cards)) {
      if (!v || typeof v !== 'object') continue;
      const c = v as CardState;
      cards[k] = {
        ease: Math.max(1.3, num(c.ease, 2.5)),
        interval: Math.max(0, num(c.interval, 0)),
        reps: Math.max(0, num(c.reps, 0)),
        lapses: Math.max(0, num(c.lapses, 0)),
        due: num(c.due, startOfLocalDay()),
        lastReviewed: num(c.lastReviewed, 0),
        lastGrade: num(c.lastGrade, 0),
      };
    }
  }

  const exercises: Record<string, ExerciseState> = {};
  if (o.exercises && typeof o.exercises === 'object') {
    for (const [k, v] of Object.entries(o.exercises)) {
      if (!v || typeof v !== 'object') continue;
      const e = v as ExerciseState;
      exercises[k] = {
        status: (['attempted', 'solved', 'revealed'] as const).includes(e.status) ? e.status : 'attempted',
        selfAssessed: (['ok', 'partial', 'no'] as const).includes(e.selfAssessed as 'ok')
          ? e.selfAssessed
          : undefined,
        code: typeof e.code === 'string' ? e.code.slice(0, 20_000) : undefined,
        hintsRevealed: Math.max(0, num(e.hintsRevealed, 0)),
        updatedAt: num(e.updatedAt, 0),
      };
    }
  }

  const customCards: CustomCard[] = Array.isArray(o.customCards)
    ? o.customCards
        .filter((c): c is CustomCard => !!c && typeof c === 'object')
        .map((c) => ({
          id: str(c.id) || crypto.randomUUID(),
          courseId: str(c.courseId),
          objectiveId: str(c.objectiveId) || 'perso',
          chapterKey: typeof c.chapterKey === 'string' ? c.chapterKey : undefined,
          front: str(c.front),
          back: str(c.back),
          createdAt: num(c.createdAt, Date.now()),
        }))
        .filter((c) => c.front && c.back)
    : [];

  const streakRaw = (o.streak ?? {}) as ProgressState['streak'];

  return {
    version: SCHEMA_VERSION,
    attempts,
    chapters,
    cards,
    exercises,
    customCards,
    streak: {
      current: Math.max(0, num(streakRaw.current, 0)),
      longest: Math.max(0, num(streakRaw.longest, 0)),
      lastDay: typeof streakRaw.lastDay === 'string' ? streakRaw.lastDay : null,
    },
    createdAt: num(o.createdAt, base.createdAt),
    updatedAt: num(o.updatedAt, base.updatedAt),
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

let state: ProgressState | null = null;
const listeners = new Set<() => void>();
/** Cached immutable snapshot, so useSyncExternalStore does not loop. */
let snapshot: ProgressState = emptyState();

function readFromStorage(): ProgressState {
  if (!isBrowser()) return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return coerceState(JSON.parse(raw));
  } catch {
    // Corrupt JSON, private mode, quota errors — start clean rather than crash.
    return emptyState();
  }
}

export function getState(): ProgressState {
  if (state === null) {
    state = readFromStorage();
    snapshot = state;
  }
  return state;
}

/** Stable reference between writes — required by useSyncExternalStore. */
export function getSnapshot(): ProgressState {
  return state === null ? getState() : snapshot;
}

export function getServerSnapshot(): ProgressState {
  return snapshot;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  if (!isBrowser() || state === null) return;
  if (writeTimer) clearTimeout(writeTimer);
  // Debounced: typing in a code editor must not hammer localStorage.
  writeTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded or storage blocked — the session still works in memory */
    }
  }, 180);
}

export function update(mutator: (draft: ProgressState) => void): ProgressState {
  const current = getState();
  const next: ProgressState = {
    ...current,
    chapters: { ...current.chapters },
    cards: { ...current.cards },
    exercises: { ...current.exercises },
    attempts: [...current.attempts],
    customCards: [...current.customCards],
    streak: { ...current.streak },
  };
  mutator(next);
  next.updatedAt = Date.now();
  next.version = SCHEMA_VERSION;
  state = next;
  snapshot = next;
  persist();
  for (const fn of listeners) fn();
  return next;
}

export function replaceState(next: ProgressState) {
  state = coerceState(next);
  snapshot = state;
  persist();
  for (const fn of listeners) fn();
}

/** Cross-tab sync: another tab wrote, so adopt its state. */
if (isBrowser()) {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = readFromStorage();
    snapshot = state;
    for (const fn of listeners) fn();
  });
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/** Any studying action touches the streak. Idempotent within a day. */
export function touchStreak(draft: ProgressState) {
  const today = localDay();
  const last = draft.streak.lastDay;
  if (last === today) return;
  if (last === null) {
    draft.streak.current = 1;
  } else {
    const gap = daysBetweenDayStrings(last, today);
    draft.streak.current = gap === 1 ? draft.streak.current + 1 : 1;
  }
  draft.streak.longest = Math.max(draft.streak.longest, draft.streak.current);
  draft.streak.lastDay = today;
}

export function recordAttempt(attempt: Omit<Attempt, 'id'>) {
  return update((d) => {
    d.attempts.push({ ...attempt, id: crypto.randomUUID() });
    // Keep history bounded; 400 attempts is years of study.
    if (d.attempts.length > 400) d.attempts = d.attempts.slice(-400);
    touchStreak(d);

    // A chapter graded at 85%+ on a test counts as mastered.
    if (attempt.chapterKey) {
      const key = attempt.chapterKey;
      const prev = d.chapters[key] ?? { status: 'in-progress' as ChapterStatus, lastOpenedAt: Date.now() };
      const qualifies = attempt.mode === 'test' && attempt.score >= 0.85;
      d.chapters[key] = {
        ...prev,
        status: qualifies ? 'mastered' : prev.status === 'mastered' ? 'mastered' : 'in-progress',
        masteredAt: qualifies && !prev.masteredAt ? Date.now() : prev.masteredAt,
      };
    }
  });
}

export function openChapter(key: string) {
  return update((d) => {
    const prev = d.chapters[key];
    d.chapters[key] = {
      status: prev?.status && prev.status !== 'not-started' ? prev.status : 'in-progress',
      lastOpenedAt: Date.now(),
      masteredAt: prev?.masteredAt,
    };
    touchStreak(d);
  });
}

export function setChapterStatus(key: string, status: ChapterStatus) {
  return update((d) => {
    const prev = d.chapters[key];
    d.chapters[key] = {
      status,
      lastOpenedAt: prev?.lastOpenedAt ?? Date.now(),
      masteredAt: status === 'mastered' ? (prev?.masteredAt ?? Date.now()) : prev?.masteredAt,
    };
  });
}

export function setExerciseState(key: string, patch: Partial<ExerciseState>) {
  return update((d) => {
    const prev: ExerciseState = d.exercises[key] ?? {
      status: 'attempted',
      hintsRevealed: 0,
      updatedAt: Date.now(),
    };
    d.exercises[key] = { ...prev, ...patch, updatedAt: Date.now() };
    touchStreak(d);
  });
}

export function addCustomCard(card: Omit<CustomCard, 'id' | 'createdAt'>) {
  return update((d) => {
    d.customCards.push({ ...card, id: `perso-${crypto.randomUUID().slice(0, 8)}`, createdAt: Date.now() });
  });
}

export function removeCustomCard(id: string) {
  return update((d) => {
    d.customCards = d.customCards.filter((c) => c.id !== id);
    delete d.cards[cardKey('perso', id)];
  });
}

export function resetAll() {
  return replaceState(emptyState());
}

/* ------------------------------------------------------------------ */
/* Export / import                                                     */
/* ------------------------------------------------------------------ */

export interface ExportEnvelope {
  app: 'studyguide';
  schemaVersion: number;
  exportedAt: string;
  state: ProgressState;
}

export function exportJson(): string {
  return JSON.stringify(
    {
      app: 'studyguide',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      state: getState(),
    } satisfies ExportEnvelope,
    null,
    2,
  );
}

export type ImportMode = 'replace' | 'merge';

export interface ImportResult {
  ok: boolean;
  message: string;
  added?: { attempts: number; cards: number; chapters: number; exercises: number; customCards: number };
}

/**
 * Accepts either a full export envelope or a bare state object, so a file
 * hand-edited down to its `state` still imports.
 */
export function importJson(text: string, mode: ImportMode = 'replace'): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: 'Fichier illisible : ce n’est pas du JSON valide.' };
  }

  const candidate =
    parsed && typeof parsed === 'object' && 'state' in (parsed as Record<string, unknown>)
      ? (parsed as ExportEnvelope).state
      : parsed;

  const incoming = coerceState(candidate);
  const looksEmpty =
    incoming.attempts.length === 0 &&
    Object.keys(incoming.cards).length === 0 &&
    Object.keys(incoming.chapters).length === 0 &&
    Object.keys(incoming.exercises).length === 0 &&
    incoming.customCards.length === 0;

  if (looksEmpty) {
    return { ok: false, message: 'Le fichier ne contient aucune progression reconnaissable. Rien n’a été modifié.' };
  }

  if (mode === 'replace') {
    replaceState(incoming);
    return {
      ok: true,
      message: 'Progression remplacée.',
      added: {
        attempts: incoming.attempts.length,
        cards: Object.keys(incoming.cards).length,
        chapters: Object.keys(incoming.chapters).length,
        exercises: Object.keys(incoming.exercises).length,
        customCards: incoming.customCards.length,
      },
    };
  }

  let added = { attempts: 0, cards: 0, chapters: 0, exercises: 0, customCards: 0 };
  update((d) => {
    const seen = new Set(d.attempts.map((a) => a.id));
    for (const a of incoming.attempts) {
      if (!seen.has(a.id)) {
        d.attempts.push(a);
        added.attempts++;
      }
    }
    d.attempts.sort((x, y) => x.finishedAt - y.finishedAt);
    if (d.attempts.length > 400) d.attempts = d.attempts.slice(-400);

    // On conflict the more advanced card wins (more reps = more history).
    for (const [k, v] of Object.entries(incoming.cards)) {
      const mine = d.cards[k];
      if (!mine || v.reps > mine.reps || (v.reps === mine.reps && v.lastReviewed > mine.lastReviewed)) {
        d.cards[k] = v;
        added.cards++;
      }
    }

    const rank: Record<ChapterStatus, number> = { 'not-started': 0, 'in-progress': 1, mastered: 2 };
    for (const [k, v] of Object.entries(incoming.chapters)) {
      const mine = d.chapters[k];
      if (!mine || rank[v.status] > rank[mine.status] || v.lastOpenedAt > mine.lastOpenedAt) {
        d.chapters[k] = mine && rank[mine.status] > rank[v.status] ? { ...v, status: mine.status } : v;
        added.chapters++;
      }
    }

    const exRank = { attempted: 0, revealed: 1, solved: 2 } as const;
    for (const [k, v] of Object.entries(incoming.exercises)) {
      const mine = d.exercises[k];
      if (!mine || exRank[v.status] > exRank[mine.status] || v.updatedAt > mine.updatedAt) {
        d.exercises[k] = v;
        added.exercises++;
      }
    }

    const cardIds = new Set(d.customCards.map((c) => c.id));
    for (const c of incoming.customCards) {
      if (!cardIds.has(c.id)) {
        d.customCards.push(c);
        added.customCards++;
      }
    }

    if (incoming.streak.longest > d.streak.longest) d.streak.longest = incoming.streak.longest;
    if (incoming.streak.lastDay && (!d.streak.lastDay || incoming.streak.lastDay > d.streak.lastDay)) {
      d.streak.lastDay = incoming.streak.lastDay;
      d.streak.current = Math.max(d.streak.current, incoming.streak.current);
    }
  });

  return { ok: true, message: 'Progression fusionnée.', added };
}
