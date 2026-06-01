import {
  cleanRewriteOutput,
  emotionPrompts,
  rewriteWithRules,
} from "./rewrite.js";

const HF_MODEL =
  process.env.HF_SLIDE_SCRIPT_MODEL ||
  process.env.HF_REWRITE_MODEL ||
  "HuggingFaceTB/SmolLM2-1.7B-Instruct";

async function chatCompletion(system, user) {
  const token = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_TOKEN;
  if (!token) throw new Error("Missing HF_API_TOKEN");

  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 1200,
      temperature: 0.65,
    }),
    signal: AbortSignal.timeout(90000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || `AI API ${response.status}`);
  }
  return cleanRewriteOutput(data.choices?.[0]?.message?.content);
}

export function buildSlideScriptRules(slide, emotion = "Neutral") {
  const tone = emotionPrompts[emotion] || "neutral and clear";
  const body = slide.body?.trim() || slide.title || "";
  const intro = slide.index === 1 ? "Welcome. " : `Moving to slide ${slide.index}. `;
  const core = body.length > 20 ? body : `Let's look at ${slide.title}.`;
  let script = `${intro}${core}`.replace(/\s+/g, " ").trim();
  if (script.length > 400) script = `${script.slice(0, 397)}...`;
  if (emotion !== "Neutral") {
    script = rewriteWithRules(script, emotion);
  }
  return script;
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
    slideIndex != null
      ? slides.filter(s => s.index === slideIndex)
      : slides;

  const tone = emotionPrompts[emotion] || `${emotion.toLowerCase()} in tone`;
  const results = [];

  try {
    for (const slide of targets) {
      let script = "";
      try {
        const userPrompt = [
          `Write a spoken narration script for presentation slide ${slide.index}.`,
          `Tone: ${tone}.`,
          "2 to 5 sentences, natural when read aloud, no bullet characters.",
          "Return only the narration text.",
          "",
          `Title: ${slide.title || `Slide ${slide.index}`}`,
          `Slide content: ${slide.body || "(no text on slide)"}`,
        ].join("\n");

        script = await chatCompletion(
          "You write concise voice-over scripts for presentation slides.",
          userPrompt
        );
      } catch {
        script = buildSlideScriptRules(slide, emotion);
      }

      if (!script?.trim()) script = buildSlideScriptRules(slide, emotion);
      results.push({ index: slide.index, script: script.trim() });
    }

    return res.status(200).json({
      slides: results,
      provider: process.env.HF_API_TOKEN ? "huggingface" : "rules",
    });
  } catch (err) {
    console.error("slide-scripts failed", err);
    return res.status(500).json({ error: err.message || "Slide script generation failed" });
  }
}
