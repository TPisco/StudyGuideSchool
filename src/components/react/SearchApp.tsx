import { useEffect, useMemo, useRef, useState } from 'react';
import MiniSearch from 'minisearch';
import type { SearchDoc } from '../../lib/content';
import { cx } from '../../lib/utils';

interface Props {
  /** Static JSON built at build time; fetched once and cached by the browser. */
  indexUrl: string;
}

const KIND_LABELS: Record<SearchDoc['kind'], string> = {
  chapitre: 'Chapitre',
  concept: 'Concept',
  carte: 'Carte',
  exercice: 'Exercice',
  tableau: 'Tableau',
  question: 'Question',
};

const KIND_ORDER: SearchDoc['kind'][] = ['chapitre', 'concept', 'tableau', 'exercice', 'carte', 'question'];

export default function SearchApp({ indexUrl }: Props) {
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [kinds, setKinds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(indexUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: SearchDoc[]) => {
        if (!cancelled) setDocs(d);
      })
      .catch(() => {
        if (!cancelled) setError("L'index de recherche n'a pas pu être chargé.");
      });
    return () => {
      cancelled = true;
    };
  }, [indexUrl]);

  // Read ?q= on first paint so results are linkable.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q);
    inputRef.current?.focus();
  }, []);

  const mini = useMemo(() => {
    if (!docs) return null;
    const ms = new MiniSearch<SearchDoc>({
      fields: ['title', 'body', 'chapterTitle', 'courseCode'],
      storeFields: ['title', 'kind', 'href', 'chapterTitle', 'chapterNumber', 'courseCode', 'body'],
      idField: 'id',
      searchOptions: {
        boost: { title: 3, chapterTitle: 1.5 },
        prefix: true,
        fuzzy: 0.2,
        combineWith: 'AND',
      },
      // Accent-insensitive: "complexite" must find "complexité".
      processTerm: (term) =>
        term
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase(),
      tokenize: (text) => text.split(/[\s\-–—/(),;:.'"«»?![\]{}]+/).filter(Boolean),
    });
    ms.addAll(docs);
    return ms;
  }, [docs]);

  const results = useMemo(() => {
    if (!mini || query.trim().length < 2) return [];
    const raw = mini.search(query.trim()) as unknown as (SearchDoc & { score: number })[];
    return (kinds.size ? raw.filter((r) => kinds.has(r.kind)) : raw).slice(0, 60);
  }, [mini, query, kinds]);

  const countsByKind = useMemo(() => {
    if (!mini || query.trim().length < 2) return new Map<string, number>();
    const raw = mini.search(query.trim()) as unknown as SearchDoc[];
    const m = new Map<string, number>();
    for (const r of raw) m.set(r.kind, (m.get(r.kind) ?? 0) + 1);
    return m;
  }, [mini, query]);

  const toggleKind = (k: string) =>
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          className="field py-3 pl-11 text-base"
          placeholder="Chercher un concept, une définition, un exercice…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Recherche plein texte"
          autoComplete="off"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg"
          style={{ color: 'var(--text-faint)' }}
        >
          ⌕
        </span>
      </div>

      {docs && (
        <div className="flex flex-wrap gap-1.5">
          {KIND_ORDER.map((k) => {
            const n = countsByKind.get(k);
            return (
              <button
                key={k}
                type="button"
                className="chip"
                aria-pressed={kinds.has(k)}
                onClick={() => toggleKind(k)}
                style={kinds.has(k) ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}
              >
                {KIND_LABELS[k]}
                {n !== undefined && <span style={{ opacity: 0.6 }}> {n}</span>}
              </button>
            );
          })}
          {kinds.size > 0 && (
            <button type="button" className="chip" onClick={() => setKinds(new Set())}>
              ✕ tout afficher
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="card p-4 text-sm" style={{ color: 'var(--bad)' }}>
          {error}
        </p>
      )}

      {!docs && !error && (
        <p className="card p-8 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          Chargement de l’index…
        </p>
      )}

      {docs && query.trim().length < 2 && (
        <div className="card p-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          <p>
            {docs.length} éléments indexés — notes de cours, concepts, tableaux, exercices, cartes mémoire et
            questions, sur l’ensemble des cours.
          </p>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-faint)' }}>
            La recherche ignore les accents et accepte les préfixes&nbsp;: « complex » trouve « complexité ».
          </p>
        </div>
      )}

      {docs && query.trim().length >= 2 && (
        <>
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
            {results.length === 0 ? 'Aucun résultat.' : `${results.length} résultat${results.length > 1 ? 's' : ''}`}
          </p>
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.id}>
                <a
                  href={r.href}
                  className="block rounded-xl border p-3.5 transition-colors hover:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-raised)' }}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className={cx('chip', r.kind === 'chapitre' && 'chip-accent')}>{KIND_LABELS[r.kind]}</span>
                    <span className="chip">{r.courseCode}</span>
                    {r.chapterNumber > 0 && <span className="chip">Ch. {r.chapterNumber}</span>}
                  </div>
                  <p className="font-medium leading-snug">{r.title}</p>
                  <p className="mt-1 line-clamp-2 text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>
                    {excerpt(r.body, query)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Show the region of the body around the first matching word. */
function excerpt(body: string, query: string, len = 190): string {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const terms = norm(query).split(/\s+/).filter((t) => t.length > 2);
  const hay = norm(body);
  let at = -1;
  for (const t of terms) {
    const i = hay.indexOf(t);
    if (i >= 0 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return body.slice(0, len) + (body.length > len ? '…' : '');
  const start = Math.max(0, at - 60);
  return (start > 0 ? '…' : '') + body.slice(start, start + len).trim() + (start + len < body.length ? '…' : '');
}
