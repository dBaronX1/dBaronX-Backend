# Web Reviews + Traceability Recovery (Migration Task 2)

## Scope
- Target: `apps/web`
- Source intent: legacy review/rating/traceability UX behavior from historical frontend snapshot
- Constraint: keep Rocket UI shells/routes/layouts intact and add behavior without cross-app coupling

## Source inspection outcome
Requested source paths under `.dbx-source/dbaronx-frontend/src/components/*` were **not present** in this repository checkout. Migration proceeded by implementing the requested behaviors (rating stars, review cards/listing, traceability payload component) with current `apps/web` primitives and coding style.

## What was added
- `StarRating` component: compact star visualization with clamped values and optional score text.
- `ReviewCard` component: reviewer identity, verification badge, rating, and helpful vote line.
- `ProductReviews` component: review summary panel, average rating, and client-side sorting (newest/highest/lowest).
- `TraceabilityQR` component: low-bandwidth trace payload section with product/lot/origin metadata and copy-to-clipboard action.

## Integration decision
- Added the new components to `storefront-catalog` as an additive section because this route already surfaces product and variant mirror data and does not alter existing platform layout conventions.
- Reviews are synthesized from mirrored product rows to remain platform-safe until first-class review APIs are introduced.
- Traceability payload is generated from available product fields (`id`, `handle`, `sku` fallbacks) to avoid backend changes and preserve build/typecheck safety.

## Non-goals respected
- No runtime imports from `.dbx-source`
- No edits to `apps/api`, `apps/services-fastapi`, `apps/telegram-bot`, `apps/medusa`
- No route or layout replacement
