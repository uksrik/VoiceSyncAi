import { describe, it, expect } from "vitest";
import { prepareAudioDataUrl } from "./audioUtils.js";

describe("audioUtils", () => {
  it("keeps wav data URLs unchanged", async () => {
    const wav = "data:audio/wav;base64,AAAA";
    const file = new File(["x"], "test.wav", { type: "audio/wav" });
    const result = await prepareAudioDataUrl(file, wav);
    expect(result).toBe(wav);
  });
});
