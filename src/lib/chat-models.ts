export const CHAT_MODELS = [
  {
    id: "gemini-flash-lite-minimal",
    label: "Snabb",
    hint: "Få snabba svar",
    provider: "Google",
    requiresAuth: false,
  },
  {
    id: "gemini-flash-lite-medium",
    label: "Tänker",
    hint: "Hantera komplexa uppgifter",
    provider: "Google",
    requiresAuth: false,
  },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_MODEL_ID: ChatModelId = "gemini-flash-lite-minimal";
