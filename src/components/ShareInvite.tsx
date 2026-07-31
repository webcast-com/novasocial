"use client";

import React, { useState } from "react";
import { Copy, Check, Share2, Gift, Sparkles } from "lucide-react";

interface Props {
  referralLink: string;
  userName: string;
  showToast?: (msg: string, isError?: boolean) => void;
}

/* Brand glyphs as inline SVGs to avoid deprecated lucide brand icons */
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.014 1.792-4.677 4.533-4.677 1.312 0 2.686.235 2.686.235v2.97h-1.514c-1.49 0-1.955.93-1.955 1.885v2.26h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

export default function ShareInvite({ referralLink, userName, showToast }: Props) {
  const [copied, setCopied] = useState(false);

  const shareText = `${userName} invited you to join VibePulse — the gamified community where you earn loyalty points for posts, reactions, shares & referrals! Join free:`;
  const encodedLink = encodeURIComponent(referralLink);
  const encodedText = encodeURIComponent(shareText);

  const shareOptions = [
    {
      key: "facebook",
      label: "Facebook",
      color: "bg-[#1877F2] hover:bg-[#1463d6] text-white border-[#1877F2]",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&quote=${encodedText}`,
      icon: <FacebookIcon className="w-5 h-5" />,
    },
    {
      key: "x",
      label: "X (Twitter)",
      color: "bg-black hover:bg-slate-800 text-white border-black",
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedLink}`,
      icon: <XIcon className="w-5 h-5" />,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      color: "bg-[#25D366] hover:bg-[#1da851] text-white border-[#25D366]",
      url: `https://wa.me/?text=${encodedText}%20${encodedLink}`,
      icon: <WhatsAppIcon className="w-5 h-5" />,
    },
    {
      key: "telegram",
      label: "Telegram",
      color: "bg-[#229ED9] hover:bg-[#1b86bd] text-white border-[#229ED9]",
      url: `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`,
      icon: <TelegramIcon className="w-5 h-5" />,
    },
  ];

  const handleShare = (url: string, label: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=620,height=640");
    showToast?.(`Opening ${label} to invite your friends…`);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    showToast?.("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Join me on VibePulse!", text: shareText, url: referralLink });
      } catch {
        /* user cancelled — ignore */
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
          <Share2 className="w-4.5 h-4.5" />
        </div>
        <div>
          <h4 className="font-extrabold text-white text-base">Invite friends via social media</h4>
          <p className="text-xs text-slate-400">Share your link on your favorite platform — each signup earns you +200 points!</p>
        </div>
      </div>

      {/* Social share buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {shareOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleShare(opt.url, opt.label)}
            className={`flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl font-extrabold text-xs sm:text-sm border shadow-md transition-all hover:scale-[1.03] active:scale-95 ${opt.color}`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Copy link + native share */}
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 shadow-inner">
          <Gift className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="font-mono text-xs text-slate-300 truncate flex-1 select-all">{referralLink}</span>
        </div>
        <button
          onClick={handleCopy}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied!" : "Copy Link"}</span>
        </button>
        <button
          onClick={handleNativeShare}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 text-slate-950 font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>More…</span>
        </button>
      </div>
    </div>
  );
}
