const COOKIE = "liutentor_chat_intro_seen";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function hasSeenChatIntro(): boolean {
  try {
    return document.cookie
      .split("; ")
      .some((part) => part.startsWith(`${COOKIE}=`));
  } catch {
    return false;
  }
}

export function markChatIntroSeen() {
  try {
    document.cookie = `${COOKIE}=1; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax${
      location.protocol === "https:" ? "; Secure" : ""
    }`;
  } catch {}
}
