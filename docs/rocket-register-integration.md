# Rocket Register Functionality Integration

Use this as implementation documentation only. Do not copy this as customer-facing UI.

## Purpose

Wire a Rocket-designed registration form to the dBaronX auth functionality while preserving Rocket visuals, labels, animations, validation layout, and success/error presentation.

## Functional imports

```tsx
import { useSearchParams } from "next/navigation";
import { captureReferralParams, referralMetadata } from "@/lib/auth/referral-capture";
import { resolveAuthRedirect } from "@/lib/env";
import { getSupabaseRuntimeBrowserClient } from "@/lib/supabase/runtime-client";
```

## Submit handler pattern

```tsx
async function submitRegister(email: string, password: string, searchParams: URLSearchParams) {
  const supabase = await getSupabaseRuntimeBrowserClient();
  const referral = captureReferralParams(searchParams);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: resolveAuthRedirect("/auth/callback"),
      data: referralMetadata(referral),
    },
  });

  if (error) throw error;
  return data;
}
```

## Rocket page usage

Keep the Rocket register page and form controls. Call `submitRegister` from the existing Rocket submit callback, then display status with the Rocket-designed message/toast component.
