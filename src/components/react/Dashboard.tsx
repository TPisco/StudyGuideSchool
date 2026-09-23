import { useMemo, useState } from 'react';
import type { ObjectiveIndexEntry } from '../../lib/mastery';
import {
  activityByDay,
  bloomBreakdown,
  courseProgress,
  objectiveStats,
  weakTopics,
  WEAK_THRESHOLD,
} from '../../lib/mastery';
import { useHydrated, useProgress } from '../../lib/useProgress';
import { queueCounts } from '../../lib/srs';
import { BLOOM_LABELS, STATUS_LABELS, cx, formatDate, formatDuration, pct } from '../../lib/utils';
import { scoreColor } from './QuizEngine';

export interface DashboardCourse {
  id: string;
  code: string;
  title: string;
  accent: string;
  chapters: { slug: string; number: number; title: string; objectiveIds: string[] }[];
}

interface Props {
  courses: DashboardCourse[];
  objectives: ObjectiveIndexEntry[];
  cardKeys: { key: string; courseId: string }[];
  base: string;
}

export default function Dashboard({ courses, objectives, cardKeys, base }: Props) {
  const hydrated = useHydrated();
  const state = useProgress();
  const [scope, setScope] = useState<string>('all');

  const scopedCourse = scope === 'all' ? undefined : scope;

  const stats = useMemo(() => objectiveStats(state, scopedCourse), [state, scopedCourse]);
  const weak = useMemo(
    () => weakTopics(state, objectives, { courseId: scopedCourse, limit: 10, base }),
    [state, objectives, scopedCourse, base],
  );
  const bloom = useMemo(() => bloomBreakdown(state, scopedCourse), [state, scopedCourse]);
  const activity = useMemo(() => activityByDay(state, 14), [state]);
  const cards = useMemo(
    () => queueCounts(
      cardKeys.filter((c) => !scopedCourse || c.courseId === scopedCourse).map((c) => ({ item: c, key: c.key })),
      state.cards,
    ),
    [cardKeys, state.cards, scopedCourse],
  );

  const attempts = useMemo(
    () => state.attempts.filter((a) => !scopedCourse || a.courseId === scopedCourse).slice(-12).reverse(),
    [state.attempts, scopedCourse],
  );

  const totalAnswered = [...stats.values()].reduce((n, s) => n + s.answered, 0);
  const totalMinutes = state.attempts
    .filter((a) => !scopedCourse || a.courseId === scopedCourse)
    .reduce((n, a) => n + a.durationMs, 0);

  if (!hydrated) {
    return (
      <div className="card p-10 text-center" style={{ color: 'var(--text-faint)' }}>
        Lecture de la progression…
      </div>
    );
  }

  if (totalAnswered === 0 && cards.total === 0) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-lg font-semibold">Rien à afficher pour l’instant</h2>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
          Le tableau de bord se remplit dès le premier quiz. Il mesure la maîtrise objectif par objectif
          et signale automatiquement ceux qui passent sous {pct(WEAK_THRESHOLD)}.
        </p>
        <a href={`${base}/cours`} className="btn btn-primary mt-5">
          Choisir un chapitre
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {courses.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={scope === 'all'} onClick={() => setScope('all')}>
            Tous les cours
          </FilterChip>
          {courses.map((c) => (
            <FilterChip key={c.id} active={scope === c.id} onClick={() => setScope(c.id)}>
              {c.code}
            </FilterChip>
          ))}
        </div>
      )}

      {/* ---------- headline numbers ---------- */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BigStat label="Série" value={`${state.streak.current} j`} sub={`record : ${state.streak.longest} j`} tone="warn" />
        <BigStat label="Questions répondues" value={String(totalAnswered)} sub={formatDuration(totalMinutes)} />
        <BigStat
          label="Cartes à réviser"
          value={String(cards.due + cards.fresh)}
          sub={`${cards.learned} acquises sur ${cards.total}`}
          tone={cards.due > 0 ? 'warn' : 'ok'}
          href={`${base}/revision`}
        />
        <BigStat
          label="Sujets faibles"
          value={String(weak.length)}
          sub={weak.length ? 'sous le seuil de 70 %' : 'aucun objectif en difficulté'}
          tone={weak.length ? 'bad' : 'ok'}
        />
      </dl>

      {/* ---------- weak topics ---------- */}
      <section className="card p-5">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Sujets à retravailler</h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--text-faint)' }}>
          Un objectif est signalé sous {pct(WEAK_THRESHOLD)} de maîtrise, après au moins 3 réponses.
          La maîtrise pondère les réponses récentes plus fortement que les anciennes.
        </p>

        {weak.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm" style={{ borderColor: 'color-mix(in srgb, var(--ok) 35%, transparent)', background: 'var(--ok-soft)' }}>
            Aucun objectif sous le seuil. Continuer à alimenter la mesure&nbsp;: un objectif jamais évalué
            n’apparaît jamais ici.
          </p>
        ) : (
          <ul className="space-y-3">
            {weak.map((w) => (
              <li key={w.objectiveId}>
                <a href={w.href} className="block rounded-xl border p-3.5 transition-colors hover:border-[var(--accent)]" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.95rem] font-medium">{w.label}</p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-faint)' }}>
                        Ch. {w.chapterTitle} · {w.correct}/{w.answered} bonnes réponses
                      </p>
                    </div>
                    <span className="chip tabular-nums" style={{ color: scoreColor(w.mastery), borderColor: scoreColor(w.mastery) }}>
                      {pct(w.mastery)}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
                    <div className="h-full rounded-full" style={{ width: `${w.mastery * 100}%`, background: scoreColor(w.mastery) }} />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- per course ---------- */}
      {courses
        .filter((c) => !scopedCourse || c.id === scopedCourse)
        .map((c) => {
          const cp = courseProgress(state, c.id, c.chapters);
          return (
            <section key={c.id} className="card p-5" data-accent={c.accent}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{c.title}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    {cp.chaptersMastered} / {cp.chaptersTotal} chapitres maîtrisés · {cp.attempts} tentative(s)
                  </p>
                </div>
                <a href={`${base}/cours/${c.id}`} className="btn btn-sm">
                  Ouvrir
                </a>
              </div>

              <ul className="space-y-2">
                {c.chapters.map((ch) => {
                  const key = `${c.id}/${ch.slug}`;
                  const status = state.chapters[key]?.status ?? 'not-started';
                  const objStats = ch.objectiveIds.map((id) => stats.get(id)).filter(Boolean);
                  const mastery = objStats.length
                    ? objStats.reduce((n, s) => n + (s?.mastery ?? 0), 0) / ch.objectiveIds.length
                    : 0;
                  const best = state.attempts
                    .filter((a) => a.chapterKey === key && a.mode === 'test')
                    .reduce<number | null>((m, a) => (m === null ? a.score : Math.max(m, a.score)), null);

                  return (
                    <li key={ch.slug}>
                      <a
                        href={`${base}/cours/${c.id}/chapitre/${ch.slug}`}
                        className="flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors hover:border-[var(--accent)]"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                          {ch.number}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{ch.title}</span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${mastery * 100}%`, background: mastery > 0 ? scoreColor(mastery) : 'transparent' }}
                            />
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {best !== null && (
                            <span className="chip tabular-nums" style={{ color: scoreColor(best), borderColor: scoreColor(best) }}>
                              {pct(best)}
                            </span>
                          )}
                          <span className={cx('chip', status === 'mastered' && 'chip-ok', status === 'in-progress' && 'chip-warn')}>
                            {STATUS_LABELS[status]}
                          </span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

      {/* ---------- bloom + activity ---------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 text-base font-semibold tracking-tight">Par niveau cognitif</h2>
          <p className="mb-4 text-xs" style={{ color: 'var(--text-faint)' }}>
            Un écart marqué entre restitution et analyse indique qu’on retient les définitions sans savoir s’en servir.
          </p>
          <ul className="space-y-3">
            {Object.entries(bloom).map(([level, row]) => {
              const ratio = row.answered ? row.correct / row.answered : 0;
              return (
                <li key={level}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{BLOOM_LABELS[level]}</span>
                    <span className="tabular-nums text-xs" style={{ color: row.answered ? scoreColor(ratio) : 'var(--text-faint)' }}>
                      {row.answered ? `${row.correct}/${row.answered} · ${pct(ratio)}` : '—'}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${ratio * 100}%`, background: row.answered ? scoreColor(ratio) : 'transparent' }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-1 text-base font-semibold tracking-tight">14 derniers jours</h2>
          <p className="mb-4 text-xs" style={{ color: 'var(--text-faint)' }}>
            Questions répondues par jour. La régularité bat l’intensité.
          </p>
          <div className="flex items-end gap-1" style={{ height: '90px' }}>
            {activity.map((d) => {
              const max = Math.max(...activity.map((x) => x.answered), 1);
              const ratio = d.answered ? d.correct / d.answered : 0;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: '100%' }}>
                  <div
                    className="w-full rounded-t"
                    title={`${d.day} : ${d.answered} question(s), ${d.correct} juste(s)`}
                    style={{
                      height: d.answered ? `${Math.max(6, (d.answered / max) * 100)}%` : '2px',
                      background: d.answered ? scoreColor(ratio) : 'var(--border)',
                      opacity: d.answered ? 0.85 : 1,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[0.7rem]" style={{ color: 'var(--text-faint)' }}>
            <span>{activity[0]?.day.slice(5)}</span>
            <span>aujourd’hui</span>
          </div>
        </section>
      </div>

      {/* ---------- objective table ---------- */}
      <section className="card overflow-hidden">
        <h2 className="border-b px-5 py-3.5 text-base font-semibold tracking-tight" style={{ borderColor: 'var(--border)' }}>
          Maîtrise par objectif
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-sunken)' }}>
                <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Objectif
                </th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Réponses
                </th>
                <th scope="col" className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Maîtrise
                </th>
              </tr>
            </thead>
            <tbody>
              {objectives
                .filter((o) => !scopedCourse || o.courseId === scopedCourse)
                .map((o) => {
                  const s = stats.get(o.objectiveId);
                  return (
                    <tr key={`${o.courseId}-${o.objectiveId}`} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-2.5">
                        <a href={`${base}/cours/${o.courseId}/chapitre/${o.chapterSlug}#objectif-${o.objectiveId}`} className="hover:underline">
                          {o.text}
                        </a>
                        <span className="mt-0.5 block text-[0.7rem]" style={{ color: 'var(--text-faint)' }}>
                          Ch. {o.chapterNumber}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-faint)' }}>
                        {s ? `${s.correct}/${s.answered}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {s ? (
                          <span className="tabular-nums font-medium" style={{ color: s.unproven ? 'var(--text-faint)' : scoreColor(s.mastery) }}>
                            {pct(s.mastery)}
                            {s.unproven && <span className="ml-1 text-[0.65rem]">(peu de données)</span>}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>non évalué</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- history ---------- */}
      {attempts.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-base font-semibold tracking-tight">Dernières tentatives</h2>
          <ul className="space-y-1.5">
            {attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5 text-sm last:border-0" style={{ borderColor: 'var(--border)' }}>
                <span className="flex items-center gap-2">
                  <span className="chip">{a.mode}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{formatDate(a.finishedAt)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    {a.answers.length} q · {formatDuration(a.durationMs)}
                  </span>
                  <span className="chip tabular-nums" style={{ color: scoreColor(a.score), borderColor: scoreColor(a.score) }}>
                    {pct(a.score)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip"
      style={active ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function BigStat({
  label,
  value,
  sub,
  tone,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'ok' | 'warn' | 'bad';
  href?: string;
}) {
  const color = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : tone === 'bad' ? 'var(--bad)' : 'var(--text)';
  const inner = (
    <>
      <dt className="text-xs" style={{ color: 'var(--text-faint)' }}>
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </dd>
      {sub && (
        <p className="mt-0.5 text-[0.7rem]" style={{ color: 'var(--text-faint)' }}>
          {sub}
        </p>
      )}
    </>
  );
  return href ? (
    <a href={href} className="card block p-4 transition-colors hover:border-[var(--accent)]">
      {inner}
    </a>
  ) : (
    <div className="card p-4">{inner}</div>
  );
}
