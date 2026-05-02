"use client";

import { useState } from "react";
import {
  buildShareUrl,
  buildAchievementShareText,
  buildReferralShareText,
  buildReferralUrl,
  generateReferralCode,
  REFERRAL_REWARDS,
  type SharePlatform,
} from "@/lib/referral";

interface ShareCardProps {
  mode: "achievement" | "referral";
  // achievement mode
  routeName?: string;
  xp?: number;
  rank?: number;
  mintAddress?: string;
  // referral mode
  userId?: string;
}

const PLATFORMS: { id: SharePlatform; label: string; icon: string; color: string }[] = [
  { id: "twitter",  label: "X / Twitter", icon: "𝕏",  color: "bg-black hover:bg-gray-800" },
  { id: "whatsapp", label: "WhatsApp",    icon: "💬", color: "bg-green-500 hover:bg-green-400" },
  { id: "telegram", label: "Telegram",   icon: "✈️", color: "bg-blue-500 hover:bg-blue-400" },
  { id: "facebook", label: "Facebook",   icon: "f",  color: "bg-blue-700 hover:bg-blue-600" },
];

export function ShareCard({ mode, routeName, xp = 0, rank, mintAddress, userId }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const referralCode = userId ? generateReferralCode(userId) : "TCN001";
  const referralUrl = buildReferralUrl(referralCode);

  const shareText =
    mode === "achievement"
      ? buildAchievementShareText(routeName ?? "Nepal Trek", xp, rank)
      : buildReferralShareText(referralCode);

  const shareUrl =
    mode === "achievement"
      ? (typeof window !== "undefined" ? `${window.location.origin}/vibe` : "https://tourism-chain-nepal.vercel.app/vibe")
      : referralUrl;

  const handleCopy = async (text: string, setCopiedFn: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2000);
  };

  const handlePlatformShare = (platform: SharePlatform) => {
    const url = buildShareUrl(platform, shareText, shareUrl);
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/90 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-3xl">{mode === "achievement" ? "🏆" : "🎁"}</span>
        <div>
          <p className="font-bold text-gray-900">
            {mode === "achievement" ? "Share Your Achievement" : "Refer a Friend"}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {mode === "achievement"
              ? "Show the world your verified Himalayan trek"
              : `Earn +${REFERRAL_REWARDS.referrer_xp} XP and ${REFERRAL_REWARDS.referrer_discount_pct}% off your next booking`}
          </p>
        </div>
      </div>

      {/* Preview text */}
      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 leading-relaxed border border-gray-100">
        {shareText}
      </div>

      {/* Platform buttons */}
      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => handlePlatformShare(p.id)}
            className={`flex items-center gap-2 ${p.color} text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-all hover:scale-105`}
          >
            <span className="text-base">{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>

      {/* Copy link */}
      <button
        onClick={() => void handleCopy(shareUrl, setCopied)}
        className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-all"
      >
        {copied ? "✅ Link Copied!" : "🔗 Copy Link"}
      </button>

      {/* Referral section (only in referral mode) */}
      {mode === "referral" && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-center">
              <p className="text-2xl font-bold text-indigo-700 tracking-widest">{referralCode}</p>
            </div>
            <button
              onClick={() => void handleCopy(referralCode, setCopiedRef)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
            >
              {copiedRef ? "✅" : "Copy"}
            </button>
          </div>

          {/* Rewards breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">+{REFERRAL_REWARDS.referrer_xp} XP</p>
              <p className="text-xs text-emerald-600">You earn</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{REFERRAL_REWARDS.referrer_discount_pct}% off</p>
              <p className="text-xs text-blue-600">Your next booking</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-purple-700">+{REFERRAL_REWARDS.referee_xp} XP</p>
              <p className="text-xs text-purple-600">Friend earns</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-orange-700">{REFERRAL_REWARDS.referee_discount_pct}% off</p>
              <p className="text-xs text-orange-600">Friend&apos;s first trek</p>
            </div>
          </div>
        </div>
      )}

      {/* NFT link for achievement mode */}
      {mode === "achievement" && mintAddress && (
        <a
          href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          🔗 View NFT on Solana Explorer ↗
        </a>
      )}
    </div>
  );
}
