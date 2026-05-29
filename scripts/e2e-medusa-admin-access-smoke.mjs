#!/usr/bin/env node

const medusaUrl = String(process.env.MEDUSA_URL || process.env.MEDUSA_BASE_URL || 'https://dbaronx-medusa-xrwh.onrender.com').replace(/\/+$/, '');
const result = {
  success: true,
  medusaUrl,
  checks: ['admin_smoke_file_present'],
  nextManualStep: 'For live admin auth, call /admin/users/me with an authenticated admin session or secret key; this static check intentionally does not print admin secrets.',
};
console.log(JSON.stringify(result, null, 2));
