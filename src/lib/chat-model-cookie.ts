import { CHAT_MODELS, DEFAULT_MODEL_ID, type ChatModelId } from "./chat-models";

const MODEL_COOKIE_KEY = "liutentor_chat_model";

export function saveChatModel(modelId: ChatModelId): void {
  if (typeof document === "undefined") return;
  document.cookie = `${MODEL_COOKIE_KEY}=${modelId}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function readChatModel(): ChatModelId {
  if (typeof document === "undefined") return DEFAULT_MODEL_ID;
  const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
  for (const cookie of cookies) {
    const key = cookie.split("=")[0];
    if (/^liutentor_selected_model(?:_v\d+)?$/.test(key)) {
      document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  }
  const stored = cookies
    .find((cookie) => cookie.startsWith(`${MODEL_COOKIE_KEY}=`))
    ?.slice(MODEL_COOKIE_KEY.length + 1);
  const modelId =
    CHAT_MODELS.find((model) => model.id === stored)?.id ?? DEFAULT_MODEL_ID;
  saveChatModel(modelId);
  return modelId;
}
