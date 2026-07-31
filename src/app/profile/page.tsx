"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User } from "@/types";
import ShareInvite from "@/components/ShareInvite";
import SocialPreviewCard from "@/components/SocialPreviewCard";
import {
  ArrowLeft,
  Zap,
  MapPin,
  UserCircle2,
  Shield,
  Save,
  Check,
  Sparkles,
  Loader2,
  ImageIcon,
  Calendar,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" },
];

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80",
];

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Editable form fields
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  const showToast = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Determine which profile to show: ?userId= > localStorage active user > first user
        const paramId = searchParams.get("userId");
        let targetId = paramId;
        if (!targetId && typeof window !== "undefined") {
          targetId = window.localStorage.getItem("vibepulse_active_user_id");
        }

        const res = await fetch("/api/users");
        const data = await res.json();
        if (data.success) {
          setAllUsers(data.users);
          let target: User | undefined;
          if (targetId) {
            target = data.users.find((u: User) => String(u.id) === String(targetId));
          }
          if (!target) {
            target =
              data.users.find((u: User) => u.username === "elena_tech") || data.users[0];
          }
          if (target) {
            setUser(target);
            setEditName(target.name);
            setEditBio(target.bio || "");
            setEditLocation(target.location || "");
            setEditGender(target.gender || "");
            setEditAvatar(target.avatarUrl || "");
          }
        }
      } catch (err) {
        console.error("Profile init error:", err);
        showToast("Failed to load profile data", true);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [searchParams]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!editName.trim()) {
      showToast("Name cannot be empty", true);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          bio: editBio.trim(),
          location: editLocation.trim(),
          gender: editGender,
          avatarUrl: editAvatar.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        // keep localStorage in sync if this is the active user
        if (typeof window !== "undefined") {
          const activeId = window.localStorage.getItem("vibepulse_active_user_id");
          if (activeId && String(data.user.id) === activeId) {
            window.localStorage.setItem("vibepulse_active_user_id", String(data.user.id));
          }
        }
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
        showToast("Profile settings saved successfully!");
      } else {
        showToast(data.error || "Failed to save profile", true);
      }
    } catch (err) {
      showToast(String(err), true);
    } finally {
      setSaving(false);
    }
  };

  const randomizeAvatar = () => {
    const seed = Math.random().toString(36).slice(2, 10);
    const newUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    setEditAvatar(newUrl);
  };

  const referralLink =
    typeof window !== "undefined" && user
      ? `${window.location.origin}/join?ref=${user.referralCode}`
      : `https://vibepulse.io/join?ref=${user?.referralCode || "PULSE"}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <span className="text-sm font-bold">Loading profile…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center flex-col gap-4">
        <p className="text-sm">No profile found.</p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  let memberSince = "Recently";
  try {
    memberSince = format(new Date(user.createdAt), "MMM yyyy");
  } catch {}

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-lg font-black text-xl">
              VP
            </div>
            <div className="text-left">
              <h1 className="font-extrabold text-lg tracking-tight text-white">VibePulse</h1>
              <p className="text-[11px] text-slate-400 -mt-0.5">Profile & Settings</p>
            </div>
          </button>

          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Hero Banner */}
        <div className="relative bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden mb-8">
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
              alt={user.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-slate-700 shadow-xl"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{user.name}</h2>
                {user.role === "admin" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-600 text-white uppercase tracking-wider">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 font-medium">@{user.username}</p>
              {user.bio && <p className="text-sm text-slate-300 mt-2 max-w-xl">{user.bio}</p>}

              <div className="flex items-center gap-4 flex-wrap mt-3">
                {user.location && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-950/60 border border-slate-700 rounded-full px-3 py-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" /> {user.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-950/60 border border-slate-700 rounded-full px-3 py-1">
                  <UserCircle2 className="w-3.5 h-3.5 text-indigo-400" />{" "}
                  {GENDER_OPTIONS.find((g) => g.value === (user.gender || ""))?.label || "Prefer not to say"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-950/60 border border-slate-700 rounded-full px-3 py-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Joined {memberSince}
                </span>
                {(user.currentStreak || 0) > 1 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-orange-300 bg-orange-500/20 border border-orange-500/40 rounded-full px-3 py-1">
                    🔥 {user.currentStreak}-Day Streak (Best: {user.maxStreak})
                  </span>
                )}
              </div>

              {/* Showcased Badge Collection */}
              {(user.equippedBadges || []).length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Showcased Badges
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(user.equippedBadges || []).map((badge) => (
                      <span
                        key={badge}
                        className="px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-white border border-indigo-500/40 shadow-sm"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Points + tier */}
            <div className="bg-slate-950/80 border-2 border-amber-500/60 rounded-3xl p-5 text-center min-w-[180px] flex-shrink-0 shadow-xl">
              <div className="text-3xl font-black text-amber-400 flex items-center justify-center gap-1.5">
                <Zap className="w-7 h-7 fill-current" />
                {user.totalPoints.toLocaleString()}
              </div>
              <div className="text-xs font-bold text-slate-300 uppercase mt-0.5">Loyalty Points</div>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                {user.tierInfo.icon} {user.tierInfo.levelName}
              </div>
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Settings form */}
          <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <UserCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Profile Settings</h3>
                <p className="text-xs text-slate-400">Update your personal details, location & avatar</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Profile Picture editor */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-300 mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={editAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    alt="preview"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-600 shadow-md flex-shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                      placeholder="Paste image URL (https://…)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={randomizeAvatar}
                      className="text-xs font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Generate random avatar
                    </button>
                  </div>
                </div>
                {/* Preset avatars */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setEditAvatar(av)}
                      className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition-all hover:scale-110 ${
                        editAvatar === av ? "border-indigo-400 ring-2 ring-indigo-500/40" : "border-slate-700"
                      }`}
                    >
                      <img src={av} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">Username (handle)</label>
                  <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-400 font-mono flex items-center gap-1">
                    <span className="text-slate-500">@</span>
                    {user.username}
                  </div>
                </div>
              </div>

              {/* Location & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" /> Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. San Francisco, USA"
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <UserCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">Bio / About</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell the community a little about yourself…"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-400 font-medium">
                  Referral code: <span className="font-mono text-amber-400 font-bold">{user.referralCode}</span>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : savedFlash ? (
                    <><Check className="w-4 h-4 text-emerald-300" /> Saved!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Invite column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow">
                  <Sparkles className="w-3.5 h-3.5 fill-current" /> +200 pts per signup
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mt-2 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-rose-400" /> Invite & Earn
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Share your personal referral link across social platforms. Every friend who joins credits your account.
              </p>

              <ShareInvite referralLink={referralLink} userName={user.name} showToast={(msg, err) => showToast(msg, err)} />

              {/* Dynamic OpenGraph rich link preview */}
              <div className="mt-6">
                <SocialPreviewCard
                  referrerName={user.name}
                  referrerUsername={user.username}
                  referrerAvatar={user.avatarUrl}
                  totalPoints={user.totalPoints}
                  tierLevel={user.tierInfo.levelName}
                  tierIcon={user.tierInfo.icon}
                  referralCode={user.referralCode}
                />
              </div>
            </div>

            {/* Quick switch persona */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
              <h4 className="text-sm font-extrabold text-white mb-3 uppercase tracking-wider">View another profile</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setEditName(u.name);
                      setEditBio(u.bio || "");
                      setEditLocation(u.location || "");
                      setEditGender(u.gender || "");
                      setEditAvatar(u.avatarUrl || "");
                      setUser(u);
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                      u.id === user.id
                        ? "bg-indigo-900/40 border-indigo-500/60"
                        : "bg-slate-950/60 border-transparent hover:bg-slate-800/80"
                    }`}
                  >
                    <img
                      src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                      alt={u.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-600"
                    />
                    <span className="text-sm font-bold text-white truncate">{u.name}</span>
                    <span className="text-xs text-amber-400 ml-auto font-bold flex items-center gap-0.5">
                      <Zap className="w-3 h-3 fill-current" /> {u.totalPoints}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-md ${
            toast.err
              ? "bg-rose-950/90 text-rose-100 border-rose-600/50"
              : "bg-slate-900/95 text-white border-indigo-500/40"
          }`}
        >
          <p className="text-sm font-bold">{toast.msg}</p>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
