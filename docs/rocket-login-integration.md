# Rocket Login Functionality Integration

Use this as implementation documentation only. Do not copy this as customer-facing UI.

## Purpose

Connect a Rocket-designed login form to dBaronX auth without replacing Rocket visuals.

## Functional imports

```tsx
import { appendReferralParams, captureReferralParams } from "@/lib/auth/referral-capture";
import { getSupabaseRuntimeBrowserClient } from "@/lib/supabase/runtime-client";
```

## Submit handler pattern

```tsx
async function submitLogin(email: string, password: string) {
  const supabase = await getSupabaseRuntimeBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
```

## Redirect helper pattern

```tsx
function nextAfterLogin(searchParams: URLSearchParams) {
  const referral = captureReferralParams(searchParams);
  return appendReferralParams("/account", referral);
}
```

## Rocket page usage

Keep the Rocket login page. Call `submitLogin` from the Rocket form submit callback and route to the Rocket account page when the returned session is present.
