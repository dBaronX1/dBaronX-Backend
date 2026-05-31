#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
const checks=[]; const check=(name,pass)=>checks.push({name,pass:Boolean(pass)}); const file=(p)=>existsSync(p)?readFileSync(p,"utf8"):"";
const controller=file("apps/api/src/modules/ai-stories/ai-stories-generation.controller.ts");
const service=file("apps/api/src/modules/ai-stories/ai-stories-generation.service.ts");
const module=file("apps/api/src/modules/ai-stories/ai-stories.module.ts");
const combined=`${controller}\n${service}\n${module}`;
check("GET /api/v1/ai-stories/readiness route exists", /@Controller\(\{\s*path:\s*"ai-stories",\s*version:\s*"1"/.test(controller) && /@Get\("readiness"\)/.test(controller));
check("POST /api/v1/ai-stories/generate route exists", /@Post\("generate"\)/.test(controller));
check("NestJS calls FastAPI readiness route", /\/ai\/stories\/readiness/.test(service));
check("NestJS calls FastAPI generation route", /\/ai\/stories\/generate/.test(service));
check("FastAPI route missing is returned as safe blocker", /fastapi_route_missing/.test(service));
check("AI provider missing is returned as safe blocker", /ai_provider_missing/.test(service));
check("NestJS does not call AI providers directly", !/OpenAI|Anthropic|GoogleGenerativeAI|GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY/.test(combined));
check("raw provider errors are not returned", /safeDiagnostics/.test(service) && !/error\.stack|providerError|rawError/.test(service));
const failed=checks.filter((c)=>!c.pass); for (const c of checks) console.log(`${c.pass?"ok":"not ok"} - ${c.name}`); if(failed.length) process.exit(1);
