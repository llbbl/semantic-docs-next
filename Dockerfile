# Production Dockerfile - Uses Turso database
# Automatically indexes content to Turso during build

# Build stage
FROM node:20-slim AS builder

# Build arguments for Turso credentials (required for indexing and pre-rendering)
ARG TURSO_DB_URL
ARG TURSO_AUTH_TOKEN
ARG EMBEDDING_PROVIDER=local

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Set environment variables for build
ENV TURSO_DB_URL=$TURSO_DB_URL
ENV TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN
ENV EMBEDDING_PROVIDER=$EMBEDDING_PROVIDER
ENV NEXT_TELEMETRY_DISABLED=1

# Index content to Turso database (env vars already set via ENV directives)
RUN pnpm exec tsx scripts/init-db.ts && pnpm exec tsx scripts/index-content.ts

# Build Next.js application (queries Turso database for static pre-rendering)
RUN pnpm build

# Production stage
FROM node:20-slim AS runtime

# Set working directory
WORKDIR /app

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nextjs

# Copy standalone output from Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the Next.js server
CMD ["node", "server.js"]
