import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Provedor de IA OpenAI-compatível. A URL base vem de AI_GATEWAY_URL (default: API
// direta do Google AI Studio / Gemini, OpenAI-compatível) e a chave de AI_API_KEY
// (resolvida pelo chamador). Trocar de provider (Google, OpenRouter, OpenAI…) é só
// setar AI_GATEWAY_URL + AI_API_KEY como secrets do Worker — sem mexer no código.
// O header Authorization: Bearer é o padrão OpenAI (o Google também o aceita).
export const createAiGatewayProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "ai-gateway",
    baseURL:
      process.env.AI_GATEWAY_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
