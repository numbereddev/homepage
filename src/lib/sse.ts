/**
 * Server-Sent Events broadcaster.
 *
 * Maintains an in-process registry of active SSE connections keyed by post
 * slug. Route handlers call `subscribe` to get a ReadableStream to hand back
 * to the browser, and call `broadcast` to push a JSON payload to every
 * subscriber on a given slug.
 *
 * This works correctly for self-hosted / single-process deployments (Next.js
 * dev server, `next start`, PM2 single instance). For multi-process setups
 * (e.g. cluster mode) you would swap the in-process Map for a Redis pub/sub
 * channel — the API surface here stays identical.
 */

type Controller = ReadableStreamDefaultController<Uint8Array>;

// slug → set of active stream controllers
const subscribers = new Map<string, Set<Controller>>();

const encoder = new TextEncoder();

function formatEvent(data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function formatPing(): Uint8Array {
  return encoder.encode(`: ping\n\n`);
}

/**
 * Returns a ReadableStream that will receive SSE messages for `slug`.
 * The stream sends a `: ping` comment every 25 s to keep the connection alive
 * through proxies and load balancers that close idle connections.
 * The subscriber is automatically removed when the client disconnects.
 */
export function subscribe(slug: string): ReadableStream<Uint8Array> {
  let controller: Controller;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;

      if (!subscribers.has(slug)) {
        subscribers.set(slug, new Set());
      }
      subscribers.get(slug)!.add(controller);
    },
    cancel() {
      const set = subscribers.get(slug);
      if (set) {
        set.delete(controller);
        if (set.size === 0) subscribers.delete(slug);
      }
    },
  });

  // Keep-alive ping
  const pingInterval = setInterval(() => {
    try {
      controller.enqueue(formatPing());
    } catch {
      // Stream already closed — clean up interval
      clearInterval(pingInterval);
    }
  }, 25_000);

  return stream;
}

/**
 * Push `data` as a JSON SSE event to every active subscriber for `slug`.
 */
export function broadcast(slug: string, data: unknown): void {
  const set = subscribers.get(slug);
  if (!set || set.size === 0) return;

  const payload = formatEvent(data);
  for (const controller of set) {
    try {
      controller.enqueue(payload);
    } catch {
      // Stale controller — remove it
      set.delete(controller);
    }
  }

  if (set.size === 0) subscribers.delete(slug);
}

/**
 * Returns the number of active SSE connections for a given slug.
 * Useful for debugging / admin dashboards.
 */
export function getSubscriberCount(slug: string): number {
  return subscribers.get(slug)?.size ?? 0;
}
