/**
 * Zod schemas for every piece of generated study content.
 *
 * These are the gate. Malformed generated content must never reach the build,
 * so the refinements here are deliberately strict: they encode the fidelity
 * rules and the quiz-quality rules from CLAUDE.md as machine-checked
 * invariants rather than as prose nobody re-reads.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/**
 * Where a piece of content came from in MY documents.
 * `file` is a path relative to content/sources/<course-code>/.
 * Fidelity rule 1: every concept, formula and example carries one of these.
 */
export const sourceRefSchema = z.object({
  file: z.string().min(1, 'source.file is required - no uncited content'),
  page: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  /** Slide number, section heading, or timestamp when a page number is meaningless. */
  locator: z.string().optional(),
  /** Verbatim short quote from the source, to make the citation checkable. */
  quote: z.string().max(300).optional(),
});
export type SourceRef = z.infer<typeof sourceRefSchema>;

export const bloomLevelSchema = z.enum(['recall', 'understand', 'apply', 'analyze']);
export type BloomLevel = z.infer<typeof bloomLevelSchema>;

export const difficultySchema = z.number().int().min(1).max(3);

export const questionTypeSchema = z.enum([
  'mcq',
  'multi',
  'true-false',
  'short-answer',
  'code-output',
  'fill-blank',
]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const codeBlockSchema = z.object({
  lang: z.string().min(1),
  value: z.string().min(1),
  caption: z.string().optional(),
});

const idSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/i, 'ids must be slug-like (letters, digits, . _ -)');

/* ------------------------------------------------------------------ */
/* Learning objectives                                                 */
/* ------------------------------------------------------------------ */

export const objectiveSchema = z.object({
  id: idSchema,
  text: z.string().min(3),
  bloom: bloomLevelSchema.optional(),
});
export type Objective = z.infer<typeof objectiveSchema>;

/* ------------------------------------------------------------------ */
/* Concept                                                             */
/* ------------------------------------------------------------------ */

export const conceptSchema = z.object({
  id: idSchema,
  term: z.string().min(1),
  definition: z.string().min(1),
  whyItMatters: z.string().min(1),
  commonMisconception: z.string().min(1),
  objectiveId: idSchema.optional(),
  /** Auto-generate a flashcard from this concept. Default true. */
  makeFlashcard: z.boolean().default(true),
  source: sourceRefSchema,
});
export type Concept = z.infer<typeof conceptSchema>;

/* ------------------------------------------------------------------ */
/* Question                                                            */
/* ------------------------------------------------------------------ */

const optionSchema = z.object({
  id: idSchema,
  text: z.string().min(1),
});

const distractorExplanationSchema = z.object({
  optionId: idSchema,
  why: z.string().min(1),
});

const OPTION_TYPES: QuestionType[] = ['mcq', 'multi', 'true-false'];
const OPEN_TYPES: QuestionType[] = ['short-answer', 'code-output', 'fill-blank'];

const BLANK_MARKER = /_{2,}|\{\{blank\}\}/;
const CATCH_ALL = /^(toutes? (les|ces) (r[eé]ponses|propositions)|aucune de ces|all of the above|none of the above)/i;

export const questionSchema = z
  .object({
    id: idSchema,
    objectiveId: idSchema, // mandatory: powers weak-topic detection
    bloomLevel: bloomLevelSchema,
    type: questionTypeSchema,
    prompt: z.string().min(1),
    code: codeBlockSchema.optional(),
    options: z.array(optionSchema).optional(),
    /** Option id (mcq/true-false), array of option ids (multi), or literal text (open types). */
    correct: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    /** Extra accepted spellings for open answers, compared case/accent-insensitively. */
    acceptableAnswers: z.array(z.string().min(1)).default([]),
    explanation: z.string().min(1),
    perDistractorExplanation: z.array(distractorExplanationSchema).default([]),
    difficulty: difficultySchema,
    source: sourceRefSchema.optional(),
  })
  .superRefine((q, ctx) => {
    const fail = (message: string, path: (string | number)[] = []) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `[${q.id}] ${message}`, path });

    if (OPTION_TYPES.includes(q.type)) {
      if (!q.options || q.options.length < 2) {
        fail(`type "${q.type}" requires at least 2 options`, ['options']);
        return;
      }
      if (q.type === 'true-false' && q.options.length !== 2) {
        fail('true-false must have exactly 2 options', ['options']);
      }
      const ids = q.options.map((o) => o.id);
      if (new Set(ids).size !== ids.length) fail('duplicate option ids', ['options']);

      const correctIds = Array.isArray(q.correct) ? q.correct : [q.correct];
      if (q.type === 'multi') {
        if (!Array.isArray(q.correct)) fail('type "multi" requires correct to be an array', ['correct']);
        if (correctIds.length < 2) fail('type "multi" needs at least 2 correct options', ['correct']);
        if (correctIds.length === q.options.length)
          fail('every option cannot be correct - that is not a real question', ['correct']);
      } else if (Array.isArray(q.correct)) {
        fail(`type "${q.type}" requires correct to be a single option id`, ['correct']);
      }
      for (const cid of correctIds) {
        if (!ids.includes(cid)) fail(`correct "${cid}" is not one of the option ids`, ['correct']);
      }

      // Quality rule: every distractor must be explained.
      const distractors = ids.filter((id) => !correctIds.includes(id));
      const explained = new Set(q.perDistractorExplanation.map((d) => d.optionId));
      const missing = distractors.filter((id) => !explained.has(id));
      if (missing.length) {
        fail(
          `missing perDistractorExplanation for: ${missing.join(', ')} - every wrong option must say why it is wrong`,
          ['perDistractorExplanation'],
        );
      }
      for (const d of q.perDistractorExplanation) {
        if (!ids.includes(d.optionId))
          fail(`perDistractorExplanation references unknown option "${d.optionId}"`, ['perDistractorExplanation']);
      }

      // Quality rule: no giveaway length cues. The correct answer must not be
      // dramatically longer than every distractor.
      if (q.type === 'mcq' && q.options.length > 2) {
        const byId = new Map(q.options.map((o) => [o.id, o.text.length] as const));
        const correctLen = byId.get(correctIds[0]!) ?? 0;
        const longestDistractor = Math.max(...distractors.map((id) => byId.get(id) ?? 0), 0);
        if (correctLen > 28 && correctLen > longestDistractor * 2) {
          fail(
            'the correct option is more than twice as long as every distractor - that is a giveaway length cue',
            ['options'],
          );
        }
      }

      // Quality rule: no throwaway catch-all options.
      for (const o of q.options) {
        if (CATCH_ALL.test(o.text.trim()) && !correctIds.includes(o.id)) {
          fail(`option "${o.id}" is a throwaway catch-all used as filler`, ['options']);
        }
      }
    }

    if (OPEN_TYPES.includes(q.type)) {
      if (q.options?.length) fail(`type "${q.type}" must not define options`, ['options']);
      if (Array.isArray(q.correct)) fail(`type "${q.type}" requires correct to be a string`, ['correct']);
      if (q.perDistractorExplanation.length)
        fail(`type "${q.type}" has no distractors to explain`, ['perDistractorExplanation']);
      if (q.type === 'code-output' && !q.code)
        fail('type "code-output" requires a code block to reason about', ['code']);
      if (q.type === 'fill-blank' && !BLANK_MARKER.test(q.prompt + (q.code?.value ?? '')))
        fail('type "fill-blank" needs a visible blank (____ or {{blank}}) in the prompt or code', ['prompt']);
    }
  });
export type Question = z.infer<typeof questionSchema>;

/* ------------------------------------------------------------------ */
/* Question sets (quiz / test)                                         */
/* ------------------------------------------------------------------ */

/**
 * Shared quality gate for a graded set of questions.
 * Enforces "mix Bloom levels - never all-recall" and unique ids.
 */
function questionSetSchema(kind: 'quiz' | 'test', min: number, max: number) {
  return z
    .object({
      title: z.string().optional(),
      instructions: z.string().optional(),
      /** Suggested time budget shown in the UI. */
      estimatedMinutes: z.number().int().positive().optional(),
      questions: z.array(questionSchema),
    })
    .superRefine((set, ctx) => {
      const fail = (message: string, path: (string | number)[] = ['questions']) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });

      const n = set.questions.length;
      if (n < min || n > max) fail(`${kind} must have ${min}-${max} questions, found ${n}`);

      const ids = set.questions.map((q) => q.id);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dupes.length) fail(`duplicate question ids: ${[...new Set(dupes)].join(', ')}`);

      const levels = new Set(set.questions.map((q) => q.bloomLevel));
      if (n >= min) {
        if (levels.size === 1)
          fail(`${kind} is entirely "${[...levels][0]}" - mix Bloom levels (recall/understand/apply/analyze)`);
        else if (levels.size < 3)
          fail(`${kind} uses only ${levels.size} Bloom levels (${[...levels].join(', ')}) - use at least 3`);
        const recallShare = set.questions.filter((q) => q.bloomLevel === 'recall').length / n;
        if (recallShare > 0.5) fail(`${Math.round(recallShare * 100)}% of this ${kind} is pure recall - cap it at 50%`);
      }

      // A test is meant to be harder and format-varied.
      if (kind === 'test' && n >= min) {
        const types = new Set(set.questions.map((q) => q.type));
        if (types.size < 3) fail(`a test must mix at least 3 question formats, found ${types.size}`);
        if (!set.questions.some((q) => q.difficulty === 3)) fail('a test needs at least one difficulty-3 question');
      }
    });
}

export const quizSchema = questionSetSchema('quiz', 10, 15);
export const testSchema = questionSetSchema('test', 20, 30);

/* ------------------------------------------------------------------ */
/* Exercise                                                            */
/* ------------------------------------------------------------------ */

/** Languages we can genuinely execute in the browser. Never ship a fake runner. */
export const runnableLanguageSchema = z.enum(['python', 'javascript', 'typescript', 'sql']);
/** Languages that cannot run client-side - these get reasoning exercises instead. */
export const staticLanguageSchema = z.enum(['c', 'cpp', 'java', 'pseudocode', 'text']);

export const exerciseModeSchema = z.enum([
  'run', // write code, we execute it and run tests
  'predict-output', // read code, predict what it prints
  'fill-blank', // complete the missing line(s)
  'find-bug', // locate and explain the defect
  'trace', // trace variable state step by step
]);
export type ExerciseMode = z.infer<typeof exerciseModeSchema>;

const exerciseTestSchema = z.object({
  name: z.string().min(1),
  /** Expression evaluated after the learner's code runs (python/js), or a SQL query. */
  call: z.string().min(1),
  /** Expected value, compared as a trimmed string against the evaluated result. */
  expected: z.string(),
  /** Hidden tests still run but their body is not shown before solving. */
  hidden: z.boolean().default(false),
});

export const exerciseSchema = z
  .object({
    id: idSchema,
    objectiveId: idSchema,
    difficulty: difficultySchema,
    mode: exerciseModeSchema,
    language: z.union([runnableLanguageSchema, staticLanguageSchema]),
    title: z.string().min(1),
    statement: z.string().min(1),
    starterCode: z.string().default(''),
    /** Progressive: hint 1 nudges, the last hint nearly gives it away. */
    hints: z.array(z.string().min(1)).min(1, 'at least one hint'),
    solution: z.string().min(1),
    solutionExplanation: z.string().optional(),
    tests: z.array(exerciseTestSchema).default([]),
    /** For predict-output / trace modes: the answer the learner self-checks against. */
    expectedOutput: z.string().optional(),
    /** Seed data for SQL exercises, executed before the learner's query. */
    setupSql: z.string().optional(),
    source: sourceRefSchema.optional(),
  })
  .superRefine((ex, ctx) => {
    const fail = (message: string, path: (string | number)[] = []) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `[${ex.id}] ${message}`, path });

    const isRunnable = runnableLanguageSchema.safeParse(ex.language).success;

    if (ex.mode === 'run') {
      if (!isRunnable)
        fail(
          `mode "run" is impossible for ${ex.language} in a browser - use predict-output, fill-blank, find-bug or trace`,
          ['mode'],
        );
      if (!ex.tests.length) fail('mode "run" requires at least one test', ['tests']);
      if (ex.language === 'sql' && !ex.setupSql) fail('SQL exercises need setupSql to create the tables', ['setupSql']);
    } else if (!ex.expectedOutput) {
      fail(`mode "${ex.mode}" requires expectedOutput for self-assessment`, ['expectedOutput']);
    }

    if (ex.mode === 'fill-blank' && !BLANK_MARKER.test(ex.starterCode)) {
      fail('mode "fill-blank" needs a visible blank (____ or {{blank}}) in starterCode', ['starterCode']);
    }
  });
export type Exercise = z.infer<typeof exerciseSchema>;

/* ------------------------------------------------------------------ */
/* Flashcard                                                           */
/* ------------------------------------------------------------------ */

export const flashcardSchema = z.object({
  id: idSchema,
  objectiveId: idSchema,
  front: z.string().min(1),
  back: z.string().min(1),
  /** Optional extra shown under the answer. */
  extra: z.string().optional(),
  source: sourceRefSchema.optional(),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

/* ------------------------------------------------------------------ */
/* Summary table                                                       */
/* ------------------------------------------------------------------ */

export const summaryTableSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1),
    kind: z.enum(['comparison', 'complexity', 'syntax', 'cheatsheet', 'reference']).default('reference'),
    caption: z.string().optional(),
    columns: z
      .array(z.object({ key: z.string().min(1), label: z.string().min(1), mono: z.boolean().default(false) }))
      .min(2),
    rows: z.array(z.record(z.string())).min(1),
    source: sourceRefSchema.optional(),
  })
  .superRefine((t, ctx) => {
    const keys = t.columns.map((c) => c.key);
    t.rows.forEach((row, i) => {
      for (const k of keys) {
        if (!(k in row))
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `[${t.id}] row ${i} is missing column "${k}"`,
            path: ['rows', i],
          });
      }
    });
  });
export type SummaryTable = z.infer<typeof summaryTableSchema>;

/* ------------------------------------------------------------------ */
/* Chapter artifacts file  (<nn>-<slug>.json)                          */
/* ------------------------------------------------------------------ */

export const chapterDataSchema = z.object({
  course: z.string().min(1),
  chapter: z.number().int().positive(),
  concepts: z.array(conceptSchema).min(1),
  tables: z.array(summaryTableSchema).default([]),
  quiz: quizSchema,
  test: testSchema,
  flashcards: z.array(flashcardSchema).default([]),
  exercises: z.array(exerciseSchema).default([]),
});
export type ChapterData = z.infer<typeof chapterDataSchema>;

/* ------------------------------------------------------------------ */
/* Chapter notes frontmatter  (<nn>-<slug>.mdx)                        */
/* ------------------------------------------------------------------ */

export const chapterFrontmatterSchema = z.object({
  course: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().min(1),
  objectives: z.array(objectiveSchema).min(1, 'a chapter without objectives cannot be tracked'),
  estimatedMinutes: z.number().int().positive(),
  /** Objective ids or chapter numbers assumed known before starting. */
  prerequisites: z.array(z.string()).default([]),
  /** Which of my files fed this chapter. */
  sources: z.array(sourceRefSchema).min(1, 'fidelity rule 1: cite the source documents'),
  /** Set true only for scaffolding content not derived from my documents. */
  sample: z.boolean().default(false),
  draft: z.boolean().default(false),
});
export type ChapterFrontmatter = z.infer<typeof chapterFrontmatterSchema>;

/* ------------------------------------------------------------------ */
/* Roadmap + Course  (course.json)                                     */
/* ------------------------------------------------------------------ */

export const roadmapStepSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  /** Chapter this step maps to. Omitted for external prerequisites. */
  chapter: z.number().int().positive().optional(),
  estimatedMinutes: z.number().int().positive(),
  /** Ids of steps that must come first. */
  prerequisites: z.array(idSchema).default([]),
  /**
   * Fidelity rule 2: true when this step is NOT covered by my documents.
   * The UI styles these differently and coverage.md lists them.
   */
  external: z.boolean().default(false),
  /** Where to learn an external prerequisite. */
  externalNote: z.string().optional(),
  /** A checkpoint is a "prove you have it" gate rather than new material. */
  checkpoint: z.boolean().default(false),
});
export type RoadmapStep = z.infer<typeof roadmapStepSchema>;

export const courseSchema = z
  .object({
    code: z.string().min(1),
    title: z.string().min(1),
    term: z.string().min(1),
    description: z.string().min(1),
    /** Language of the generated content - must match the source documents. */
    language: z.string().default('fr'),
    /** Accent hue used for course chips. */
    accent: z.enum(['indigo', 'emerald', 'amber', 'rose', 'sky', 'violet', 'teal']).default('indigo'),
    chapters: z
      .array(
        z.object({
          number: z.number().int().positive(),
          slug: z.string().min(1),
          title: z.string().min(1),
        }),
      )
      .min(1),
    roadmap: z.object({
      title: z.string().default('Parcours'),
      steps: z.array(roadmapStepSchema).min(1),
    }),
    exam: z
      .object({
        defaultMinutes: z.number().int().positive().default(90),
        defaultQuestionCount: z.number().int().positive().default(30),
        /** Set when a real past exam in my sources defines the format. */
        mirrorsPastExam: z.boolean().default(false),
        formatNote: z.string().optional(),
      })
      .default({ defaultMinutes: 90, defaultQuestionCount: 30, mirrorsPastExam: false }),
    /** True while the course is scaffolding/sample data rather than real material. */
    sample: z.boolean().default(false),
  })
  .superRefine((c, ctx) => {
    const fail = (message: string, path: (string | number)[] = []) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `[${c.code}] ${message}`, path });

    const stepIds = new Set(c.roadmap.steps.map((s) => s.id));
    if (stepIds.size !== c.roadmap.steps.length) fail('duplicate roadmap step ids', ['roadmap']);

    const chapterNumbers = new Set(c.chapters.map((ch) => ch.number));
    for (const s of c.roadmap.steps) {
      for (const p of s.prerequisites) {
        if (!stepIds.has(p)) fail(`roadmap step "${s.id}" requires unknown step "${p}"`, ['roadmap']);
      }
      if (s.chapter !== undefined && !chapterNumbers.has(s.chapter))
        fail(`roadmap step "${s.id}" points at chapter ${s.chapter}, which does not exist`, ['roadmap']);
      if (s.external && s.chapter !== undefined)
        fail(`roadmap step "${s.id}" cannot be both external and mapped to a chapter`, ['roadmap']);
      if (s.external && !s.externalNote)
        fail(`external step "${s.id}" must explain where to learn it (externalNote)`, ['roadmap']);
    }

    // Cycle detection on the prerequisite graph.
    const byId = new Map(c.roadmap.steps.map((s) => [s.id, s] as const));
    const state = new Map<string, 0 | 1 | 2>();
    const walk = (id: string): boolean => {
      const st = state.get(id) ?? 0;
      if (st === 1) return true;
      if (st === 2) return false;
      state.set(id, 1);
      for (const p of byId.get(id)?.prerequisites ?? []) {
        if (walk(p)) return true;
      }
      state.set(id, 2);
      return false;
    };
    for (const s of c.roadmap.steps) {
      if (walk(s.id)) {
        fail(`the roadmap prerequisite graph has a cycle involving "${s.id}"`, ['roadmap']);
        break;
      }
    }

    const nums = c.chapters.map((ch) => ch.number);
    if (new Set(nums).size !== nums.length) fail('duplicate chapter numbers', ['chapters']);
  });
export type Course = z.infer<typeof courseSchema>;
