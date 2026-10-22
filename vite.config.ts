import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Link previews need absolute URLs. On Vercel the production domain is provided automatically;
// set SITE_URL to override (e.g. once a custom domain exists).
const host = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'localhost:5173';
const siteUrl = host.startsWith('http') ? host.replace(/\/$/, '') : `https://${host}`;

export default defineConfig({
  plugins: [
    preact(),
    { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl) },
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
