import { describe, it, expect } from "vitest";
import { buildSlideScriptRules } from "./slide-scripts.js";

describe("buildSlideScriptRules", () => {
  it("builds spoken narration from slide text", () => {
    const script = buildSlideScriptRules(
      {
        index: 1,
        title: "Introduction",
        body: "We help teams ship faster with AI-powered video.",
      },
      "Neutral"
    );
    expect(script).toMatch(/Welcome/i);
    expect(script.length).toBeGreaterThan(20);
  });

  it("applies emotion tone via rules fallback", () => {
    const script = buildSlideScriptRules(
      {
        index: 2,
        title: "Results",
        body: "Revenue grew twenty percent year over year.",
      },
      "Excited"
    );
    expect(script.length).toBeGreaterThan(15);
  });
});
