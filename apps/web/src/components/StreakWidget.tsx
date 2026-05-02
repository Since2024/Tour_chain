"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Snowflake, CheckCircle2, Zap } from "lucide-react";

type Streak = {
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  freeze_count: number;
};

type DailyChallenge = {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  challenge_type: string;
};

const STREAK_LABELS: Record<string, { label: string; icon: string }> = {
  login:   { label: "Login",    icon: "🔑" },
  trek:    { label: "Trek",     icon: "🥾" },
  checkin: { label: "Check-in", icon: "📍" },
  social:  { label: "Social",   icon: "🤝" },
  quest:   { label: "Quest",    icon: "🎯" },
};

const MILESTONES = [7, 30, 100, 365];

function FlameIcon({ streak }: { streak: number }) {
  const size = streak >= 100 ? "text-5xl" : streak >= 30 ? "text-4xl" : streak >= 7 ? "text-3xl" : "text-2xl";
  return (
    <motion.div
      animate={{ scale: [1, 1.15, 1], rotate: [-3, 3, -3] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={size}
    >
      🔥
    </motion.div>
  );
}

export function StreakWidget() {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [todayChallenge, setTodayChallenge] = useState<DailyChallenge | null>(null);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/streaks");
        if (res.ok) {
          const data = await res.json();
          setStreaks(data.streaks ?? []);
          setTodayChallenge(data.today_challenge ?? null);
          setTodayCompleted(data.today_completed ?? false);
        }
      } catch { /* ignore */ }
      setLoaded(true);
    };
    void load();
  }, []);

  const topStreak = streaks.reduce((best, s) => s.current_streak > (best?.current_streak ?? 0) ? s : best, streaks[0]);

  const handleCompleteDaily = async () => {
    if (!todayChallenge || todayCompleted) return;
    setCompleting(true);
    try {
      const res = await fetch("/api/daily-challenges/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_challenge_id: todayChallenge.id }),
      });
      if (res.ok) setTodayCompleted(true);
    } finally {
      setCompleting(false);
    }
  };

  if (!loaded) return <div className="h-32 rounded-2xl skeleton" />;

  const displayStreak = topStreak?.current_streak ?? 0;
  const nextMilestone = MILESTONES.find((m) => m > displayStreak) ?? 365;

  return (
    <div className="space-y-3">
      {/* Main streak card */}
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: displayStreak >= 30 ? "linear-gradient(135deg,#dc2626,#ea580c)" : displayStreak >= 7 ? "linear-gradient(135deg,#ea580c,#f97316)" : "linear-gradient(135deg,#f97316,#fb923c)" }}
      >
        <div className="absolute top-0 right-0 opacity-10 text-[120px] leading-none pointer-events-none select-none">🔥</div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FlameIcon streak={displayStreak} />
              <div>
                <p className="text-white/80 text-xs uppercase tracking-wider">Current Streak</p>
                <p className="text-3xl font-bold">{displayStreak} <span className="text-lg font-normal">days</span></p>
              </div>
            </div>
            {(topStreak?.freeze_count ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                <Snowflake className="w-4 h-4" />
                <span className="text-sm font-bold">{topStreak?.freeze_count}</span>
              </div>
            )}
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>Next milestone: {nextMilestone} days</span>
              <span>{displayStreak}/{nextMilestone}</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (displayStreak / nextMilestone) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily challenge */}
      {todayChallenge && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl shrink-0">⚡</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-0.5">Daily Challenge</p>
                <p className="font-semibold text-gray-900 text-sm">{todayChallenge.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{todayChallenge.description}</p>
              </div>
            </div>
            <div className="shrink-0">
              {todayCompleted ? (
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Done!
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => void handleCompleteDaily()}
                  disabled={completing}
                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Zap className="w-3 h-3" /> +{todayChallenge.xp_reward} XP
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* All streaks */}
      <button onClick={() => setShowAll((s) => !s)} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors">
        {showAll ? "Hide" : "Show"} all streaks ▾
      </button>

      <AnimatePresence>
        {showAll && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-2"
          >
            {streaks.map((s) => {
              const cfg = STREAK_LABELS[s.streak_type] ?? { label: s.streak_type, icon: "🔥" };
              return (
                <div key={s.streak_type} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-2">
                  <span className="text-xl">{cfg.icon}</span>
                  <div>
                    <p className="text-xs text-gray-400">{cfg.label}</p>
                    <p className="font-bold text-gray-900 text-sm">{s.current_streak} <span className="text-xs font-normal text-gray-400">days</span></p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
