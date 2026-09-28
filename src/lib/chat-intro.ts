/**
 * The one-time dialog introducing the learning chat. Remembered in a cookie
 * (a functional one: it only stops the dialog from coming back), set when the
 * visitor opens the chat, dismisses the dialog, or visits /chatt on their own.
 */
const COOKIE = "liutentor_chat_intro_seen";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function hasSeenChatIntro(): boolean {
  try {
    return document.cookie
      .split("; ")
      .some((part) => part.startsWith(`${COOKIE}=`));
  } catch {
    // Cookies blocked: showing it again is better than never.
    return false;
  }
}

export function markChatIntroSeen() {
  try {
    document.cookie = `${COOKIE}=1; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax${
      location.protocol === "https:" ? "; Secure" : ""
    }`;
  } catch {
    // See above.
  }
}
