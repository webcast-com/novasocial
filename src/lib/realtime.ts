// Lightweight in-memory pub/sub event bus for Server-Sent Events (SSE).
// Uses a global singleton so every API route in the same Node process
// shares the same set of connected client subscribers.

export type RealtimeEvent = {
  type:
    | "notification"
    | "chat_message"
    | "points_update"
    | "new_post"
    | "poll_update"
    | "leaderboard_update"
    | "flash_event"
    | "idea_update"
    | "presence";
  payload: any;
  // Optional target user id. When set, only that user's streams receive it.
  targetUserId?: number | null;
  ts?: number;
};

type Subscriber = {
  id: string;
  userId: number | null;
  send: (event: RealtimeEvent) => void;
};

const globalForRealtime = globalThis as typeof globalThis & {
  __vibepulseRealtimeSubscribers?: Map<string, Subscriber>;
};

const subscribers: Map<string, Subscriber> =
  globalForRealtime.__vibepulseRealtimeSubscribers ?? new Map();

if (!globalForRealtime.__vibepulseRealtimeSubscribers) {
  globalForRealtime.__vibepulseRealtimeSubscribers = subscribers;
}

export function subscribe(subscriber: Subscriber) {
  subscribers.set(subscriber.id, subscriber);
  return () => {
    subscribers.delete(subscriber.id);
  };
}

export function getActiveUserIds(): number[] {
  const ids = new Set<number>();
  for (const sub of subscribers.values()) {
    if (sub.userId != null) ids.add(sub.userId);
  }
  return Array.from(ids);
}

export function getSubscriberCount(): number {
  return subscribers.size;
}

// Broadcast an event. If targetUserId is provided, only deliver to that user's
// streams; otherwise deliver to everyone.
export function publish(event: RealtimeEvent) {
  const enriched: RealtimeEvent = { ...event, ts: event.ts ?? Date.now() };
  for (const sub of subscribers.values()) {
    if (enriched.targetUserId != null && sub.userId !== enriched.targetUserId) {
      continue;
    }
    try {
      sub.send(enriched);
    } catch {
      // Drop broken subscribers silently; they will be cleaned up on close.
      subscribers.delete(sub.id);
    }
  }
}
