import { SLIDE_W, SLIDE_H, loadImage } from "./deckSlideImages.js";

const DEFAULT_FPS = 24;
const SLIDE_GAP_SEC = 0.35;

export function getAudioDuration(audioUrl) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      if (!Number.isFinite(d) || d <= 0) {
        reject(new Error("Invalid audio duration"));
        return;
      }
      resolve(d);
    };
    audio.onerror = () => reject(new Error("Could not load slide audio"));
    audio.src = audioUrl;
  });
}

async function fetchAudioBuffer(audioContext, audioUrl) {
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error("Failed to fetch slide audio");
  const data = await res.arrayBuffer();
  return audioContext.decodeAudioData(data);
}

function findSegmentAt(timeline, timeSec) {
  for (const seg of timeline) {
    if (timeSec >= seg.start && timeSec < seg.end) return seg;
  }
  return timeline[timeline.length - 1] || null;
}

function drawSlideFrame(ctx, width, height, imageEl, slideIndex, totalSlides) {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  if (imageEl?.naturalWidth > 0) {
    const scale = Math.min(width / imageEl.width, height / imageEl.height);
    const w = imageEl.width * scale;
    const h = imageEl.height * scale;
    ctx.drawImage(imageEl, (width - w) / 2, (height - h) / 2, w, h);
  }

  ctx.fillStyle = "rgba(15,23,42,0.55)";
  ctx.fillRect(0, height - 40, width, 40);
  ctx.font = "600 14px DM Sans, Segoe UI, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Slide ${slideIndex} of ${totalSlides}`, 20, height - 20);
}

/**
 * Build a WebM video: each slide image for the duration of its narration audio.
 */
export async function stitchDeckPresentationVideo(slides, options = {}) {
  const {
    width = SLIDE_W,
    height = SLIDE_H,
    fps = DEFAULT_FPS,
    slideGapSec = SLIDE_GAP_SEC,
    onProgress,
  } = options;

  const ready = slides.filter(
    s => s.imageUrl && s.audioUrl && (s.script || "").trim().length > 0
  );
  if (!ready.length) {
    throw new Error(
      "Each slide needs an image and generated voice audio. Generate voices on the Voice step first."
    );
  }

  onProgress?.(5);

  const audioContext = new AudioContext();
  await audioContext.resume();
  const timeline = [];
  let cursor = 0;

  for (let i = 0; i < ready.length; i++) {
    const slide = ready[i];
    const duration = await getAudioDuration(slide.audioUrl);
    const buffer = await fetchAudioBuffer(audioContext, slide.audioUrl);
    const imageEl = await loadImage(slide.imageUrl);
    timeline.push({
      slide,
      imageEl,
      buffer,
      duration,
      start: cursor,
      end: cursor + duration,
    });
    cursor += duration + (i < ready.length - 1 ? slideGapSec : 0);
    onProgress?.(5 + Math.round(((i + 1) / ready.length) * 25));
  }

  const totalDuration = cursor;
  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));

  const dest = audioContext.createMediaStreamDestination();
  for (const seg of timeline) {
    const source = audioContext.createBufferSource();
    source.buffer = seg.buffer;
    source.connect(dest);
    source.start(audioContext.currentTime + seg.start);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable.");

  const videoStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mime =
    ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m =>
      MediaRecorder.isTypeSupported(m)
    ) || "video/webm";

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: mime,
    videoBitsPerSecond: 5_000_000,
    audioBitsPerSecond: 128_000,
  });

  const chunks = [];
  const stopped = new Promise((resolve, reject) => {
    recorder.ondataavailable = e => {
      if (e.data?.size > 0) chunks.push(e.data);
    };
    recorder.onerror = e => reject(e.error || new Error("Presentation video recording failed"));
    recorder.onstop = resolve;
  });

  recorder.start(100);

  const frameMs = 1000 / fps;
  const totalSlides = ready.length;

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / fps;
    const seg = findSegmentAt(timeline, t);
    if (seg) {
      drawSlideFrame(ctx, width, height, seg.imageEl, seg.slide.index, totalSlides);
    }
    onProgress?.(30 + Math.round((frame / totalFrames) * 65));
    if (frame % 2 === 0) await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, frameMs));
  }

  recorder.stop();
  await stopped;

  videoStream.getTracks().forEach(t => t.stop());
  dest.stream.getTracks().forEach(t => t.stop());
  await audioContext.close();

  onProgress?.(100);

  const blob = new Blob(chunks, { type: mime });
  return URL.createObjectURL(blob);
}
