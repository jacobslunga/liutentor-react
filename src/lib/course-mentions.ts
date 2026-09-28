import type { Message } from "@/stores/chat";

/**
 * "@TATA41"-style course references in the learning chat. LiU course codes are
 * five or six letters and digits (TATA41, TDDE44, 725G80); matching loosely and
 * uppercasing lets "@tata41" work too.
 */
const MENTION_PATTERN = /(^|[^\w@])@([A-Za-z0-9]{5,6})(?![\w])/g;

/** The backend accepts at most this many courses per turn. */
export const MAX_COURSE_MENTIONS = 3;

export interface CourseRef {
  code: string;
  name?: string;
}

/** Codes mentioned in `text`, uppercased, in order, without duplicates. */
export function findCourseMentions(text: string): string[] {
  const codes = new Set<string>();
  for (const match of text.matchAll(MENTION_PATTERN))
    codes.add(match[2].toUpperCase());
  return [...codes];
}

/**
 * Courses referenced anywhere in the conversation, so a follow-up question
 * keeps the course context without repeating the mention. The most recently
 * mentioned courses win when there are more than the backend accepts.
 */
export function conversationCourses(
  messages: Message[],
  nameByCode: Map<string, string>,
): CourseRef[] {
  const codes: string[] = [];
  for (const message of messages) {
    if (message.role !== "user") continue;
    for (const code of findCourseMentions(message.content)) {
      const existing = codes.indexOf(code);
      if (existing !== -1) codes.splice(existing, 1);
      codes.push(code);
    }
  }
  return codes.slice(-MAX_COURSE_MENTIONS).map((code) => {
    const name = nameByCode.get(code);
    return name ? { code, name } : { code };
  });
}

export type MentionPart =
  | { type: "text"; text: string }
  /** `text` is the mention as typed, e.g. "@tata41". */
  | { type: "mention"; code: string; text: string };

/** Splits a user message into text and course mentions for rendering. */
export function splitCourseMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const start = match.index + match[1].length;
    if (start > last) parts.push({ type: "text", text: text.slice(last, start) });
    last = start + 1 + match[2].length;
    parts.push({
      type: "mention",
      code: match[2].toUpperCase(),
      text: text.slice(start, last),
    });
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}

/** Where each mention sits in `text`: `start` is the "@", `end` is exclusive. */
export function findMentionRanges(
  text: string,
): { start: number; end: number; code: string }[] {
  return [...text.matchAll(MENTION_PATTERN)].map((match) => {
    const start = match.index + match[1].length;
    return {
      start,
      end: start + 1 + match[2].length,
      code: match[2].toUpperCase(),
    };
  });
}

/**
 * The "@query" being typed right before the caret, if any. `start` is the
 * index of the "@".
 */
export function activeMentionQuery(
  value: string,
  caret: number,
): { start: number; query: string } | null {
  const match = /(^|\s)@([A-Za-z0-9]{0,6})$/.exec(value.slice(0, caret));
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2] };
}
