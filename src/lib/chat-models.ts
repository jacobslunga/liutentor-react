export const CHAT_MODELS = [
  {
    id: "gpt-6-luna",
    label: "ChatGPT",
    provider: "OpenAI",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini",
    provider: "Google",
  },
  {
    id: "claude-haiku-5-5",
    label: "Claude",
    provider: "Anthropic",
  },
] as const;

export const CHAT_EFFORTS = [
  { id: "low", label: "Låg", requiresAuth: false },
  { id: "medium", label: "Medium", requiresAuth: false },
  { id: "high", label: "Hög", requiresAuth: true },
] as const;

/** The id is also the model id the AI service expects. */
export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];
export type ChatEffort = (typeof CHAT_EFFORTS)[number]["id"];

export const DEFAULT_MODEL_ID: ChatModelId = "gemini-3.1-flash-lite";
export const DEFAULT_EFFORT: ChatEffort = "low";
