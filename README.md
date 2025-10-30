# semantic-docs-next

**Next.js version** of the original [semantic-docs](https://github.com/llbbl/semantic-docs) Astro theme.

Documentation theme with semantic vector search.

A beautiful, dark-mode documentation theme powered by [libsql-search](https://github.com/llbbl/libsql-search) for semantic search capabilities. Built with **Next.js 15** and **React 19** for server-side rendering and optimal performance.

> **Note:** Looking for the Astro version? Check out the [original semantic-docs template](https://github.com/llbbl/semantic-docs).

## Features

- 🎨 **Modern Dark UI** - Sleek design with OKLCH colors
- 🔍 **Semantic Search** - AI-powered vector search in the header
- 📱 **Responsive** - Mobile-friendly with collapsible sidebar
- 📑 **Auto TOC** - Table of contents generated from headings
- 🚀 **Edge-Ready** - Optimized for Turso's global database
- ⚡ **Fast** - Static generation with server-rendered search
- 🎯 **Type-Safe** - Full TypeScript support

## Quick Start

### 1. Clone or Use as Template

```bash
git clone git@github.com:llbbl/semantic-docs-next.git
cd semantic-docs-next
```

Or use as a template on GitHub.

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment

Copy `.env.example` to `.env` and add your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
TURSO_DB_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
EMBEDDING_PROVIDER=local
```

**Get Turso credentials:**

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Sign up and authenticate
turso auth signup

# Create a database
turso db create my-docs

# Get credentials
turso db show my-docs
```

### 4. Add Your Content

Create markdown files in `./content`:

```bash
mkdir -p content/getting-started
echo "# Hello World\n\nThis is my first article." > content/getting-started/intro.md
```

**Front matter support:**

```markdown
---
title: Getting Started
tags: [tutorial, beginner]
---

# Getting Started

Your content here...
```

### 5. Index Content

```bash
# Initialize database and index content to Turso
pnpm db:init
pnpm index

# Or use local database without Turso (for testing)
pnpm db:init:local
pnpm index:local
```

This will:
- Scan your markdown files
- Generate embeddings (using local model by default)
- Store everything in Turso (or local.db with `:local` commands)

### 6. Start Development

```bash
pnpm dev
```

Visit `http://localhost:3000` to see your docs!

## Customization

### Change Site Title

Edit `components/DocsHeader.tsx`:

```tsx
<span className="font-sans hidden sm:inline">Your Site Name</span>
```

And `app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: 'Your Site Name',
  description: 'Your description',
};
```

### Customize Colors

Edit `src/styles/global.css` to change the color scheme. The theme uses OKLCH colors for smooth gradients and perceptual uniformity.

### Change Embedding Provider

**Use Gemini** (free tier: 1,500 requests/day):

```env
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your-key
```

**Use OpenAI** (paid):

```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your-key
```

## Project Structure

```
semantic-docs-next/
├── app/
│   ├── api/
│   │   └── search/
│   │       └── route.ts        # Search API endpoint
│   ├── content/
│   │   └── [...slug]/
│   │       └── page.tsx        # Article pages
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/
│   ├── DocsHeader.tsx          # Header with search
│   └── DocsSidebar.tsx         # Navigation sidebar
├── src/
│   ├── components/
│   │   ├── DocsToc.tsx         # Table of contents
│   │   ├── Search.tsx          # Search component
│   │   └── ThemeSwitcher.tsx   # Theme toggle
│   ├── lib/
│   │   └── turso.ts            # Database client
│   └── styles/
│       └── global.css          # Global styles
├── scripts/
│   └── index-content.ts        # Indexing script
├── content/                    # Your markdown files
├── next.config.mjs
├── package.json
└── .env                        # Your credentials
```

## Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Add environment variables in Netlify dashboard
```

### Docker

```bash
# Build Docker image
docker build -t semantic-docs-next .

# Run container
docker run -p 3000:3000 semantic-docs-next
```

Or using Docker Compose:

```bash
docker compose up
```

**Important:** Run `pnpm index` before building to ensure content is indexed.

## Content Organization

The theme automatically organizes content by folder:

```
content/
├── getting-started/
│   ├── intro.md
│   └── installation.md
├── guides/
│   ├── configuration.md
│   └── deployment.md
└── reference/
    └── api.md
```

Folders become collapsible sections in the sidebar.

## Search

The search bar in the header provides semantic search:

- **Semantic matching**: Finds content by meaning, not just keywords
- **Instant results**: Real-time as you type
- **Smart ranking**: Most relevant results first
- **Tag display**: Shows article tags in results

Try searching for concepts rather than exact phrases!

## Build for Production

```bash
# Index content
pnpm index

# Build site
pnpm build

# Preview
pnpm preview
```

## Troubleshooting

### Search not working

1. Check `.env` file has correct credentials
2. Ensure API route is working at `/api/search`
3. Verify content is indexed: run `pnpm index`

### Content not showing

1. Run `pnpm index` to index your markdown files
2. Check content is in `./content` directory
3. Verify Turso database has data

### Local embedding model slow

First run downloads ~50MB model. Subsequent runs use cache.

Use Gemini for faster embeddings:

```env
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your-key
```

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 15
- **Search**: [libsql-search](https://github.com/llbbl/libsql-search)
- **Database**: [Turso](https://turso.tech) (libSQL)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) 4
- **UI**: React 19 with Server Components
- **Embeddings**: Xenova, Gemini, or OpenAI

## License

MIT

## Support

- [Issues](https://github.com/llbbl/semantic-docs-next/issues)
- [Discussions](https://github.com/llbbl/semantic-docs-next/discussions)

## Credits

Built with [libsql-search](https://github.com/llbbl/libsql-search).
