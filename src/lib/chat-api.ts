const AI_API_BASE =
  import.meta.env.VITE_AI_API_URL ??
  "https://liutentor-hono-687405545415.europe-north2.run.app/api/v1";

export const CHAT_COMPLETION_URL = `${AI_API_BASE}/chat/completion`;

const ANONYMOUS_ID_KEY = "liutentor_anonymous_id";

/** Stable per-browser id so anonymous usage can be rate limited. */
export function getAnonymousId(): string {
  try {
    const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
    return id;
  } catch {
    return "unknown";
  }
}

/** Splits an SSE byte stream into `{ event, data }` frames. */
export async function* readSseEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: unknown }> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const event = frame.match(/^event: (\w+)/m)?.[1];
      const data = frame.match(/^data: (.+)/m)?.[1];
      if (!event || !data) continue;
      try {
        yield { event, data: JSON.parse(data) };
      } catch {
        // A frame we can't parse is not worth killing the turn over.
      }
    }
  }
}
