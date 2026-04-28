import { StarRating } from "@/components/platform/StarRating";

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verifiedPurchase?: boolean;
  helpfulCount?: number;
}

interface ReviewCardProps {
  review: ProductReview;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-neutral-900">{review.author}</p>
          <p className="text-xs text-neutral-500">{new Date(review.createdAt).toLocaleDateString()}</p>
        </div>

        {review.verifiedPurchase ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Verified purchase
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        <StarRating rating={review.rating} />
        <h3 className="text-sm font-semibold text-neutral-900">{review.title}</h3>
        <p className="text-sm leading-relaxed text-neutral-700">{review.body}</p>
      </div>

      <p className="mt-3 text-xs text-neutral-500">Helpful votes: {review.helpfulCount ?? 0}</p>
    </article>
  );
}
