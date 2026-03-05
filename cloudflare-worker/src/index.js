/**
 * DevDocs Proxy & Cache Worker
 *
 * Cloudflare Worker that proxies and caches DevDocs.io API responses.
 * Provides faster access for Alfred workflow users by:
 * - Caching documentation indices in KV storage
 * - Serving cached responses from edge locations
 * - Handling rate limiting and retries to upstream
 *
 * Endpoints:
 *   GET /docs/docs.json         - List all available documentations
 *   GET /docs/:slug/index.json  - Get documentation index for a specific doc
 *   GET /health                 - Health check endpoint
 *   GET /cache/status           - Cache status for debugging
 */

const UPSTREAM_BASE = 'https://devdocs.io/';
const DEFAULT_CACHE_TTL = 604800; // 7 days in seconds

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // Health check
      if (path === '/health') {
        return new Response(
          JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            upstream: UPSTREAM_BASE,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Cache status endpoint
      if (path === '/cache/status') {
        return await handleCacheStatus(env, corsHeaders);
      }

      // Documentation list: /docs/docs.json
      if (path === '/docs/docs.json') {
        return await handleCachedRequest(
          env,
          'docs:list',
          `${UPSTREAM_BASE}docs/docs.json`,
          corsHeaders
        );
      }

      // Documentation index: /docs/:slug/index.json
      const slugMatch = path.match(/^\/docs\/([a-z0-9_~-]+)\/index\.json$/i);
      if (slugMatch) {
        const slug = slugMatch[1];
        return await handleCachedRequest(
          env,
          `docs:index:${slug}`,
          `${UPSTREAM_BASE}docs/${slug}/index.json`,
          corsHeaders
        );
      }

      // 404 for unknown routes
      return new Response(
        JSON.stringify({
          error: 'Not found',
          endpoints: [
            'GET /health',
            'GET /docs/docs.json',
            'GET /docs/:slug/index.json',
            'GET /cache/status',
          ],
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Internal server error', message: err.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};

/**
 * Handle a request with KV caching and upstream fallback
 */
async function handleCachedRequest(env, cacheKey, upstreamUrl, corsHeaders) {
  const cacheTtl = parseInt(env.CACHE_TTL_SECONDS) || DEFAULT_CACHE_TTL;

  // Try KV cache first
  if (env.DOCS_CACHE) {
    const cached = await env.DOCS_CACHE.getWithMetadata(cacheKey, { type: 'text' });
    if (cached && cached.value) {
      const metadata = cached.metadata || {};
      const cachedAt = metadata.cachedAt || 0;
      const age = Math.floor((Date.now() - cachedAt) / 1000);

      // Serve from cache if not expired
      if (age < cacheTtl) {
        return new Response(cached.value, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'X-Cache-Age': String(age),
            'Cache-Control': `public, max-age=${cacheTtl - age}`,
          },
        });
      }
    }
  }

  // Fetch from upstream with retry
  const data = await fetchWithRetry(upstreamUrl, 3);
  if (!data.ok) {
    return new Response(
      JSON.stringify({ error: 'Upstream error', status: data.status }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const body = await data.text();

  // Validate JSON
  try {
    JSON.parse(body);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON from upstream' }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Store in KV cache
  if (env.DOCS_CACHE) {
    await env.DOCS_CACHE.put(cacheKey, body, {
      metadata: { cachedAt: Date.now(), url: upstreamUrl },
      expirationTtl: cacheTtl * 2, // KV expiration at 2x TTL as safety net
    });
  }

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'Cache-Control': `public, max-age=${cacheTtl}`,
    },
  });
}

/**
 * Fetch with exponential backoff retry
 */
async function fetchWithRetry(url, maxRetries) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Alfred-DevDocs-Worker/1.0',
          'Accept': 'application/json',
        },
      });
      if (response.ok || response.status < 500) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }
    // Exponential backoff: 1s, 2s, 4s
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  return { ok: false, status: 502, text: async () => lastError.message };
}

/**
 * Return cache status information
 */
async function handleCacheStatus(env, corsHeaders) {
  const status = {
    kv_available: !!env.DOCS_CACHE,
    cache_ttl_seconds: parseInt(env.CACHE_TTL_SECONDS) || DEFAULT_CACHE_TTL,
    upstream: UPSTREAM_BASE,
  };

  if (env.DOCS_CACHE) {
    const docsList = await env.DOCS_CACHE.getWithMetadata('docs:list', { type: 'text' });
    status.docs_list_cached = !!docsList.value;
    if (docsList.metadata) {
      status.docs_list_cached_at = new Date(docsList.metadata.cachedAt).toISOString();
    }
  }

  return new Response(JSON.stringify(status, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
