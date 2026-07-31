"use client";

import React, { useEffect, useState } from "react";
import { DirectConversationItem, DirectMessageItem, User } from "@/types";
import { Loader2, LockKeyhole, MessageCircle, Plus, Send, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRealtime } from "@/hooks/useRealtime";

interface Props { currentUser: User | null; allUsers: User[]; onShowToast: (message: string, points?: number, error?: boolean) => void; }

export default function PrivateMessages({ currentUser, allUsers, onShowToast }: Props) {
  const [conversations, setConversations] = useState<DirectConversationItem[]>([]);
  const [active, setActive] = useState<DirectConversationItem | null>(null);
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  const loadConversations = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch("/api/messages"); const data = await res.json();
      if (data.success) { setConversations(data.conversations); if (!active && data.conversations[0]) setActive(data.conversations[0]); }
    } catch { onShowToast("Could not load private messages.", undefined, true); }
    finally { setLoading(false); }
  };
  const loadMessages = async (conversationId: number) => {
    try { const res = await fetch(`/api/messages?conversationId=${conversationId}`); const data = await res.json(); if (data.success) setMessages(data.messages); } catch { onShowToast("Could not load this conversation.", undefined, true); }
  };
  useEffect(() => { const timer = window.setTimeout(() => void loadConversations(), 0); return () => window.clearTimeout(timer); }, [currentUser?.id]);
  useEffect(() => { if (!active) return; const timer = window.setTimeout(() => void loadMessages(active.id), 0); return () => window.clearTimeout(timer); }, [active?.id]);

  useRealtime(currentUser?.id, (event) => {
    if (event.type === "direct_message" && event.payload?.conversationId) {
      void loadConversations();
      if (active?.id === event.payload.conversationId && event.payload.message) setMessages((items) => items.some((item) => item.id === event.payload.message.id) ? items : [...items, event.payload.message]);
    }
  });

  const startConversation = async (partnerId: number) => {
    try {
      const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", partnerId }) });
      const data = await res.json();
      if (!data.success) return onShowToast(data.error || "Could not start a conversation.", undefined, true);
      const item: DirectConversationItem = { ...data.conversation, partner: data.partner, lastMessage: null, unreadCount: 0 };
      setConversations((items) => [item, ...items.filter((existing) => existing.id !== item.id)]); setActive(item); setShowCompose(false);
    } catch { onShowToast("Could not start a conversation.", undefined, true); }
  };
  const send = async (event: React.FormEvent) => {
    event.preventDefault(); if (!active || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", conversationId: active.id, content: draft.trim() }) });
      const data = await res.json();
      if (data.success) { setMessages((items) => [...items, data.message]); setDraft(""); void loadConversations(); } else onShowToast(data.error || "Message could not be sent.", undefined, true);
    } catch { onShowToast("Message could not be sent.", undefined, true); } finally { setSending(false); }
  };

  if (!currentUser) return <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-12 text-center text-slate-400">Sign in to use private messages.</div>;
  const available = allUsers.filter((user) => user.id !== currentUser.id);
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 rounded-3xl border border-indigo-500/25 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:flex-row sm:items-center">
      <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-300"><LockKeyhole className="h-4 w-4" /> Private conversations</div><h2 className="mt-2 text-3xl font-black text-white">Messages</h2><p className="mt-1 text-sm text-slate-300">One-to-one conversations are visible only to their two participants.</p></div>
      <button onClick={() => setShowCompose(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white"><Plus className="h-4 w-4" /> New message</button>
    </div>
    <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-slate-800 p-3 lg:border-b-0 lg:border-r">{loading ? <Loader2 className="m-6 h-5 w-5 animate-spin text-indigo-400" /> : conversations.length === 0 ? <p className="p-5 text-sm text-slate-500">No conversations yet.</p> : conversations.map((conversation) => <button key={conversation.id} onClick={() => setActive(conversation)} className={`mb-1 w-full rounded-2xl p-3 text-left ${active?.id === conversation.id ? "bg-indigo-600/20 text-white" : "text-slate-300 hover:bg-slate-800"}`}><div className="flex items-center gap-2"><img src={conversation.partner.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.partner.username}`} alt="" className="h-9 w-9 rounded-full" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{conversation.partner.name}</div><div className="truncate text-xs text-slate-400">{conversation.lastMessage || "Start a private chat"}</div></div>{(conversation.unreadCount || 0) > 0 && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black">{conversation.unreadCount}</span>}</div></button>)}</aside>
      <section className="flex min-h-[430px] flex-col">{active ? <><div className="flex items-center gap-3 border-b border-slate-800 p-4"><img src={active.partner.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${active.partner.username}`} alt="" className="h-10 w-10 rounded-full" /><div><div className="font-black text-white">{active.partner.name}</div><div className="text-xs text-emerald-300">Private · @{active.partner.username}</div></div></div><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message) => <div key={message.id} className={`max-w-[82%] rounded-2xl p-3 text-sm ${message.senderId === currentUser.id ? "ml-auto bg-indigo-600 text-white" : "bg-slate-800 text-slate-200"}`}><p>{message.content}</p><span className="mt-1 block text-[10px] opacity-60">{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span></div>)}</div><form onSubmit={send} className="flex gap-2 border-t border-slate-800 p-3"><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Write a private message…" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white" /><button disabled={sending} className="rounded-xl bg-indigo-600 px-4 text-white disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></form></> : <div className="m-auto text-center text-slate-500"><MessageCircle className="mx-auto mb-2 h-9 w-9" />Select or start a conversation.</div>}</section>
    </div>
    {showCompose && <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/80 p-4 backdrop-blur sm:items-center sm:justify-center"><div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6"><div className="flex items-center justify-between"><h3 className="font-black text-white">Message a member</h3><button onClick={() => setShowCompose(false)} className="text-slate-400">✕</button></div><div className="mt-4 max-h-80 space-y-1 overflow-y-auto">{available.map((user) => <button key={user.id} onClick={() => startConversation(user.id)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-800"><img src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="" className="h-9 w-9 rounded-full" /><span className="text-sm font-bold text-white">{user.name}<small className="ml-1 text-slate-500">@{user.username}</small></span></button>)}</div><p className="mt-4 flex items-center gap-1 text-[11px] text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Only you and the recipient can access these messages.</p></div></div>}
  </div>;
}
