import React from "react";

export default function DeckScriptSection({
  styles,
  deckSlides,
  activeSlideIndex,
  setActiveSlideIndex,
  deckFileName,
  deckLoading,
  deckError,
  generatingSlideScripts,
  onDeckFile,
  onGenerateScripts,
  onUpdateSlideScript,
  onPreviewSlideVoice,
  previewLoading,
}) {
  const active = deckSlides[activeSlideIndex];

  return (
    <div style={{
      marginBottom: 16, padding: 16, borderRadius: 14,
      background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.22)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#6ee7b7", marginBottom: 10 }}>
        PDF / PowerPoint deck
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <label style={{ ...styles.secondaryBtn, cursor: deckLoading ? "wait" : "pointer" }}>
          {deckLoading ? "Analyzing deck…" : "Upload PDF or PPTX"}
          <input
            type="file"
            accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            style={{ display: "none" }}
            disabled={deckLoading}
            onChange={e => onDeckFile(e.target.files[0])}
          />
        </label>
        {deckSlides.length > 0 && (
          <button
            type="button"
            style={styles.secondaryBtn}
            disabled={generatingSlideScripts}
            onClick={onGenerateScripts}
          >
            {generatingSlideScripts ? "Writing scripts…" : "Generate talking scripts (all slides)"}
          </button>
        )}
      </div>

      {deckFileName && (
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
          {deckFileName} — {deckSlides.length} slide{deckSlides.length === 1 ? "" : "s"}
        </div>
      )}

      {deckError && (
        <div style={{
          marginBottom: 10, padding: "10px 12px", borderRadius: 10, fontSize: 12,
          background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
          color: "#fca5a5",
        }}>
          {deckError}
        </div>
      )}

      {deckSlides.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {deckSlides.map((slide, i) => {
              const selected = i === activeSlideIndex;
              const hasScript = (slide.script || "").trim().length > 10;
              return (
                <button
                  key={slide.index}
                  type="button"
                  style={{
                    ...styles.secondaryBtn,
                    padding: "6px 12px",
                    background: selected ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.04)",
                    border: selected
                      ? "1px solid rgba(16,185,129,0.55)"
                      : `1px solid ${hasScript ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.1)"}`,
                    color: selected ? "#a7f3d0" : "#94a3b8",
                  }}
                  onClick={() => setActiveSlideIndex(i)}
                >
                  Slide {slide.index}
                </button>
              );
            })}
          </div>

          {active && (
            <div style={{
              padding: 12, borderRadius: 12,
              background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{active.title}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10, lineHeight: 1.5 }}>
                {active.body || "No on-slide text detected."}
              </div>
              <textarea
                style={{ ...styles.textarea, minHeight: 100 }}
                placeholder="Talking script for this slide…"
                value={active.script || ""}
                onChange={e => onUpdateSlideScript(activeSlideIndex, e.target.value)}
                maxLength={1000}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  disabled={previewLoading || !(active.script || "").trim()}
                  onClick={() => onPreviewSlideVoice(activeSlideIndex)}
                >
                  Preview voice for this slide
                </button>
                {active.audioUrl && (
                  <audio controls src={active.audioUrl} style={{ height: 32, flex: 1, minWidth: 200 }} />
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginTop: 8 }}>
        We extract text from each slide, AI writes narration, then on Generate we stitch every slide with its voice into one presentation video.
      </div>
    </div>
  );
}
