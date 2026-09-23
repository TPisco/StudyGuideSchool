import { useRef, useState } from 'react';
import { STORAGE_KEY, exportJson, importJson, resetAll, type ImportMode, type ImportResult } from '../../lib/progress';
import { useHydrated, useProgress } from '../../lib/useProgress';
import { formatDate } from '../../lib/utils';

export default function DataManager() {
  const hydrated = useHydrated();
  const state = useProgress();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [pasted, setPasted] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `progression-revisions-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke on the next tick so Safari has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    setResult(importJson(text, mode));
  };

  const answered = state.attempts.reduce((n, a) => n + a.answers.length, 0);
  const bytes = hydrated
    ? (() => {
        try {
          return localStorage.getItem(STORAGE_KEY)?.length ?? 0;
        } catch {
          return 0;
        }
      })()
    : 0;

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h2 className="text-lg font-semibold tracking-tight">Ma progression</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Tout est stocké dans le navigateur (<code>localStorage</code>), sur cet appareil uniquement.
          Vider les données du site l’efface définitivement — exporter régulièrement est la seule sauvegarde.
        </p>

        {hydrated && (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Tentatives" value={String(state.attempts.length)} />
            <Stat label="Réponses" value={String(answered)} />
            <Stat label="Cartes suivies" value={String(Object.keys(state.cards).length)} />
            <Stat label="Taille" value={`${(bytes / 1024).toFixed(1)} Ko`} />
          </dl>
        )}

        {hydrated && (
          <p className="mt-3 text-xs" style={{ color: 'var(--text-faint)' }}>
            Dernière modification&nbsp;: {formatDate(state.updatedAt)} · série actuelle&nbsp;: {state.streak.current} j
          </p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold tracking-tight">Exporter</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Télécharge un fichier JSON complet&nbsp;: tentatives, réponses, état des cartes, exercices, série.
        </p>
        <button type="button" className="btn btn-primary mt-4" onClick={download} disabled={!hydrated}>
          ⭳ Télécharger la sauvegarde
        </button>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold tracking-tight">Importer</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Restaurer une sauvegarde, ou récupérer la progression d’un autre appareil.
        </p>

        <fieldset className="mt-4">
          <legend className="mb-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Que faire des données déjà présentes&nbsp;?
          </legend>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm" style={{ borderColor: mode === 'merge' ? 'var(--accent)' : 'var(--border)' }}>
              <input type="radio" name="import-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} className="mt-1" />
              <span>
                <strong>Fusionner</strong> — conserve tout, et garde la version la plus avancée en cas de
                conflit. À privilégier pour réunir deux appareils.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm" style={{ borderColor: mode === 'replace' ? 'var(--accent)' : 'var(--border)' }}>
              <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-1" />
              <span>
                <strong>Remplacer</strong> — efface la progression actuelle et la remplace par le fichier.
              </span>
            </label>
          </div>
        </fieldset>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            Choisir un fichier…
          </button>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm" style={{ color: 'var(--text-muted)' }}>
            Ou coller le JSON directement
          </summary>
          <textarea
            className="field mt-2 font-mono text-xs"
            rows={5}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder='{ "app": "studyguide", … }'
          />
          <button
            type="button"
            className="btn btn-sm mt-2"
            disabled={!pasted.trim()}
            onClick={() => setResult(importJson(pasted, mode))}
          >
            Importer le texte collé
          </button>
        </details>

        {result && (
          <p
            className="mt-4 rounded-lg border p-3 text-sm"
            role="status"
            style={{
              borderColor: result.ok ? 'color-mix(in srgb, var(--ok) 45%, transparent)' : 'color-mix(in srgb, var(--bad) 45%, transparent)',
              background: result.ok ? 'var(--ok-soft)' : 'var(--bad-soft)',
            }}
          >
            {result.message}
            {result.added && (
              <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                {result.added.attempts} tentative(s) · {result.added.cards} carte(s) · {result.added.chapters} chapitre(s) ·{' '}
                {result.added.exercises} exercice(s) · {result.added.customCards} carte(s) perso.
              </span>
            )}
          </p>
        )}
      </section>

      <section className="card p-5" style={{ borderColor: 'color-mix(in srgb, var(--bad) 35%, transparent)' }}>
        <h2 className="text-base font-semibold tracking-tight" style={{ color: 'var(--bad)' }}>
          Tout effacer
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Remet la progression à zéro. Irréversible — exporter d’abord.
        </p>
        {!confirmingReset ? (
          <button type="button" className="btn mt-4" onClick={() => setConfirmingReset(true)}>
            Effacer ma progression
          </button>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Confirmer&nbsp;?</span>
            <button
              type="button"
              className="btn btn-sm"
              style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
              onClick={() => {
                resetAll();
                setConfirmingReset(false);
                setResult({ ok: true, message: 'Progression effacée.' });
              }}
            >
              Oui, tout effacer
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setConfirmingReset(false)}>
              Annuler
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
      <dt className="text-xs" style={{ color: 'var(--text-faint)' }}>
        {label}
      </dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
