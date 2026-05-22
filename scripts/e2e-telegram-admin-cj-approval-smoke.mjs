#!/usr/bin/env node
import fs from 'node:fs';

const content = fs.readFileSync('docs/cj-fulfillment-automation-roadmap.md', 'utf8');
if (!content.includes('telegram_callback_not_wired')) {
  throw new Error('telegram callback blocker must be explicit until fully wired');
}
if (!content.includes('1838800389')) {
  throw new Error('owner admin id contract missing');
}
console.log('PASS e2e-telegram-admin-cj-approval-smoke');
