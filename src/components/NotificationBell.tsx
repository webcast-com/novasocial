"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { NotificationItem } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface Props {
  userId: number | null;
  // A counter that increments whenever a realtime notification arrives,
  // so the bell knows to refetch.
  realtimeSignal: number;
}

export default function NotificationBell({ userId, realtimeSignal }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.notifications);
        setUnread(data.unreadCount);
      }
    } catch (e) {
      console.error("Fetch notifications error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  // Re-fetch and pulse when a realtime notification arrives
  useEffect(() => {
    if (realtimeSignal > 0) {
      fetchNotifications();
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeSignal]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    if (!userId) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read", userId }),
    });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markOneRead = async (id: number) => {
    if (!userId) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", userId, notificationId: id }),
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all ${
          pulse ? "animate-bounce" : ""
        }`}
      >
        <Bell className={`w-4.5 h-4.5 ${unread > 0 ? "text-amber-400" : "text-slate-300"}`} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md border border-slate-900">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl z-50 animate-fadeIn overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-black text-white">Notifications</h4>
              {unread > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {loading && items.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm animate-pulse">Loading…</div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center px-6">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm font-bold text-slate-300">No notifications yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  React, comment, DM, or refer friends to see live activity here.
                </p>
              </div>
            ) : (
              items.map((n) => {
                let timeStr = "just now";
                try {
                  if (n.createdAt) timeStr = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true });
                } catch {}
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markOneRead(n.id)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-slate-800/60 cursor-pointer transition-all ${
                      n.isRead ? "bg-transparent hover:bg-slate-800/40" : "bg-indigo-950/30 hover:bg-indigo-950/50"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {n.actorAvatar ? (
                        <img
                          src={n.actorAvatar}
                          alt={n.actorName || ""}
                          className="w-9 h-9 rounded-full object-cover border border-slate-600"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-base">
                          {n.iconEmoji || "🔔"}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 text-xs">{n.iconEmoji || "🔔"}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-white leading-tight">{n.title}</p>
                      <p className="text-xs text-slate-300 mt-0.5 leading-snug break-words">{n.message}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{timeStr}</p>
                    </div>

                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
