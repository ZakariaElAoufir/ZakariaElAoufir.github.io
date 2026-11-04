import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Every visible text exists in both languages: a missing translation fails the build.
const localized = z.object({ fr: z.string().min(1), en: z.string().min(1) });

const profile = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/profile' }),
  schema: z.object({
    firstName: z.string(),
    lastName: z.string(),
    role: localized,
    shortRole: localized,
    status: localized,
    summary: localized,
    email: z.string().email(),
    linkedin: z.string().url(),
    github: z.string().url(),
    siteRepo: z.string().url(),
    spokenLanguages: z.array(localized),
    marquee: z.array(localized)
  })
});

const education = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/education' }),
  schema: z.object({
    order: z.number(),
    years: z.string(),
    school: localized,
    degree: localized,
    city: z.string()
  })
});

const experiences = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/experiences' }),
  schema: z.object({
    order: z.number(),
    year: z.number(),
    period: localized,
    company: z.string(),
    post: localized,
    place: z.string(),
    bullets: z.array(localized).min(1),
    stack: z.array(z.string()),
    project: z.string().optional()
  })
});

const skills = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/skills' }),
  schema: z.object({
    order: z.number(),
    position: z.enum(['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br']),
    name: localized,
    items: z.array(z.object({ name: z.string(), logo: z.string() })).min(1)
  })
});

const certifications = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/certifications' }),
  schema: z.object({
    order: z.number(),
    name: localized,
    issuer: z.string(),
    partner: z.string().optional(),
    date: localized,
    skills: z.array(z.string()),
    verifyUrl: z.string().url()
  })
});

// One folder per project: project.json for the facts, fr.md / en.md for the description.
const projects = defineCollection({
  loader: glob({ pattern: '*/project.json', base: './src/projects', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: ({ image }) => z.object({
    order: z.number(),
    published: z.boolean(),
    featured: z.boolean().default(false),
    type: z.enum(['stage', 'personnel', 'academique']),
    company: z.string().optional(),
    pair: z.boolean().default(false),
    period: localized,
    title: localized,
    shortTitle: localized,
    card: z.object({ title: localized, summary: localized, stack: z.array(z.string()) }).optional(),
    repo: z.string().url().nullable(),
    stack: z.array(z.string()).min(1),
    hasDemo: z.boolean().default(false),
    /** A picture of the demo, shown on the cards and the projects list. */
    thumbnail: image().optional(),
    /** The demo page: what the project is about, and the annotated screenshots shown on phones instead of the demo. */
    detail: z.object({
      problem: localized,
      does: localized,
      role: localized,
      gallery: z.array(z.object({ image: image(), title: localized, text: localized })).min(1)
    }).optional()
  }).refine(p => !p.hasDemo || p.detail, { message: 'A project with a demo needs its "detail" block' })
});

const localizedList = z.object({ fr: z.array(z.string()), en: z.array(z.string()) });

// The architecture page of a project with a demo: architecture.json next to project.json.
const architectures = defineCollection({
  loader: glob({ pattern: '*/architecture.json', base: './src/projects', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: z.object({
    overview: z.object({
      width: z.number(),
      height: z.number(),
      nodes: z.array(z.object({ id: z.string(), x: z.number(), y: z.number(), logo: z.string(), title: localized, subtitle: localized })),
      wires: z.array(z.object({
        from: z.string(), to: z.string(), path: z.string(),
        label: localized, labelX: z.number(), labelY: z.number(), once: z.boolean().default(false)
      }))
    }),
    stack: z.array(z.object({ name: localized, items: z.array(z.object({ name: z.string(), logo: z.string(), note: localized.optional() })) })),
    diagrams: z.array(z.object({ id: z.string(), title: localized, caption: localized })),
    choices: z.array(z.object({ title: localized, why: localized, alternative: localized, tradeoff: localized })),
    limits: localizedList,
    next: localizedList
  })
});

const projectTexts = defineCollection({
  loader: glob({ pattern: '*/{fr,en}.md', base: './src/projects' }),
  schema: z.object({})
});

export const collections = { profile, education, experiences, skills, certifications, projects, projectTexts, architectures };
