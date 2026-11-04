import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/utils';

export type Project = CollectionEntry<'projects'>;

/** Published projects, in the order chosen in their project.json. */
export async function publishedProjects(): Promise<Project[]> {
  return (await getCollection('projects', p => p.data.published)).sort((a, b) => a.data.order - b.data.order);
}

/** Published projects that have a demo, so a demo page and an architecture page. */
export async function demoProjects(): Promise<Project[]> {
  return (await publishedProjects()).filter(p => p.data.hasDemo);
}

/** The description of a project in one language (its fr.md or en.md). */
export async function projectText(slug: string, lang: Lang) {
  const texts = await getCollection('projectTexts');
  const entry = texts.find(t => t.id === `${slug}/${lang}`);
  if (!entry) throw new Error(`Missing ${lang}.md for project "${slug}"`);
  return entry;
}

export async function architectureOf(slug: string) {
  const entry = await getEntry('architectures', slug);
  if (!entry) throw new Error(`Project "${slug}" has a demo but no architecture.json`);
  return entry.data;
}

// Diagrams are pre-rendered from diagrams/<id>.<lang>.mmd to .svg (see SPEC-project-<slug>.md) and inlined at build time.
const diagramFiles = import.meta.glob<string>('/src/projects/*/diagrams/*.svg', { query: '?raw', import: 'default', eager: true });

export function diagramSvg(slug: string, id: string, lang: Lang) {
  const svg = diagramFiles[`/src/projects/${slug}/diagrams/${id}.${lang}.svg`];
  if (!svg) throw new Error(`Missing diagram ${slug}/diagrams/${id}.${lang}.svg`);
  return svg;
}

// Each demo is an Astro wrapper in its project folder (demo/Demo.astro) that hydrates its own React island.
const demoWrappers = import.meta.glob<{ default: (props: { lang: Lang }) => unknown }>('/src/projects/*/demo/Demo.astro', { eager: true });

export function demoOf(slug: string) {
  const wrapper = demoWrappers[`/src/projects/${slug}/demo/Demo.astro`];
  if (!wrapper) throw new Error(`Project "${slug}" has hasDemo: true but no demo/Demo.astro`);
  return wrapper.default;
}
