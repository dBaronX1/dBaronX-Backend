#!/usr/bin/env node
const checklist = `
Supabase Auth production checklist for dBaronX

1. Site URL checklist
   - Set Site URL to: https://dbaronx.com
   - Keep NEXT_PUBLIC_SITE_URL aligned with the canonical production site.

2. Redirect URL checklist
   - Allow: https://dbaronx.com/auth/callback
   - Allow: https://www.dbaronx.com/auth/callback
   - Allow: https://dbaronx-web.fly.dev/auth/callback

3. Email provider checklist
   - Enable the Supabase Email provider.
   - Decide before launch whether Confirm Email is enabled.
   - If Confirm Email is enabled, complete a real signup and confirm the callback redirects to /onboarding.

4. SMTP recommendation
   - Configure custom SMTP for production email reliability.
   - During tests, check inbox, spam, and promotions folders.
   - Use the Register page resend-confirmation action if the first message is delayed.

5. Test signup checklist
   - Register with full name, email, password, and matching confirm password.
   - Confirm Auth user metadata includes full_name, display_name, referral_code, invite_code, initiation_code, source, and onboarding_target when supplied.
   - Confirm customers see safe guidance only, not developer configuration names.

6. First-owner bootstrap after signup checklist
   - Run first-owner referral/reference/invitation creation only after the real Supabase user exists.
   - Do not create fake profiles or placeholder first-user records from the frontend.

7. No secrets
   - The Web frontend may use only public Supabase URL and anon key.
   - Never expose service role keys, database URLs, Stripe secrets, Telegram tokens, CJ tokens, or internal tokens to Web.
`;

console.log(checklist.trim());
