/** Base-path aware URL building, so the same build works at a domain root
 *  (Vercel) and under /repo-name/ (GitHub Pages). */
export const BASE: string = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

export const path = (p: string): string => {
  const suffix = p.startsWith('/') ? p : `/${p}`;
  return `${BASE}${suffix}` || '/';
};

export const routes = {
  home: () => path('/'),
  courses: () => path('/cours'),
  course: (c: string) => path(`/cours/${c}`),
  chapter: (c: string, slug: string) => path(`/cours/${c}/chapitre/${slug}`),
  quiz: (c: string, slug: string) => path(`/cours/${c}/chapitre/${slug}/quiz`),
  test: (c: string, slug: string) => path(`/cours/${c}/chapitre/${slug}/test`),
  exercises: (c: string, slug: string) => path(`/cours/${c}/chapitre/${slug}/exercices`),
  roadmap: (c: string) => path(`/cours/${c}/parcours`),
  exam: (c: string) => path(`/cours/${c}/examen`),
  coverage: (c: string) => path(`/cours/${c}/couverture`),
  review: () => path('/revision'),
  dashboard: () => path('/tableau-de-bord'),
  search: () => path('/recherche'),
  data: () => path('/donnees'),
};
