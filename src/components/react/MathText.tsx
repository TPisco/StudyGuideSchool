import katex from 'katex';
import { Fragment, useMemo } from 'react';

/**
 * Plain text in which `$…$` (inline) and `$$…$$` (display) delimit LaTeX,
 * typeset with KaTeX — the engine the chapter notes already use, so a quiz on
 * matrices reads like the notes. A string without a pair of `$` is returned
 * untouched, which keeps a lone `$x24` (a GDB register) literal. Write `\$`
 * for a literal dollar sign inside a string that also contains math.
 *
 * Safe to render without a client directive: Astro then emits static HTML.
 */

type Part = { kind: 'text'; value: string } | { kind: 'math'; value: string; display: boolean };

const MATH = /\$\$([\s\S]+?)\$\$|\$((?:\\.|[^$\\\n])+?)\$/g;

export function splitMath(text: string): Part[] {
  if (!text.includes('$')) return [{ kind: 'text', value: text }];
  const parts: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    const at = m.index ?? 0;
    // `\$` is an escaped dollar, not an opening delimiter.
    if (at > 0 && text[at - 1] === '\\') continue;
    if (at > last) parts.push({ kind: 'text', value: text.slice(last, at) });
    parts.push(m[1] !== undefined ? { kind: 'math', value: m[1], display: true } : { kind: 'math', value: m[2]!, display: false });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });
  return parts.map((p) => (p.kind === 'text' ? { ...p, value: p.value.replace(/\\\$/g, '$') } : p));
}

export default function MathText({ text }: { text: string }) {
  const parts = useMemo(() => splitMath(text), [text]);
  if (parts.length === 1 && parts[0]!.kind === 'text') return <>{parts[0]!.value}</>;

  return (
    <>
      {parts.map((p, i) =>
        p.kind === 'text' ? (
          <Fragment key={i}>{p.value}</Fragment>
        ) : (
          <span
            key={i}
            className={p.display ? 'math-display' : 'math-inline'}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(p.value, { displayMode: p.display, throwOnError: false, strict: 'ignore' }),
            }}
          />
        ),
      )}
    </>
  );
}
