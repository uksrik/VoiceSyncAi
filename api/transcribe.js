import { parseDataUrl } from "./fal-utils.js";

const WHISPER_MODEL =
  process.env.HF_TRANSCRIBE_MODEL || "openai/whisper-large-v3-turbo";

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

async function transcribeWithHuggingFace(buffer, mime) {
  const token = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    throw new Error("Missing HF_API_TOKEN — add a free Hugging Face token in .env.local");
  }

  const endpoints = [
    `https://router.huggingface.co/hf-inference/models/${WHISPER_MODEL}`,
    `https://api-inference.huggingface.co/models/${WHISPER_MODEL}`,
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": mime.includes("wav") ? "audio/wav" : mime,
          "x-wait-for-model": "true",
        },
        body: buffer,
        signal: AbortSignal.timeout(120000),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : data.error?.message || `Transcription API ${response.status}`
        );
      }

      const text = (data.text || data.generated_text || "").trim();
      if (!text) throw new Error("Transcription returned empty text");
      return { text, provider: "huggingface", model: WHISPER_MODEL, endpoint: url };
    } catch (err) {
      lastError = err;
      console.warn(`HF transcribe failed at ${url}:`, err.message);
    }
  }

  throw lastError || new Error("Hugging Face transcription failed");
}

/**
 * Transcribe uploaded/recorded audio to text (for re-voicing with another voice).
 * Expects JSON: { audioDataUrl: string }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { audioDataUrl } = body;

  if (!audioDataUrl) {
    return res.status(400).json({ error: "Missing audioDataUrl" });
  }

  const parsed = parseDataUrl(audioDataUrl);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid audio data URL" });
  }

  if (parsed.buffer.length > MAX_AUDIO_BYTES) {
    return res.status(413).json({
      error: "Audio file is too large. Please use a clip under 12 MB or trim the recording.",
    });
  }

  try {
    const result = await transcribeWithHuggingFace(
      parsed.buffer,
      parsed.mime || "audio/wav"
    );
    return res.status(200).json(result);
  } catch (err) {
    console.error("Transcription failed", err);
    const causeCode = err.cause?.code || err.code;
    const networkCodes = ["EAI_AGAIN", "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "AbortError"];
    const isNetwork = networkCodes.includes(causeCode) || /fetch failed|timeout|network/i.test(err.message);

    return res.status(500).json({
      error: isNetwork
        ? "Could not reach Hugging Face transcription. Check your internet connection and HF_API_TOKEN."
        : err.message || "Transcription failed",
    });
  }
}
