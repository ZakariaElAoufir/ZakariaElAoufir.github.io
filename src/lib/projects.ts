import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

/** Published projects, in the order chosen in their project.json. */
export async function publishedProjects(): Promise<Project[]> {
  return (await getCollection('projects', p => p.data.published)).sort((a, b) => a.data.order - b.data.order);
}

/** The description of a project in one language (its fr.md or en.md). */
export async function projectText(slug: string, lang: 'fr' | 'en') {
  const texts = await getCollection('projectTexts');
  const entry = texts.find(t => t.id === `${slug}/${lang}`);
  if (!entry) throw new Error(`Missing ${lang}.md for project "${slug}"`);
  return entry;
}
