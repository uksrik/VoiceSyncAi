import JSZip from "jszip";
import { loadPdfJs } from "./deckParse.js";

const SLIDE_W = 1280;
const SLIDE_H = 720;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load slide image"));
    img.src = src;
  });
}

export function renderTextSlideImage(slide) {
  const canvas = document.createElement("canvas");
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const bg = ctx.createLinearGradient(0, 0, SLIDE_W, SLIDE_H);
  bg.addColorStop(0, "#1e1b4b");
  bg.addColorStop(1, "#312e81");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);

  ctx.fillStyle = "#e9d5ff";
  ctx.font = "bold 52px DM Sans, Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const title = slide.title || `Slide ${slide.index}`;
  ctx.fillText(title.slice(0, 60), 72, 72, SLIDE_W - 144);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "32px DM Sans, Segoe UI, sans-serif";
  const body = (slide.body || slide.content || "").slice(0, 1200);
  wrapText(ctx, body, 72, 160, SLIDE_W - 144, 44);

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 22px DM Sans, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(String(slide.index), SLIDE_W - 48, SLIDE_H - 48);

  return canvas.toDataURL("image/jpeg", 0.9);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
      if (cy > SLIDE_H - 120) break;
    } else {
      line = test;
    }
  }
  if (line && cy <= SLIDE_H - 120) ctx.fillText(line, x, cy);
}

async function renderPdfPageImages(file) {
  const pdfjsLib = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const urls = [];

  for (let page = 1; page <= pdf.numPages; page++) {
    const pdfPage = await pdf.getPage(page);
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const scale = Math.min(SLIDE_W / baseViewport.width, SLIDE_H / baseViewport.height);
    const viewport = pdfPage.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = SLIDE_W;
    canvas.height = SLIDE_H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);

    const offsetX = (SLIDE_W - viewport.width) / 2;
    const offsetY = (SLIDE_H - viewport.height) / 2;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    ctx.restore();

    urls.push(canvas.toDataURL("image/jpeg", 0.9));
  }

  return urls;
}

async function findPptxSlideBackground(zip, slidePath) {
  const slideNum = slidePath.match(/slide(\d+)/i)?.[1];
  if (!slideNum) return null;

  const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
  const relsFile = zip.files[relsPath];
  if (!relsFile) return null;

  const relsXml = await relsFile.async("string");
  const embedMatch = relsXml.match(
    /Target="[^"]*media\/([^"]+\.(?:png|jpe?g|webp))"/i
  );
  if (!embedMatch) return null;

  const mediaPath = Object.keys(zip.files).find(
    p => p.toLowerCase().includes(`/media/${embedMatch[1].toLowerCase()}`)
  );
  if (!mediaPath) return null;

  const blob = await zip.files[mediaPath].async("blob");
  return URL.createObjectURL(blob);
}

async function renderPptxSlideImages(file, slides) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slidePaths = Object.keys(zip.files)
    .filter(name => /ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)/i)?.[1] || 0);
      return na - nb;
    });

  const urls = [];
  for (let i = 0; i < slides.length; i++) {
    const slidePath = slidePaths[i];
    let imageUrl = null;
    if (slidePath) {
      try {
        imageUrl = await findPptxSlideBackground(zip, slidePath);
      } catch {
        imageUrl = null;
      }
    }
    if (imageUrl) {
      try {
        const img = await loadImage(imageUrl);
        const canvas = document.createElement("canvas");
        canvas.width = SLIDE_W;
        canvas.height = SLIDE_H;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
        const scale = Math.min(SLIDE_W / img.width, SLIDE_H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (SLIDE_W - w) / 2, (SLIDE_H - h) / 2, w, h);
        urls.push(canvas.toDataURL("image/jpeg", 0.9));
        URL.revokeObjectURL(imageUrl);
        continue;
      } catch {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
      }
    }
    urls.push(renderTextSlideImage(slides[i]));
  }
  return urls;
}

/** Attach data-URL slide images for video export. */
export async function attachDeckSlideImages(file, deck) {
  const imageUrls =
    deck.type === "pdf"
      ? await renderPdfPageImages(file)
      : await renderPptxSlideImages(file, deck.slides);

  const slides = deck.slides.map((slide, i) => ({
    ...slide,
    imageUrl: imageUrls[i] || renderTextSlideImage(slide),
  }));

  return { ...deck, slides };
}

export { SLIDE_W, SLIDE_H, loadImage };
