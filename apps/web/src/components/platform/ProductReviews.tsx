"use client";

import { useMemo, useState } from "react";
import { ReviewCard, type ProductReview } from "@/components/platform/ReviewCard";
import { StarRating } from "@/components/platform/StarRating";

interface ProductReviewsProps {
  title: string;
  reviews: ProductReview[];
}

type ReviewSort = "newest" | "highest" | "lowest";

export function ProductReviews({ title, reviews }: ProductReviewsProps) {
  const [sort, setSort] = useState<ReviewSort>("newest");

  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const sortedReviews = useMemo(() => {
    const copy = [...reviews];

    if (sort === "highest") {
      return copy.sort((a, b) => b.rating - a.rating);
    }

    if (sort === "lowest") {
      return copy.sort((a, b) => a.rating - b.rating);
    }

    return copy.sort(
      (a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf(),
    );
  }, [reviews, sort]);

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          <p className="text-sm text-neutral-600">Customer review sentiment from mirrored storefront metadata.</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          Sort
          <select
            className="rounded-xl border bg-white px-3 py-2 text-sm"
            value={sort}
            onChange={(event) => setSort(event.target.value as ReviewSort)}
          >
            <option value="newest">Newest</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-xl bg-neutral-50 p-3">
        <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Average rating</p>
        <div className="mt-1 flex items-center gap-3">
          <StarRating rating={average} sizeClassName="h-5 w-5" />
          <p className="text-sm text-neutral-600">{reviews.length} total reviews</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {sortedReviews.length === 0 ? (
          <p className="text-sm text-neutral-600">No review activity has been mirrored yet.</p>
        ) : (
          sortedReviews.slice(0, 6).map((review) => <ReviewCard key={review.id} review={review} />)
        )}
      </div>
    </section>
  );
}
