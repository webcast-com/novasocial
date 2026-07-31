"use client";

import { useEffect, useRef } from "react";

export interface RealtimeMessage {
  type:
    | "notification"
    | "chat_message"
    | "points_update"
    | "new_post"
    | "poll_update"
    | "leaderboard_update"
    | "flash_event"
    | "idea_update"
    | "direct_message"
    | "live_signal"
    | "live_room"
    | "presence";
  payload: any;
  targetUserId?: number | null;
  ts?: number;
}

// Subscribes to the SSE /api/stream endpoint and invokes onMessage for each event.
// Automatically reconnects when the active user changes or the connection drops.
export function useRealtime(userId: number | null | undefined, onMessage: (msg: RealtimeMessage) => void) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userId == null) return;

    let es: EventSource | null = null;
    let closedByEffect = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      es = new EventSource(`/api/stream?userId=${userId}`);

      es.onmessage = (e) => {
        if (!e.data) return;
        try {
          const parsed = JSON.parse(e.data) as RealtimeMessage;
          handlerRef.current(parsed);
        } catch {
          /* ignore malformed frames / heartbeats */
        }
      };

      es.onerror = () => {
        // Browser will retry EventSource automatically, but if it fully closed,
        // schedule a manual reconnect.
        if (es && es.readyState === EventSource.CLOSED && !closedByEffect) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) es.close();
    };
  }, [userId]);
}
