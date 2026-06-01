import { describe, it, expect } from "vitest";
import { parseDeckFile } from "./deckParse.js";

describe("parseDeckFile", () => {
  it("rejects unsupported file types", async () => {
    const file = new File(["x"], "deck.docx", { type: "application/octet-stream" });
    await expect(parseDeckFile(file)).rejects.toThrow(/PDF or PPTX/i);
  });
});
