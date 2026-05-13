export {
  CUSTOMER_AUTH_UNAVAILABLE_MESSAGE as CUSTOMER_ACCESS_UNAVAILABLE_MESSAGE,
  getBrowserPublicConfig as getBrowserCustomerConfig,
  hasSupabasePublicConfig as hasCustomerAccessConfig,
} from "@/lib/public-config";

export { getSupabaseRuntimeBrowserClient as getCustomerAuthClient } from "@/lib/supabase/runtime-client";
