"use client";

import React, { useState, useEffect } from "react";
import { User, ChatGroupItem, ChatMessageItem } from "@/types";
import {
  MessageSquare,
  Send,
  Plus,
  Users,
  Hash,
  Sparkles,
  Zap,
  RefreshCw,
  Search,
  Lock,
  Smile,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRealtime } from "@/hooks/useRealtime";
import CommunityRoster from "@/components/CommunityRoster";

interface Props {
  currentUser: User | null;
  allUsers: User[];
  onReward: (rewardData: any) => void;
  onShowToast: (msg: string, pts?: number, err?: boolean) => void;
}

export default function CommunityChat({ currentUser, allUsers, onReward, onShowToast }: Props) {
  const [groups, setGroups] = useState<ChatGroupItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroupItem | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputContent, setInputContent] = useState("");
  const [sending, setSending] = useState(false);

  // New Group Modal
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("Tech");
  const [isDirectChat, setIsDirectChat] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchGroups = async (autoSelectFirst = false) => {
    setLoadingGroups(true);
    try {
      const res = await fetch("/api/chat");
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups);
        if (autoSelectFirst && data.groups.length > 0 && !selectedGroup) {
          setSelectedGroup(data.groups[0]);
        }
      }
    } catch (e) {
      console.error("Fetch groups error:", e);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchMessages = async (groupId: number) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat?groupId=${groupId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error("Fetch messages error:", e);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchGroups(true);
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages(selectedGroup.id);
    }
  }, [selectedGroup?.id]);

  // Real-time: append incoming messages for the open channel without a refresh
  useRealtime(currentUser?.id, (msg) => {
    if (msg.type === "chat_message" && msg.payload?.scope === "group_message") {
      if (selectedGroup && msg.payload.groupId === selectedGroup.id && msg.payload.message) {
        const incoming = msg.payload.message as ChatMessageItem;
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      }
    }
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onShowToast("Please select an active persona first", undefined, true);
      return;
    }
    if (!selectedGroup) return;
    if (!inputContent.trim()) {
      onShowToast("Message cannot be empty", undefined, true);
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          groupId: selectedGroup.id,
          senderId: currentUser.id,
          content: inputContent.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInputContent("");
        fetchMessages(selectedGroup.id);
        if (data.reward && data.reward.pointsAwarded > 0) {
          onReward(data.reward);
        }
      } else {
        onShowToast(data.error || "Failed to send message", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setSending(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onShowToast("Please select an active persona first", undefined, true);
      return;
    }
    if (!newGroupName.trim()) {
      onShowToast("Group or DM name cannot be empty", undefined, true);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_group",
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          category: newGroupCategory,
          isDirect: isDirectChat,
          senderId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewGroupModal(false);
        setNewGroupName("");
        setNewGroupDescription("");
        onShowToast(data.message);
        await fetchGroups();
        setSelectedGroup(data.group);
      } else {
        onShowToast(data.error || "Failed to create group", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setCreating(false);
    }
  };

  const categoryColor = (cat: string) => {
    switch (cat) {
      case "Tech":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "Ideas":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "General":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-extrabold mb-3 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            <span>Mini Interest Groups & Direct Messaging</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Community Chat & DMs
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-medium leading-relaxed">
            Collaborate in focused interest channels (#Tech, #Ideas, #General) or launch Direct Message rooms. Every active discussion message awards +15 loyalty points!
          </p>
        </div>

        <button
          onClick={() => setShowNewGroupModal(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Channel / DM</span>
        </button>
      </div>

      {/* Main Two-Column Chat UI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar: Groups & DMs List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/95 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              <Hash className="w-4 h-4 text-indigo-400" />
              <span>Channels & DM Groups</span>
            </h3>
            <button
              onClick={() => fetchGroups()}
              className="text-xs font-bold text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingGroups ? (
            <div className="py-8 text-center text-slate-400 text-sm animate-pulse">Loading channels...</div>
          ) : groups.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No channels created yet. Create one!</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {groups.map((group) => {
                const isSelected = selectedGroup?.id === group.id;
                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-indigo-900/50 border-indigo-500/70 text-white shadow-md"
                        : "bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/80 text-slate-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black truncate">{group.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${categoryColor(group.category)}`}>
                          {group.category}
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-xs text-slate-400 truncate mt-1">{group.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Room Area (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col h-[640px]">
          {selectedGroup ? (
            <>
              {/* Header of Channel */}
              <div className="pb-4 border-b border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">{selectedGroup.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${categoryColor(selectedGroup.category)}`}>
                      {selectedGroup.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedGroup.description || "Active community chat room"}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-extrabold text-amber-400">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>+15 pts / msg</span>
                </div>
              </div>
              <CommunityRoster groupId={selectedGroup.id} currentUser={currentUser} onShowToast={onShowToast} />

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2 custom-scrollbar">
                {loadingMessages ? (
                  <div className="py-12 text-center text-slate-400 text-sm animate-pulse">Loading channel messages...</div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl p-6 bg-slate-950/40">
                    <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-300">No messages in this channel yet</h4>
                    <p className="text-xs text-slate-400 mt-1">Be the first to say hello and earn +15 loyalty points!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = currentUser?.id === msg.senderId;
                    let timeStr = "recently";
                    try {
                      if (msg.createdAt) {
                        timeStr = formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true });
                      }
                    } catch (e) {}

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <img
                          src={
                            msg.senderAvatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderUsername}`
                          }
                          alt={msg.senderName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-600 flex-shrink-0 mt-0.5"
                        />
                        <div
                          className={`max-w-[75%] rounded-2xl p-3.5 text-sm ${
                            isMe
                              ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                              : "bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none"
                          }`}
                        >
                          <div className={`flex items-center gap-2 mb-1 text-xs ${isMe ? "text-indigo-200 justify-end" : "text-slate-400"}`}>
                            <span className="font-extrabold text-white">{msg.senderName}</span>
                            <span>@{msg.senderUsername}</span>
                            <span>•</span>
                            <span>{timeStr}</span>
                          </div>
                          <p className="leading-relaxed break-words">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-800 flex items-center gap-3">
                <input
                  type="text"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder={`Message ${selectedGroup.name} as ${currentUser?.name || "Guest"}... (+15 pts)`}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={sending || !currentUser}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {sending ? <span>Sending...</span> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a channel from the sidebar to join the conversation.
            </div>
          )}
        </div>
      </div>

      {/* New Channel / DM Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setShowNewGroupModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-black text-white mb-1">Create Interest Group / DM</h3>
            <p className="text-xs text-slate-400 mb-5">Launch a mini community channel for focused topics</p>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Channel Name</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. 🤖 AI & Machine Learning"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Category / Topic</label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Tech">💻 Tech & Development</option>
                  <option value="Ideas">💡 Ideas & Brainstorming</option>
                  <option value="General">💬 General Community</option>
                  <option value="Direct">🔒 Direct Message Group</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Description</label>
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What is this channel about?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-md disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Launch Channel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
