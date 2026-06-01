import { describe, it, expect, vi } from "vitest";
import {
  buildRewritePrompt,
  cleanRewriteOutput,
  rewriteWithRules,
  emotionPrompts,
} from "./rewrite.js";

describe("rewrite helpers", () => {
  it("builds a prompt with the selected emotion tone", () => {
    const prompt = buildRewritePrompt("Hello world.", "Happy");
    expect(prompt).toContain("joyful, upbeat");
    expect(prompt).toContain("Hello world.");
  });

  it("cleans markdown fences from model output", () => {
    expect(cleanRewriteOutput('```\nRewritten script here.\n```')).toBe(
      "Rewritten script here."
    );
  });

  it("rewrites with rules without network", () => {
    const result = rewriteWithRules("This is good news for everyone.", "Happy");
    expect(result).not.toBe("This is good news for everyone.");
    expect(result.length).toBeGreaterThan(10);
  });

  it("returns neutral script unchanged from rules", () => {
    const script = "Keep this exactly.";
    expect(rewriteWithRules(script, "Neutral")).toBe(script);
  });

  it("defines all UI emotions", () => {
    for (const emotion of ["Happy", "Serious", "Excited", "Calm", "Inspirational"]) {
      expect(emotionPrompts[emotion]).toBeTruthy();
    }
  });
});

describe("rewrite handler", () => {
  it("rejects GET requests", async () => {
    const handler = (await import("./rewrite.js")).default;
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
  });

  it("uses rules provider when configured as only provider", async () => {
    vi.resetModules();
    process.env.REWRITE_PROVIDER_ORDER = "rules";
    const handler = (await import("./rewrite.js")).default;
    const res = {
      setHeader: vi.fn(),
      status(code) {
        this.statusCode = code;
        return this;
      },
      json: vi.fn(),
    };

    await handler(
      {
        method: "POST",
        body: { script: "We built something amazing today.", emotion: "Excited" },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "rules",
        script: expect.stringMatching(/amazing|!/i),
      })
    );

    delete process.env.REWRITE_PROVIDER_ORDER;
  });
});
