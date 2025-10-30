/**
 * Vector Search API Endpoint
 * Uses libsql-search for semantic search
 */

import { search } from '@logan/libsql-search';
import { logger } from '@logan/logger';
import { type NextRequest, NextResponse } from 'next/server';
import { getTursoClient } from '../../../src/lib/turso';
import {
  checkRateLimit,
  createRateLimitHeaders,
} from '../../../src/middleware/rateLimit';

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute per IP
  const rateLimitResult = checkRateLimit(request, {
    maxRequests: 20,
    windowSeconds: 60,
  });

  const rateLimitHeaders = {
    'Content-Type': 'application/json',
    ...createRateLimitHeaders(rateLimitResult),
  };

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          'Retry-After': Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000,
          ).toString(),
        },
      },
    );
  }

  try {
    const body = await request.json();
    const { query, limit = 10 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400, headers: rateLimitHeaders },
      );
    }

    // Limit query length to prevent abuse
    if (query.length > 500) {
      return NextResponse.json(
        {
          error: 'Query too long',
          message: 'Query must be less than 500 characters',
        },
        { status: 400, headers: rateLimitHeaders },
      );
    }

    // Limit max results to prevent excessive database queries
    const sanitizedLimit = Math.min(Math.max(1, limit), 20);

    const client = getTursoClient();

    // Perform vector search
    const results = await search({
      client,
      query,
      limit: sanitizedLimit,
      embeddingOptions: {
        provider:
          (process.env.EMBEDDING_PROVIDER as 'local' | 'gemini' | 'openai') ||
          'local',
      },
    });

    return NextResponse.json(
      {
        results,
        count: results.length,
        query,
      },
      {
        status: 200,
        headers: rateLimitHeaders,
      },
    );
  } catch (error) {
    logger.error('Search error:', error);

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: rateLimitHeaders,
      },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST method for search' },
    {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
