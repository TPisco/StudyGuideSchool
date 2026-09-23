/**
 * Turning raw attempts into "what should I study next".
 *
 * Mastery is recency-weighted: an objective you got wrong six weeks ago and
 * have since answered correctly four times is not a weak topic. Each answer is
 * weighted by DECAY^k where k counts backwards from the most recent answer, so
 * old evidence fades without ever being thrown away.
 */
import type { AnswerRecord, Attempt, ProgressState } from './progress';

/** Below this, an objective is flagged weak. */
export const WEAK_THRESHOLD = 0.7;
/** Never flag on thin evidence. */
export const MIN_ANSWERS_FOR_WEAK = 3;
/** Each older answer counts 12% less than the one after it. */
const DECAY = 0.88;

export interface ObjectiveStats {
  objectiveId: string;
  courseId: string;
  chapterKey: string;
  answered: number;
  correct: number;
  /** Plain proportion correct, all history. */
  rawAccuracy: number;
  /** Recency-weighted accuracy — this is the "mastery" shown in the UI. */
  mastery: number;
  lastAnsweredAt: number;
  isWeak: boolean;
  /** True when there is not yet enough evidence to judge. */
  unproven: boolean;
}

function allAnswers(attempts: Attempt[]): AnswerRecord[] {
  const out: AnswerRecord[] = [];
  for (const a of attempts) {
    for (const ans of a.answers) out.push(ans);
  }
  return out.sort((x, y) => x.answeredAt - y.answeredAt);
}

/**
 * @param courseId optional filter
 */
export function objectiveStats(state: ProgressState, courseId?: string): Map<string, ObjectiveStats> {
  const attempts = courseId ? state.attempts.filter((a) => a.courseId === courseId) : state.attempts;
  const byObjective = new Map<string, AnswerRecord[]>();

  for (const ans of allAnswers(attempts)) {
    const list = byObjective.get(ans.objectiveId);
    if (list) list.push(ans);
    else byObjective.set(ans.objectiveId, [ans]);
  }

  const out = new Map<string, ObjectiveStats>();
  for (const [objectiveId, answers] of byObjective) {
    const answered = answers.length;
    const correct = answers.filter((a) => a.correct).length;

    // Most recent first, so index 0 gets full weight.
    let weightSum = 0;
    let weightedCorrect = 0;
    for (let i = answers.length - 1, k = 0; i >= 0; i--, k++) {
      const w = Math.pow(DECAY, k);
      weightSum += w;
      if (answers[i]!.correct) weightedCorrect += w;
    }

    const mastery = weightSum > 0 ? weightedCorrect / weightSum : 0;
    const last = answers[answers.length - 1]!;
    const unproven = answered < MIN_ANSWERS_FOR_WEAK;

    out.set(objectiveId, {
      objectiveId,
      courseId: attempts.find((a) => a.answers.some((x) => x.objectiveId === objectiveId))?.courseId ?? '',
      chapterKey: last.chapterKey,
      answered,
      correct,
      rawAccuracy: answered ? correct / answered : 0,
      mastery,
      lastAnsweredAt: last.answeredAt,
      isWeak: !unproven && mastery < WEAK_THRESHOLD,
      unproven,
    });
  }
  return out;
}

export interface WeakTopic extends ObjectiveStats {
  label: string;
  chapterTitle: string;
  chapterSlug: string;
  href: string;
}

export interface ObjectiveIndexEntry {
  objectiveId: string;
  text: string;
  courseId: string;
  chapterSlug: string;
  chapterNumber: number;
  chapterTitle: string;
}

/** Join measured stats with the static objective catalogue built at build time. */
export function weakTopics(
  state: ProgressState,
  index: ObjectiveIndexEntry[],
  { courseId, limit = 8, base = '' }: { courseId?: string; limit?: number; base?: string } = {},
): WeakTopic[] {
  const stats = objectiveStats(state, courseId);
  const out: WeakTopic[] = [];

  for (const entry of index) {
    if (courseId && entry.courseId !== courseId) continue;
    const s = stats.get(entry.objectiveId);
    if (!s || !s.isWeak) continue;
    out.push({
      ...s,
      courseId: entry.courseId,
      label: entry.text,
      chapterTitle: entry.chapterTitle,
      chapterSlug: entry.chapterSlug,
      href: `${base}/cours/${entry.courseId}/chapitre/${entry.chapterSlug}#objectif-${entry.objectiveId}`,
    });
  }

  // Worst first; break ties by how much evidence we have.
  out.sort((a, b) => a.mastery - b.mastery || b.answered - a.answered);
  return out.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */

export interface ChapterProgress {
  chapterKey: string;
  status: 'not-started' | 'in-progress' | 'mastered';
  /** Mean mastery across the chapter's objectives that have evidence. */
  mastery: number;
  objectivesProven: number;
  objectivesTotal: number;
  bestTestScore: number | null;
  attempts: number;
  weakCount: number;
}

export function chapterProgress(
  state: ProgressState,
  chapterKey: string,
  objectiveIds: string[],
): ChapterProgress {
  const stats = objectiveStats(state);
  let sum = 0;
  let proven = 0;
  let weak = 0;

  for (const id of objectiveIds) {
    const s = stats.get(id);
    if (!s) continue;
    proven++;
    sum += s.mastery;
    if (s.isWeak) weak++;
  }

  const chapterAttempts = state.attempts.filter((a) => a.chapterKey === chapterKey);
  const tests = chapterAttempts.filter((a) => a.mode === 'test');

  return {
    chapterKey,
    status: state.chapters[chapterKey]?.status ?? 'not-started',
    mastery: proven ? sum / proven : 0,
    objectivesProven: proven,
    objectivesTotal: objectiveIds.length,
    bestTestScore: tests.length ? Math.max(...tests.map((t) => t.score)) : null,
    attempts: chapterAttempts.length,
    weakCount: weak,
  };
}

export interface CourseProgress {
  courseId: string;
  chaptersMastered: number;
  chaptersStarted: number;
  chaptersTotal: number;
  /** 0..1 across every objective of the course, unproven ones counting as 0. */
  overallMastery: number;
  weakCount: number;
  attempts: number;
  minutesStudied: number;
}

export function courseProgress(
  state: ProgressState,
  courseId: string,
  chapters: { slug: string; objectiveIds: string[] }[],
): CourseProgress {
  const stats = objectiveStats(state, courseId);
  let total = 0;
  let sum = 0;
  let weak = 0;
  let mastered = 0;
  let started = 0;

  for (const ch of chapters) {
    const key = `${courseId}/${ch.slug}`;
    const st = state.chapters[key]?.status ?? 'not-started';
    if (st === 'mastered') mastered++;
    if (st !== 'not-started') started++;
    for (const id of ch.objectiveIds) {
      total++;
      const s = stats.get(id);
      if (s) {
        sum += s.mastery;
        if (s.isWeak) weak++;
      }
    }
  }

  const attempts = state.attempts.filter((a) => a.courseId === courseId);

  return {
    courseId,
    chaptersMastered: mastered,
    chaptersStarted: started,
    chaptersTotal: chapters.length,
    overallMastery: total ? sum / total : 0,
    weakCount: weak,
    attempts: attempts.length,
    minutesStudied: Math.round(attempts.reduce((acc, a) => acc + a.durationMs, 0) / 60_000),
  };
}

/* ------------------------------------------------------------------ */
/* Bloom breakdown — is the weakness recall or reasoning?              */
/* ------------------------------------------------------------------ */

export function bloomBreakdown(state: ProgressState, courseId?: string) {
  const attempts = courseId ? state.attempts.filter((a) => a.courseId === courseId) : state.attempts;
  const acc: Record<string, { answered: number; correct: number }> = {
    recall: { answered: 0, correct: 0 },
    understand: { answered: 0, correct: 0 },
    apply: { answered: 0, correct: 0 },
    analyze: { answered: 0, correct: 0 },
  };
  for (const a of attempts) {
    for (const ans of a.answers) {
      const row = acc[ans.bloomLevel];
      if (!row) continue;
      row.answered++;
      if (ans.correct) row.correct++;
    }
  }
  return acc;
}

/** Last 14 local days of activity, for the dashboard sparkline. */
export function activityByDay(state: ProgressState, days = 14) {
  const out: { day: string; answered: number; correct: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ day: label, answered: 0, correct: 0 });
  }
  const index = new Map(out.map((r, i) => [r.day, i] as const));

  for (const a of state.attempts) {
    for (const ans of a.answers) {
      const d = new Date(ans.answeredAt);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const i = index.get(label);
      if (i === undefined) continue;
      out[i]!.answered++;
      if (ans.correct) out[i]!.correct++;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* What to study next                                                  */
/* ------------------------------------------------------------------ */

export interface NextStep {
  kind: 'weak' | 'continue' | 'next-chapter' | 'test' | 'review' | 'done';
  title: string;
  reason: string;
  href: string;
}

/**
 * One concrete recommendation, in priority order:
 *   1. a weak objective        2. an unfinished chapter
 *   3. the test of a chapter read but never tested
 *   4. the next unstarted chapter
 */
export function nextStep(
  state: ProgressState,
  courseId: string,
  chapters: { slug: string; number: number; title: string; objectiveIds: string[] }[],
  objectiveIndex: ObjectiveIndexEntry[],
  base = '',
): NextStep {
  const weak = weakTopics(state, objectiveIndex, { courseId, limit: 1, base });
  if (weak.length) {
    const w = weak[0]!;
    return {
      kind: 'weak',
      title: `Reprendre : ${w.label}`,
      reason: `Maîtrise ${Math.round(w.mastery * 100)} % sur ${w.answered} réponses — sous le seuil de ${Math.round(WEAK_THRESHOLD * 100)} %.`,
      href: w.href,
    };
  }

  for (const ch of chapters) {
    const key = `${courseId}/${ch.slug}`;
    const st = state.chapters[key]?.status ?? 'not-started';
    if (st === 'in-progress') {
      const testedHere = state.attempts.some((a) => a.chapterKey === key && a.mode === 'test');
      if (testedHere) {
        return {
          kind: 'continue',
          title: `Continuer le chapitre ${ch.number}`,
          reason: 'Commencé mais pas encore maîtrisé (85 % au test requis).',
          href: `${base}/cours/${courseId}/chapitre/${ch.slug}`,
        };
      }
      return {
        kind: 'test',
        title: `Passer le test du chapitre ${ch.number}`,
        reason: 'Chapitre lu, jamais évalué en profondeur.',
        href: `${base}/cours/${courseId}/chapitre/${ch.slug}/test`,
      };
    }
  }

  for (const ch of chapters) {
    const key = `${courseId}/${ch.slug}`;
    if ((state.chapters[key]?.status ?? 'not-started') === 'not-started') {
      return {
        kind: 'next-chapter',
        title: `Commencer le chapitre ${ch.number} — ${ch.title}`,
        reason: 'Prochain chapitre du parcours.',
        href: `${base}/cours/${courseId}/chapitre/${ch.slug}`,
      };
    }
  }

  return {
    kind: 'done',
    title: 'Tous les chapitres sont maîtrisés',
    reason: 'Entretenir avec les cartes mémoire et un examen blanc.',
    href: `${base}/cours/${courseId}/examen`,
  };
}
