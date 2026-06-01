import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

export const parseDataUrl = (dataUrl) => {
  const match = /^data:(.+);base64,(.+)$/i.exec(dataUrl || "");
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
};

export const uploadDataUrl = async (dataUrl, errorLabel) => {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error(`Invalid ${errorLabel} data URL`);
  const blob = new Blob([parsed.buffer], { type: parsed.mime });
  return await fal.storage.upload(blob, { expiresIn: "24h" });
};

export async function remoteAudioToDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch audio (${response.status})`);
  const mime = response.headers.get("content-type") || "audio/mpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${mime};base64,${buffer.toString("base64")}`;
}
