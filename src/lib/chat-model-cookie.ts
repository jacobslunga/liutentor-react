import {
  CHAT_EFFORTS,
  CHAT_MODELS,
  DEFAULT_EFFORT,
  DEFAULT_MODEL_ID,
  type ChatEffort,
  type ChatModelId,
} from "./chat-models";

const MODEL_COOKIE_KEY = "liutentor_ai_model";
const EFFORT_COOKIE_KEY = "liutentor_ai_effort";
// Earlier versions stored "fast" / "thinking" or a different cookie name.
const OBSOLETE_COOKIE_KEY =
  /^liutentor_(?:selected_model|chat_model|chat_mode)(?:_v\d+)?$/;

function writeCookie(key: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${key}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function readCookies(): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const cookie of document.cookie.split(";")) {
    const [key, ...value] = cookie.trim().split("=");
    cookies.set(key, value.join("="));
  }
  return cookies;
}

export function saveChatModel(modelId: ChatModelId): void {
  writeCookie(MODEL_COOKIE_KEY, modelId);
}

export function saveChatEffort(effort: ChatEffort): void {
  writeCookie(EFFORT_COOKIE_KEY, effort);
}

export function readChatModel(): ChatModelId {
  if (typeof document === "undefined") return DEFAULT_MODEL_ID;
  const cookies = readCookies();
  for (const key of cookies.keys()) {
    if (OBSOLETE_COOKIE_KEY.test(key)) {
      document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  }
  const modelId =
    CHAT_MODELS.find((model) => model.id === cookies.get(MODEL_COOKIE_KEY))
      ?.id ?? DEFAULT_MODEL_ID;
  saveChatModel(modelId);
  return modelId;
}

export function readChatEffort(): ChatEffort {
  if (typeof document === "undefined") return DEFAULT_EFFORT;
  const stored = readCookies().get(EFFORT_COOKIE_KEY);
  return (
    CHAT_EFFORTS.find((effort) => effort.id === stored)?.id ?? DEFAULT_EFFORT
  );
}
