/**
 * Build-time assembly of the content collections into the shapes the pages and
 * islands actually want. Everything here runs at build time only — the output
 * is serialised into the static HTML, so the site works offline.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { ObjectiveIndexEntry } from './mastery';
import type { Concept, Flashcard, Question, SourceRef } from './schemas';

export type CourseEntry = CollectionEntry<'courses'>;
export type ChapterEntry = CollectionEntry<'chapters'>;
export type ChapterDataEntry = CollectionEntry<'chapterData'>;

export interface ChapterBundle {
  /** "<courseId>/<slug>" — the collection id and the progress key. */
  key: string;
  slug: string;
  number: number;
  title: string;
  entry: ChapterEntry;
  data: ChapterDataEntry['data'];
  objectiveIds: string[];
}

export interface CourseBundle {
  /** Lowercased course code, used in URLs. */
  id: string;
  course: CourseEntry['data'];
  chapters: ChapterBundle[];
}

const slugOf = (id: string) => id.split('/')[1] ?? id;
const courseOf = (id: string) => id.split('/')[0] ?? id;

/** Every course, ordered by code. */
export async function getCourses(): Promise<CourseEntry[]> {
  const courses = await getCollection('courses');
  return courses.sort((a, b) => a.data.code.localeCompare(b.data.code));
}

export async function getCourseBundle(courseId: string): Promise<CourseBundle> {
  const courses = await getCollection('courses');
  const entry = courses.find((c) => c.id === courseId);
  if (!entry) throw new Error(`Unknown course "${courseId}"`);

  const chapters = await getCollection('chapters');
  const data = await getCollection('chapterData');

  const dataById = new Map(data.map((d) => [d.id, d] as const));

  const bundles: ChapterBundle[] = chapters
    .filter((c) => courseOf(c.id) === courseId)
    .map((c) => {
      const d = dataById.get(c.id);
      if (!d) throw new Error(`Chapter "${c.id}" has no .json artifacts file`);
      return {
        key: c.id,
        slug: slugOf(c.id),
        number: c.data.number,
        title: c.data.title,
        entry: c,
        data: d.data,
        objectiveIds: c.data.objectives.map((o) => o.id),
      };
    })
    .sort((a, b) => a.number - b.number);

  return { id: courseId, course: entry.data, chapters: bundles };
}

export async function getAllBundles(): Promise<CourseBundle[]> {
  const courses = await getCourses();
  return Promise.all(courses.map((c) => getCourseBundle(c.id)));
}

/* ------------------------------------------------------------------ */
/* Flashcards — authored cards plus auto-generated ones from concepts  */
/* ------------------------------------------------------------------ */

export interface StudyCard {
  id: string;
  /** Progress key: "<courseId>:<cardId>". */
  key: string;
  courseId: string;
  courseTitle: string;
  chapterSlug: string;
  chapterNumber: number;
  chapterTitle: string;
  objectiveId: string;
  front: string;
  back: string;
  extra?: string;
  source?: SourceRef;
  origin: 'authored' | 'concept';
}

function conceptToCard(c: Concept, ctx: Omit<StudyCard, 'id' | 'key' | 'front' | 'back' | 'extra' | 'source' | 'origin' | 'objectiveId'>, courseId: string): StudyCard {
  return {
    ...ctx,
    id: `concept-${c.id}`,
    key: `${courseId}:concept-${c.id}`,
    objectiveId: c.objectiveId ?? 'sans-objectif',
    front: c.term,
    back: c.definition,
    extra: `Pourquoi c’est important : ${c.whyItMatters}\n\nPiège courant : ${c.commonMisconception}`,
    source: c.source,
    origin: 'concept',
  };
}

export function cardsForCourse(bundle: CourseBundle): StudyCard[] {
  const out: StudyCard[] = [];
  for (const ch of bundle.chapters) {
    const ctx = {
      courseId: bundle.id,
      courseTitle: bundle.course.title,
      chapterSlug: ch.slug,
      chapterNumber: ch.number,
      chapterTitle: ch.title,
    };

    for (const f of ch.data.flashcards as Flashcard[]) {
      out.push({
        ...ctx,
        id: f.id,
        key: `${bundle.id}:${f.id}`,
        objectiveId: f.objectiveId,
        front: f.front,
        back: f.back,
        extra: f.extra,
        source: f.source,
        origin: 'authored',
      });
    }

    for (const c of ch.data.concepts as Concept[]) {
      if (c.makeFlashcard) out.push(conceptToCard(c, ctx, bundle.id));
    }
  }
  return out;
}

export async function allCards(): Promise<StudyCard[]> {
  const bundles = await getAllBundles();
  return bundles.flatMap(cardsForCourse);
}

/* ------------------------------------------------------------------ */
/* Objective index — powers weak-topic links                           */
/* ------------------------------------------------------------------ */

export function objectiveIndexFor(bundle: CourseBundle): ObjectiveIndexEntry[] {
  return bundle.chapters.flatMap((ch) =>
    ch.entry.data.objectives.map((o) => ({
      objectiveId: o.id,
      text: o.text,
      courseId: bundle.id,
      chapterSlug: ch.slug,
      chapterNumber: ch.number,
      chapterTitle: ch.title,
    })),
  );
}

export async function allObjectives(): Promise<ObjectiveIndexEntry[]> {
  const bundles = await getAllBundles();
  return bundles.flatMap(objectiveIndexFor);
}

/* ------------------------------------------------------------------ */
/* Question pools — for mock exams                                     */
/* ------------------------------------------------------------------ */

export interface PoolQuestion extends Question {
  chapterKey: string;
  chapterSlug: string;
  chapterNumber: number;
  chapterTitle: string;
  origin: 'quiz' | 'test';
}

export function questionPool(bundle: CourseBundle): PoolQuestion[] {
  const out: PoolQuestion[] = [];
  for (const ch of bundle.chapters) {
    const ctx = {
      chapterKey: ch.key,
      chapterSlug: ch.slug,
      chapterNumber: ch.number,
      chapterTitle: ch.title,
    };
    for (const q of ch.data.quiz.questions) out.push({ ...(q as Question), ...ctx, origin: 'quiz' });
    for (const q of ch.data.test.questions) out.push({ ...(q as Question), ...ctx, origin: 'test' });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Search documents                                                    */
/* ------------------------------------------------------------------ */

export interface SearchDoc {
  id: string;
  kind: 'chapitre' | 'concept' | 'carte' | 'exercice' | 'tableau' | 'question';
  title: string;
  body: string;
  courseId: string;
  courseCode: string;
  chapterSlug: string;
  chapterNumber: number;
  chapterTitle: string;
  href: string;
}

/**
 * MDX is indexed as plain-ish text: strip frontmatter, JSX tags, code fences
 * and markdown punctuation. Rough is fine — this feeds a fuzzy index, not a
 * renderer.
 */
export function mdxToText(raw: string): string {
  return raw
    .replace(/^---[\s\S]*?\n---\n/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/chart=\{`[\s\S]*?`\}/g, ' ')
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/[#*_>`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function buildSearchDocs(base = ''): Promise<SearchDoc[]> {
  const bundles = await getAllBundles();
  const docs: SearchDoc[] = [];

  for (const b of bundles) {
    for (const ch of b.chapters) {
      const chapterHref = `${base}/cours/${b.id}/chapitre/${ch.slug}`;
      const ctx = {
        courseId: b.id,
        courseCode: b.course.code,
        chapterSlug: ch.slug,
        chapterNumber: ch.number,
        chapterTitle: ch.title,
      };

      docs.push({
        ...ctx,
        id: `ch:${ch.key}`,
        kind: 'chapitre',
        title: `Chapitre ${ch.number} — ${ch.title}`,
        body: `${ch.entry.data.summary} ${ch.entry.data.objectives.map((o) => o.text).join(' ')} ${mdxToText(ch.entry.body ?? '')}`,
        href: chapterHref,
      });

      for (const c of ch.data.concepts) {
        docs.push({
          ...ctx,
          id: `co:${ch.key}:${c.id}`,
          kind: 'concept',
          title: c.term,
          body: `${c.definition} ${c.whyItMatters} ${c.commonMisconception}`,
          href: `${chapterHref}#concept-${c.id}`,
        });
      }

      for (const t of ch.data.tables) {
        docs.push({
          ...ctx,
          id: `ta:${ch.key}:${t.id}`,
          kind: 'tableau',
          title: t.title,
          body: `${t.caption ?? ''} ${t.columns.map((c) => c.label).join(' ')} ${t.rows
            .map((r) => Object.values(r).join(' '))
            .join(' ')}`,
          href: `${chapterHref}#tableau-${t.id}`,
        });
      }

      for (const e of ch.data.exercises) {
        docs.push({
          ...ctx,
          id: `ex:${ch.key}:${e.id}`,
          kind: 'exercice',
          title: e.title,
          body: `${e.statement} ${e.hints.join(' ')}`,
          href: `${chapterHref}/exercices#exercice-${e.id}`,
        });
      }

      for (const f of ch.data.flashcards) {
        docs.push({
          ...ctx,
          id: `fc:${ch.key}:${f.id}`,
          kind: 'carte',
          title: f.front,
          body: `${f.back} ${f.extra ?? ''}`,
          href: `${base}/revision?carte=${encodeURIComponent(`${b.id}:${f.id}`)}`,
        });
      }

      for (const q of [...ch.data.quiz.questions, ...ch.data.test.questions]) {
        docs.push({
          ...ctx,
          id: `qu:${ch.key}:${q.id}`,
          kind: 'question',
          title: q.prompt.slice(0, 120),
          body: `${q.explanation} ${(q.options ?? []).map((o) => o.text).join(' ')}`,
          href: `${chapterHref}/${ch.data.quiz.questions.some((x) => x.id === q.id) ? 'quiz' : 'test'}`,
        });
      }
    }
  }

  return docs;
}
