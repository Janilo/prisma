import { describe, it, expect } from "vitest";
import {
  adstock,
  hill,
  choleskySolve,
  choleskyInverse,
  ridgeFit,
  r2,
  rmse,
  mean,
  std,
} from "./mmm.server";

describe("adstock", () => {
  it("is the identity when decay is 0", () => {
    expect(adstock([1, 2, 3], 0)).toEqual([1, 2, 3]);
  });

  it("applies geometric carryover", () => {
    // 1, then 0.5·1, then 0.5·0.5
    expect(adstock([1, 0, 0], 0.5)).toEqual([1, 0.5, 0.25]);
  });
});

describe("hill saturation", () => {
  it("is 0 at 0, monotonic increasing, and bounded below 1", () => {
    const [h0, h1, h2] = hill([0, 1, 2], 1, 1);
    expect(h0).toBe(0);
    expect(h1).toBeGreaterThan(h0);
    expect(h2).toBeGreaterThan(h1);
    expect(h2).toBeLessThan(1);
  });
});

describe("choleskySolve", () => {
  it("solves an SPD system", () => {
    const x = choleskySolve(
      [
        [2, 1],
        [1, 2],
      ],
      [3, 3],
    );
    expect(x[0]).toBeCloseTo(1, 10);
    expect(x[1]).toBeCloseTo(1, 10);
  });

  it("throws on a non-positive-definite matrix (guarding singular X'X)", () => {
    expect(() =>
      choleskySolve(
        [
          [1, 2],
          [2, 1],
        ],
        [1, 1],
      ),
    ).toThrow();
  });
});

describe("choleskyInverse", () => {
  it("inverts a diagonal SPD matrix", () => {
    const inv = choleskyInverse([
      [4, 0],
      [0, 9],
    ]);
    expect(inv[0][0]).toBeCloseTo(0.25, 10);
    expect(inv[1][1]).toBeCloseTo(1 / 9, 10);
  });
});

describe("ridgeFit", () => {
  // Clean, noise-free linear data: y = 10 + 2·x1 + 3·x2.
  const X = [
    [1, 2],
    [2, 1],
    [3, 4],
    [4, 3],
    [5, 7],
    [6, 5],
  ];
  const y = X.map((r) => 10 + 2 * r[0] + 3 * r[1]);

  it("recovers known coefficients when alpha is tiny", () => {
    const fit = ridgeFit({ X, y, alpha: 1e-8, featureNames: ["a", "b"] });
    expect(fit.beta[0]).toBeCloseTo(2, 1);
    expect(fit.beta[1]).toBeCloseTo(3, 1);
    expect(fit.intercept).toBeCloseTo(10, 0);
    expect(r2(y, fit.yPred)).toBeGreaterThan(0.999);
  });

  it("shrinks coefficients toward zero as alpha grows", () => {
    const sumAbs = (b: number[]) => b.reduce((s, v) => s + Math.abs(v), 0);
    const low = ridgeFit({ X, y, alpha: 0.01, featureNames: ["a", "b"] });
    const high = ridgeFit({ X, y, alpha: 500, featureNames: ["a", "b"] });
    expect(sumAbs(high.beta)).toBeLessThan(sumAbs(low.beta));
  });

  it("decomposition invariant: intercept + Σ contributions === prediction", () => {
    const fit = ridgeFit({ X, y, alpha: 1e-6, featureNames: ["a", "b"] });
    for (let i = 0; i < X.length; i++) {
      const total = fit.intercept + fit.contributions[i].reduce((s, v) => s + v, 0);
      expect(total).toBeCloseTo(fit.yPred[i], 6);
    }
  });
});

describe("metrics", () => {
  it("r2 is 1 for a perfect fit", () => {
    expect(r2([1, 2, 3], [1, 2, 3])).toBe(1);
  });

  it("rmse is 0 for identical arrays", () => {
    expect(rmse([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("mean and std compute the obvious values", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(std([2, 4, 6])).toBe(2);
  });
});
