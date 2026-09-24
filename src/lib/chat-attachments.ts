import type { ChatAttachment } from "@/stores/chat";

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_TOTAL_SIZE = 20 * 1024 * 1024;

const EXTENSIONS_BY_MEDIA_TYPE: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
};

export const FILE_INPUT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/jpeg,image/png,image/webp,image/gif";

const attachmentKey = (f: Pick<File, "name" | "size" | "lastModified">) =>
  `${f.name}:${f.size}:${f.lastModified}`;

/**
 * Validates new files against the chat's limits (type, size, count, total,
 * duplicates) and turns the accepted ones into attachments. Returns the
 * distinct error messages for the rejected ones.
 */
export function acceptFiles(
  files: File[],
  existing: ChatAttachment[],
): { accepted: ChatAttachment[]; errors: string[] } {
  const keys = new Set(existing.map(attachmentKey));
  let count = existing.length;
  let totalSize = existing.reduce((sum, a) => sum + a.size, 0);
  const accepted: ChatAttachment[] = [];
  const errors = new Set<string>();

  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!EXTENSIONS_BY_MEDIA_TYPE[file.type]?.includes(extension)) {
      errors.add("Endast PDF, JPEG, PNG, WebP och GIF stöds.");
    } else if (file.size === 0) {
      errors.add("Tomma filer kan inte bifogas.");
    } else if (file.size > MAX_ATTACHMENT_SIZE) {
      errors.add("Varje fil får vara högst 5 MB.");
    } else if (keys.has(attachmentKey(file))) {
      errors.add("Dubbletter har hoppats över.");
    } else if (count >= MAX_ATTACHMENTS) {
      errors.add("En aktiv chatt kan ha högst fem filer.");
    } else if (totalSize + file.size > MAX_ATTACHMENTS_TOTAL_SIZE) {
      errors.add("Filerna får vara högst 20 MB tillsammans.");
    } else {
      accepted.push({
        id: crypto.randomUUID(),
        name: file.name,
        mediaType: file.type,
        size: file.size,
        lastModified: file.lastModified,
        active: true,
        file,
        ...(file.type.startsWith("image/") ? { previewUrl: URL.createObjectURL(file) } : {}),
      });
      keys.add(attachmentKey(file));
      count += 1;
      totalSize += file.size;
    }
  }

  return { accepted, errors: [...errors] };
}

const IMAGE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Pasted screenshots often arrive as "image.png" or without an extension. */
export function normalizeClipboardFile(file: File, index: number): File {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && extension !== file.name.toLowerCase()) return file;
  const resolved = IMAGE_EXTENSION[file.type];
  if (!resolved) return file;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new File([file], `skarmbild-${timestamp}${index ? `-${index + 1}` : ""}.${resolved}`, {
    type: file.type,
    lastModified: Date.now(),
  });
}
