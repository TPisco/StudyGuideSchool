import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  chart: string;
  caption?: string;
}

/**
 * Mermaid is bundled rather than loaded from a CDN, so diagrams still render
 * offline. It is heavy, so this island is always mounted with client:visible
 * and the library is imported lazily inside the effect.
 */
export default function MermaidChart({ chart, caption }: Props) {
  const reactId = useId();
  const domId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const holder = useRef<HTMLDivElement>(null);

  // Re-render when the user flips the theme.
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        const dark = theme === 'dark';

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          themeVariables: dark
            ? {
                background: 'transparent',
                primaryColor: '#1e293b',
                primaryTextColor: '#e2e8f0',
                primaryBorderColor: '#4f5b73',
                lineColor: '#7c8aa5',
                secondaryColor: '#243044',
                tertiaryColor: '#172033',
                mainBkg: '#1e293b',
                nodeBorder: '#5b6a86',
                clusterBkg: '#141d2e',
                clusterBorder: '#33415c',
                textColor: '#e2e8f0',
                edgeLabelBackground: '#0f172a',
              }
            : {
                background: 'transparent',
                primaryColor: '#eef2ff',
                primaryTextColor: '#0f172a',
                primaryBorderColor: '#a5b4fc',
                lineColor: '#64748b',
                secondaryColor: '#f1f5f9',
                tertiaryColor: '#f8fafc',
                mainBkg: '#eef2ff',
                nodeBorder: '#a5b4fc',
                clusterBkg: '#f8fafc',
                clusterBorder: '#cbd5e1',
                textColor: '#0f172a',
                edgeLabelBackground: '#ffffff',
              },
          flowchart: { curve: 'basis', useMaxWidth: true, htmlLabels: true },
          er: { useMaxWidth: true },
          sequence: { useMaxWidth: true },
        });

        const { svg: rendered } = await mermaid.render(`${domId}-${theme}`, chart.trim());
        if (!cancelled) {
          setSvg(rendered);
          setFailed(false);
        }
      } catch {
        // A malformed diagram must not take the page down — fall back to the
        // source, which is still readable.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, theme, domId]);

  return (
    <figure className="my-7 not-prose">
      <div
        className="overflow-x-auto rounded-xl border p-4"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}
      >
        {failed ? (
          <div>
            <p className="mb-2 text-sm" style={{ color: 'var(--bad)' }}>
              Ce diagramme n’a pas pu être rendu. Voici sa source&nbsp;:
            </p>
            <pre className="overflow-x-auto text-xs" style={{ color: 'var(--text-muted)' }}>
              {chart.trim()}
            </pre>
          </div>
        ) : svg ? (
          <div ref={holder} className="mermaid-holder flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div
            className="flex h-32 items-center justify-center text-sm"
            style={{ color: 'var(--text-faint)' }}
            aria-hidden="true"
          >
            Diagramme…
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-[0.8rem]" style={{ color: 'var(--text-faint)' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
