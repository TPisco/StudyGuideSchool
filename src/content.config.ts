import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  chapterDataSchema,
  chapterFrontmatterSchema,
  courseSchema,
} from './lib/schemas';

/**
 * Content lives OUTSIDE src/ on purpose: content/sources/ (my professors'
 * copyrighted files) sits next to content/courses/ (the generated study
 * material), so one .gitignore line keeps the sources off GitHub while the
 * generated material ships.
 */
const CONTENT_BASE = './content/courses';

/** "ALGO-101/chapters/01-complexite.mdx" -> "algo-101/01-complexite" */
const chapterId = ({ entry }: { entry: string }) => {
  const [course, , file] = entry.split('/');
  return `${course!.toLowerCase()}/${file!.replace(/\.(mdx|json)$/, '')}`;
};

/** "ALGO-101/course.json" -> "algo-101" */
const courseId = ({ entry }: { entry: string }) => entry.split('/')[0]!.toLowerCase();

const courses = defineCollection({
  loader: glob({ pattern: '*/course.json', base: CONTENT_BASE, generateId: courseId }),
  schema: courseSchema,
});

/** Chapter study notes (MDX body + frontmatter). */
const chapters = defineCollection({
  loader: glob({ pattern: '*/chapters/*.mdx', base: CONTENT_BASE, generateId: chapterId }),
  schema: chapterFrontmatterSchema,
});

/** Chapter artifacts: concepts, tables, quiz, test, flashcards, exercises. */
const chapterData = defineCollection({
  loader: glob({ pattern: '*/chapters/*.json', base: CONTENT_BASE, generateId: chapterId }),
  schema: chapterDataSchema,
});

/** Per-course coverage report, rendered in the app so gaps stay visible. */
const coverage = defineCollection({
  loader: glob({ pattern: '*/coverage.md', base: CONTENT_BASE, generateId: courseId }),
});

export const collections = { courses, chapters, chapterData, coverage };
