# Multi-stage Dockerfile using pnpm with npm/npx elimination
# Migrated from npm to pnpm to eliminate npm CVEs while maintaining Corepack support
# See docs/dockerfile-pnpm-standardization.md for architecture details

# =============================================================================
# Base Stage - Foundation with Corepack and pnpm
# =============================================================================
FROM node:24-alpine AS base

# Enable Corepack and activate pnpm version from package.json
WORKDIR /app
COPY package.json ./
RUN corepack enable && \
    corepack prepare "$(node -p "require('./package.json').packageManager")" --activate

# =============================================================================
# Dependencies Stage - Install all dependencies
# =============================================================================
FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# =============================================================================
# Builder Stage - Build application with database initialization
# =============================================================================
FROM base AS builder

# Build arguments for Turso credentials (required for indexing and pre-rendering)
ARG TURSO_DB_URL
ARG TURSO_AUTH_TOKEN
ARG EMBEDDING_PROVIDER=local

# Set environment variables for build
ENV TURSO_DB_URL=$TURSO_DB_URL
ENV TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN
ENV EMBEDDING_PROVIDER=$EMBEDDING_PROVIDER
ENV NEXT_TELEMETRY_DISABLED=1

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Index content to Turso database (env vars already set via ENV directives)
RUN pnpm exec tsx scripts/init-db.ts && pnpm exec tsx scripts/index-content.ts

# Build Next.js application (queries Turso database for static pre-rendering)
RUN pnpm build

# =============================================================================
# Production Dependencies Stage - Install only production dependencies
# =============================================================================
FROM base AS prod-deps

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# =============================================================================
# Runner Stage - Minimal production runtime with npm/npx eliminated
# =============================================================================
FROM node:24-alpine AS runner

# Set working directory
WORKDIR /app

# Enable Corepack for production
RUN corepack enable

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy production dependencies
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy standalone output from Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Remove npm and npx while preserving Corepack
# This eliminates npm CVEs while maintaining pnpm support via Corepack
RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack/dist/npm*.js \
    /usr/local/lib/node_modules/corepack/dist/npx*.js \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /opt/corepack/shims/npm \
    /opt/corepack/shims/npx 2>/dev/null || true

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
