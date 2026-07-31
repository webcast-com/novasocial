import { NextRequest } from "next/server";
import { subscribe, publish, getSubscriberCount, RealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userIdParam = searchParams.get("userId");
  const userId = userIdParam ? Number(userIdParam) : null;

  const encoder = new TextEncoder();
  const subId = `${userId ?? "anon"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const write = (event: RealtimeEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          /* controller may be closed */
        }
      };

      // Initial hello event so the client knows the stream is live.
      write({
        type: "presence",
        payload: { status: "connected", subId, online: getSubscriberCount() + 1 },
        ts: Date.now(),
      });

      unsubscribe = subscribe({ id: subId, userId, send: write });

      // Announce presence change to everyone.
      publish({ type: "presence", payload: { status: "online", online: getSubscriberCount() } });

      // Heartbeat comment every 25s keeps proxies from closing the connection.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* ignore */
        }
      }, 25000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
      publish({ type: "presence", payload: { status: "offline", online: getSubscriberCount() } });
    },
  });

  request.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat);
    if (unsubscribe) unsubscribe();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
