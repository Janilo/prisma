import { describe, expect, it } from "vitest";
import {
  AppError,
  AuthError,
  NotFoundError,
  ValidationError,
  isAppError,
  userMessageFrom,
} from "./errors";

describe("AppError e subtipos", () => {
  it("carrega userMessage como message e o httpStatus do subtipo", () => {
    expect(new AppError("Falha ao salvar.").httpStatus).toBe(500);
    expect(new NotFoundError("Run não encontrado.").httpStatus).toBe(404);
    expect(new ValidationError("Poucas linhas.").httpStatus).toBe(422);
    expect(new AuthError().httpStatus).toBe(401);
    expect(new AuthError("Acesso negado.", 403).httpStatus).toBe(403);
    expect(new NotFoundError("Run não encontrado.").message).toBe("Run não encontrado.");
  });

  it("subtipos são instanceof AppError (lado servidor)", () => {
    expect(new NotFoundError()).toBeInstanceOf(AppError);
    expect(new ValidationError("x")).toBeInstanceOf(AppError);
    expect(new AuthError()).toBeInstanceOf(AppError);
  });
});

describe("userMessageFrom — dos dois lados do boundary", () => {
  it("retorna a mensagem de um AppError vivo", () => {
    expect(userMessageFrom(new ValidationError("Poucas linhas."))).toBe("Poucas linhas.");
  });

  it("retorna a mensagem da forma deserializada (Error puro + marker)", () => {
    // A serialização do serverFn preserva own props mas não o prototype: no
    // client chega um Error com appError=true. É por isso que a UI usa
    // userMessageFrom, nunca instanceof.
    const wire = Object.assign(new Error("Run não encontrado."), {
      name: "NotFoundError",
      appError: true,
      httpStatus: 404,
    });
    expect(wire).not.toBeInstanceOf(AppError);
    expect(isAppError(wire)).toBe(true);
    expect(userMessageFrom(wire)).toBe("Run não encontrado.");
  });

  it("retorna undefined para erros de infra — a UI mostra o genérico", () => {
    expect(userMessageFrom(new Error("connect ECONNREFUSED 127.0.0.1:5432"))).toBeUndefined();
    expect(userMessageFrom("string")).toBeUndefined();
    expect(userMessageFrom(null)).toBeUndefined();
    expect(userMessageFrom({ appError: "true" })).toBeUndefined();
  });
});
