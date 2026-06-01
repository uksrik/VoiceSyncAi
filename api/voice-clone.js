import fs from "node:fs/promises";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { parseDataUrl, uploadDataUrl } from "./fal-utils.js";

fal.config({ credentials: process.env.FAL_KEY });

/**
 * Upload a custom voice sample and optionally clone it with fal MiniMax.
 * Expects JSON body: { name: string, dataUrl: string, previewText?: string }
 * Returns: { id, label, isCloned, audioUrl, customVoiceId?, pitch, speed, emoji, accent, flag }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { name, dataUrl, previewText } = body;
  if (!name?.trim() || !dataUrl) {
    return res.status(400).json({ error: "Missing name or audio sample" });
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid audio data URL" });
  }

  const storageDir = path.resolve(process.cwd(), "cloned_voices");
  await fs.mkdir(storageDir, { recursive: true }).catch(() => {});

  const safeName = name.trim().replace(/[^a-z0-9 _-]/gi, "_");
  const ext = parsed.mime.split("/")[1]?.split(";")[0] || "wav";
  const filename = `${Date.now()}-${safeName}.${ext}`;
  await fs.writeFile(path.join(storageDir, filename), parsed.buffer);

  const audioUrl = `data:${parsed.mime};base64,${parsed.buffer.toString("base64")}`;
  let customVoiceId = null;
  let cloneWarning = null;

  if (process.env.FAL_KEY) {
    try {
      const audio_url = await uploadDataUrl(dataUrl, "voice sample");
      const cloneInput = { audio_url };
      if (previewText?.trim()) {
        cloneInput.text = previewText.trim();
      }

      const result = await fal.subscribe("fal-ai/minimax/voice-clone", {
        input: cloneInput,
        logs: true,
      });

      customVoiceId = result?.data?.custom_voice_id || null;
      if (!customVoiceId) {
        cloneWarning = "Voice sample saved, but AI cloning did not return a voice ID.";
      }
    } catch (err) {
      console.error("MiniMax voice clone failed", err);
      cloneWarning = err.message || "AI voice cloning unavailable. Sample saved locally.";
    }
  } else {
    cloneWarning = "Add FAL_KEY to enable AI voice cloning from your sample.";
  }

  const voice = {
    id: `cloned-${Date.now()}`,
    label: name.trim(),
    isCloned: true,
    audioUrl,
    customVoiceId,
    pitch: 0,
    speed: 1,
    emoji: "🎙️",
    accent: "Custom upload",
    flag: "✨",
    cloneWarning,
  };

  return res.status(200).json(voice);
}
