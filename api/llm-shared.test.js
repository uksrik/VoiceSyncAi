import { describe, it, expect } from "vitest";
import { formatProviderError, filterProviderOrder } from "./llm-shared.js";

describe("formatProviderError", () => {
  it("explains Hugging Face Inference Providers permission errors", () => {
    const msg = formatProviderError(
      "Hugging Face",
      new Error(
        "This authentication method does not have sufficient permissions to call Inference Providers"
      )
    );
    expect(msg).toContain("Inference Providers");
    expect(msg).toContain("huggingface.co/settings/tokens");
  });
});

describe("filterProviderOrder", () => {
  it("skips groq when no API key is set", () => {
    delete process.env.GROQ_API_KEY;
    const order = filterProviderOrder(["groq", "huggingface", "rules"]);
    expect(order).not.toContain("groq");
    expect(order).toContain("huggingface");
  });
});
