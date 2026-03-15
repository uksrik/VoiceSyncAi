import { fal } from "@fal-ai/client";

// Allow a slightly larger payload for base64 audio.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

fal.config({ credentials: process.env.FAL_KEY });

const parseDataUrl = (dataUrl) => {
  const match = /^data:(.+);base64,(.+)$/i.exec(dataUrl || "");
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { audioDataUrl, videoUrl, syncMode = "cut_off", model = "lipsync-2-pro" } = body;
    if (!audioDataUrl || !videoUrl) {
      return res.status(400).json({ error: "audioDataUrl and videoUrl are required" });
    }
    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: "Missing FAL_KEY environment variable" });
    }

    const parsed = parseDataUrl(audioDataUrl);
    if (!parsed) return res.status(400).json({ error: "Invalid audio data URL" });

    // Upload audio to fal storage to obtain a URL usable by the model.
    const audioBlob = new Blob([parsed.buffer], { type: parsed.mime });
    const audio_url = await fal.storage.upload(audioBlob, { expiresIn: "24h" });

    const result = await fal.subscribe("fal-ai/sync-lipsync/v2", {
      input: {
        model,
        video_url: videoUrl,
        audio_url,
        sync_mode: syncMode,
      },
      logs: true,
    });

    const outputUrl = result?.data?.video?.url;
    if (!outputUrl) return res.status(500).json({ error: "No video returned from lipsync" });

    return res.status(200).json({ videoUrl: outputUrl, requestId: result.requestId });
  } catch (err) {
    console.error("Lipsync API error", err);
    return res.status(500).json({ error: err.message || "Lipsync failed" });
  }
}
