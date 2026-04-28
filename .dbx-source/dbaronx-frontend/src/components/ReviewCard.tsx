"use client";
import React from "react";
import StarRating from "./StarRating";

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    review_text: string;
    is_verified_purchase: boolean;
    helpful_count: number;
    dbx_staked?: number;
    created_at: string;
    user_profiles?: { full_name: string; avatar_url?: string } | null;
  };
  onHelpful?: (id: string) => void;
  showAdminActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
  isPending?: boolean;
}

export default function ReviewCard({
  review,
  onHelpful,
  showAdminActions = false,
  onApprove,
  onReject,
  onDelete,
  isPending = false,
}: ReviewCardProps) {
  const authorName =
    (review.user_profiles as any)?.full_name ||
    "Anonymous";
  const initials = authorName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  return (
    <div
      className={`bg-bg-card rounded-2xl border p-4 sm:p-5 transition-all ${
        isPending
          ? "border-yellow-400/30 bg-yellow-400/5" :"border-[rgba(94,23,235,0.15)] hover:border-[rgba(94,23,235,0.3)]"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-fg-base truncate">
              {authorName}
            </span>
            {review.is_verified_purchase && (
              <span className="text-[10px] bg-eco-green/15 text-eco-green border border-eco-green/25 px-2 py-0.5 rounded-full font-medium">
                ✓ Verified Purchase
              </span>
            )}
            {isPending && (
              <span className="text-[10px] bg-yellow-400/15 text-yellow-400 border border-yellow-400/25 px-2 py-0.5 rounded-full font-medium">
                Pending Approval
              </span>
            )}
            {review.dbx_staked && review.dbx_staked > 0 ? (
              <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full font-mono">
                {review.dbx_staked} DBX staked
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-xs text-fg-muted">{timeAgo(review.created_at)}</span>
          </div>
        </div>
      </div>

      {review.review_text && (
        <p className="text-sm text-fg-muted leading-relaxed mb-3">
          {review.review_text}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onHelpful && !isPending && (
            <button
              onClick={() => onHelpful(review.id)}
              className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-accent transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              Helpful ({review.helpful_count || 0})
            </button>
          )}
        </div>

        {showAdminActions && (
          <div className="flex items-center gap-2">
            {onApprove && (
              <button
                onClick={() => onApprove(review.id)}
                className="text-xs bg-eco-green/15 border border-eco-green/30 text-eco-green px-3 py-1 rounded-full hover:bg-eco-green/25 transition-all"
              >
                ✓ Approve
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(review.id)}
                className="text-xs bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full hover:bg-yellow-400/20 transition-all"
              >
                Hold
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(review.id)}
                className="text-xs bg-red-400/10 border border-red-400/20 text-red-400 px-3 py-1 rounded-full hover:bg-red-400/20 transition-all"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
