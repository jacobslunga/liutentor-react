export const CHAT_MODELS = [
  {
    id: "gpt-6-luna",
    label: "Snabb",
    hint: "Få snabba svar",
    provider: "OpenAI",
    requiresAuth: false,
  },
  {
    id: "gpt-6.1-sol",
    label: "Tänker",
    hint: "Hantera komplexa uppgifter",
    provider: "OpenAI",
    requiresAuth: true,
  },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_MODEL_ID: ChatModelId = "gpt-6-luna";
