import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Provedor de IA OpenAI-compatível. A URL base vem de AI_GATEWAY_URL e a chave
// de AI_API_KEY (resolvida pelo chamador), com fallback pro gateway do Lovable
// pra não quebrar nada. Trocar de provider (OpenRouter, Google, OpenAI…) é só
// setar AI_GATEWAY_URL + AI_API_KEY como secrets do Worker — sem mexer no código.
// O header Authorization: Bearer é o padrão OpenAI (o gateway do Lovable também o aceita).
export const createAiGatewayProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "ai-gateway",
    baseURL: process.env.AI_GATEWAY_URL ?? "https://ai.gateway.lovable.dev/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

// Alias retrocompatível (uso anterior).
export const createLovableAiGatewayProvider = createAiGatewayProvider;
