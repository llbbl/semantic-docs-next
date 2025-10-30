import type { Metadata } from 'next';
import '../src/styles/global.css';

export const metadata: Metadata = {
  title: 'Next.js Vault',
  description: 'Documentation',
  generator: 'Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme') || 'dark';

                // Add dark class immediately if needed
                if (savedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                }

                const themes = {
                  dark: {
                    background: '#1a1a1a',
                    foreground: '#fafafa',
                    header: '#141414',
                    sidebar: '#1a1a1a',
                    toc: '#262626'
                  },
                  light: {
                    background: '#ffffff',
                    foreground: '#171717',
                    header: '#f5f5f5',
                    sidebar: '#fafafa',
                    toc: '#fafafa'
                  },
                  ocean: {
                    background: '#0a1628',
                    foreground: '#e0f2fe',
                    header: '#0a1a2e',
                    sidebar: '#071220',
                    toc: '#0f2942'
                  },
                  forest: {
                    background: '#0f1e13',
                    foreground: '#d1fae5',
                    header: '#0d1a11',
                    sidebar: '#0a140d',
                    toc: '#14291a'
                  },
                  sunset: {
                    background: '#1c0f0a',
                    foreground: '#fef3c7',
                    header: '#1a0d08',
                    sidebar: '#110a07',
                    toc: '#2a1510'
                  },
                  purple: {
                    background: '#1a0a1f',
                    foreground: '#f3e8ff',
                    header: '#15091c',
                    sidebar: '#0f0514',
                    toc: '#241129'
                  },
                };
                const theme = themes[savedTheme];
                if (theme) {
                  document.documentElement.style.setProperty('--background', theme.background);
                  document.documentElement.style.setProperty('--foreground', theme.foreground);
                  document.documentElement.style.setProperty('--header', theme.header);
                  document.documentElement.style.setProperty('--sidebar', theme.sidebar);
                  document.documentElement.style.setProperty('--toc', theme.toc);
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
