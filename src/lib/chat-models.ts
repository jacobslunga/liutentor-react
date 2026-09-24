/**
 * The picker is presented as a thinking level rather than a model name: students
 * pick how much effort they want spent, not a vendor. Each level maps to exactly
 * one model, so the mapping stays swappable without touching the UI copy.
 */
export const CHAT_MODELS = [
  {
    id: "gemini-flash-lite-minimal",
    label: "Låg",
    hint: "Snabbast. Bra för korta frågor.",
    provider: "Google",
    requiresAuth: false,
  },
  {
    id: "gemini-flash-lite-medium",
    label: "Medium",
    hint: "Standard för de flesta uppgifter.",
    provider: "Google",
    requiresAuth: false,
  },
  {
    id: "gemini-flash-lite-high",
    label: "Hög",
    hint: "Tänker längre. Bäst på svåra uppgifter.",
    provider: "Google",
    requiresAuth: true,
  },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_MODEL_ID: ChatModelId = "gemini-flash-lite-minimal";
