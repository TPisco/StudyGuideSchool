import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Deployment targets:
//   Vercel / Netlify / any static host at domain root -> leave SITE_BASE unset.
//   GitHub Pages project site -> SITE_BASE=/<repo-name> npm run build
const base = process.env.SITE_BASE || undefined;
const site = process.env.SITE_URL || undefined;

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [react(), mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: { chunkSizeWarningLimit: 1800 },
  },
});
