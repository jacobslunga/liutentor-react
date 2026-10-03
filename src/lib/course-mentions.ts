import type { Message } from "@/stores/chat";

const MENTION_PATTERN = /(^|[^\w@])@([A-Za-z0-9]{5,6})(?![\w])/g;

export const MAX_COURSE_MENTIONS = 3;

export interface CourseRef {
  code: string;
  name?: string;
}

export function findCourseMentions(text: string): string[] {
  const codes = new Set<string>();
  for (const match of text.matchAll(MENTION_PATTERN))
    codes.add(match[2].toUpperCase());
  return [...codes];
}

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
  | { type: "mention"; code: string; text: string };

export function splitCourseMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const start = match.index + match[1].length;
    if (start > last)
      parts.push({ type: "text", text: text.slice(last, start) });
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

export function activeMentionQuery(
  value: string,
  caret: number,
): { start: number; query: string } | null {
  const match = /(^|\s)@([A-Za-z0-9]{0,6})$/.exec(value.slice(0, caret));
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2] };
}
