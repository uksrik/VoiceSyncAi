import { fal } from "@fal-ai/client";

// Allow a slightly larger payload for base64 audio.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16mb",
    },
  },
};

fal.config({ credentials: process.env.FAL_KEY });

const parseDataUrl = (dataUrl) => {
  const match = /^data:(.+);base64,(.+)$/i.exec(dataUrl || "");
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
};

const uploadDataUrl = async (dataUrl, errorLabel) => {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error(`Invalid ${errorLabel} data URL`);
  const blob = new Blob([parsed.buffer], { type: parsed.mime });
  return await fal.storage.upload(blob, { expiresIn: "24h" });
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const {
      audioDataUrl,
      imageDataUrl,
      videoUrl,
      videoDataUrl,
      syncMode = "cut_off",
      model = "lipsync-2-pro",
      prompt = "A realistic talking head video with natural facial expressions, subtle head movement, eye blinks, and accurate lip synchronization.",
    } = body;
    if (!audioDataUrl || (!imageDataUrl && !videoUrl && !videoDataUrl)) {
      return res.status(400).json({ error: "audioDataUrl and an image or video source are required" });
    }
    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: "Missing FAL_KEY environment variable" });
    }

    const audio_url = await uploadDataUrl(audioDataUrl, "audio");

    if (imageDataUrl) {
      const image_url = await uploadDataUrl(imageDataUrl, "image");
      const result = await fal.subscribe("fal-ai/ai-avatar", {
        input: {
          image_url,
          audio_url,
          prompt,
        },
        logs: true,
      });

      const outputUrl = result?.data?.video?.url;
      if (!outputUrl) return res.status(500).json({ error: "No video returned from talking avatar model" });

      return res.status(200).json({
        videoUrl: outputUrl,
        requestId: result.requestId,
        provider: "fal-ai/ai-avatar",
      });
    }

    let video_url = videoUrl;
    if (!video_url && videoDataUrl) {
      video_url = await uploadDataUrl(videoDataUrl, "video");
    }

    const result = await fal.subscribe("fal-ai/sync-lipsync/v2", {
      input: {
        model,
        video_url,
        audio_url,
        sync_mode: syncMode,
      },
      logs: true,
    });

    const outputUrl = result?.data?.video?.url;
    if (!outputUrl) return res.status(500).json({ error: "No video returned from lipsync" });

    return res.status(200).json({
      videoUrl: outputUrl,
      requestId: result.requestId,
      provider: "fal-ai/sync-lipsync/v2",
    });
  } catch (err) {
    console.error("Lipsync API error", err);
    return res.status(500).json({ error: err.message || "Lipsync failed" });
  }
}
