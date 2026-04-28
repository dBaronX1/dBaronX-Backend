"use client";
import React from "react";

interface OpenInBotProps {
  page?: "shop" | "impact" | "blog" | "dreams" | "id-card" | "affiliates" | "wallet" | "support" | "track";
  productId?: string;
  campaignId?: string;
  orderId?: string;
  refCode?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "outline" | "solid" | "minimal";
  label?: string;
}

const BOT_USERNAME = "dBaronX_DBX_Token";

export default function OpenInBotButton({
  page = "shop",
  productId,
  campaignId,
  orderId,
  refCode,
  className = "",
  size = "md",
  variant = "outline",
  label,
}: OpenInBotProps) {
  const getDeepLink = () => {
    if (productId) return `https://t.me/${BOT_USERNAME}?start=product-${productId}`;
    if (campaignId) return `https://t.me/${BOT_USERNAME}?start=campaign-${campaignId}`;
    if (orderId) return `https://t.me/${BOT_USERNAME}?start=track-${orderId}`;
    if (refCode) return `https://t.me/${BOT_USERNAME}?start=affiliate-${refCode}`;
    const pageMap: Record<string, string> = {
      shop: `https://t.me/${BOT_USERNAME}?start=shop`,
      impact: `https://t.me/${BOT_USERNAME}?start=impact`,
      blog: `https://t.me/${BOT_USERNAME}?start=shop`,
      dreams: `https://t.me/${BOT_USERNAME}?start=dreams`,
      "id-card": `https://t.me/${BOT_USERNAME}?start=wallet`,
      affiliates: `https://t.me/${BOT_USERNAME}?start=affiliate`,
      wallet: `https://t.me/${BOT_USERNAME}?start=wallet`,
      support: `https://t.me/${BOT_USERNAME}?start=support`,
      track: `https://t.me/${BOT_USERNAME}?start=track`,
    };
    return pageMap[page] || `https://t.me/${BOT_USERNAME}`;
  };

  const sizeClasses = {
    sm: "text-[10px] px-3 py-1.5 gap-1",
    md: "text-xs px-4 py-2 gap-1.5",
    lg: "text-sm px-6 py-3 gap-2",
  };

  const variantClasses = {
    outline: "bg-transparent border border-accent text-accent hover:bg-accent hover:text-bg-base",
    solid: "bg-accent text-bg-base hover:bg-accent/80",
    minimal: "bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] text-accent hover:bg-[rgba(0,240,255,0.15)]",
  };

  const displayLabel = label || (page === "track" ? "Track in Bot" : page === "affiliates" ? "Earnings in Bot" : "Open in Bot");

  return (
    <a
      href={getDeepLink()}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      aria-label={`${displayLabel} — opens Telegram`}
    >
      <svg className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
      {displayLabel}
    </a>
  );
}
