import type { APIRoute } from 'astro';
import { buildSearchDocs } from '../../lib/content';

/**
 * The full-text index, built once at build time and served as a static file.
 * Fetched on demand by the search island rather than inlined into the page, so
 * adding courses never bloats the HTML.
 */
export const GET: APIRoute = async () => {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const docs = await buildSearchDocs(base);

  return new Response(JSON.stringify(docs), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
