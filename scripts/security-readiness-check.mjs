#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const MAX_SCAN_BYTES = 2 * 1024 * 1024;

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function listTrackedFiles() {
  return git(['ls-files'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isTrackedEnvFile(file) {
  const parts = file.split('/');
  const name = parts[parts.length - 1];
  if (name === '.env') return true;
  if (name.endsWith('.env')) return true;
  if (name.startsWith('.env.') && !name.endsWith('.example') && !name.endsWith('.sample') && !name.endsWith('.template')) return true;
  return false;
}

function isLikelyPlaceholder(value) {
  const normalized = value.trim().replace(/^['"]|['"]$/g, '').trim();
  if (!normalized) return true;
  if (/^(changeme|change-me|placeholder|example|todo|replace-me|dummy|fake|test|local|none|null|undefined)$/i.test(normalized)) return true;
  if (/^<[^>]+>$/.test(normalized)) return true;
  if (/^\$\{[^}]+\}$/.test(normalized)) return true;
  if (/your[-_]/i.test(normalized)) return true;
  return false;
}

function extractEnvValue(line, key) {
  const match = line.match(new RegExp(`(?:^|\\b)(?:export\\s+)?${key}\\s*=\\s*([^#\\s]+)`, 'i'));
  return match?.[1]?.trim() ?? null;
}

const secretChecks = [
  {
    id: 'stripe_secret_key',
    severity: 'blocker',
    test(file, line) {
      const value = extractEnvValue(line, 'STRIPE_SECRET_KEY');
      if (!value || isLikelyPlaceholder(value)) return false;
      return /^sk_(test|live)_[A-Za-z0-9]{16,}/.test(value.replace(/^['"]|['"]$/g, ''));
    },
  },
  {
    id: 'supabase_service_role_key',
    severity: 'blocker',
    test(file, line) {
      const value = extractEnvValue(line, 'SUPABASE_SERVICE_ROLE_KEY');
      if (!value || isLikelyPlaceholder(value)) return false;
      const clean = value.replace(/^['"]|['"]$/g, '');
      return clean.length >= 40 && /^[A-Za-z0-9._-]+$/.test(clean);
    },
  },
  {
    id: 'cj_access_token',
    severity: 'blocker',
    test(file, line) {
      const value = extractEnvValue(line, 'CJ_ACCESS_TOKEN');
      if (!value || isLikelyPlaceholder(value)) return false;
      const clean = value.replace(/^['"]|['"]$/g, '');
      return clean.length >= 20 && /^[A-Za-z0-9._-]+$/.test(clean);
    },
  },
  {
    id: 'private_key_env',
    severity: 'blocker',
    test(file, line) {
      const match = line.match(/(?:^|\b)(?:export\s+)?[A-Z0-9_]*(?:DB_)?PRIVATE_KEY\s*=\s*([^#\s]+)/i);
      if (!match || isLikelyPlaceholder(match[1])) return false;
      return /[A-Za-z0-9+/=_-]{16,}/.test(match[1]);
    },
  },
  {
    id: 'seed_phrase_env',
    severity: 'blocker',
    test(file, line) {
      const value = extractEnvValue(line, 'SEED_PHRASE') ?? extractEnvValue(line, 'MNEMONIC');
      if (!value || isLikelyPlaceholder(value)) return false;
      const clean = value.replace(/^['"]|['"]$/g, '');
      return clean.split(/[\s,]+/).filter(Boolean).length >= 12 || /[A-Za-z]+(?:\s+[A-Za-z]+){11,}/.test(clean);
    },
  },
  {
    id: 'pem_private_key',
    severity: 'blocker',
    test(file, line) {
      return /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line);
    },
  },
  {
    id: 'database_private_key',
    severity: 'blocker',
    test(file, line) {
      const value = extractEnvValue(line, 'DB_PRIVATE_KEY') ?? extractEnvValue(line, 'DATABASE_PRIVATE_KEY');
      if (!value || isLikelyPlaceholder(value)) return false;
      return /[A-Za-z0-9+/=_-]{16,}/.test(value);
    },
  },
];

const files = listTrackedFiles();
const trackedEnvFiles = files.filter(isTrackedEnvFile);
const secretPatternMatches = [];
const conflictMarkersFound = [];
const warnings = [];

for (const file of files) {
  let stat;
  try {
    stat = statSync(file);
  } catch {
    warnings.push({ file, warning: 'tracked_file_not_readable' });
    continue;
  }

  if (!stat.isFile()) continue;
  if (stat.size > MAX_SCAN_BYTES) {
    warnings.push({ file, warning: 'skipped_large_tracked_file', bytes: stat.size });
    continue;
  }

  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    warnings.push({ file, warning: 'skipped_non_utf8_or_unreadable_file' });
    continue;
  }

  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (/^(<<<<<<<|=======|>>>>>>>)($|\s)/.test(line)) {
      conflictMarkersFound.push({ file, line: lineNumber, marker: line.trim().slice(0, 40) });
    }

    for (const check of secretChecks) {
      if (check.test(file, line)) {
        secretPatternMatches.push({ file, line: lineNumber, id: check.id, severity: check.severity });
      }
    }
  });
}

const blockers = [];
if (trackedEnvFiles.length > 0) {
  blockers.push('tracked_env_files_found');
}
if (secretPatternMatches.some((match) => match.severity === 'blocker')) {
  blockers.push('secret_pattern_matches_found');
}
if (conflictMarkersFound.length > 0) {
  blockers.push('conflict_markers_found');
}

const result = {
  success: blockers.length === 0,
  blockers,
  warnings,
  trackedEnvFiles,
  secretPatternMatches,
  conflictMarkersFound,
  nextManualStep:
    blockers.length === 0
      ? 'Replace ownership/contact placeholders, enable branch protection/CODEOWNERS reviews, and verify platform secret stores outside the repository.'
      : 'Remove tracked env files, rotate exposed secrets, resolve conflict markers, then rerun security:readiness before release.',
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
