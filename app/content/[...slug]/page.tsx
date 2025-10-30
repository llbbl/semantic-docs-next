import { getAllArticles, getArticleBySlug } from '@logan/libsql-search';
import { marked } from 'marked';
import { notFound } from 'next/navigation';
import { getTursoClient } from '../../../src/lib/turso';
import DocsHeader from '../../../components/DocsHeader';
import DocsSidebar from '../../../components/DocsSidebar';
import DocsToc from '../../../src/components/DocsToc';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

// Generate static paths for all articles at build time
export async function generateStaticParams() {
  const client = getTursoClient();
  const allArticles = await getAllArticles(client);

  return allArticles.map((article) => ({
    slug: article.slug.split('/'),
  }));
}

// Generate metadata for each page
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugString = slug.join('/');
  const client = getTursoClient();
  const article = await getArticleBySlug(client, slugString);

  if (!article) {
    return {
      title: 'Not Found',
    };
  }

  return {
    title: article.title,
    description: article.title,
  };
}

export default async function ContentPage({ params }: PageProps) {
  const { slug } = await params;
  const slugString = slug.join('/');

  // Fetch the article from database
  const client = getTursoClient();
  const article = await getArticleBySlug(client, slugString);

  if (!article) {
    notFound();
  }

  // Fetch all articles for sidebar
  const allArticles = await getAllArticles(client);

  // Configure marked to add IDs to headings and handle external links
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const id = text
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '');
        return `<h${depth} id="${id}">${text}</h${depth}>`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${title}"` : '';

        // Open external links in new tab
        if (href?.startsWith('http://') || href?.startsWith('https://')) {
          return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
        }

        // Internal links open in same tab
        return `<a href="${href}"${titleAttr}>${text}</a>`;
      },
    },
  });

  // Convert markdown to HTML
  const htmlContent = await marked(article.content);

  // Parse tags
  const tags = article.tags;

  return (
    <>
      <DocsHeader />
      <div className="flex">
        <DocsSidebar articles={allArticles} />

        <main className="flex-1 lg:pl-64 xl:pr-64 min-w-0 relative z-10">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <article className="prose prose-neutral dark:prose-invert max-w-none overflow-x-auto relative">
              <header className="mb-8 pb-6 border-b border-border">
                <h1 className="text-4xl font-bold tracking-tight text-balance mb-4">{article.title}</h1>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </header>

              <div className="article-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />

              <footer className="mt-12 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Last updated:{' '}
                  {new Date(article.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </footer>
            </article>
          </div>
        </main>

        <DocsToc />
      </div>
    </>
  );
}
