import { describe, it, expect } from "vitest";
import {
  isPlaceholderScript,
  narrateSlideFromContent,
  slideReadableText,
} from "./slideNarration.js";

describe("narrateSlideFromContent", () => {
  it("reads real slide body instead of generic slide labels", () => {
    const script = narrateSlideFromContent({
      index: 2,
      title: "Slide 2",
      body: "Revenue grew 20%. Costs fell 8%. Margin expanded.",
      content: "Revenue grew 20%. Costs fell 8%. Margin expanded.",
    });
    expect(script).toContain("Revenue grew");
    expect(script).not.toMatch(/walk you through the key point/i);
    expect(script).not.toMatch(/this slide is titled/i);
  });

  it("uses a real title when present", () => {
    const script = narrateSlideFromContent({
      index: 1,
      title: "Q4 Results",
      body: "Enterprise ARR passed ten million dollars.",
      content: "Q4 Results Enterprise ARR passed ten million dollars.",
    });
    expect(script).toContain("Q4 Results");
    expect(script).toContain("ten million");
  });
});

describe("isPlaceholderScript", () => {
  it("detects old generic fallback lines", () => {
    expect(
      isPlaceholderScript("This slide is titled Slide 2. I'll walk you through the key point on screen.")
    ).toBe(true);
    expect(isPlaceholderScript("Revenue grew twenty percent year over year.")).toBe(false);
  });
});

describe("slideReadableText", () => {
  it("ignores auto slide title when body exists", () => {
    expect(
      slideReadableText({
        title: "Slide 3",
        body: "Customer satisfaction reached ninety-five percent.",
        content: "Customer satisfaction reached ninety-five percent.",
      })
    ).toContain("ninety-five");
  });
});
