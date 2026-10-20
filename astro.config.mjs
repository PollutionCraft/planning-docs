import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// SITE/BASE are injected by the Pages workflow; defaults suit local dev.
const site = process.env.SITE ?? 'http://localhost:4321';
const base = process.env.BASE ?? '/';

export default defineConfig({
  site,
  base,
  integrations: [
    starlight({
      title: 'Pollution Craft',
      description: 'Planning and design docs for Pollution Craft.',
      ...(process.env.EDIT_URL && { editLink: { baseUrl: process.env.EDIT_URL } }),
      sidebar: [
        { label: 'Overview', slug: '' },
        { label: 'Brief', items: [{ autogenerate: { directory: 'brief' } }] },
        { label: 'Design', items: [{ autogenerate: { directory: 'design' } }] },
        { label: 'Plan', items: [{ autogenerate: { directory: 'plan' } }] },
        { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
      ],
    }),
  ],
});
