"use client";

import React, { useEffect, useState } from "react";
import { PostItem, User } from "@/types";
import { 
  MessageSquare, 
  Share2, 
  Heart, 
  Sparkles, 
  Plus, 
  Send, 
  Check, 
  Zap, 
  Copy, 
  Image as ImageIcon,
  Code,
  BarChart2,
  Video,
  CheckCircle2,
  Terminal,
  Bookmark,
  BookmarkCheck,
  UsersRound,
  Mail,
  SendHorizontal,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  currentUser: User | null;
  posts: PostItem[];
  onRefreshPosts: () => void;
  onReward: (rewardData: any) => void;
  onShowToast: (msg: string, pts?: number, err?: boolean) => void;
}

const REACTIONS_MAP = [
  { key: "like", label: "Like", emoji: "👍", color: "text-blue-400" },
  { key: "love", label: "Love", emoji: "❤️", color: "text-rose-400" },
  { key: "celebrate", label: "Celebrate", emoji: "🎉", color: "text-amber-400" },
  { key: "fire", label: "Fire", emoji: "🔥", color: "text-orange-500" },
  { key: "mindblown", label: "Mindblown", emoji: "🤯", color: "text-purple-400" },
];

export default function CommunityStream({
  currentUser,
  posts,
  onRefreshPosts,
  onReward,
  onShowToast,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create post states
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("Ideas");
  const [posting, setPosting] = useState(false);

  // Rich Media states
  const [mediaTypeOption, setMediaTypeOption] = useState<"none" | "image" | "code" | "poll" | "video">("none");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [codeSnippetInput, setCodeSnippetInput] = useState("");
  const [codeLangInput, setCodeLangInput] = useState("javascript");
  const [pollQuestionInput, setPollQuestionInput] = useState("");
  const [pollOptionA, setPollOptionA] = useState("Yes, absolutely!");
  const [pollOptionB, setPollOptionB] = useState("Needs more testing");
  const [pollOptionC, setPollOptionC] = useState("Not yet");

  // Comment & interaction states
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState<Record<number, string>>({});
  const [commentingPostId, setCommentingPostId] = useState<number | null>(null);

  // Share, save, and feed-scope state
  const [shareDropdownPostId, setShareDropdownPostId] = useState<number | null>(null);
  const [feedScope, setFeedScope] = useState<"all" | "following" | "saved">("all");
  const [scopedPosts, setScopedPosts] = useState<PostItem[]>([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [savingPostIds, setSavingPostIds] = useState<number[]>([]);

  const categories = ["All", "Ideas", "Show & Tell", "Announcements", "Tutorials", "General"];
  const visiblePosts = feedScope === "all" ? posts : scopedPosts;
  const filteredPosts = selectedCategory === "All"
    ? visiblePosts
    : visiblePosts.filter((p) => p.category === selectedCategory);

  const loadScopedFeed = async (scope = feedScope) => {
    if (scope === "all") {
      await onRefreshPosts();
      return;
    }
    setLoadingScope(true);
    try {
      const res = await fetch(`/api/posts?feed=${scope}`);
      const data = await res.json();
      if (data.success) {
        setScopedPosts(data.posts || []);
      } else {
        onShowToast(data.error || "Could not load this feed.", undefined, true);
      }
    } catch {
      onShowToast("Could not load this feed.", undefined, true);
    } finally {
      setLoadingScope(false);
    }
  };

  useEffect(() => {
    if (feedScope === "all") return;
    // Schedule the network state transition after the current render commits.
    // This also lets a quick scope change cancel an obsolete request.
    const timer = window.setTimeout(() => {
      void loadScopedFeed(feedScope);
    }, 0);
    return () => window.clearTimeout(timer);
    // The scope drives the request; other dependencies are intentionally read
    // at call time to avoid refetching every time the global feed refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedScope]);

  const changeFeedScope = (scope: "all" | "following" | "saved") => {
    if (scope !== "all" && !currentUser) {
      onShowToast("Sign in to view your Following and Saved feeds.", undefined, true);
      return;
    }
    setFeedScope(scope);
  };

  const refreshVisibleFeed = async () => {
    await loadScopedFeed();
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onShowToast("Please select an active profile first", undefined, true);
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      onShowToast("Title and post body cannot be empty", undefined, true);
      return;
    }

    let mediaUrlToSend = null;
    let codeSnippetToSend = null;
    let pollQuestionToSend = null;
    let pollOptionsToSend: string[] | null = null;

    if (mediaTypeOption === "image" || mediaTypeOption === "video") {
      if (!mediaFile) {
        onShowToast(`Choose a ${mediaTypeOption} from your device first.`, undefined, true);
        return;
      }
      setUploadingMedia(true);
      try {
        const uploadData = new FormData();
        uploadData.set("file", mediaFile);
        const uploadRes = await fetch("/api/uploads", { method: "POST", body: uploadData });
        const upload = await uploadRes.json();
        if (!upload.success) {
          onShowToast(upload.error || "Media upload failed.", undefined, true);
          return;
        }
        mediaUrlToSend = upload.url;
      } catch {
        onShowToast("Media upload failed. Please try again.", undefined, true);
        return;
      } finally {
        setUploadingMedia(false);
      }
    } else if (mediaTypeOption === "code" && codeSnippetInput.trim()) {
      codeSnippetToSend = codeSnippetInput.trim();
    } else if (mediaTypeOption === "poll") {
      pollQuestionToSend = pollQuestionInput.trim() || newTitle.trim();
      pollOptionsToSend = [pollOptionA.trim(), pollOptionB.trim(), pollOptionC.trim()].filter(Boolean);
    }

    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          title: newTitle.trim(),
          content: newContent.trim(),
          category: newCategory,
          mediaUrl: mediaUrlToSend,
          mediaType: mediaTypeOption === "none" ? null : mediaTypeOption,
          codeSnippet: codeSnippetToSend,
          codeLanguage: codeLangInput,
          pollQuestion: pollQuestionToSend,
          pollOptions: pollOptionsToSend,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewTitle("");
        setNewContent("");
        setMediaFile(null);
        setCodeSnippetInput("");
        setMediaTypeOption("none");
        await refreshVisibleFeed();
        if (data.reward) {
          onReward(data.reward);
        }
      } else {
        onShowToast(data.error || "Failed to create post", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setPosting(false);
    }
  };

  const handleVotePoll = async (postId: number, option: string) => {
    if (!currentUser) {
      onShowToast("Please select an active profile first", undefined, true);
      return;
    }
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote_poll",
          postId,
          userId: currentUser.id,
          option,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshVisibleFeed();
        if (data.reward && data.reward.pointsAwarded > 0) {
          onReward(data.reward);
        } else {
          onShowToast(data.message || "Voted successfully!");
        }
      } else {
        onShowToast(data.error || "Vote failed", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    }
  };

  const handleReact = async (postId: number, reactionType: string) => {
    if (!currentUser) {
      onShowToast("Please select an active profile first", undefined, true);
      return;
    }
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "react",
          postId,
          userId: currentUser.id,
          reactionType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshVisibleFeed();
        if (data.reward && data.reward.pointsAwarded > 0) {
          onReward(data.reward);
        } else if (data.message) {
          onShowToast(data.message);
        }
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    }
  };

  const openShareDestination = (post: PostItem, platform: string) => {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const sharedText = `${post.title} — via VibePulse`;
    const url = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(sharedText);

    if (platform === "copy_link") {
      navigator.clipboard?.writeText(shareUrl);
      onShowToast("Share link copied to your clipboard.");
      return;
    }
    if (platform === "native") {
      if (navigator.share) {
        navigator.share({ title: post.title, text: sharedText, url: shareUrl }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(shareUrl);
        onShowToast("Your browser does not support native sharing, so the link was copied instead.");
      }
      return;
    }

    const destinations: Record<string, string> = {
      x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${sharedText} ${shareUrl}`)}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      email: `mailto:?subject=${text}&body=${encodeURIComponent(`${sharedText}\n\n${shareUrl}`)}`,
    };
    const destination = destinations[platform];
    if (destination) window.open(destination, "_blank", "noopener,noreferrer");
  };

  const handleShare = async (post: PostItem, platform: string) => {
    if (!currentUser) {
      onShowToast("Please select an active profile first", undefined, true);
      return;
    }
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "share",
          postId: post.id,
          platform,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShareDropdownPostId(null);
        openShareDestination(post, platform);
        await refreshVisibleFeed();
        if (data.reward) {
          onReward(data.reward);
        }
      } else {
        onShowToast(data.error || "Share could not be recorded.", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    }
  };

  const handleSavePost = async (post: PostItem) => {
    if (!currentUser) {
      onShowToast("Sign in to save posts to your private library.", undefined, true);
      return;
    }
    if (savingPostIds.includes(post.id)) return;

    setSavingPostIds((ids) => [...ids, post.id]);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_save", postId: post.id }),
      });
      const data = await res.json();
      if (!data.success) {
        onShowToast(data.error || "Could not update your saved posts.", undefined, true);
        return;
      }

      if (feedScope === "all") {
        // The global list is parent-owned, so update its local presentation
        // after a fresh response rather than mutating a prop.
        await onRefreshPosts();
      } else if (feedScope === "saved" && !data.isBookmarked) {
        setScopedPosts((items) => items.filter((item) => item.id !== post.id));
      } else {
        setScopedPosts((items) => items.map((item) => item.id === post.id ? { ...item, isBookmarked: data.isBookmarked } : item));
      }
      onShowToast(data.message || "Saved posts updated.");
    } catch {
      onShowToast("Could not update your saved posts.", undefined, true);
    } finally {
      setSavingPostIds((ids) => ids.filter((id) => id !== post.id));
    }
  };

  const handleComment = async (postId: number) => {
    if (!currentUser) {
      onShowToast("Please select an active profile first", undefined, true);
      return;
    }
    const text = commentInput[postId]?.trim();
    if (!text) {
      onShowToast("Please enter a comment to post", undefined, true);
      return;
    }

    setCommentingPostId(postId);
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          postId,
          userId: currentUser.id,
          content: text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCommentInput((prev) => ({ ...prev, [postId]: "" }));
        await refreshVisibleFeed();
        if (data.reward) {
          onReward(data.reward);
        }
      } else {
        onShowToast(data.error || "Failed to post comment", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setCommentingPostId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-6">
      {/* Top Header & Action Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16,1,0.3,1] as any }}
        className="glass-strong rounded-[28px] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.4)] text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5 shadow-sm">
              <Zap className="w-3.5 h-3.5 fill-current text-amber-400" /> +50 Pts Per Post
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              +25 Comments • +10 Reactions • +30 Shares
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse">Live Feed</span>
          </div>
          <h2 className="text-2xl sm:text-[30px] font-black tracking-tight text-white leading-[1.1]">
            Community Activity & Feed Stream
          </h2>
          <p className="mt-2.5 text-[13px] sm:text-sm text-slate-300 font-medium leading-relaxed">
            Share ideas, tutorials, and show-offs with rich media — images, code blocks, polls & video. Every engagement awards loyalty points and progresses daily quests!
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreateModal(true)}
          className="relative z-10 w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-rose-500 hover:shadow-[0_8px_32px_rgba(99,102,241,0.45)] text-white font-black shadow-lg transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Publish Post (+50 pts)</span>
        </motion.button>
      </motion.div>

      {/* Feed scope and topic filters */}
      <div className="space-y-4 border-b border-slate-800 pb-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-1 sm:w-auto">
            {[
              { id: "all" as const, label: "Community", icon: Sparkles },
              { id: "following" as const, label: "Following", icon: UsersRound },
              { id: "saved" as const, label: "Saved", icon: Bookmark },
            ].map((scope) => {
              const active = feedScope === scope.id;
              return (
                <button
                  key={scope.id}
                  onClick={() => changeFeedScope(scope.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition sm:flex-none ${active ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                >
                  <scope.icon className="h-3.5 w-3.5" /> {scope.label}
                </button>
              );
            })}
          </div>
          <div className="text-xs font-medium text-slate-400">
            {loadingScope ? "Refreshing feed…" : <>Showing <span className="font-bold text-white">{filteredPosts.length}</span> posts</>}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="mr-2 hidden text-xs font-bold uppercase tracking-wider text-slate-400 sm:inline">Filter topic:</span>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-xl border px-4 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "border-indigo-400/30 bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "border-slate-800 bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Posts List */}
      <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }} className="space-y-5">
        {filteredPosts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-12 text-center max-w-lg mx-auto border border-slate-800/80">
            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-200">
              {feedScope === "following" ? "Your Following feed is quiet" : feedScope === "saved" ? "No saved posts in this view" : "No posts in this topic yet"}
            </h3>
            <p className="text-sm text-slate-400 mt-1 mb-6">
              {feedScope === "following" ? "Visit a member profile and follow creators whose updates you want to see here." : feedScope === "saved" ? "Use the bookmark button on any valuable post to build your private reading list." : "Be the trailblazer! Post the first update in this category to earn +50 points instantly."}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-500 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create First Post
            </button>
          </motion.div>
        ) : (
          filteredPosts.map((post) => {
            const isExpanded = expandedPostId === post.id;
            const hasReacted = currentUser && post.reactedUserIds?.includes(currentUser.id);
            const isShareOpen = shareDropdownPostId === post.id;

            let timeAgo = "recently";
            try {
              if (post.createdAt) {
                timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
              }
            } catch (e) {
              timeAgo = "recently";
            }

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16,1,0.3,1] as any }}
                whileHover={{ y: -2 }}
                className="glass hover:border-slate-700/80 rounded-[24px] p-6 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-200 text-slate-100"
              >
                {/* Author & Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={post.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorUsername}`}
                      alt={post.authorName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-600 shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm sm:text-base text-white hover:underline cursor-pointer">
                          {post.authorName}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">@{post.authorUsername}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-slate-400">{timeAgo}</span>
                      </div>
                      <div className="mt-0.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                          {post.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/70 text-xs font-semibold text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span>Active Stream</span>
                  </div>
                </div>

                {/* Content */}
                <div className="mt-4 sm:mt-5">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                    {post.content}
                  </p>

                  {/* Rich Media: Image Upload */}
                  {(post.mediaType === "image" || (!post.mediaType && post.mediaUrl)) && post.mediaUrl && (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/50 max-h-96">
                      <img src={post.mediaUrl} alt="Post attachment" className="w-full h-full object-cover max-h-96" />
                    </div>
                  )}

                  {/* Rich Media: Device Video */}
                  {post.mediaType === "video" && post.mediaUrl && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950">
                      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2 text-xs font-bold text-indigo-300">
                        <Video className="w-4 h-4" /> Device video attachment
                      </div>
                      <video src={post.mediaUrl} controls playsInline preload="metadata" className="max-h-[520px] w-full bg-black" />
                    </div>
                  )}

                  {/* Rich Media: Code Snippet Block */}
                  {post.codeSnippet && (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 font-mono text-xs shadow-inner">
                      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="uppercase text-[11px]">{post.codeLanguage || "code"} snippet</span>
                        </span>
                        <span className="text-[10px] text-slate-500">Read-Only</span>
                      </div>
                      <pre className="p-4 overflow-x-auto text-emerald-300 leading-relaxed">
                        <code>{post.codeSnippet}</code>
                      </pre>
                    </div>
                  )}

                  {/* Rich Media: Interactive Poll */}
                  {post.pollOptions && post.pollOptions.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-950/80 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                          <BarChart2 className="w-4 h-4" />
                          <span>Interactive Community Poll</span>
                        </span>
                        <span className="text-[11px] font-bold text-amber-400">+20 Pts to vote</span>
                      </div>
                      <h4 className="font-extrabold text-sm sm:text-base text-white">
                        {post.pollQuestion || "What do you think?"}
                      </h4>

                      <div className="space-y-2 pt-1">
                        {post.pollOptions.map((opt) => {
                          const votesRecord = post.pollVotes || {};
                          const totalVotes = Object.values(votesRecord).reduce((a, b) => a + Number(b || 0), 0) || 1;
                          const optVotes = Number(votesRecord[opt] || 0);
                          const pct = Math.round((optVotes / totalVotes) * 100);

                          return (
                            <button
                              key={opt}
                              onClick={() => handleVotePoll(post.id, opt)}
                              className="w-full relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900/90 hover:border-indigo-500 transition-all p-3 text-left group"
                            >
                              <div
                                className="absolute inset-y-0 left-0 bg-indigo-600/30 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm font-bold text-white">
                                <span>{opt}</span>
                                <span className="text-slate-400 text-xs">
                                  {optVotes} votes ({pct}%)
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reactions Breakdown Badge strip */}
                {post.reactionsBreakdown && Object.keys(post.reactionsBreakdown).length > 0 && (
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    {Object.entries(post.reactionsBreakdown).map(([rType, rCount]) => {
                      const found = REACTIONS_MAP.find((m) => m.key === rType) || REACTIONS_MAP[0];
                      return (
                        <span
                          key={rType}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800/90 text-slate-200 border border-slate-700 shadow-xs"
                        >
                          <span>{found.emoji}</span>
                          <span className="text-slate-300 font-extrabold">{rCount}</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Action Bar (Reactions, Comment toggle, Share) */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4 flex-wrap">
                  {/* Reactions Toolbar */}
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    {REACTIONS_MAP.map((reaction) => (
                      <button
                        key={reaction.key}
                        onClick={() => handleReact(post.id, reaction.key)}
                        title={`React with ${reaction.label} (+10 pts)`}
                        className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/70 hover:bg-slate-700/80 hover:scale-105 transition-all text-slate-200 border border-slate-700/60 active:scale-95"
                      >
                        <span className="text-sm">{reaction.emoji}</span>
                        <span className="hidden md:inline text-[11px] text-slate-300 font-bold">{reaction.label}</span>
                        <span className="text-[9px] text-amber-400 font-extrabold opacity-80">+10</span>
                      </button>
                    ))}
                  </div>

                  {/* Comment & Share buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                        isExpanded || post.commentsCount > 0
                          ? "bg-indigo-900/30 text-indigo-300 border-indigo-500/40 hover:bg-indigo-900/50"
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <span>{post.commentsList?.length ?? post.commentsCount} Comments</span>
                      <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded ml-0.5">
                        +25 pts
                      </span>
                    </button>

                    <button
                      onClick={() => handleSavePost(post)}
                      disabled={savingPostIds.includes(post.id)}
                      title={post.isBookmarked ? "Remove from saved posts" : "Save to private library"}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-60 ${
                        post.isBookmarked
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                          : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {savingPostIds.includes(post.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : post.isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      <span className="hidden md:inline">{post.isBookmarked ? "Saved" : "Save"}</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setShareDropdownPostId(isShareOpen ? null : post.id)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-800/80 text-slate-300 hover:bg-slate-700/90 border border-slate-700 transition-all"
                      >
                        <Share2 className="w-4 h-4 text-emerald-400" />
                        <span>Share</span>
                        <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded ml-0.5">
                          +30 pts
                        </span>
                      </button>

                      {/* External share intents preserve platform-native flows. */}
                      {isShareOpen && (
                        <div className="absolute bottom-full right-0 z-30 mb-2 w-64 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl animate-fadeIn">
                          <div className="mb-1 border-b border-slate-800 px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-400">
                            Share externally · +30 points
                          </div>
                          <button onClick={() => handleShare(post, "copy_link")} className="w-full flex items-center gap-2.5 rounded-xl p-2 text-left text-xs font-bold text-slate-200 transition-all hover:bg-slate-800">
                            <Copy className="w-3.5 h-3.5 text-indigo-400" /> Copy direct link
                          </button>
                          <button onClick={() => handleShare(post, "native")} className="w-full flex items-center gap-2.5 rounded-xl p-2 text-left text-xs font-bold text-slate-200 transition-all hover:bg-slate-800">
                            <SendHorizontal className="w-3.5 h-3.5 text-violet-400" /> Device share sheet
                          </button>
                          <div className="my-1 grid grid-cols-2 gap-1 border-t border-slate-800 pt-2">
                            <button onClick={() => handleShare(post, "whatsapp")} className="rounded-xl p-2 text-left text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/10">🟢 WhatsApp</button>
                            <button onClick={() => handleShare(post, "telegram")} className="rounded-xl p-2 text-left text-[11px] font-bold text-sky-300 transition hover:bg-sky-500/10">✈️ Telegram</button>
                            <button onClick={() => handleShare(post, "x")} className="rounded-xl p-2 text-left text-[11px] font-bold text-slate-200 transition hover:bg-slate-800">𝕏 X</button>
                            <button onClick={() => handleShare(post, "linkedin")} className="rounded-xl p-2 text-left text-[11px] font-bold text-blue-300 transition hover:bg-blue-500/10">in LinkedIn</button>
                            <button onClick={() => handleShare(post, "facebook")} className="rounded-xl p-2 text-left text-[11px] font-bold text-indigo-300 transition hover:bg-indigo-500/10">f Facebook</button>
                            <button onClick={() => handleShare(post, "email")} className="rounded-xl p-2 text-left text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/10"><Mail className="mr-1 inline h-3.5 w-3.5" />Email</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Comments Section */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-slate-800 space-y-5 bg-slate-950/40 -mx-6 -mb-6 p-6 sm:rounded-b-3xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Discussion Replies & Contributions</span>
                    </h4>

                    {/* Comment Input Form */}
                    <div className="flex items-start gap-3">
                      <img
                        src={
                          currentUser?.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || "user"}`
                        }
                        alt="my avatar"
                        className="w-9 h-9 rounded-full object-cover border border-slate-600 flex-shrink-0 mt-1"
                      />
                      <div className="flex-1">
                        <textarea
                          rows={2}
                          value={commentInput[post.id] || ""}
                          onChange={(e) => setCommentInput({ ...commentInput, [post.id]: e.target.value })}
                          placeholder={`Write a thoughtful comment as ${currentUser ? currentUser.name : "Guest"} to earn +25 points...`}
                          className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all resize-none shadow-inner"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-current" /> Award: +25 Points per reply
                          </span>
                          <button
                            onClick={() => handleComment(post.id)}
                            disabled={commentingPostId === post.id}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {commentingPostId === post.id ? (
                              <span>Posting...</span>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Post Reply (+25 Pts)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Existing Comments List */}
                    <div className="space-y-3 pt-2">
                      {(!post.commentsList || post.commentsList.length === 0) ? (
                        <div className="text-xs text-slate-400 text-center py-4 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                          No comments yet. Start the conversation above!
                        </div>
                      ) : (
                        post.commentsList.map((c) => {
                          let cTime = "recently";
                          try {
                            if (c.createdAt) {
                              cTime = formatDistanceToNow(new Date(c.createdAt), { addSuffix: true });
                            }
                          } catch (e) {}

                          return (
                            <div key={c.id} className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-sm">
                              <img
                                src={c.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.authorUsername}`}
                                alt={c.authorName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-600 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-white text-xs sm:text-sm">{c.authorName}</span>
                                  <span className="text-[11px] text-slate-400">@{c.authorUsername}</span>
                                  <span className="text-[11px] text-slate-400">• {cTime}</span>
                                </div>
                                <p className="mt-1 text-slate-200 text-xs sm:text-sm leading-relaxed">{c.content}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Create New Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-100 animate-scaleUp">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 font-bold">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white">Publish Community Post</h3>
                <p className="text-xs text-slate-400">Earn <strong className="text-amber-400">+50 loyalty points</strong> upon publishing</p>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1">Post Title or Topic</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. My top learnings after releasing our gamification engine!"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1">Topic Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Ideas">💡 Ideas & Innovations</option>
                  <option value="Show & Tell">🚀 Show & Tell / Projects</option>
                  <option value="Announcements">📣 Announcements & Milestones</option>
                  <option value="Tutorials">📚 Tutorials & Guides</option>
                  <option value="General">💬 General Community Discussion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1">Content Body</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write out your thoughts, links, code ideas, or questions for peers to comment and react to..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              {/* Rich Media Attachment Picker */}
              <div className="border border-slate-700 rounded-2xl p-4 bg-slate-950/60 space-y-3">
                <label className="block text-xs font-extrabold uppercase text-slate-300">
                  Attach Rich Media (optional)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {([
                    { key: "none", label: "Text Only", icon: <MessageSquare className="w-3.5 h-3.5" /> },
                    { key: "image", label: "Image", icon: <ImageIcon className="w-3.5 h-3.5" /> },
                    { key: "video", label: "Video", icon: <Video className="w-3.5 h-3.5" /> },
                    { key: "code", label: "Code Block", icon: <Code className="w-3.5 h-3.5" /> },
                    { key: "poll", label: "Poll", icon: <BarChart2 className="w-3.5 h-3.5" /> },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setMediaTypeOption(opt.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        mediaTypeOption === opt.key
                          ? "bg-indigo-600 text-white border-indigo-400/40 shadow-md"
                          : "bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>

                {(mediaTypeOption === "image" || mediaTypeOption === "video") && (
                  <label className="block rounded-xl border border-dashed border-indigo-500/50 bg-indigo-500/5 p-3.5 text-center transition hover:bg-indigo-500/10 cursor-pointer">
                    <input
                      type="file"
                      accept={mediaTypeOption === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "video/mp4,video/webm,video/quicktime"}
                      onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                      className="sr-only"
                    />
                    <span className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-200">
                      {mediaTypeOption === "image" ? <ImageIcon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      {mediaFile ? mediaFile.name : `Choose ${mediaTypeOption} from device`}
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-400">
                      {mediaTypeOption === "image" ? "JPG, PNG, WebP or GIF · up to 10 MB" : "MP4, WebM or MOV · up to 45 MB"}
                    </span>
                  </label>
                )}

                {mediaTypeOption === "code" && (
                  <div className="space-y-2">
                    <select
                      value={codeLangInput}
                      onChange={(e) => setCodeLangInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="sql">SQL</option>
                      <option value="bash">Bash</option>
                    </select>
                    <textarea
                      rows={4}
                      value={codeSnippetInput}
                      onChange={(e) => setCodeSnippetInput(e.target.value)}
                      placeholder={"const awardPoints = (user) => user.points + 50;"}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                )}

                {mediaTypeOption === "poll" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={pollQuestionInput}
                      onChange={(e) => setPollQuestionInput(e.target.value)}
                      placeholder="Poll question (defaults to your post title)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={pollOptionA}
                      onChange={(e) => setPollOptionA(e.target.value)}
                      placeholder="Option A"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={pollOptionB}
                      onChange={(e) => setPollOptionB(e.target.value)}
                      placeholder="Option B"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={pollOptionC}
                      onChange={(e) => setPollOptionC(e.target.value)}
                      placeholder="Option C (optional)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400 fill-current animate-pulse" />
                  Instant Activity Bounty:
                </span>
                <span className="text-base font-extrabold text-amber-400">+50 Points</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting || uploadingMedia}
                  className="px-7 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 font-extrabold text-sm text-white rounded-2xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {uploadingMedia ? "Uploading media…" : posting ? "Publishing..." : "Publish Now ✨"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
