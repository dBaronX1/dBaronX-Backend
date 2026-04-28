"use client";

interface StarRatingProps {
  rating: number;
  max?: number;
  sizeClassName?: string;
  showValue?: boolean;
}

export function StarRating({
  rating,
  max = 5,
  sizeClassName = "h-4 w-4",
  showValue = true,
}: StarRatingProps) {
  const clampedRating = Math.max(0, Math.min(rating, max));

  return (
    <div className="flex items-center gap-2" aria-label={`Rating: ${clampedRating} out of ${max}`}>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, index) => {
          const isFilled = index + 1 <= Math.round(clampedRating);
          return (
            <svg
              key={index}
              viewBox="0 0 20 20"
              fill={isFilled ? "currentColor" : "none"}
              className={`${sizeClassName} ${isFilled ? "text-amber-500" : "text-neutral-300"}`}
              aria-hidden="true"
            >
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118L2.98 8.719c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          );
        })}
      </div>

      {showValue ? (
        <p className="text-xs font-medium text-neutral-700">{clampedRating.toFixed(1)}/{max}</p>
      ) : null}
    </div>
  );
}
