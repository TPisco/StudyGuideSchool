import { useMemo, useState } from 'react';
import type { SummaryTable } from '../../lib/schemas';
import { cx } from '../../lib/utils';

const KIND_LABELS: Record<string, string> = {
  comparison: 'Comparaison',
  complexity: 'Complexité',
  syntax: 'Syntaxe',
  cheatsheet: 'Aide-mémoire',
  reference: 'Référence',
};

/** Sort numerically when every value in the column parses as a number. */
function comparator(values: string[]): (a: string, b: string) => number {
  const numeric = values.every((v) => v.trim() !== '' && !Number.isNaN(Number(v.replace(/\s/g, '').replace(',', '.'))));
  if (numeric) {
    return (a, b) => Number(a.replace(/\s/g, '').replace(',', '.')) - Number(b.replace(/\s/g, '').replace(',', '.'));
  }
  const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
  return (a, b) => collator.compare(a, b);
}

export default function SortableTable({ table }: { table: SummaryTable }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => {
    let out = table.rows;

    if (filter.trim()) {
      const needle = filter.toLowerCase();
      out = out.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(needle)));
    }

    if (sortKey) {
      const cmp = comparator(table.rows.map((r) => String(r[sortKey] ?? '')));
      out = [...out].sort((a, b) => {
        const res = cmp(String(a[sortKey] ?? ''), String(b[sortKey] ?? ''));
        return dir === 'asc' ? res : -res;
      });
    }
    return out;
  }, [table.rows, sortKey, dir, filter]);

  const toggle = (key: string) => {
    if (sortKey === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir('asc');
    }
  };

  return (
    <section id={`tableau-${table.id}`} className="card overflow-hidden scroll-mt-24">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="min-w-0">
          <h3 className="font-semibold tracking-tight">{table.title}</h3>
          {table.caption && (
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-faint)' }}>
              {table.caption}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">{KIND_LABELS[table.kind] ?? table.kind}</span>
          {table.rows.length > 5 && (
            <input
              type="search"
              className="field no-print w-32 py-1 text-xs sm:w-44"
              placeholder="Filtrer…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label={`Filtrer le tableau ${table.title}`}
            />
          )}
          <button
            type="button"
            className="btn btn-sm btn-ghost no-print"
            onClick={() => window.print()}
            title="Imprimer cette page"
            aria-label="Imprimer"
          >
            ⎙
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {table.columns.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="border-b px-3 py-2.5 text-left align-bottom"
                    style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-sunken)' }}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(col.key)}
                      className="flex w-full items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {col.label}
                      <span aria-hidden="true" style={{ opacity: active ? 1 : 0.3 }}>
                        {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                {table.columns.map((col) => (
                  <td
                    key={col.key}
                    className={cx('px-3 py-2.5 align-top', col.mono && 'font-mono text-[0.82rem]')}
                    style={col.mono ? { color: 'var(--accent)' } : undefined}
                  >
                    {String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={table.columns.length} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
                  Aucune ligne ne correspond à « {filter} ».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {table.source && (
        <footer className="border-t px-4 py-2 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}>
          Source&nbsp;: {table.source.file}
          {table.source.page !== undefined && `, p. ${table.source.page}`}
          {table.source.locator && ` · ${table.source.locator}`}
        </footer>
      )}
    </section>
  );
}
