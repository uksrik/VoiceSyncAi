import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseDataUrl } from "./fal-utils.js";

vi.mock("@fal-ai/client", () => ({
  fal: {
    config: vi.fn(),
    storage: { upload: vi.fn() },
    subscribe: vi.fn(),
  },
}));

describe("voice-clone helpers", () => {
  it("parses valid audio data URLs", () => {
    const buffer = Buffer.from("hello");
    const dataUrl = `data:audio/wav;base64,${buffer.toString("base64")}`;
    const parsed = parseDataUrl(dataUrl);

    expect(parsed?.mime).toBe("audio/wav");
    expect(parsed?.buffer.toString()).toBe("hello");
  });

  it("returns null for invalid data URLs", () => {
    expect(parseDataUrl("not-a-data-url")).toBeNull();
    expect(parseDataUrl("")).toBeNull();
  });
});

describe("voice-clone handler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects non-POST requests", async () => {
    const handler = (await import("./voice-clone.js")).default;
    const res = {
      setHeader: vi.fn(),
      status(code) {
        this.statusCode = code;
        return this;
      },
      json: vi.fn(),
    };

    await handler({ method: "GET", body: {} }, res);

    expect(res.statusCode).toBe(405);
    expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed" });
  });

  it("rejects missing name or audio sample", async () => {
    const handler = (await import("./voice-clone.js")).default;
    const res = {
      setHeader: vi.fn(),
      status(code) {
        this.statusCode = code;
        return this;
      },
      json: vi.fn(),
    };

    await handler({ method: "POST", body: { name: "Demo" } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing name or audio sample" });
  });
});
