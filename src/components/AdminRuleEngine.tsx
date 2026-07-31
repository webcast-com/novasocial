"use client";

import React, { useState, useEffect } from "react";
import { User, ActivityRuleItem, FlashEventItem } from "@/types";
import { Shield, Settings, Zap, Check, Save, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, Sparkles, Rocket } from "lucide-react";

interface Props {
  currentUser: User | null;
  onShowToast: (msg: string, pts?: number, err?: boolean) => void;
}

export default function AdminRuleEngine({ currentUser, onShowToast }: Props) {
  const [rules, setRules] = useState<ActivityRuleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Local editing states
  const [editedPoints, setEditedPoints] = useState<Record<number, number>>({});
  const [editedActive, setEditedActive] = useState<Record<number, boolean>>({});

  // Flash Event / Happy Hour states
  const [events, setEvents] = useState<FlashEventItem[]>([]);
  const [togglingEventId, setTogglingEventId] = useState<number | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (data.success) setEvents(data.events);
    } catch (err) {
      console.error("Fetch events error:", err);
    }
  };

  const handleToggleEvent = async (evt: FlashEventItem) => {
    setTogglingEventId(evt.id);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id: evt.id, isActive: !evt.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message);
        fetchEvents();
      } else {
        onShowToast(data.error || "Failed to toggle event", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setTogglingEventId(null);
    }
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rules");
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
        const pts: Record<number, number> = {};
        const act: Record<number, boolean> = {};
        data.rules.forEach((r: ActivityRuleItem) => {
          pts[r.id] = r.points;
          act[r.id] = r.isActive;
        });
        setEditedPoints(pts);
        setEditedActive(act);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchEvents();
  }, []);

  const handleSaveRule = async (rule: ActivityRuleItem) => {
    const newPoints = editedPoints[rule.id];
    const newActive = editedActive[rule.id];

    if (newPoints === undefined || isNaN(newPoints) || newPoints < 0) {
      onShowToast("Please enter a valid positive point number", undefined, true);
      return;
    }

    setSavingId(rule.id);
    try {
      const res = await fetch("/api/admin/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          points: newPoints,
          isActive: newActive,
          dailyCap: rule.dailyCap,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message);
        fetchRules();
      } else {
        onShowToast(data.error || "Failed to update rule", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setSavingId(null);
    }
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-black shadow mb-3 uppercase tracking-wider">
            <Shield className="w-4 h-4 stroke-[2.5]" />
            <span>Platform Admin Control Sandbox</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Activity Point Rule Engine
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-medium leading-relaxed">
            Configure exactly how many loyalty points are distributed for each community interaction. Try modifying referral bounties or engagement incentives to see them take effect instantly across the VibePulse ecosystem!
          </p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-xs text-slate-300 max-w-xs shadow-inner">
          <div className="font-extrabold text-white mb-1 flex items-center gap-1.5 text-sm">
            <Settings className="w-4 h-4 text-indigo-400" /> Live Formula Evaluation
          </div>
          <p className="text-slate-400 leading-relaxed">
            Changes saved here update backend evaluation logic immediately. Even non-admin users in this demo sandbox are permitted to experiment with custom formula tuning!
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-amber-200 text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>
              You are currently logged in as a Standard Member (<strong>{currentUser?.name}</strong>). To simulate administrative permissions, you can switch to <strong>Maya Sterling (Admin)</strong> in the top header selector—or edit these rules freely in this interactive demo!
            </span>
          </div>
        </div>
      )}

      {/* Flash Events / Happy Hour Multipliers */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800 flex-wrap gap-3">
          <div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-rose-400" />
              <span>Point Multipliers & Flash Events</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Activate Happy Hours to automatically double or triple every point award platform-wide
            </p>
          </div>
          <button
            onClick={fetchEvents}
            className="text-xs font-bold text-slate-400 hover:text-white px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
        </div>

        {events.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">No flash events configured yet.</div>
        ) : (
          <div className="space-y-4">
            {events.map((evt) => (
              <div
                key={evt.id}
                className={`p-5 sm:p-6 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                  evt.isActive
                    ? "bg-gradient-to-r from-amber-950/50 via-rose-950/40 to-slate-950 border-amber-500/60 shadow-lg shadow-amber-950/20"
                    : "bg-slate-950 border-slate-800/90"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-lg font-black text-white">{evt.title}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {evt.multiplier}X Multiplier
                    </span>
                    {evt.isActive && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                        ● LIVE NOW
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
                    {evt.description}
                  </p>
                </div>

                <button
                  onClick={() => handleToggleEvent(evt)}
                  disabled={togglingEventId === evt.id}
                  className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-50 ${
                    evt.isActive
                      ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                      : "bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-amber-500/30 hover:opacity-95"
                  }`}
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>
                    {togglingEventId === evt.id
                      ? "Updating…"
                      : evt.isActive
                      ? "Deactivate Event"
                      : `Activate ${evt.multiplier}X Happy Hour`}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rules Table */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 fill-current" />
              <span>Configurable Point Reward Parameters</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Edit point payouts for individual user actions</p>
          </div>
          <button
            onClick={fetchRules}
            className="text-xs font-bold text-slate-400 hover:text-white px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm animate-pulse">Loading system rules...</div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => {
              const currentPts = editedPoints[rule.id] ?? rule.points;
              const currentAct = editedActive[rule.id] ?? rule.isActive;
              const hasChanged = currentPts !== rule.points || currentAct !== rule.isActive;

              return (
                <div
                  key={rule.id}
                  className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                    currentAct
                      ? "bg-slate-950 border-slate-800/90 shadow-md"
                      : "bg-slate-950/40 border-slate-800/40 opacity-75"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black text-white">{rule.name}</span>
                        <span className="px-2.5 py-0.5 rounded-full font-mono text-xs font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                          {rule.actionType}
                        </span>
                        {!currentAct && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            INACTIVE (0 Pts)
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl font-normal">
                        {rule.description}
                      </p>
                    </div>

                    {/* Right Controls: Points Input & Save */}
                    <div className="flex items-center gap-4 flex-wrap pt-3 md:pt-0 border-t md:border-0 border-slate-800">
                      {/* Active toggle button */}
                      <button
                        onClick={() => setEditedActive({ ...editedActive, [rule.id]: !currentAct })}
                        title={currentAct ? "Click to deactivate rule" : "Click to activate rule"}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl font-bold text-xs border transition-all ${
                          currentAct
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        {currentAct ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                        <span>{currentAct ? "Active" : "Disabled"}</span>
                      </button>

                      {/* Points numerical input */}
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-2xl p-1 px-3 shadow-inner">
                        <Zap className="w-4 h-4 text-amber-400 fill-current" />
                        <span className="text-xs font-extrabold text-slate-400 uppercase">Award:</span>
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          value={currentPts}
                          onChange={(e) => setEditedPoints({ ...editedPoints, [rule.id]: Number(e.target.value) })}
                          className="w-16 bg-transparent text-white font-black text-base sm:text-lg focus:outline-none text-center"
                        />
                        <span className="text-xs font-black text-amber-400 uppercase">Pts</span>
                      </div>

                      {/* Save Changes button */}
                      <button
                        onClick={() => handleSaveRule(rule)}
                        disabled={savingId === rule.id || !hasChanged}
                        className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md ${
                          hasChanged
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 scale-105 animate-pulse"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        <span>{savingId === rule.id ? "Saving..." : hasChanged ? "Save Changes" : "Saved ✓"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
