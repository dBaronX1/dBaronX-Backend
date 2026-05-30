#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const blockers = [];
const rocketRoute = await readFile('apps/web/src/app/api/ai-stories/route.ts', 'utf8');
const nestService = await readFile('apps/api/src/modules/ai-stories/ai-stories-generation.service.ts', 'utf8');
const fastapiRoute = await readFile('apps/services-fastapi/src/app/api/routes/ai_generation.py', 'utf8');
const panel = await readFile('apps/web/src/components/dbx/AiStoryGeneratorPanel.tsx', 'utf8');
if (!rocketRoute.includes('/api/v1/ai-stories/generate')) blockers.push('rocket_not_calling_nestjs_ai_stories_generate');
if (/api\.openai\.com|generativelanguage\.googleapis|anthropic\.com/i.test(rocketRoute)) blockers.push('rocket_calls_provider_directly');
if (!nestService.includes('/ai/stories/generate')) blockers.push('nestjs_not_calling_fastapi_generation');
if (!nestService.includes('/ai/stories/readiness')) blockers.push('nestjs_not_calling_fastapi_readiness');
if (!fastapiRoute.includes('/stories/generate') || !fastapiRoute.includes('/stories/readiness')) blockers.push('fastapi_ai_stories_routes_missing');
for (const code of ['ai_provider_missing', 'fastapi_route_missing', 'fastapi_unavailable', 'persistence_failed', 'validation_failed', 'provider_failed']) {
  if (!rocketRoute.includes(code) || !panel.includes(code)) blockers.push(`safe_error_code_missing_${code}`);
}
for (const title of ['Starlight Children', 'The Last Dragon', 'The Solar Forest', 'Quantum Dreams', 'Midnight Protocol', 'The Merchant’s Secret']) if (!panel.includes(title)) blockers.push(`placeholder_concept_missing_${title}`);
console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);
