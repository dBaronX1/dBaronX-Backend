# Web i18n + Accessibility Recovery

## Scope
- Target: `apps/web`
- Source snapshot: `.dbx-source/dbaronx-frontend/src/locales/*`, `.dbx-source/dbaronx-frontend/src/components/AccessibilityBar.tsx`, `.dbx-source/dbaronx-frontend/src/components/LanguageSwitcher.tsx`
- Non-goals: replacing Rocket UI architecture, route structure, or platform layouts.

## What was migrated
1. Legacy locale payloads were copied into `apps/web/src/lib/i18n/locales` for production-safe ownership inside the active web app.
2. A typed locale registry and helpers were added in `apps/web/src/lib/i18n/legacy-i18n.ts`.
3. A new `LocaleAccessibilityControls` component was introduced to recover core behavior from legacy accessibility and language switcher components:
   - skip-link to `#main-content`
   - locale switcher (en/fr/ar/tw)
   - high-contrast toggle
   - reduced-motion toggle
   - persisted settings in localStorage
   - document-level `lang` + `dir` updates
4. Controls were integrated into `OpsNav` so platform page architecture remains intact.
5. Platform layout now wraps page content in `<main id="main-content">` so skip-link targets are valid.

## Migration decisions
- Legacy JSON payloads were imported as static modules (no runtime dependency on `.dbx-source`).
- Accessibility behavior was adapted for current neutral Rocket UI style classes.
- Reduced-motion uses a global class override strategy (`.dbx-reduce-motion`) to avoid route/layout replacement.
- High-contrast behavior uses a global `filter: contrast(...)` class (`.dbx-high-contrast`) for broad compatibility.

## Validation
- `pnpm --filter dbaronx-web typecheck`
- `pnpm --filter dbaronx-web build`
