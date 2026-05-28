// Pure helpers for MMM. Server-only via ".server.ts" extension.
// Implements: matrix ops, Cholesky solve, ridge regression, adstock, Hill saturation, metrics.

export type Matrix = number[][];

export function transpose(A: Matrix): Matrix {
  const rows = A.length;
  const cols = A[0]?.length ?? 0;
  const T: Matrix = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) T[j][i] = A[i][j];
  return T;
}

export function matmul(A: Matrix, B: Matrix): Matrix {
  const n = A.length;
  const m = B[0].length;
  const k = B.length;
  const C: Matrix = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < k; p++) {
      const a = A[i][p];
      if (a === 0) continue;
      for (let j = 0; j < m; j++) C[i][j] += a * B[p][j];
    }
  }
  return C;
}

export function matvec(A: Matrix, x: number[]): number[] {
  const n = A.length;
  const m = x.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < m; j++) s += A[i][j] * x[j];
    y[i] = s;
  }
  return y;
}

// Solve A x = b where A is SPD using Cholesky (A = L L^T).
export function choleskySolve(A: Matrix, b: number[]): number[] {
  const n = A.length;
  const L: Matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (s <= 0) throw new Error("Matriz não positiva definida; aumente alpha.");
        L[i][j] = Math.sqrt(s);
      } else {
        L[i][j] = s / L[j][j];
      }
    }
  }
  // Forward solve L y = b
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k];
    y[i] = s / L[i][i];
  }
  // Back solve L^T x = y
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

// Invert SPD matrix via Cholesky (column by column).
export function choleskyInverse(A: Matrix): Matrix {
  const n = A.length;
  const inv: Matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    const e = new Array(n).fill(0);
    e[j] = 1;
    const col = choleskySolve(A, e);
    for (let i = 0; i < n; i++) inv[i][j] = col[i];
  }
  return inv;
}

// Geometric adstock: x_t' = x_t + decay * x_{t-1}'
export function adstock(x: number[], decay: number): number[] {
  const out = new Array(x.length).fill(0);
  let prev = 0;
  for (let i = 0; i < x.length; i++) {
    out[i] = x[i] + decay * prev;
    prev = out[i];
  }
  return out;
}

// Hill saturation: f(x) = x^alpha / (x^alpha + k^alpha)
export function hill(x: number[], alpha: number, k: number): number[] {
  const ka = Math.pow(Math.max(k, 1e-9), alpha);
  return x.map((v) => {
    const xa = Math.pow(Math.max(v, 0), alpha);
    return xa / (xa + ka);
  });
}

export function median(arr: number[]): number {
  const sorted = [...arr].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

export function std(arr: number[], mu?: number): number {
  if (arr.length === 0) return 0;
  const m = mu ?? mean(arr);
  let s = 0;
  for (const v of arr) s += (v - m) ** 2;
  return Math.sqrt(s / Math.max(1, arr.length - 1));
}

// Standard normal CDF for approximating p-values (large n => z-test).
function normalCdf(z: number): number {
  // Abramowitz & Stegun 7.1.26
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}
export function twoTailedPValue(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

export interface RidgeFitInput {
  X: Matrix; // n × p (after transformations, NOT standardized)
  y: number[]; // n
  alpha: number; // ridge penalty
  featureNames: string[];
}

export interface RidgeFitResult {
  beta: number[]; // length p (original scale, includes intercept implicitly via mean-centering)
  intercept: number;
  stdErrors: number[];
  zStats: number[];
  pValues: number[];
  yPred: number[];
  yMean: number;
  contributions: number[][]; // n × p, in original units
  featureNames: string[];
}

// Standardize, ridge-solve, then unstandardize.
export function ridgeFit({ X, y, alpha, featureNames }: RidgeFitInput): RidgeFitResult {
  const n = X.length;
  const p = X[0].length;

  // Column means / stds
  const xMeans: number[] = new Array(p).fill(0);
  const xStds: number[] = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    const col = X.map((row) => row[j]);
    xMeans[j] = mean(col);
    const s = std(col, xMeans[j]);
    xStds[j] = s > 1e-12 ? s : 1;
  }
  const yMean = mean(y);
  const yStd = std(y, yMean);
  const yStdSafe = yStd > 1e-12 ? yStd : 1;

  // Standardized matrices
  const Xs: Matrix = X.map((row) => row.map((v, j) => (v - xMeans[j]) / xStds[j]));
  const ys = y.map((v) => (v - yMean) / yStdSafe);

  const Xt = transpose(Xs);
  const XtX = matmul(Xt, Xs);
  // Add ridge penalty on the diagonal
  for (let i = 0; i < p; i++) XtX[i][i] += alpha;
  const Xty = matvec(Xt, ys);
  const betaStd = choleskySolve(XtX, Xty);

  // Unstandardize beta
  const beta = betaStd.map((b, j) => (b * yStdSafe) / xStds[j]);
  let intercept = yMean;
  for (let j = 0; j < p; j++) intercept -= beta[j] * xMeans[j];

  // Predictions (original scale)
  const yPred = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = intercept;
    for (let j = 0; j < p; j++) s += beta[j] * X[i][j];
    yPred[i] = s;
  }

  // Residual variance for std errors
  let rss = 0;
  for (let i = 0; i < n; i++) rss += (y[i] - yPred[i]) ** 2;
  const dof = Math.max(1, n - p - 1);
  const sigma2 = rss / dof;

  // Var(beta_std) ≈ sigma2_std * diag((X'X + alpha I)^-1)
  // sigma2_std = sigma2 / yStd^2
  const invXtX = choleskyInverse(XtX);
  const sigma2Std = sigma2 / (yStdSafe * yStdSafe);
  const seStd: number[] = new Array(p).fill(0);
  for (let j = 0; j < p; j++) seStd[j] = Math.sqrt(Math.max(0, sigma2Std * invXtX[j][j]));
  // Unstandardize std errors
  const stdErrors = seStd.map((se, j) => (se * yStdSafe) / xStds[j]);
  const zStats = beta.map((b, j) => (stdErrors[j] > 0 ? b / stdErrors[j] : 0));
  const pValues = zStats.map((z) => twoTailedPValue(z));

  // Contributions in original units: beta_j * x_ij (centered on column mean to align with intercept)
  const contributions: number[][] = Array.from({ length: n }, () => new Array(p).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      contributions[i][j] = beta[j] * X[i][j];
    }
  }

  return { beta, intercept, stdErrors, zStats, pValues, yPred, yMean, contributions, featureNames };
}

export function r2(yTrue: number[], yPred: number[]): number {
  const m = mean(yTrue);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < yTrue.length; i++) {
    ssRes += (yTrue[i] - yPred[i]) ** 2;
    ssTot += (yTrue[i] - m) ** 2;
  }
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

export function mape(yTrue: number[], yPred: number[]): number {
  let s = 0;
  let n = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (Math.abs(yTrue[i]) > 1e-9) {
      s += Math.abs((yTrue[i] - yPred[i]) / yTrue[i]);
      n++;
    }
  }
  return n === 0 ? 0 : s / n;
}

export function rmse(yTrue: number[], yPred: number[]): number {
  let s = 0;
  for (let i = 0; i < yTrue.length; i++) s += (yTrue[i] - yPred[i]) ** 2;
  return Math.sqrt(s / Math.max(1, yTrue.length));
}
