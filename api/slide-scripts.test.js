import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildSlideScriptRules,
  buildSlideScriptPrompt,
  isGenericScript,
  slideSourceText,
  generateSlideScript,
} from "./slide-scripts.js";

describe("slideSourceText", () => {
  it("merges content, body, and title without duplicates", () => {
    const text = slideSourceText({
      title: "Intro",
      body: "We ship faster.",
      content: "Intro We ship faster.",
    });
    expect(text).toContain("We ship faster");
    expect(text).toContain("Intro");
  });
});

describe("buildSlideScriptPrompt", () => {
  it("includes slide text and forbids generic openers", () => {
    const prompt = buildSlideScriptPrompt(
      {
        index: 2,
        title: "Revenue",
        body: "Revenue grew twenty percent year over year.",
      },
      "Serious"
    );
    expect(prompt).toContain("Revenue grew twenty percent");
    expect(prompt).toContain("Do NOT say 'Welcome'");
  });
});

describe("isGenericScript", () => {
  it("flags placeholder scripts", () => {
    expect(
      isGenericScript("Welcome. Let's look at Slide 1.", {
        index: 1,
        title: "Slide 1",
        body: "Our product reduces cost by thirty percent.",
      })
    ).toBe(true);
  });

  it("accepts scripts that reflect slide content", () => {
    expect(
      isGenericScript(
        "Revenue grew twenty percent year over year, driven by enterprise adoption.",
        {
          index: 2,
          title: "Results",
          body: "Revenue grew twenty percent year over year.",
        }
      )
    ).toBe(false);
  });
});

describe("buildSlideScriptRules", () => {
  it("uses slide content instead of generic slide labels", () => {
    const script = buildSlideScriptRules(
      {
        index: 1,
        title: "Introduction",
        body: "We help teams ship faster with AI-powered video.",
        content: "Introduction We help teams ship faster with AI-powered video.",
      },
      "Neutral"
    );
    expect(script).toContain("AI-powered video");
    expect(script).not.toMatch(/let'?s look at slide/i);
  });

  it("applies emotion tone via rules fallback", () => {
    const script = buildSlideScriptRules(
      {
        index: 2,
        title: "Results",
        body: "Revenue grew twenty percent year over year.",
        content: "Revenue grew twenty percent year over year.",
      },
      "Excited"
    );
    expect(script.length).toBeGreaterThan(15);
  });
});

describe("generateSlideScript", () => {
  const slide = {
    index: 1,
    title: "Product",
    body: "Our platform automates lip-sync for training videos.",
    content: "Product Our platform automates lip-sync for training videos.",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.FAL_KEY;
    delete process.env.GROQ_API_KEY;
    process.env.SLIDE_SCRIPT_PROVIDER_ORDER = "huggingface,rules";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.HF_API_TOKEN;
    delete process.env.GROQ_API_KEY;
    delete process.env.SLIDE_SCRIPT_PROVIDER_ORDER;
  });

  it("uses Hugging Face when the API returns relevant narration", async () => {
    process.env.HF_API_TOKEN = "test-token";
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                "Our platform automates lip-sync so training videos feel natural and engaging for every learner.",
            },
          },
        ],
      }),
    });

    const result = await generateSlideScript(slide, "Neutral");
    expect(result.provider).toBe("huggingface");
    expect(result.script).toContain("lip-sync");
  });

  it("falls back to rules when AI returns generic text", async () => {
    process.env.HF_API_TOKEN = "test-token";
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Welcome. Let's look at Slide 1." } }],
      }),
    });

    const result = await generateSlideScript(slide, "Neutral");
    expect(result.provider).toBe("rules");
    expect(result.script).toContain("lip-sync");
  });
});
