#!/usr/bin/env node
import fs from 'node:fs';
const y=fs.readFileSync('.github/workflows/cj-operator-onboarding.yml','utf8');
for (const k of ['workflow_dispatch:','mode:','readiness, preview, import, approve-safe, publish-approved, full-safe','category:','all, electronics, fashion, home-living, beauty, sports, automotive, agriculture, tech, finance','limitPerCategory:',"default: '5'",'category=fashion and limitPerCategory=5','category=all with 50 is heavy','heavyPreviewWarning=category=all limitPerCategory=50 is supported but heavy; prefer 5-10 first','dryRun:','readinessExitZero:','artifacts/cj-operator-output.json']) if(!y.includes(k)) throw new Error(`missing ${k}`);
for (const bad of ['printenv','env |','echo $CJ_ACCESS_TOKEN','echo $CJ_API_KEY']) if (y.includes(bad)) throw new Error(`secret echo risk ${bad}`);
console.log(JSON.stringify({success:true,smoke:'cj-github-action-safe-limit-guidance'}));
