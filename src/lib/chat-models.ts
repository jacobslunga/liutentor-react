export const CHAT_MODELS = [
  {
    id: "claude-haiku-5-5",
    label: "Haiku",
    hint: "Snabb och träffsäker",
    provider: "Anthropic",
  },
  {
    id: "gpt-6-luna",
    label: "Luna",
    hint: "Bra för vardagliga frågor",
    provider: "OpenAI",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini",
    hint: "Lätt och snabb",
    provider: "Google",
  },
] as const;

export const CHAT_EFFORTS = [
  { id: "low", label: "Låg", requiresAuth: false },
  { id: "medium", label: "Medel", requiresAuth: false },
  { id: "high", label: "Hög", requiresAuth: true },
] as const;

/** The id is also the model id the AI service expects. */
export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];
export type ChatEffort = (typeof CHAT_EFFORTS)[number]["id"];

export const DEFAULT_MODEL_ID: ChatModelId = "gpt-6-luna";
export const DEFAULT_EFFORT: ChatEffort = "low";
