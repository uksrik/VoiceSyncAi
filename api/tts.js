/**
 * Vercel serverless function to generate speech using an open-source
 * Hugging Face text-to-speech model. Returns a data URL the client can
 * play without exposing the HF token.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body =
    typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { text, model } = body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Missing text" });
  }

  const token = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "Missing HF_API_TOKEN env var" });
  }

  const modelId =
    model ||
    process.env.HF_TTS_MODEL ||
    "espnet/kan-bayashi_ljspeech_vits"; // fast, open model

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${modelId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "audio/wav",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res
        .status(500)
        .json({ error: err.error || `HF TTS error ${response.status}` });
    }

    const audioBuffer = await response.arrayBuffer();
    const b64 = Buffer.from(audioBuffer).toString("base64");
    const dataUrl = `data:audio/wav;base64,${b64}`;

    res.status(200).json({ audioUrl: dataUrl, model: modelId });
  } catch (err) {
    console.error("HF TTS failed", err);
    res.status(500).json({ error: err.message || "HF TTS failed" });
  }
}
