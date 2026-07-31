"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Filter,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { IdeaImpact, IdeaItem, IdeaStatus, User } from "@/types";

interface Props {
  currentUser: User | null;
  refreshSignal?: number;
  onReward: (rewardData: any) => void;
  onShowToast: (message: string, points?: number, isError?: boolean) => void;
}

const CATEGORIES = ["All", "Product", "Experience", "Community", "Onboarding", "Rewards", "Integrations", "Other"];
const STATUS_FILTERS = ["All", "open", "planned", "in_progress", "shipped", "declined"] as const;
const ROADMAP_STATUSES: IdeaStatus[] = ["open", "planned", "in_progress", "shipped", "declined"];

const STATUS_META: Record<IdeaStatus, { label: string; dot: string; badge: string }> = {
  open: {
    label: "Open for feedback",
    dot: "bg-sky-400",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  planned: {
    label: "Planned",
    dot: "bg-violet-400",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
  in_progress: {
    label: "In progress",
    dot: "bg-amber-400",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  shipped: {
    label: "Shipped",
    dot: "bg-emerald-400",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  declined: {
    label: "Not planned",
    dot: "bg-slate-500",
    badge: "border-slate-600 bg-slate-800/70 text-slate-400",
  },
};

const IMPACT_META: Record<IdeaImpact, { label: string; className: string }> = {
  low: { label: "Low impact", className: "text-slate-400" },
  medium: { label: "Medium impact", className: "text-indigo-300" },
  high: { label: "High impact", className: "text-rose-300" },
};

function relativeTime(value: string) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "recently";
  }
}

export default function IdeasHub({ currentUser, refreshSignal = 0, onReward, onShowToast }: Props) {
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [sort, setSort] = useState<"popular" | "recent">("popular");
  const [showComposer, setShowComposer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingIds, setVotingIds] = useState<number[]>([]);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "", category: "Product", impact: "medium" as IdeaImpact });

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (category !== "All") params.set("category", category);
      if (status !== "All") params.set("status", status);
      if (search.trim()) params.set("q", search.trim());

      const response = await fetch(`/api/ideas?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setIdeas(data.ideas || []);
      } else {
        onShowToast(data.error || "Could not load the ideas backlog.", undefined, true);
      }
    } catch {
      onShowToast("Could not connect to the ideas backlog.", undefined, true);
    } finally {
      setLoading(false);
    }
  }, [category, onShowToast, search, sort, status]);

  useEffect(() => {
    // Let a search phrase settle before requesting a new ranked list.
    const timer = window.setTimeout(fetchIdeas, search.trim() ? 260 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchIdeas, refreshSignal, search]);

  const roadmapCounts = useMemo(
    () => ({
      open: ideas.filter((idea) => idea.status === "open").length,
      active: ideas.filter((idea) => idea.status === "planned" || idea.status === "in_progress").length,
      shipped: ideas.filter((idea) => idea.status === "shipped").length,
    }),
    [ideas]
  );

  const submitIdea = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) {
      onShowToast("Sign in to submit a product idea.", undefined, true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!data.success) {
        onShowToast(data.error || "Your idea could not be submitted.", undefined, true);
        return;
      }

      setDraft({ title: "", description: "", category: "Product", impact: "medium" });
      setShowComposer(false);
      await fetchIdeas();
      if (data.reward) onReward(data.reward);
      else onShowToast("Idea submitted for community feedback.");
    } catch {
      onShowToast("Your idea could not be submitted. Please try again.", undefined, true);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVote = async (idea: IdeaItem) => {
    if (!currentUser) {
      onShowToast("Sign in to vote on roadmap ideas.", undefined, true);
      return;
    }
    if (votingIds.includes(idea.id)) return;

    setVotingIds((ids) => [...ids, idea.id]);
    try {
      const response = await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_vote", ideaId: idea.id }),
      });
      const data = await response.json();
      if (!data.success) {
        onShowToast(data.error || "Vote could not be updated.", undefined, true);
        return;
      }

      setIdeas((items) =>
        items.map((item) =>
          item.id === idea.id ? { ...item, hasVoted: data.hasVoted, voteCount: data.voteCount } : item
        )
      );
    } catch {
      onShowToast("Vote could not be updated. Please try again.", undefined, true);
    } finally {
      setVotingIds((ids) => ids.filter((id) => id !== idea.id));
    }
  };

  const updateStatus = async (idea: IdeaItem, nextStatus: IdeaStatus) => {
    if (nextStatus === idea.status || updatingId === idea.id) return;

    setUpdatingId(idea.id);
    try {
      const response = await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", ideaId: idea.id, status: nextStatus }),
      });
      const data = await response.json();
      if (!data.success) {
        onShowToast(data.error || "Roadmap status could not be updated.", undefined, true);
        return;
      }
      setIdeas((items) =>
        items.map((item) => (item.id === idea.id ? { ...item, status: data.idea.status, updatedAt: data.idea.updatedAt } : item))
      );
      onShowToast("Roadmap status updated.");
    } catch {
      onShowToast("Roadmap status could not be updated.", undefined, true);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300">
              <Lightbulb className="h-3.5 w-3.5" /> Member-led product feedback
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Ideas Hub &amp; Public Roadmap</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              Turn community feedback into visible product decisions. Submit a well-framed idea, vote for the
              improvements that matter most, and follow every idea from discovery to delivery.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <button
              onClick={() => (currentUser ? setShowComposer(true) : onShowToast("Sign in to submit a product idea.", undefined, true))}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-950/60 transition hover:brightness-110 active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" /> Submit an idea
            </button>
            <button
              onClick={fetchIdeas}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="relative mt-7 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 sm:max-w-2xl">
          {[
            { label: "Open for votes", value: roadmapCounts.open, icon: CircleDot, color: "text-sky-300" },
            { label: "On the roadmap", value: roadmapCounts.active, icon: Target, color: "text-amber-300" },
            { label: "Shipped", value: roadmapCounts.shipped, icon: Check, color: "text-emerald-300" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3 backdrop-blur-sm sm:p-4">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <div className="mt-2 text-2xl font-black text-white">{stat.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ideas, problems, or contributors…"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <label className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter ideas by category"
                className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 py-3 pl-8 pr-7 text-xs font-bold text-slate-300 outline-none transition hover:border-slate-600 focus:border-indigo-500 sm:w-auto"
              >
                {CATEGORIES.map((option) => <option key={option}>{option}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            </label>
            <label className="relative">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as (typeof STATUS_FILTERS)[number])}
                aria-label="Filter ideas by status"
                className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 pr-7 text-xs font-bold capitalize text-slate-300 outline-none transition hover:border-slate-600 focus:border-indigo-500 sm:w-auto"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option} value={option}>{option === "All" ? "All statuses" : option.replace(/_/g, " ")}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            </label>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-800 pt-4">
          <span className="text-xs font-medium text-slate-500">Ranked by community signal and roadmap momentum</span>
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1">
            {([
              ["popular", "Most voted"],
              ["recent", "Newest"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${sort === value ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="h-4 w-28 rounded bg-slate-800" />
              <div className="mt-4 h-6 w-3/5 rounded bg-slate-800" />
              <div className="mt-3 h-3 w-full rounded bg-slate-800" />
              <div className="mt-2 h-3 w-4/5 rounded bg-slate-800" />
            </div>
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
            <Lightbulb className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-black text-white">No ideas match this view</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">Try a different filter, or be the first person to frame an improvement for the community.</p>
          <button onClick={() => setShowComposer(true)} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-indigo-300 hover:text-indigo-200">
            <Plus className="h-4 w-4" /> Submit an idea
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea) => {
            const statusMeta = STATUS_META[idea.status];
            const impactMeta = IMPACT_META[idea.impact];
            const avatar = idea.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${idea.authorUsername}`;
            const isVoting = votingIds.includes(idea.id);

            return (
              <article key={idea.id} className="group rounded-3xl border border-slate-800 bg-slate-900/85 p-4 shadow-xl transition hover:border-slate-700 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row">
                  <button
                    onClick={() => toggleVote(idea)}
                    disabled={isVoting}
                    aria-label={idea.hasVoted ? `Remove vote from ${idea.title}` : `Vote for ${idea.title}`}
                    className={`flex min-w-[76px] flex-row items-center justify-center gap-2 self-start rounded-2xl border px-3 py-2.5 transition sm:flex-col sm:gap-1.5 sm:py-3 ${
                      idea.hasVoted
                        ? "border-indigo-400/45 bg-indigo-500/20 text-indigo-200"
                        : "border-slate-700 bg-slate-950 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-200"
                    } disabled:cursor-wait disabled:opacity-60`}
                  >
                    {isVoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className={`h-4 w-4 ${idea.hasVoted ? "fill-current" : ""}`} />}
                    <span className="text-base font-black leading-none">{idea.voteCount}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider">{idea.hasVoted ? "Voted" : "Votes"}</span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusMeta.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} /> {statusMeta.label}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{idea.category}</span>
                      <span className={`text-[11px] font-bold ${impactMeta.className}`}>{impactMeta.label}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black leading-snug text-white sm:text-xl">{idea.title}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">{idea.description}</p>

                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400">
                        <img src={avatar} alt="" className="h-7 w-7 rounded-full border border-slate-700 object-cover" />
                        <span><strong className="font-bold text-slate-300">{idea.authorName}</strong> · @{idea.authorUsername}</span>
                        <span className="hidden items-center gap-1 sm:inline-flex"><Clock3 className="h-3.5 w-3.5" /> {relativeTime(idea.createdAt)}</span>
                      </div>

                      {currentUser?.role === "admin" ? (
                        <label className="relative inline-flex items-center self-start sm:self-auto">
                          <span className="mr-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Roadmap</span>
                          <select
                            value={idea.status}
                            disabled={updatingId === idea.id}
                            onChange={(event) => updateStatus(idea, event.target.value as IdeaStatus)}
                            aria-label={`Update status for ${idea.title}`}
                            className="appearance-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 pr-8 text-[11px] font-bold capitalize text-slate-300 outline-none transition hover:border-indigo-500 disabled:opacity-50"
                          >
                            {ROADMAP_STATUSES.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute bottom-2.5 right-2.5 h-3.5 w-3.5 text-slate-500" />
                        </label>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-500">Updated {relativeTime(idea.updatedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="idea-composer-title"
          >
            <motion.form
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={submitIdea}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-[28px] sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300"><Sparkles className="h-4 w-4" /> Shape the next release</div>
                  <h3 id="idea-composer-title" className="mt-1 text-2xl font-black text-white">Submit a product idea</h3>
                  <p className="mt-1 text-sm text-slate-400">Focus on the problem, who it helps, and the outcome you would like to see.</p>
                </div>
                <button type="button" onClick={() => setShowComposer(false)} aria-label="Close idea composer" className="rounded-xl border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Clear title <span className="text-rose-300">*</span></span>
                  <input
                    required
                    minLength={8}
                    maxLength={140}
                    value={draft.title}
                    onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
                    placeholder="e.g. Let members save their preferred feed view"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                  <span className="mt-1 block text-right text-[10px] text-slate-500">{draft.title.length}/140</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Problem and proposed outcome <span className="text-rose-300">*</span></span>
                  <textarea
                    required
                    minLength={20}
                    maxLength={2400}
                    rows={6}
                    value={draft.description}
                    onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
                    placeholder="Describe the friction today, who it affects, and what a better experience looks like."
                    className="w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                  <span className="mt-1 block text-right text-[10px] text-slate-500">{draft.description.length}/2,400</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Area</span>
                    <select value={draft.category} onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-bold text-slate-300 outline-none focus:border-indigo-500">
                      {CATEGORIES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">Expected impact</span>
                    <select value={draft.impact} onChange={(event) => setDraft((value) => ({ ...value, impact: event.target.value as IdeaImpact }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-bold text-slate-300 outline-none focus:border-indigo-500">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowComposer(false)} disabled={submitting} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white">Cancel</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-950/60 transition hover:brightness-110 disabled:opacity-60">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {submitting ? "Submitting…" : "Submit for feedback"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
