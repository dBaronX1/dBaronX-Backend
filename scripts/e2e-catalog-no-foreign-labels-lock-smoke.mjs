#!/usr/bin/env node
import { read, assert } from './e2e-production-lock-helpers.mjs';
const catalog = read('apps/api/src/modules/catalog/catalog.service.ts');
assert(/supplier:\s*"Verified Supplier"/.test(catalog), 'public supplier label must be generic');
assert(/publicLabels:\s*\["Verified Supplier", "Direct Shipping", "Global Supplier"\]/.test(catalog), 'safe public labels missing');
assert(/sourceUrl:\s*""/.test(catalog), 'public source URL must be suppressed');
assert(/imageUrl:\s*images\[0\]/.test(catalog) && /thumbnail/.test(catalog) && /images/.test(catalog), 'catalog image fields missing');
assert(/safePublicText/.test(catalog) && /publicMetadata/.test(catalog), 'public metadata foreign wording scrub missing');
console.log('catalog no foreign labels lock smoke passed');
