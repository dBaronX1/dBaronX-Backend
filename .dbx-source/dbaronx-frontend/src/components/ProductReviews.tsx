"use client";
import React, { useState, useEffect, useCallback } from "react";
import StarRating from "./StarRating";
import ReviewCard from "./ReviewCard";
import { useAuth } from "@/contexts/AuthContext";

interface Review {
  id: string;
  rating: number;
  review_text: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  dbx_staked?: number;
  created_at: string;
  user_profiles?: { full_name: string; avatar_url?: string } | null;
}

interface ReviewSummary {
  reviews: Review[];
  avgRating: number;
  totalReviews: number;
  distribution: { star: number; count: number }[];
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [newText, setNewText] = useState("");
  const { user } = useAuth();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?product_id=${productId}`);
      const data = await res.json();
      if (res.ok) setSummary(data);
    } catch (_) {}
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { window.location.href = "/login"; return; }
    if (newRating === 0) { setSubmitError("Please select a star rating."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, rating: newRating, review_text: newText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to submit review.");
        return;
      }
      setSubmitSuccess(true);
      setShowForm(false);
      setNewRating(0);
      setNewText("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    await fetch(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "helpful" }),
    });
    fetchReviews();
  };

  if (loading) {
    return (
      <div className="mt-8 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-bg-card rounded-2xl h-24 animate-pulse border border-[rgba(94,23,235,0.1)]" />
        ))}
      </div>
    );
  }

  const { reviews = [], avgRating = 0, totalReviews = 0, distribution = [] } = summary || {};

  return (
    <div className="mt-10">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-fg-base">Customer Reviews</h3>
          <p className="text-xs text-fg-muted mt-0.5">{productName}</p>
        </div>
        {!showForm && !submitSuccess && (
          <button
            onClick={() => user ? setShowForm(true) : (window.location.href = "/login")}
            className="btn-glow-purple bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white px-5 py-2 rounded-xl text-sm font-bold transition-all"
          >
            + Write a Review
          </button>
        )}
      </div>

      {/* Success Banner */}
      {submitSuccess && (
        <div className="mb-6 bg-eco-green/10 border border-eco-green/30 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-bold text-eco-green">Review submitted!</p>
            <p className="text-xs text-fg-muted">Your review is pending admin approval and will appear shortly.</p>
          </div>
        </div>
      )}

      {/* Rating Summary */}
      {totalReviews > 0 && (
        <div className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.15)] p-5 mb-6 flex flex-col sm:flex-row gap-6 items-center">
          {/* Big Score */}
          <div className="text-center flex-shrink-0">
            <div className="text-5xl font-bold text-fg-base">{avgRating.toFixed(1)}</div>
            <StarRating rating={avgRating} size="md" />
            <p className="text-xs text-fg-muted mt-1">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</p>
          </div>
          {/* Distribution Bars */}
          <div className="flex-1 w-full space-y-1.5">
            {distribution.map(({ star, count }) => {
              const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-fg-muted w-4 text-right">{star}</span>
                  <svg className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <div className="flex-1 h-2 bg-bg-base rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-fg-muted w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.25)] p-5 mb-6 space-y-4">
          <h4 className="font-bold text-fg-base">Your Review</h4>
          <div>
            <label className="block text-xs text-fg-muted mb-2">Rating <span className="text-red-400">*</span></label>
            <StarRating rating={newRating} size="lg" interactive onChange={setNewRating} />
            {submitError && <p className="text-xs text-red-400 mt-1">{submitError}</p>}
          </div>
          <div>
            <label className="block text-xs text-fg-muted mb-2">Review (optional)</label>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Share your experience with this product..."
              className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-sm text-fg-base focus:outline-none focus:border-accent resize-none h-28"
              maxLength={1000}
            />
            <p className="text-xs text-fg-muted text-right mt-1">{newText.length}/1000</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowForm(false); setSubmitError(""); }}
              className="flex-1 border border-[rgba(94,23,235,0.3)] text-fg-muted hover:text-accent hover:border-accent/40 font-medium py-2.5 rounded-xl transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || newRating === 0}
              className="flex-1 btn-glow-purple bg-primary text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-10 text-fg-muted">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-sm">No reviews yet. Be the first to review this product!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} onHelpful={handleHelpful} />
          ))}
        </div>
      )}
    </div>
  );
}
