/**
 * Content gate. Runs before `astro build`.
 *
 * The Zod schemas validate each file in isolation. This script does the checks
 * that need to see several files at once:
 *   - every chapter promised by course.json actually exists (.mdx AND .json)
 *   - every objectiveId referenced anywhere resolves to a real objective
 *   - ids are unique within a course
 *   - cited source files exist locally (warning only: sources are gitignored,
 *     so a fresh clone legitimately has none)
 *
 * Run: npm run validate
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import {
  chapterDataSchema,
  chapterFrontmatterSchema,
  courseSchema,
} from '../src/lib/schemas.ts';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const COURSES_DIR = join(ROOT, 'content', 'courses');
const SOURCES_DIR = join(ROOT, 'content', 'sources');

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const errors = [];
const warnings = [];
const stats = [];

const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

/** Turn a ZodError into readable, path-prefixed lines. */
function zodLines(where, error) {
  for (const issue of error.issues) {
    const path = issue.path.length ? issue.path.join('.') : '(root)';
    err(where, `${path} — ${issue.message}`);
  }
}

/** Every string in a parsed JSON value, with its path. */
function* stringsIn(value, path = '') {
  if (typeof value === 'string') yield [path || '(root)', value];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* stringsIn(v, `${path}[${i}]`);
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) yield* stringsIn(v, path ? `${path}.${k}` : k);
}

/** Split `---\nyaml\n---\nbody` into [frontmatter, body]. */
function splitFrontmatter(raw) {
  const text = raw.replace(/^﻿/, '');
  if (!text.startsWith('---')) return [null, text];
  const end = text.indexOf('\n---', 3);
  if (end === -1) return [null, text];
  const yamlText = text.slice(3, end);
  const body = text.slice(text.indexOf('\n', end + 1) + 1);
  return [parseYaml(yamlText), body];
}

async function listCourseDirs() {
  if (!existsSync(COURSES_DIR)) return [];
  const entries = await readdir(COURSES_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function validateCourse(dirName) {
  const dir = join(COURSES_DIR, dirName);
  const where = `content/courses/${dirName}`;

  /* ---------------- course.json ---------------- */
  const coursePath = join(dir, 'course.json');
  if (!existsSync(coursePath)) {
    err(where, 'missing course.json');
    return;
  }
  let course;
  try {
    course = JSON.parse(await readFile(coursePath, 'utf8'));
  } catch (e) {
    err(`${where}/course.json`, `invalid JSON — ${e.message}`);
    return;
  }
  const courseParsed = courseSchema.safeParse(course);
  if (!courseParsed.success) {
    zodLines(`${where}/course.json`, courseParsed.error);
    return;
  }
  course = courseParsed.data;

  if (course.code !== dirName) {
    err(`${where}/course.json`, `code "${course.code}" does not match the folder name "${dirName}"`);
  }

  /* ---------------- chapters ---------------- */
  const chaptersDir = join(dir, 'chapters');
  if (!existsSync(chaptersDir)) {
    err(where, 'missing chapters/ folder');
    return;
  }

  const files = await readdir(chaptersDir);
  const mdxFiles = files.filter((f) => f.endsWith('.mdx')).sort();
  const jsonFiles = new Set(files.filter((f) => f.endsWith('.json')));

  // Every chapter declared in course.json must have both files.
  for (const declared of course.chapters) {
    if (!mdxFiles.includes(`${declared.slug}.mdx`))
      err(where, `course.json declares chapter ${declared.number} ("${declared.slug}") but ${declared.slug}.mdx is missing`);
    if (!jsonFiles.has(`${declared.slug}.json`))
      err(where, `course.json declares chapter ${declared.number} ("${declared.slug}") but ${declared.slug}.json is missing`);
  }
  // And nothing on disk may be orphaned.
  const declaredSlugs = new Set(course.chapters.map((c) => c.slug));
  for (const f of mdxFiles) {
    const slug = f.replace(/\.mdx$/, '');
    if (!declaredSlugs.has(slug)) err(where, `${f} exists on disk but is not listed in course.json chapters[]`);
  }

  const citedFiles = new Set();
  let totalQuiz = 0;
  let totalTest = 0;
  let totalCards = 0;
  let totalExercises = 0;
  let totalConcepts = 0;
  let externalSteps = course.roadmap.steps.filter((s) => s.external).length;

  for (const declared of course.chapters) {
    const slug = declared.slug;
    const mdxPath = join(chaptersDir, `${slug}.mdx`);
    const jsonPath = join(chaptersDir, `${slug}.json`);
    const cwhere = `${where}/chapters/${slug}`;
    if (!existsSync(mdxPath) || !existsSync(jsonPath)) continue;

    /* frontmatter */
    const [fm] = splitFrontmatter(await readFile(mdxPath, 'utf8'));
    if (!fm) {
      err(`${cwhere}.mdx`, 'missing or malformed YAML frontmatter');
      continue;
    }
    const fmParsed = chapterFrontmatterSchema.safeParse(fm);
    if (!fmParsed.success) {
      zodLines(`${cwhere}.mdx`, fmParsed.error);
      continue;
    }
    const front = fmParsed.data;

    /* artifacts */
    let data;
    try {
      data = JSON.parse(await readFile(jsonPath, 'utf8'));
    } catch (e) {
      err(`${cwhere}.json`, `invalid JSON — ${e.message}`);
      continue;
    }
    const dataParsed = chapterDataSchema.safeParse(data);
    if (!dataParsed.success) {
      zodLines(`${cwhere}.json`, dataParsed.error);
      continue;
    }
    const arts = dataParsed.data;

    /* A tab or form feed inside a string is almost always a LaTeX command whose
       backslash was eaten (\t-imes, \f-rac) — invisible in review, wrong on screen. */
    for (const [path, text] of stringsIn(data)) {
      const bad = [...text].filter((ch) => ch < ' ' && ch !== '\n');
      if (bad.length)
        err(`${cwhere}.json`, `${path} contains control character(s) ${bad.map((c) => `U+${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join(', ')} — an escaped LaTeX command lost its backslash?`);
    }

    /* cross-file coherence */
    if (front.course !== course.code) err(`${cwhere}.mdx`, `course "${front.course}" should be "${course.code}"`);
    if (arts.course !== course.code) err(`${cwhere}.json`, `course "${arts.course}" should be "${course.code}"`);
    if (front.number !== declared.number)
      err(`${cwhere}.mdx`, `number ${front.number} does not match course.json (${declared.number})`);
    if (arts.chapter !== declared.number)
      err(`${cwhere}.json`, `chapter ${arts.chapter} does not match course.json (${declared.number})`);
    if (front.title !== declared.title)
      warn(`${cwhere}.mdx`, `title differs from course.json ("${front.title}" vs "${declared.title}")`);

    /* every objectiveId must resolve — this powers weak-topic detection */
    const objectiveIds = new Set(front.objectives.map((o) => o.id));
    const checkObj = (kind, id, itemId) => {
      if (id && !objectiveIds.has(id))
        err(`${cwhere}.json`, `${kind} "${itemId}" targets unknown objectiveId "${id}" (declared: ${[...objectiveIds].join(', ')})`);
    };
    for (const c of arts.concepts) checkObj('concept', c.objectiveId, c.id);
    for (const q of arts.quiz.questions) checkObj('quiz question', q.objectiveId, q.id);
    for (const q of arts.test.questions) checkObj('test question', q.objectiveId, q.id);
    for (const f of arts.flashcards) checkObj('flashcard', f.objectiveId, f.id);
    for (const e of arts.exercises) checkObj('exercise', e.objectiveId, e.id);

    /* every objective must be assessed by at least one question */
    const assessed = new Set([
      ...arts.quiz.questions.map((q) => q.objectiveId),
      ...arts.test.questions.map((q) => q.objectiveId),
    ]);
    for (const o of front.objectives) {
      if (!assessed.has(o.id))
        warn(`${cwhere}`, `objective "${o.id}" is never assessed by a quiz or test question — mastery cannot be measured`);
    }

    /* ids unique across the chapter's artifacts */
    const seen = new Map();
    const uniq = (kind, id) => {
      const key = `${kind}:${id}`;
      if (seen.has(key)) err(`${cwhere}.json`, `duplicate ${kind} id "${id}"`);
      seen.set(key, true);
    };
    arts.concepts.forEach((c) => uniq('concept', c.id));
    arts.flashcards.forEach((f) => uniq('flashcard', f.id));
    arts.exercises.forEach((e) => uniq('exercise', e.id));
    arts.tables.forEach((t) => uniq('table', t.id));
    // quiz and test share one namespace: mock exams pool them together
    [...arts.quiz.questions, ...arts.test.questions].forEach((q) => uniq('question', q.id));

    /* collect cited source files */
    for (const s of front.sources) citedFiles.add(s.file);
    for (const c of arts.concepts) citedFiles.add(c.source.file);
    for (const t of arts.tables) if (t.source) citedFiles.add(t.source.file);
    for (const q of [...arts.quiz.questions, ...arts.test.questions]) if (q.source) citedFiles.add(q.source.file);
    for (const e of arts.exercises) if (e.source) citedFiles.add(e.source.file);
    for (const f of arts.flashcards) if (f.source) citedFiles.add(f.source.file);

    totalQuiz += arts.quiz.questions.length;
    totalTest += arts.test.questions.length;
    totalCards += arts.flashcards.length;
    totalExercises += arts.exercises.length;
    totalConcepts += arts.concepts.length;
  }

  /* ---------------- coverage.md ---------------- */
  if (!existsSync(join(dir, 'coverage.md'))) {
    warn(where, 'missing coverage.md — fidelity rule 5 requires a coverage report per course');
  }

  /* ---------------- source files on disk ---------------- */
  const courseSources = join(SOURCES_DIR, dirName);
  if (existsSync(courseSources)) {
    for (const f of citedFiles) {
      if (!existsSync(join(courseSources, f)))
        warn(where, `cited source file not found locally: content/sources/${dirName}/${f}`);
    }
  } else if (!course.sample) {
    warn(where, `no content/sources/${dirName}/ folder — citations cannot be verified on this machine`);
  }

  stats.push({
    code: course.code,
    sample: course.sample,
    chapters: course.chapters.length,
    concepts: totalConcepts,
    quiz: totalQuiz,
    test: totalTest,
    cards: totalCards,
    exercises: totalExercises,
    externalSteps,
  });
}

/* ------------------------------------------------------------------ */

const dirs = await listCourseDirs();
if (!dirs.length) {
  console.log(`${YELLOW}No courses found in content/courses/.${RESET}`);
  process.exit(0);
}

for (const d of dirs) {
  try {
    await validateCourse(d);
  } catch (e) {
    err(`content/courses/${d}`, `unexpected failure — ${e.stack ?? e.message}`);
  }
}

console.log(`\n${BOLD}Content validation${RESET}`);
console.log(`${DIM}${'-'.repeat(70)}${RESET}`);
for (const s of stats) {
  const tag = s.sample ? `${DIM}(sample)${RESET}` : '';
  console.log(
    `  ${BOLD}${s.code}${RESET} ${tag}\n` +
      `    ${s.chapters} chapter(s) · ${s.concepts} concepts · ${s.quiz} quiz Q · ${s.test} test Q · ` +
      `${s.cards} flashcards · ${s.exercises} exercises · ${s.externalSteps} external roadmap step(s)`,
  );
}

if (warnings.length) {
  console.log(`\n${YELLOW}${BOLD}${warnings.length} warning(s)${RESET}`);
  for (const w of warnings) console.log(`  ${YELLOW}!${RESET} ${w}`);
}

if (errors.length) {
  console.log(`\n${RED}${BOLD}${errors.length} error(s)${RESET}`);
  for (const e of errors) console.log(`  ${RED}x${RESET} ${e}`);
  console.log(`\n${RED}Content validation failed. Nothing was built.${RESET}\n`);
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}Content OK.${RESET}\n`);
