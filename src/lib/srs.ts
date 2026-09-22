/**
 * SM-2 spaced repetition.
 *
 * Grades are the classic 0–5 scale, but the UI only ever offers four of them
 * (see GRADES below) because finer granularity is noise for a single user.
 */
import { startOfLocalDay, type CardState } from './progress';

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;

export interface GradeOption {
  grade: number;
  label: string;
  hint: string;
  tone: 'bad' | 'warn' | 'ok' | 'info';
  key: string;
}

/** Labels are in French: the UI language follows the source documents. */
export const GRADES: GradeOption[] = [
  { grade: 0, label: 'Oublié', hint: 'à revoir aujourd’hui', tone: 'bad', key: '1' },
  { grade: 3, label: 'Difficile', hint: 'retrouvé avec effort', tone: 'warn', key: '2' },
  { grade: 4, label: 'Correct', hint: 'retrouvé sans peine', tone: 'ok', key: '3' },
  { grade: 5, label: 'Facile', hint: 'immédiat', tone: 'info', key: '4' },
];

export function newCard(now = Date.now()): CardState {
  return {
    ease: DEFAULT_EASE,
    interval: 0,
    reps: 0,
    lapses: 0,
    due: startOfLocalDay(new Date(now)),
    lastReviewed: 0,
    lastGrade: 0,
  };
}

/**
 * Apply one review. Returns the next card state.
 *
 * Below 3, the card lapses: repetitions reset and it comes back in the same
 * session rather than tomorrow, which is the point of relearning.
 */
export function review(card: CardState, grade: number, now = Date.now()): CardState {
  const q = Math.max(0, Math.min(5, Math.round(grade)));
  const next: CardState = { ...card, lastReviewed: now, lastGrade: q };

  if (q < 3) {
    next.reps = 0;
    next.lapses = card.lapses + 1;
    next.interval = 0;
    // Due immediately: relearn inside this session.
    next.due = now;
  } else {
    next.reps = card.reps + 1;
    if (next.reps === 1) next.interval = 1;
    else if (next.reps === 2) next.interval = 6;
    else next.interval = Math.round(card.interval * card.ease) || 1;
    next.due = startOfLocalDay(new Date(now)) + next.interval * 86_400_000;
  }

  // SM-2 ease update, floored so a repeatedly-missed card never goes below 1.3.
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  next.ease = Math.max(MIN_EASE, Number((card.ease + delta).toFixed(4)));

  return next;
}

export const isDue = (card: CardState | undefined, now = Date.now()): boolean =>
  !card || card.due <= now;

/** Human-readable next-review label, e.g. "dans 6 j". */
export function formatInterval(card: CardState): string {
  if (card.interval === 0) return 'aujourd’hui';
  if (card.interval === 1) return 'demain';
  if (card.interval < 31) return `dans ${card.interval} j`;
  const months = Math.round(card.interval / 30);
  if (months < 12) return `dans ${months} mois`;
  const years = (card.interval / 365).toFixed(1).replace('.0', '');
  return `dans ${years} an${Number(years) > 1 ? 's' : ''}`;
}

/** Preview of what each grade would do, shown under the buttons. */
export function previewIntervals(card: CardState, now = Date.now()): Record<number, string> {
  const out: Record<number, string> = {};
  for (const g of GRADES) out[g.grade] = formatInterval(review(card, g.grade, now));
  return out;
}

export interface QueueItem<T> {
  item: T;
  key: string;
  card: CardState | undefined;
}

/**
 * Build today's queue: cards that are due, then never-seen cards.
 * `newLimit` keeps a first session from dumping 60 unseen cards at once.
 */
export function buildQueue<T>(
  items: { item: T; key: string }[],
  cards: Record<string, CardState>,
  { now = Date.now(), newLimit = 20 }: { now?: number; newLimit?: number } = {},
): QueueItem<T>[] {
  const due: QueueItem<T>[] = [];
  const fresh: QueueItem<T>[] = [];

  for (const { item, key } of items) {
    const card = cards[key];
    if (!card) fresh.push({ item, key, card: undefined });
    else if (card.due <= now) due.push({ item, key, card });
  }

  // Most overdue first — those are the ones actually at risk of being lost.
  due.sort((a, b) => (a.card!.due ?? 0) - (b.card!.due ?? 0));
  return [...due, ...fresh.slice(0, newLimit)];
}

export interface QueueCounts {
  due: number;
  fresh: number;
  total: number;
  learned: number;
  upcoming: { day: string; count: number }[];
}

export function queueCounts<T>(
  items: { item: T; key: string }[],
  cards: Record<string, CardState>,
  now = Date.now(),
): QueueCounts {
  let due = 0;
  let fresh = 0;
  let learned = 0;
  const byDay = new Map<string, number>();

  for (const { key } of items) {
    const card = cards[key];
    if (!card) {
      fresh++;
      continue;
    }
    if (card.due <= now) due++;
    else {
      const d = new Date(card.due);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDay.set(label, (byDay.get(label) ?? 0) + 1);
    }
    if (card.reps >= 3 && card.interval >= 21) learned++;
  }

  const upcoming = [...byDay.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(0, 14);

  return { due, fresh, total: items.length, learned, upcoming };
}
