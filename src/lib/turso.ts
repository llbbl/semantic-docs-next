/**
 * Turso/LibSQL client wrapper using libsql-search
 * Falls back to local SQLite file when Turso credentials aren't available
 */

import { type Client, createClient } from '@libsql/client';
import { logger } from '@logan/logger';

let client: Client | null = null;

export function getTursoClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (url && authToken) {
      // Use Turso remote database
      // Only log in production to avoid noise from Next.js dev mode hot reloading
      if (process.env.NODE_ENV === 'production') {
        logger.info(`Using Turso database: ${url}`);
      }
      client = createClient({ url, authToken });
    } else {
      // Fall back to local libSQL file (for CI/development)
      if (process.env.NODE_ENV === 'production') {
        logger.info('Using local libSQL database: file:local.db');
      }
      client = createClient({ url: 'file:local.db' });
    }
  }

  return client;
}

// Re-export search utilities from libsql-search
export {
  getAllArticles,
  getArticleBySlug,
  getArticlesByFolder,
  getFolders,
} from '@logan/libsql-search';
