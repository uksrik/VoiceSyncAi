/**
 * Syncs variables from .env.local to Vercel (production, preview, development).
 * Secrets are never written to the repo — only pushed via the Vercel CLI.
 *
 * Usage: node scripts/push-vercel-env.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

if (!existsSync(envPath)) {
  console.error("Missing .env.local — create it with HF_API_TOKEN and FAL_KEY first.");
  process.exit(1);
}

const parsed = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  parsed[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

/** Keys used by serverless API routes on Vercel */
const VERCEL_KEYS = [
  "HF_API_TOKEN",
  "HUGGINGFACE_TOKEN",
  "FAL_KEY",
  "HF_REWRITE_MODEL",
  "REWRITE_PROVIDER_ORDER",
];

if (parsed.HF_API_TOKEN && !parsed.HUGGINGFACE_TOKEN) {
  parsed.HUGGINGFACE_TOKEN = parsed.HF_API_TOKEN;
}

if (!parsed.REWRITE_PROVIDER_ORDER) {
  parsed.REWRITE_PROVIDER_ORDER = "huggingface,groq,rules";
}

if (!parsed.HF_REWRITE_MODEL) {
  parsed.HF_REWRITE_MODEL = "HuggingFaceTB/SmolLM2-1.7B-Instruct";
}

const environments = ["production", "preview", "development"];

function pushEnv(name, value, target) {
  const result = spawnSync(
    "vercel",
    ["env", "add", name, target, "--value", value, "--sensitive", "--yes", "--force"],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"], shell: true }
  );

  if (result.status !== 0) {
    const err = (result.stderr?.toString() || result.stdout?.toString() || "").trim();
    console.error(`  ✗ ${name} (${target}): ${err || "failed"}`);
    return false;
  }
  console.log(`  ✓ ${name} → ${target}`);
  return true;
}

console.log("Pushing environment variables from .env.local to Vercel...\n");

let ok = 0;
let fail = 0;

for (const target of environments) {
  console.log(`[${target}]`);
  for (const key of VERCEL_KEYS) {
    const value = parsed[key];
    if (!value) {
      console.log(`  − ${key} (skipped, not in .env.local)`);
      continue;
    }
    if (pushEnv(key, value, target)) ok += 1;
    else fail += 1;
  }
  console.log("");
}

if (fail > 0) {
  console.error(`Done with ${fail} error(s). Run \`vercel login\` if needed.`);
  process.exit(1);
}

console.log(`Synced ${ok} variable(s). Redeploy: vercel --prod`);
