#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('apps/web/src/components/dbx/CustomerAccountPanel.tsx', 'utf8');
const blockers = [];
for (const raw of ['email_verified', 'phone_verified', 'source', 'sub']) {
  if (new RegExp(`\\b${raw}\\b`).test(source)) blockers.push(`raw_metadata_${raw}_rendered`);
}
if (/Additional Info/i.test(source)) blockers.push('additional_info_section_present');
for (const value of ['Male', 'Female', 'Prefer not to say', 'He', 'She']) if (!source.includes(value)) blockers.push(`missing_option_${value}`);
if (!source.includes('type="file"') || !source.includes('image/jpeg,image/jpg,image/png,image/webp')) blockers.push('profile_photo_file_input_contract_missing');
for (const label of ['Country', 'Phone code', 'Language']) if (!source.includes(`label="${label}"`)) blockers.push(`missing_single_line_${label.toLowerCase().replaceAll(' ', '_')}`);
if (/password|hash/i.test(source.replace(/Password\/security controls must not show actual password or hash\./g, ''))) blockers.push('password_or_hash_render_marker_present');
console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);
