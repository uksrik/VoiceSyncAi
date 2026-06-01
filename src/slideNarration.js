/** Shared slide narration helpers (browser + API). */

export function isAutoSlideTitle(title) {
  return /^slide\s*\d+$/i.test((title || "").trim());
}

export function isPlaceholderScript(script) {
  if (!script?.trim()) return true;
  const s = script.trim();
  return (
    /this slide is titled/i.test(s) ||
    /walk you through the key point/i.test(s) ||
    /let'?s look at slide\s*\d+/i.test(s) ||
    /^welcome\.\s*let'?s look at/i.test(s)
  );
}

/** Best-effort plain text from a parsed slide object. */
export function slideReadableText(slide) {
  const title = (slide.title || "").trim();
  const body = (slide.body || "").trim();
  const content = (slide.content || "").trim();
  const autoTitle = isAutoSlideTitle(title);

  if (content.length > 8) return content;
  if (body.length > 8) {
    if (!autoTitle && title && !body.toLowerCase().includes(title.toLowerCase())) {
      return `${title}. ${body}`;
    }
    return body;
  }
  if (!autoTitle && title.length > 2) return title;
  return "";
}

/**
 * Turn extracted slide text into spoken narration without AI.
 */
export function narrateSlideFromContent(slide, _emotion = "Neutral") {
  const raw = slideReadableText(slide);
  const title = (slide.title || "").trim();
  const autoTitle = isAutoSlideTitle(title);

  if (!raw) {
    if (!autoTitle && title) {
      return `${title}.`;
    }
    return `On slide ${slide.index}, please review the visuals shown on screen.`;
  }

  let chunks = raw
    .split(/\s*(?:•|·|▪|‣|◦|►|—)\s*|\s*\|\s*|\n+/)
    .map(part => part.replace(/\s+/g, " ").trim())
    .filter(part => part.length > 2);

  if (chunks.length <= 1) {
    chunks = raw
      .split(/(?<=[.!?])\s+/)
      .map(part => part.trim())
      .filter(part => part.length > 2);
  }

  if (chunks.length <= 1 && raw.length > 80) {
    const sentences = [];
    let buf = "";
    for (const word of raw.split(/\s+/)) {
      buf = buf ? `${buf} ${word}` : word;
      if (buf.length > 90) {
        sentences.push(buf);
        buf = "";
      }
    }
    if (buf) sentences.push(buf);
    if (sentences.length > 1) chunks = sentences;
  }

  let script = chunks
    .map((part, i) => {
      if (i === 0) return part;
      const c = part.charAt(0).toLowerCase() + part.slice(1);
      return c;
    })
    .join(". ");

  if (!/[.!?]$/.test(script)) script += ".";

  if (!autoTitle && title.length > 2) {
    const titleBit = title.replace(/[.!?]$/, "");
    if (!script.toLowerCase().includes(titleBit.toLowerCase().slice(0, 12))) {
      script = `${titleBit}. ${script}`;
    }
  }

  if (script.length > 500) {
    script = `${script.slice(0, 497).replace(/[.,;:]?$/, "")}...`;
  }

  return script.replace(/\s+/g, " ").trim();
}
