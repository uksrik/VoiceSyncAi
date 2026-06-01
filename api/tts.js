import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { remoteAudioToDataUrl } from "./fal-utils.js";

fal.config({ credentials: process.env.FAL_KEY });

function prepareSpokenText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s*([,.!?;:])\s*/g, "$1 ")
    .replace(/\[pause\]/gi, ". ")
    .trim();
}

/**
 * Vercel serverless function to generate speech using an open-source
 * Hugging Face text-to-speech model. In local Windows development, falls back
 * to the built-in Windows speech engine so Generate can work offline.
 */
async function synthesizeWithWindowsSpeech(text, options = {}) {
  if (process.platform !== "win32") {
    throw new Error("Windows speech fallback is only available on Windows.");
  }

  const id = randomUUID();
  const scriptPath = path.join(os.tmpdir(), `voicesync-tts-${id}.ps1`);
  const wavPath = path.join(os.tmpdir(), `voicesync-tts-${id}.wav`);
  const rate = Number.isFinite(Number(options.rate)) ? Math.max(-10, Math.min(10, Math.round(Number(options.rate)))) : -1;
  const voiceName = options.voiceName || "";
  const spokenText = prepareSpokenText(text);
  const script = `
param([string]$Text, [string]$OutPath, [string]$VoiceName, [int]$Rate)
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToDefaultAudioDevice()
$installed = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
if ($VoiceName) {
  $match = $installed | Where-Object { $_ -like "*$VoiceName*" } | Select-Object -First 1
  if ($match) { $synth.SelectVoice($match) }
}
$synth.Rate = $Rate
$synth.Volume = 100
$synth.SetOutputToWaveFile($OutPath)
$synth.Speak($Text)
$synth.Dispose()
`;

  try {
    await writeFile(scriptPath, script, "utf8");
    await new Promise((resolve, reject) => {
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-Text",
        spokenText,
        "-OutPath",
        wavPath,
        "-VoiceName",
        voiceName,
        "-Rate",
        String(rate),
      ], { windowsHide: true });

      let stderr = "";
      child.stderr.on("data", chunk => { stderr += chunk.toString(); });
      child.on("error", reject);
      child.on("close", code => {
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `Windows speech exited with ${code}`));
      });
    });

    return await readFile(wavPath);
  } finally {
    await rm(scriptPath, { force: true }).catch(() => {});
    await rm(wavPath, { force: true }).catch(() => {});
  }
}

function sendAudio(res, audioBuffer, provider, model) {
  const b64 = Buffer.from(audioBuffer).toString("base64");
  const dataUrl = `data:audio/wav;base64,${b64}`;
  res.status(200).json({ audioUrl: dataUrl, model, provider });
}

const EMOTION_MAP = {
  Neutral: "neutral",
  Happy: "happy",
  Serious: "neutral",
  Excited: "happy",
  Calm: "neutral",
  Inspirational: "happy",
};

async function synthesizeWithFalMinimax(text, options = {}) {
  const spokenText = prepareSpokenText(text);
  const result = await fal.subscribe("fal-ai/minimax/speech-02-hd", {
    input: {
      text: spokenText,
      voice_setting: {
        voice_id: options.falVoiceId || "English_CalmWoman",
        pitch: Math.max(-12, Math.min(12, Math.round(Number(options.pitch) || 0))),
        speed: Math.max(0.5, Math.min(2, Number(options.speed) || 1)),
        emotion: EMOTION_MAP[options.emotion] || options.emotion || "neutral",
        english_normalization: true,
      },
      language_boost: options.languageBoost || "English",
    },
    logs: true,
  });

  const remoteUrl = result?.data?.audio?.url;
  if (!remoteUrl) throw new Error("No audio returned from natural voice TTS");
  const dataUrl = await remoteAudioToDataUrl(remoteUrl);
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body =
    typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const {
    text,
    provider,
    voiceName,
    rate,
    customVoiceId,
    pitch,
    speed,
    falVoiceId,
    emotion,
    languageBoost,
  } = body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Missing text" });
  }

  try {
    if (provider === "fal-minimax") {
      if (!process.env.FAL_KEY) {
        const audioBuffer = await synthesizeWithWindowsSpeech(text, {
          voiceName: voiceName || "Microsoft Jenny",
          rate: rate ?? -3,
        });
        return sendAudio(res, audioBuffer, "windows-speech", voiceName || "Microsoft Jenny");
      }

      const audioBuffer = await synthesizeWithFalMinimax(text, {
        falVoiceId,
        pitch,
        speed,
        emotion,
        languageBoost,
      });
      return sendAudio(res, audioBuffer, "fal-minimax", falVoiceId || "English_CalmWoman");
    }

    if (provider === "cloned-voice") {
      if (!customVoiceId) {
        throw new Error("This uploaded voice is not AI-cloned yet. Re-upload with FAL_KEY configured, or use a preset voice.");
      }
      if (!process.env.FAL_KEY) {
        throw new Error("Missing FAL_KEY for cloned voice speech generation.");
      }

      const audioBuffer = await synthesizeWithFalMinimax(text, {
        falVoiceId: customVoiceId,
        pitch,
        speed,
        emotion,
      });
      return sendAudio(res, audioBuffer, "fal-minimax-cloned", customVoiceId);
    }

    if (provider === "windows-speech") {
      const audioBuffer = await synthesizeWithWindowsSpeech(text, { voiceName, rate });
      return sendAudio(res, audioBuffer, "windows-speech", voiceName || "System.Speech");
    }

    throw new Error(`Unsupported TTS provider: ${provider || "unknown"}`);
  } catch (err) {
    console.error("TTS failed", err);

    try {
      const audioBuffer = await synthesizeWithWindowsSpeech(text, {
        voiceName: voiceName || "Microsoft Jenny",
        rate: rate ?? -3,
      });
      sendAudio(res, audioBuffer, "windows-speech", voiceName || "Microsoft Jenny");
    } catch (fallbackErr) {
      console.error("Windows TTS fallback failed", fallbackErr);
      res.status(500).json({
        error: fallbackErr.message || err.message || "TTS failed",
      });
    }
  }
}
