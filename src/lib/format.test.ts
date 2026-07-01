import { describe, it, expect } from "vitest";
import { fmt, pConfidence } from "./format";

describe("fmt", () => {
  it("scales to B / M / k with the documented precision", () => {
    expect(fmt(2_500_000_000)).toBe("2.50B");
    expect(fmt(8_400_000)).toBe("8.40M");
    expect(fmt(760_000)).toBe("760.0k");
    expect(fmt(42)).toBe("42.0");
  });

  it("scales by magnitude for negatives", () => {
    expect(fmt(-3_000_000)).toBe("-3.00M");
  });

  it("returns an em-dash for non-finite values", () => {
    expect(fmt(NaN)).toBe("—");
    expect(fmt(Infinity)).toBe("—");
  });
});

describe("pConfidence", () => {
  it("has no confidence label for the Base series", () => {
    expect(pConfidence(0.001, "Base (sazonalidade + intercepto)")).toBe("—");
  });

  it("maps p-value thresholds", () => {
    expect(pConfidence(0.005, "Search")).toBe("Muito alta (★★★)");
    expect(pConfidence(0.03, "Search")).toBe("Alta (★★)");
    expect(pConfidence(0.08, "Search")).toBe("Moderada (★)");
    expect(pConfidence(0.5, "Search")).toBe("Baixa");
  });
});
