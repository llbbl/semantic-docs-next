'use client';

/**
 * Docs Sidebar Component
 * Collapsible navigation populated from Turso database
 */
import { useState } from 'react';
import { usePathname } from 'next/navigation';

interface Article {
  slug: string;
  title: string;
  folder: string;
}

interface DocsSidebarProps {
  articles: Article[];
}

function formatFolderName(folder: string): string {
  if (folder === 'root') return 'Documentation';
  return folder
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function DocsSidebar({ articles }: DocsSidebarProps) {
  const pathname = usePathname();

  // Group articles by folder
  const articlesByFolder = articles.reduce(
    (acc, article) => {
      const folder = article.folder || 'root';
      if (!acc[folder]) {
        acc[folder] = [];
      }
      acc[folder].push(article);
      return acc;
    },
    {} as Record<string, Article[]>
  );

  return (
    <aside
      id="docs-sidebar"
      className="fixed top-14 z-30 -translate-x-full lg:translate-x-0 transition-transform duration-300 h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-sidebar lg:block"
    >
      <div className="py-6 px-6">
        <nav className="space-y-2">
          {Object.entries(articlesByFolder).map(([folder, folderArticles]) => (
            <FolderSection
              key={folder}
              folder={folder}
              articles={folderArticles}
              currentPath={pathname}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function FolderSection({
  folder,
  articles,
  currentPath,
}: {
  folder: string;
  articles: Article[];
  currentPath: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2 text-sm font-medium text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors"
      >
        {formatFolderName(folder)}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-2 space-y-1">
          {articles.map((article) => {
            const href = `/content/${article.slug}`;
            const isActive = currentPath === href || currentPath.startsWith(href + '/');

            return (
              <a
                key={article.slug}
                href={href}
                className={`block py-2 text-sm transition-colors pl-4 border-l-2 ${
                  isActive
                    ? 'text-sidebar-foreground border-sidebar-primary font-medium'
                    : 'text-muted-foreground border-transparent hover:text-sidebar-foreground hover:border-muted-foreground/30'
                }`}
              >
                {article.title}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
