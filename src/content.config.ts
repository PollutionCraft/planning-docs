import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // Lifecycle marker so agents and humans can tell what is authoritative.
        status: z.enum(['draft', 'proposed', 'accepted', 'superseded']).optional(),
        owner: z.string().optional(),
      }),
    }),
  }),
};
