const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const HF_REWRITE_MODEL =
  process.env.HF_REWRITE_MODEL || "HuggingFaceTB/SmolLM2-1.7B-Instruct";
const GROQ_REWRITE_MODEL = process.env.GROQ_REWRITE_MODEL || "llama-3.1-8b-instant";
const DEFAULT_PROVIDER_ORDER = "huggingface,ollama,groq,rules";

export const emotionPrompts = {
  Happy: "joyful, upbeat, celebratory, warm, and positive",
  Serious: "authoritative, measured, sincere, precise, and composed",
  Excited: "thrilling, energetic, enthusiastic, and full of momentum",
  Calm: "peaceful, soothing, reassuring, gentle, and smooth",
  Inspirational: "motivating, uplifting, vivid, emotionally resonant, and action-oriented",
};

export function buildRewritePrompt(script, emotion = "Neutral") {
  const tone = emotionPrompts[emotion] || `${emotion.toLowerCase()} in tone`;
  return [
    "Rewrite this spoken video script so it sounds natural when read aloud.",
    `Tone: ${tone}.`,
    "Keep the same meaning and roughly the same length.",
    "Use conversational phrasing, natural pauses, and clean spoken rhythm.",
    "Return only the rewritten script. No labels, quotes, markdown, or explanation.",
    "",
    script.trim(),
  ].join("\n");
}

export function cleanRewriteOutput(text) {
  if (!text) return "";
  return text
    .replace(/^```[\w]*\n?/i, "")
    .replace(/\n?```$/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

/** Offline fallback — always succeeds without network. */
export function rewriteWithRules(script, emotion = "Neutral") {
  const text = script.trim();
  if (!text || emotion === "Neutral") return text;

  const openers = {
    Happy: ["I'm so glad to share this with you — ", "Here's some wonderful news — "],
    Serious: ["Let me be clear and direct — ", "This is important — "],
    Excited: ["You won't believe this — ", "Get ready — "],
    Calm: ["Take a breath with me — ", "Let's walk through this calmly — "],
    Inspirational: ["Imagine what's possible — ", "Here's what drives us forward — "],
  };

  const closers = {
    Happy: " Let's celebrate this together!",
    Serious: " Thank you for your attention.",
    Excited: " Let's make it happen!",
    Calm: " Everything will be alright.",
    Inspirational: " Together, we can achieve more.",
  };

  const swaps = {
    Happy: [
      [/\.(\s*)$/, "!$1"],
      [/\bgood\b/gi, "wonderful"],
      [/\bnice\b/gi, "fantastic"],
    ],
    Serious: [
      [/\bawesome\b/gi, "significant"],
      [/\bcool\b/gi, "notable"],
      [/\bgreat\b/gi, "important"],
    ],
    Excited: [
      [/\./g, "!"],
      [/\bgood\b/gi, "incredible"],
      [/\bvery\b/gi, "truly"],
    ],
    Calm: [
      [/\bnow\b/gi, "gently now"],
      [/\bhurry\b/gi, "take your time"],
      [/\bfast\b/gi, "steady"],
    ],
    Inspirational: [
      [/\byou can\b/gi, "you have the power to"],
      [/\bwe will\b/gi, "we're going to"],
      [/\bgoal\b/gi, "vision"],
    ],
  };

  const picks = openers[emotion] || openers.Inspirational;
  const opener = picks[text.length % picks.length];
  let result = text;

  for (const [pattern, replacement] of swaps[emotion] || []) {
    result = result.replace(pattern, replacement);
  }

  if (!result.toLowerCase().startsWith(opener.trim().toLowerCase().slice(0, 12))) {
    result = opener + result.charAt(0).toLowerCase() + result.slice(1);
  }

  const closer = closers[emotion];
  if (closer && !result.toLowerCase().includes(closer.trim().toLowerCase().slice(0, 15))) {
    result = result.replace(/[.!?]?\s*$/, "") + closer;
  }

  return result.replace(/\s+/g, " ").trim();
}

async function rewriteWithChatCompletions({
  url,
  apiKey,
  model,
  script,
  emotion,
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
        {
          role: "system",
          content:
            "You rewrite spoken video scripts for text-to-speech. Output only the rewritten script.",
        },
        { role: "user", content: buildRewritePrompt(script, emotion) },
      ],
      max_tokens: 700,
      temperature: 0.7,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data.error?.message || data.error || `${providerLabel} API ${response.status}`;
    throw new Error(message);
  }

  const rewritten = cleanRewriteOutput(data.choices?.[0]?.message?.content);
  if (!rewritten) throw new Error(`${providerLabel} returned an empty response`);
  return rewritten;
}

async function rewriteWithHuggingFace(script, emotion) {
  const token = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_TOKEN;
  if (!token) throw new Error("Missing HF_API_TOKEN for Hugging Face rewrite");

  return rewriteWithChatCompletions({
    url: "https://router.huggingface.co/v1/chat/completions",
    apiKey: token,
    model: HF_REWRITE_MODEL,
    script,
    emotion,
    providerLabel: "Hugging Face",
  });
}

async function rewriteWithGroq(script, emotion) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");

  return rewriteWithChatCompletions({
    url: "https://api.groq.com/openai/v1/chat/completions",
    apiKey,
    model: GROQ_REWRITE_MODEL,
    script,
    emotion,
    providerLabel: "Groq",
  });
}

async function rewriteWithOllama(script, emotion) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: buildRewritePrompt(script, emotion),
      stream: false,
      options: { temperature: 0.7, num_predict: 700 },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Ollama API ${response.status}`);
  }

  const rewritten = cleanRewriteOutput(data.response);
  if (!rewritten) throw new Error("Ollama returned an empty response");
  return rewritten;
}

const PROVIDERS = {
  huggingface: rewriteWithHuggingFace,
  ollama: rewriteWithOllama,
  groq: rewriteWithGroq,
  rules: async (script, emotion) => rewriteWithRules(script, emotion),
};

function getProviderOrder() {
  const configured = process.env.REWRITE_PROVIDER_ORDER || DEFAULT_PROVIDER_ORDER;
  const order = configured
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter((name) => PROVIDERS[name]);

  return order.length ? order : ["huggingface", "ollama", "groq", "rules"];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { script, emotion = "Neutral" } = body;

  if (!script || !script.trim()) {
    return res.status(400).json({ error: "Missing script" });
  }

  if (emotion === "Neutral") {
    return res.status(400).json({ error: "Select an emotion other than Neutral to rewrite" });
  }

  const errors = [];
  const order = getProviderOrder();

  for (const name of order) {
    try {
      const rewritten = await PROVIDERS[name](script, emotion);
      return res.status(200).json({
        script: rewritten,
        provider: name,
        model:
          name === "huggingface"
            ? HF_REWRITE_MODEL
            : name === "ollama"
              ? OLLAMA_MODEL
              : name === "groq"
                ? GROQ_REWRITE_MODEL
                : "rules",
      });
    } catch (err) {
      const message = err.cause?.code === "ECONNREFUSED" || err.message === "fetch failed"
        ? `${name}: service not reachable`
        : `${name}: ${err.message}`;
      console.warn(`Rewrite provider ${name} failed:`, err.message || err);
      errors.push(message);
    }
  }

  return res.status(500).json({
    error: errors.length
      ? `All rewrite providers failed (${errors.join("; ")})`
      : "Rewrite failed",
  });
}
