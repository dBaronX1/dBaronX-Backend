#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(process.env.ROCKET_REPO_ROOT || process.cwd());
const rocketRoot = fs.existsSync(path.join(repoRoot, "apps/web/src")) ? "apps/web/src" : "src";
const failures = [];
const warnings = [];

function rel(file) {
  return path.relative(repoRoot, file).replaceAll(path.sep, "/");
}

function file(pathname) {
  return path.join(repoRoot, pathname);
}

function read(pathname) {
  const full = file(pathname);
  if (!fs.existsSync(full)) {
    failures.push(`Missing required file: ${pathname}`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function has(content, pattern) {
  return typeof pattern === "string" ? content.includes(pattern) : pattern.test(content);
}


function sourceChainIncludes(entryFile, pattern, visited = new Set()) {
  if (visited.has(entryFile)) return false;
  visited.add(entryFile);
  const content = read(entryFile);
  if (has(content, pattern)) return true;
  const imports = [...content.matchAll(/from\s+["'](@\/[^"']+)["']/g)].map((match) => match[1]);
  return imports.some((specifier) => {
    const withoutAlias = specifier.replace("@/", `${rocketRoot}/`);
    const candidates = [
      `${withoutAlias}.tsx`,
      `${withoutAlias}.ts`,
      path.join(withoutAlias, "index.tsx"),
      path.join(withoutAlias, "index.ts"),
    ];
    return candidates.some((candidate) => fs.existsSync(file(candidate)) && sourceChainIncludes(candidate, pattern, visited));
  });
}

function listFiles(dir, predicate = () => true) {
  const root = file(dir);
  if (!fs.existsSync(root)) return [];
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (["node_modules", ".next", ".git", "dist", "build", "coverage"].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (predicate(full)) out.push(full);
    }
  }
  return out;
}

const routePath = `${rocketRoot}/app/api/ai-stories/route.ts`;
const aiStoriesPagePath = `${rocketRoot}/app/ai-stories/page.tsx`;
const createPagePath = `${rocketRoot}/app/ai-stories/create/page.tsx`;
const generatorPagePath = `${rocketRoot}/app/ai-story-generator/page.tsx`;

const route = read(routePath);
const aiStoriesPage = read(aiStoriesPagePath);
const createPage = read(createPagePath);
const generatorPage = read(generatorPagePath);

assert(has(route, /export\s+async\s+function\s+POST\s*\(/), "Rocket /api/ai-stories route must export POST().");
assert(has(route, /prompt/), "Route must accept prompt.");
assert(has(route, /genre/), "Route must accept genre.");
assert(has(route, /length/), "Route must accept length.");
assert(has(route, /tone/), "Route must accept tone.");
assert(has(route, /is_series/) && has(route, /isSeries/), "Route must normalize both is_series and isSeries.");
assert(has(route, /content\s*:/) || has(route, /content,/), "Route response must include content.");
assert(has(route, /story\s*:/), "Route response must include story.");
assert(has(route, /saved\s*:/), "Route response must include saved.");
assert(has(route, /provider\s*:/), "Route response must include provider.");
assert(has(route, /getUser|getSession|auth\./), "Route must derive auth user from Supabase server/session auth.");
assert(!has(route, /body\s*\.\s*user_id|user_id\s*=\s*body|const\s+\{[^}]*user_id/), "Route must not trust arbitrary body.user_id for persistence.");
assert(!has(route, /NEXT_PUBLIC_SUPABASE_ANON_KEY[\s\S]{0,120}(service|admin|privileged|insert|upsert)/i), "Route must not use NEXT_PUBLIC_SUPABASE_ANON_KEY for privileged server writes.");
assert(!has(route, /error\.message\s*[,}]|message\s*:\s*[^\n]*(provider|supabase|error)\s*\.\s*message/i), "Route must not return raw provider/Supabase error.message publicly.");

const normalizedResponsePattern = /success\s*:\s*true[\s\S]*provider[\s\S]*content[\s\S]*story[\s\S]*saved|success[\s\S]*provider[\s\S]*content[\s\S]*story[\s\S]*saved/;
assert(has(route, normalizedResponsePattern), "Route must return normalized success/provider/content/story/saved response.");

for (const [pathname, content] of [
  [aiStoriesPagePath, aiStoriesPage],
  [createPagePath, createPage],
  [generatorPagePath, generatorPage],
]) {
  assert(sourceChainIncludes(pathname, /fetch\(["']\/api\/ai-stories["']/), `${pathname} must call Rocket-local /api/ai-stories.`);
  assert(sourceChainIncludes(pathname, /prompt/), `${pathname} must send prompt.`);
  assert(sourceChainIncludes(pathname, /genre/), `${pathname} should send normalized genre when available.`);
  assert(sourceChainIncludes(pathname, /length/), `${pathname} should send normalized length when available.`);
  assert(sourceChainIncludes(pathname, /tone/), `${pathname} should send normalized tone when available.`);
  assert(sourceChainIncludes(pathname, /data\.content|content\s*=\s*data\?\.content|content:\s*data\.content/), `${pathname} must read generated story text from data.content.`);
  assert(!has(content, /set[A-Za-z0-9_]*\(\s*data\.story\s*\)|<[^>]*>\s*\{\s*data\.story\s*\}/), `${pathname} must not render object data.story as text.`);
  assert(!has(content, /INTERNAL_SERVICE_TOKEN|SUPABASE_SERVICE_ROLE|ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY/), `${pathname} must not expose server/internal secrets.`);
}

assert(!has(generatorPage, /user_id\s*:\s*["']anonymous["']/), "/ai-story-generator must not send user_id: \"anonymous\".");
assert(!has(aiStoriesPage, /user_id\s*:/), "/ai-stories should rely on server/session auth instead of sending user_id.");
assert(!has(createPage, /user_id\s*:/), "/ai-stories/create should rely on server/session auth instead of sending user_id.");
assert(!has(createPage, /fetch\(["']\/api\/ai-stories["'][\s\S]*fetch\(["']\/api\/ai-stories["']/), "/ai-stories/create must not double-save by default.");
warn(sourceChainIncludes(createPagePath, /saved\s*={0,2}\s*false|!data\.saved|data\.saved\s*={0,2}\s*false/), "/ai-stories/create should gate any manual save path on saved=false.");

const frontendFiles = listFiles(rocketRoot, (full) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(full));
for (const full of frontendFiles) {
  const content = fs.readFileSync(full, "utf8");
  const relative = rel(full);
  if (relative === routePath) continue;
  assert(!has(content, /ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY|SUPABASE_SERVICE_ROLE|INTERNAL_SERVICE_TOKEN/), `${relative} must not expose AI provider keys, Supabase service role, or internal token.`);
}

console.log(`AI Stories generation contract smoke root: ${repoRoot}`);
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (failures.length > 0) {
  console.error("Failures:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("AI Stories generation contract smoke passed.");
