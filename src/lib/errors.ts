// Typed domain errors (P-05). Business code throws these instead of bare
// `Error("string")`, so the UI can (a) trust that `message` is safe to show a
// user and (b) react to the kind of failure via httpStatus/subtype — while
// anything NOT an AppError renders as a generic "algo deu errado".
//
// Invariant: `message` IS the user-facing message. Internal detail (SQL error,
// missing env var, stack) must go to console.error at the throw site, never
// into the message.
//
// Boundary note: server functions serialize thrown errors (seroval), which
// preserves own enumerable props (`appError`, `httpStatus`, `name`) but NOT
// the class prototype — on the client the error arrives as a plain Error.
// That is why callers check `isAppError(e)` / `userMessageFrom(e)` instead of
// `instanceof AppError` when the error may have crossed the wire.

export class AppError extends Error {
  /** Own enumerable marker that survives the serverFn serialization boundary. */
  readonly appError = true;
  readonly httpStatus: number;

  constructor(userMessage: string, httpStatus = 500) {
    super(userMessage);
    this.name = new.target.name;
    this.httpStatus = httpStatus;
  }
}

export class NotFoundError extends AppError {
  constructor(userMessage = "Não encontrado.") {
    super(userMessage, 404);
  }
}

export class ValidationError extends AppError {
  constructor(userMessage: string) {
    super(userMessage, 422);
  }
}

export class AuthError extends AppError {
  constructor(userMessage = "Não autenticado. Faça login novamente.", httpStatus = 401) {
    super(userMessage, httpStatus);
  }
}

// True for a live AppError OR its deserialized shape (plain Error + marker).
export function isAppError(e: unknown): boolean {
  if (e instanceof AppError) return true;
  return e != null && typeof e === "object" && (e as { appError?: unknown }).appError === true;
}

// The message that is safe to render. undefined for non-domain errors —
// callers show a generic fallback (and log the original).
export function userMessageFrom(e: unknown): string | undefined {
  if (!isAppError(e)) return undefined;
  const msg = (e as { message?: unknown }).message;
  return typeof msg === "string" && msg.length > 0 ? msg : undefined;
}
