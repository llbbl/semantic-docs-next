import { getAllArticles } from '@logan/libsql-search';
import DocsHeader from '../components/DocsHeader';
import DocsSidebar from '../components/DocsSidebar';
import DocsToc from '../src/components/DocsToc';
import { getTursoClient } from '../src/lib/turso';

export default async function HomePage() {
  const client = getTursoClient();
  const allArticles = await getAllArticles(client);

  return (
    <>
      <DocsHeader />
      <div className="flex">
        <DocsSidebar articles={allArticles} />

        <main className="flex-1 lg:pl-64 xl:pr-64">
          <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
            <article className="prose prose-neutral dark:prose-invert max-w-none">
              <div className="mb-8">
                <h1
                  id="welcome"
                  className="text-4xl font-bold tracking-tight text-balance mb-4"
                >
                  Welcome to Your Documentation
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Your content is powered by libSQL with vector search
                  capabilities.
                </p>
              </div>

              <section id="features" className="mb-12">
                <h2 className="text-3xl font-bold tracking-tight mb-4 text-balance">
                  Features
                </h2>
                <ul className="space-y-2">
                  <li>
                    📝 <strong>Database Storage</strong>: Content stored in
                    distributed libSQL database
                  </li>
                  <li>
                    🔍 <strong>Semantic Search</strong>: AI-powered vector
                    search
                  </li>
                  <li>
                    🚀 <strong>Edge-Ready</strong>: Fast global access via Turso
                  </li>
                  <li>
                    🆓 <strong>Free Options</strong>: Local embeddings or Gemini
                    API
                  </li>
                </ul>
              </section>

              <section id="getting-started" className="mb-12">
                <h2 className="text-3xl font-bold tracking-tight mb-4 text-balance">
                  Getting Started
                </h2>
                <p className="text-base leading-relaxed mb-4">
                  Select an article from the sidebar or use the search bar for
                  semantic search.
                </p>
              </section>
            </article>
          </div>
        </main>

        <DocsToc />
      </div>
    </>
  );
}
