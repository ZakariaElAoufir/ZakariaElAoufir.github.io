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
  schema: z.object({
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
    hasDemo: z.boolean().default(false)
  })
});

const projectTexts = defineCollection({
  loader: glob({ pattern: '*/{fr,en}.md', base: './src/projects' }),
  schema: z.object({})
});

export const collections = { profile, education, experiences, skills, certifications, projects, projectTexts };
