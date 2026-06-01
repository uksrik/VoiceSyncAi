import {
  cleanRewriteOutput,
  emotionPrompts,
  rewriteWithRules,
} from "./rewrite.js";
import {
  chatWithFal,
  chatWithGroq,
  chatWithHuggingFace,
  filterProviderOrder,
  formatProviderError,
  buildAiUnavailableHint,
} from "./llm-shared.js";

const HF_MODEL =
  process.env.HF_SLIDE_SCRIPT_MODEL ||
  process.env.HF_REWRITE_MODEL ||
  "HuggingFaceTB/SmolLM2-1.7B-Instruct";
const GROQ_MODEL =
  process.env.GROQ_SLIDE_SCRIPT_MODEL ||
  process.env.GROQ_REWRITE_MODEL ||
  "llama-3.3-70b-versatile";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const DEFAULT_PROVIDER_ORDER = "groq,fal,huggingface,ollama,rules";

const SYSTEM_PROMPT =
  "You write voice-over narration for presentation slides. Output only the spoken script.";

export function slideSourceText(slide) {
  const parts = [slide.content, slide.body, slide.title]
    .map(s => (s || "").trim())
    .filter(Boolean);
  const seen = new Set();
  const unique = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }
  return unique.join("\n\n").trim();
}

export function buildSlideScriptPrompt(slide, emotion = "Neutral") {
  const tone = emotionPrompts[emotion] || `${emotion.toLowerCase()} in tone`;
  const source = slideSourceText(slide);
  const title = slide.title?.trim() || `Slide ${slide.index}`;

  return [
    `You are writing a voice-over script for slide ${slide.index} of a presentation.`,
    `Tone: ${tone}.`,
    "Rules:",
    "- Explain the slide's actual message using the slide text below (do not invent unrelated facts).",
    "- Write 2 to 5 natural spoken sentences (about 25–80 words).",
    "- Sound like a presenter talking to an audience, not a slide title reader.",
    "- Do NOT say 'Welcome', 'Moving to slide', or 'Let's look at slide'.",
    "- No bullet symbols, markdown, labels, or quotes — narration only.",
    "",
    `Slide title: ${title}`,
    "Slide text:",
    source || "(No text was detected on this slide — briefly introduce the topic from the title only.)",
  ].join("\n");
}

async function generateWithOllama(slide, emotion) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: `${SYSTEM_PROMPT}\n\n${buildSlideScriptPrompt(slide, emotion)}`,
      stream: false,
      options: { temperature: 0.72, num_predict: 500 },
    }),
    signal: AbortSignal.timeout(120000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Ollama API ${response.status}`);

  const script = cleanRewriteOutput(data.response);
  if (!script) throw new Error("Ollama returned an empty response");
  return script;
}

const PROVIDERS = {
  groq: (slide, emotion) =>
    chatWithGroq({
      model: GROQ_MODEL,
      system: SYSTEM_PROMPT,
      user: buildSlideScriptPrompt(slide, emotion),
    }),
  fal: (slide, emotion) =>
    chatWithFal({
      system: SYSTEM_PROMPT,
      user: buildSlideScriptPrompt(slide, emotion),
      model: process.env.FAL_SLIDE_SCRIPT_MODEL,
    }),
  huggingface: (slide, emotion) =>
    chatWithHuggingFace({
      model: HF_MODEL,
      system: SYSTEM_PROMPT,
      user: buildSlideScriptPrompt(slide, emotion),
    }),
  ollama: generateWithOllama,
};

function getProviderOrder() {
  const configured =
    process.env.SLIDE_SCRIPT_PROVIDER_ORDER ||
    process.env.REWRITE_PROVIDER_ORDER ||
    DEFAULT_PROVIDER_ORDER;
  const order = configured
    .split(",")
    .map(name => name.trim().toLowerCase())
    .filter(name => PROVIDERS[name] || name === "rules");

  const filtered = filterProviderOrder(order.length ? order : DEFAULT_PROVIDER_ORDER.split(","));
  return filtered.length ? filtered : ["rules"];
}

export function isGenericScript(script, slide) {
  if (!script?.trim()) return true;
  const s = script.trim();
  if (/let'?s look at slide\s*\d+/i.test(s)) return true;
  if (/^welcome\.\s*let'?s look at/i.test(s)) return true;
  if (/^moving to slide\s*\d+/i.test(s) && s.length < 160) return true;

  const source = slideSourceText(slide);
  if (source.length < 25) return s.length < 30;

  const keywords = source
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 4)
    .slice(0, 12);
  if (!keywords.length) return false;

  const lower = s.toLowerCase();
  const hits = keywords.filter(w => lower.includes(w));
  return hits.length < Math.min(2, Math.max(1, keywords.length));
}

export function buildSlideScriptRules(slide, emotion = "Neutral") {
  const source = slideSourceText(slide);
  const title = slide.title?.trim() || `Slide ${slide.index}`;

  if (!source || /^slide\s*\d+$/i.test(title)) {
    return `This slide is titled ${title}. I'll walk you through the key point on screen.`;
  }

  let script = source;
  if (slide.index === 1 && !/^slide\s*\d+$/i.test(title)) {
    script = `${title}. ${source}`;
  } else if (source.length > 20 && !source.toLowerCase().startsWith(title.toLowerCase())) {
    script = `${title} — ${source}`;
  }

  script = script.replace(/\s+/g, " ").trim();
  if (script.length > 420) script = `${script.slice(0, 417)}...`;

  if (emotion !== "Neutral") {
    script = rewriteWithRules(script, emotion);
  }
  return script;
}

export async function generateSlideScript(slide, emotion = "Neutral") {
  const errors = [];
  const order = getProviderOrder();

  for (const name of order) {
    if (name === "rules") {
      return { script: buildSlideScriptRules(slide, emotion), provider: "rules" };
    }

    try {
      const script = await PROVIDERS[name](slide, emotion);
      if (!isGenericScript(script, slide)) {
        return { script: script.trim(), provider: name };
      }
      errors.push(`${name}: output looked generic`);
    } catch (err) {
      console.warn(`Slide script provider ${name} failed:`, err.message || err);
      errors.push(formatProviderError(name, err));
    }
  }

  return {
    script: buildSlideScriptRules(slide, emotion),
    provider: "rules",
    warning: buildAiUnavailableHint(errors),
    errors,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { slides = [], emotion = "Neutral", slideIndex = null } = body;

  if (!Array.isArray(slides) || !slides.length) {
    return res.status(400).json({ error: "Missing slides array" });
  }

  const targets =
    slideIndex != null ? slides.filter(s => s.index === slideIndex) : slides;

  const results = [];
  const providersUsed = new Set();
  const warnings = [];
  const allErrors = [];

  try {
    for (const slide of targets) {
      const { script, provider, warning, errors } = await generateSlideScript(slide, emotion);
      providersUsed.add(provider);
      if (warning) warnings.push(`Slide ${slide.index}: ${warning}`);
      if (errors?.length) allErrors.push(...errors);
      results.push({ index: slide.index, script: script.trim() });
    }

    const usedAi = [...providersUsed].some(p => p !== "rules");
    const primaryProvider =
      providersUsed.size === 1
        ? [...providersUsed][0]
        : providersUsed.has("rules")
          ? usedAi
            ? "mixed"
            : "rules"
          : "ai";

    return res.status(200).json({
      slides: results,
      provider: primaryProvider,
      providers: [...providersUsed],
      warning: warnings.length ? warnings.join(" ") : undefined,
      hint: !usedAi ? buildAiUnavailableHint([...new Set(allErrors)]) : undefined,
    });
  } catch (err) {
    console.error("slide-scripts failed", err);
    return res.status(500).json({ error: err.message || "Slide script generation failed" });
  }
}
