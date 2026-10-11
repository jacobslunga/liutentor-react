export const CHAT_MODELS = [
  {
    id: "fast",
    modelId: "gpt-6-luna",
    effort: "low",
    label: "Snabb",
    hint: "Få snabba svar",
    provider: "OpenAI",
    requiresAuth: false,
  },
  {
    id: "thinking",
    modelId: "gpt-6-luna",
    effort: "high",
    label: "Tänker",
    hint: "Hantera komplexa uppgifter",
    provider: "OpenAI",
    requiresAuth: true,
  },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_MODEL_ID: ChatModelId = "fast";
