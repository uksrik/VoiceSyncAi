import { describe, it, expect } from "vitest";
import { parseDeckFile, extractXmlTexts } from "./deckParse.js";

describe("extractXmlTexts", () => {
  it("reads namespaced drawingML text runs", () => {
    const xml = '<p:sp><a:t xml:space="preserve">Hello </a:t><a:t>World</a:t></p:sp>';
    expect(extractXmlTexts(xml)).toEqual(["Hello", "World"]);
  });
});

describe("parseDeckFile", () => {
  it("rejects unsupported file types", async () => {
    const file = new File(["x"], "deck.docx", { type: "application/octet-stream" });
    await expect(parseDeckFile(file)).rejects.toThrow(/PDF or PPTX/i);
  });
});
