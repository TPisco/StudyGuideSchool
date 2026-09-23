/**
 * Compiles every $…$ / $$…$$ segment of the chapter JSON files with KaTeX,
 * exactly as the MathText island will at runtime, and fails on the first
 * formula KaTeX cannot parse. Chapter notes (.mdx) are already checked by the
 * Astro build; this covers quizzes, tests, flashcards, exercises and tables.
 *
 *   node scripts/check-math.mjs
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import katex from 'katex';

const ROOT = new URL('../content/courses/', import.meta.url);
// Same delimiters as src/components/react/MathText.tsx.
const MATH = /\$\$([\s\S]+?)\$\$|\$((?:\\.|[^$\\\n])+?)\$/g;

function* strings(value, path = '') {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* strings(v, `${path}[${i}]`);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) yield* strings(v, path ? `${path}.${k}` : k);
}

let formulas = 0;
const failures = [];
for (const course of await readdir(ROOT)) {
  let files = [];
  try {
    files = (await readdir(new URL(`${course}/chapters/`, ROOT))).filter((f) => f.endsWith('.json'));
  } catch {
    continue;
  }
  for (const file of files) {
    const data = JSON.parse(await readFile(new URL(`${course}/chapters/${file}`, ROOT), 'utf8'));
    for (const [path, text] of strings(data)) {
      for (const m of text.matchAll(MATH)) {
        if (m.index > 0 && text[m.index - 1] === '\\') continue;
        formulas++;
        const tex = m[1] ?? m[2];
        try {
          katex.renderToString(tex, { displayMode: m[1] !== undefined, throwOnError: true, strict: 'ignore' });
        } catch (e) {
          failures.push(`${join(course, file)} ${path}: ${e.message.split('\n')[0]}\n      ${tex.slice(0, 120)}`);
        }
      }
    }
  }
}

if (failures.length) {
  console.error(`${failures.length} formula(s) KaTeX cannot render:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`${formulas} formulas in chapter data compile with KaTeX.`);
