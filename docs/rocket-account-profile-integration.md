# Rocket Account/Profile Functionality Integration

Use this as implementation documentation only. Do not copy this as customer-facing UI.

## Purpose

Let Rocket-designed account/profile surfaces read auth state and perform sign-out while preserving Rocket layout and customer-facing copy.

## Functional imports

```tsx
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { getSupabaseRuntimeBrowserClient } from "@/lib/supabase/runtime-client";
```

## Session usage pattern

```tsx
function useRocketAccountState() {
  const { session, loading, error, signedIn } = useAuthSession();
  return {
    loading,
    error,
    signedIn,
    email: session?.user?.email || "",
    userId: session?.user?.id || "",
  };
}
```

## Sign-out pattern

```tsx
async function signOutCustomer() {
  const supabase = await getSupabaseRuntimeBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

## Rocket page usage

Keep the Rocket account/profile components. Use the returned state to choose which Rocket-designed panel to show and wire `signOutCustomer` to the existing Rocket sign-out action.
