import { fal } from "@fal-ai/client";
import { cleanRewriteOutput } from "./rewrite.js";

const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export function getHfToken() {
  return process.env.HF_API_TOKEN || process.env.HUGGINGFACE_TOKEN || "";
}

export function formatProviderError(name, err) {
  const raw = err?.message || String(err);
  if (raw.includes("Insufficient permissions") || raw.includes("Inference Providers")) {
    return `${name}: Hugging Face token needs "Inference Providers" permission — create a new token at https://huggingface.co/settings/tokens`;
  }
  if (raw.includes("Exhausted balance") || raw.includes("User is locked")) {
    return `${name}: fal.ai balance exhausted — top up at https://fal.ai/dashboard/billing or use Groq (free)`;
  }
  if (err?.cause?.code === "ECONNREFUSED" || raw === "fetch failed") {
    return `${name}: service not reachable`;
  }
  return `${name}: ${raw}`;
}

export async function chatCompletions({
  url,
  apiKey,
  model,
  system,
  user,
  maxTokens = 500,
  providerLabel,
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.72,
    }),
    signal: AbortSignal.timeout(90000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.error?.message || data.error || `${providerLabel} API ${response.status}`
    );
  }

  const text = cleanRewriteOutput(data.choices?.[0]?.message?.content);
  if (!text) throw new Error(`${providerLabel} returned an empty response`);
  return text;
}

export async function chatWithHuggingFace({ model, system, user, maxTokens }) {
  const token = getHfToken();
  if (!token) throw new Error("Missing HF_API_TOKEN");

  return chatCompletions({
    url: HF_CHAT_URL,
    apiKey: token,
    model,
    system,
    user,
    maxTokens,
    providerLabel: "Hugging Face",
  });
}

export async function chatWithGroq({ model, system, user, maxTokens }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");

  return chatCompletions({
    url: GROQ_CHAT_URL,
    apiKey,
    model,
    system,
    user,
    maxTokens,
    providerLabel: "Groq",
  });
}

export async function chatWithFal({ model, system, user }) {
  if (!process.env.FAL_KEY) throw new Error("Missing FAL_KEY");

  fal.config({ credentials: process.env.FAL_KEY });
  const prompt = [system, user].filter(Boolean).join("\n\n");

  const result = await fal.subscribe("fal-ai/any-llm", {
    input: {
      model: model || process.env.FAL_LLM_MODEL || "meta-llama/llama-3.2-3b-instruct",
      prompt,
    },
  });

  const text = cleanRewriteOutput(result?.output || result?.data?.output);
  if (!text) throw new Error("fal returned an empty response");
  return text;
}

/** Skip providers that cannot run (no API key). */
export function filterProviderOrder(order) {
  return order.filter(name => {
    if (name === "rules") return true;
    if (name === "fal") return !!process.env.FAL_KEY;
    if (name === "groq") return !!process.env.GROQ_API_KEY;
    if (name === "huggingface") return !!getHfToken();
    if (name === "ollama") return true;
    return false;
  });
}

export function buildAiUnavailableHint(errors) {
  const joined = errors.join("; ");
  const hints = [];

  if (joined.includes("Inference Providers")) {
    hints.push(
      "Update your Hugging Face token: enable “Make calls to Inference Providers” at https://huggingface.co/settings/tokens"
    );
  }
  if (joined.includes("Exhausted balance") || joined.includes("fal.ai balance")) {
    hints.push("Top up fal.ai billing or use another provider.");
  }
  if (joined.includes("Missing GROQ_API_KEY") || !process.env.GROQ_API_KEY) {
    hints.push(
      "Add a free GROQ_API_KEY (https://console.groq.com) to .env.local and run npm run vercel:env"
    );
  }
  if (!getHfToken() && !process.env.GROQ_API_KEY && !process.env.FAL_KEY) {
    hints.push("Configure at least one of: GROQ_API_KEY, HF_API_TOKEN, or FAL_KEY on the server.");
  }

  if (hints.length) return hints.join(" ");
  return joined || "All AI providers failed.";
}
