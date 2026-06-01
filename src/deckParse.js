import JSZip from "jszip";

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  return pdfjsLib;
}

function extractXmlTexts(xml) {
  const texts = [];
  const re = /<a:t[^>]*>([^<]*)<\/a:t>/g;
  let match = re.exec(xml);
  while (match) {
    const t = match[1]?.trim();
    if (t) texts.push(t);
    match = re.exec(xml);
  }
  return texts;
}

function slideFromTexts(index, texts) {
  const cleaned = texts.map(t => t.replace(/\s+/g, " ").trim()).filter(Boolean);
  const title = cleaned[0]?.slice(0, 80) || `Slide ${index}`;
  const body = cleaned.slice(1).join(" ") || cleaned[0] || "";
  return {
    index,
    title,
    body: body.slice(0, 2000),
    script: "",
    audioUrl: null,
    videoUrl: null,
  };
}

export async function parsePptxFile(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slidePaths = Object.keys(zip.files)
    .filter(name => /ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)/i)?.[1] || 0);
      return na - nb;
    });

  if (!slidePaths.length) {
    throw new Error("No slides found in this PowerPoint file.");
  }

  const slides = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const xml = await zip.files[slidePaths[i]].async("string");
    const texts = extractXmlTexts(xml);
    const slideNum = Number(slidePaths[i].match(/slide(\d+)/i)?.[1]) || i + 1;
    const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    if (zip.files[notesPath]) {
      const notesXml = await zip.files[notesPath].async("string");
      texts.push(...extractXmlTexts(notesXml));
    }
    slides.push(slideFromTexts(i + 1, texts));
  }

  return { fileName: file.name, type: "pptx", slides };
}

export async function parsePdfFile(file) {
  const pdfjsLib = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const slides = [];

  for (let page = 1; page <= pdf.numPages; page++) {
    const pdfPage = await pdf.getPage(page);
    const content = await pdfPage.getTextContent();
    const lineMap = new Map();

    for (const item of content.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      const line = lineMap.get(y) || [];
      line.push(item.str);
      lineMap.set(y, line);
    }

    const lines = [...lineMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.join(" ").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    slides.push(slideFromTexts(page, lines));
  }

  if (!slides.length) {
    throw new Error("No text could be extracted from this PDF.");
  }

  return { fileName: file.name, type: "pdf", slides };
}

export async function parseDeckFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pptx")) return parsePptxFile(file);
  if (name.endsWith(".pdf")) return parsePdfFile(file);
  throw new Error("Please upload a PDF or PPTX file.");
}
