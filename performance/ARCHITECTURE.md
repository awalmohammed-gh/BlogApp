# Optimization boundaries

The React/Vite SPA, Express server, MongoDB models, ImageKit, HTTP-only cookies and transactional editorial workflow remain in place. No framework migration is planned.

Before implementing production HTML support: the current SPA sends an empty root to crawlers. The compatible production option is to let the existing always-running Express server serve the Vite build (`SERVE_FRONTEND=true`). Published article URLs will receive escaped readable article text, canonical/social metadata and NewsArticle JSON-LD in their initial HTML. React then mounts normally; this is an HTML fallback, not React hydration or a new SSR framework. It is served to every visitor, not selected by bot user-agent. Only the approved published revision is eligible. Separate static hosting must proxy article document requests to this server to receive the same SEO behavior.

Public list responses will omit full bodies and carry an accurate reading-time estimate derived from approved content. A bounded migration fills this derived field on existing published records without changing text, ownership, timestamps or workflow state. Text search uses indexes on revisions plus a legacy published-only fallback; MongoDB performs pagination before results enter Node memory.

Public caching is bounded and short-lived. Article response cache hits recheck visibility and modification timestamps against MongoDB, including across Node workers. Mutations and scheduled publication invalidate local cache entries. New publication discovery across multiple workers can lag by up to the configured cache TTL. Administrative data is always no-store. Article content in the browser is deduplicated while in flight, then revalidated on navigation.

No deployment exists yet. Production-domain, CDN, TLS and real-user performance verification remain deployment tasks. Local MongoDB is standalone; transactional publishing requires Atlas or a replica set. Tests use disposable replica sets and never write benchmark records, notifications or analytics into the real database.
