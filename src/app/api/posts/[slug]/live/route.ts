import { type NextRequest } from "next/server";
import { subscribe } from "@/lib/sse";
import { makeFingerprint, getPostStats } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const ip = getIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  const fingerprint = makeFingerprint(ip, ua);

  const stream = subscribe(slug);

  // Immediately push current stats so the client doesn't wait for the first
  // broadcast event to get an initial reading.
  const initial = getPostStats(slug, fingerprint);
  const encoder = new TextEncoder();
  const initChunk = encoder.encode(`data: ${JSON.stringify(initial)}\n\n`);
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const combined = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(initChunk);

      reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        reader?.releaseLock();
        reader = null;
        controller.close();
      }
    },
    cancel() {
      // The stream is consumed through the reader, so cancel that instead of
      // canceling the locked stream directly.
      void reader?.cancel();
    },
  });

  return new Response(combined, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx proxy buffering
    },
  });
}

// SSE connections are long-lived — opt out of Next.js static caching
export const dynamic = "force-dynamic";
