import { createClient } from "@supabase/supabase-js";
import { json, serverEnv } from "../lib/env.ts";
import { sendUploadNotification, type UploadedDocument } from "../lib/upload-notification.ts";

interface UploadMetadata extends UploadedDocument {
  normalizedFilename: string;
}

/** Stores uploaded exam PDFs for review: pending-pdfs bucket + pending_uploads row. */
export default async (req: Request) => {
  if (req.method !== "POST") return json({ message: "Method not allowed" }, 405);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ message: "No form data" }, 400);
  }

  let metadata: UploadMetadata[];
  try {
    metadata = JSON.parse(String(form.get("metadata") ?? "[]"));
  } catch {
    return json({ message: "Invalid upload metadata" }, 400);
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length || files.length !== metadata.length) {
    return json({ message: "Missing required fields" }, 400);
  }

  const config = serverEnv();
  const supabase = createClient(config.supabaseUrl, config.supabaseKey);
  const uploaded: UploadedDocument[] = [];

  for (const [index, file] of files.entries()) {
    const item = metadata[index];
    if (
      !item?.courseCode ||
      !item.originalFilename ||
      !item.normalizedFilename ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.examDate) ||
      !["EXAM", "SOLUTION"].includes(item.fileType)
    ) {
      return json({ message: "Invalid file metadata" }, 400);
    }

    const filePath = `public/${item.normalizedFilename}`;
    const { error: storageError } = await supabase.storage
      .from("pending-pdfs")
      .upload(filePath, await file.arrayBuffer(), { contentType: "application/pdf", upsert: false });
    if (storageError) return json({ message: storageError.message }, 500);

    const { error: dbError } = await supabase.from("pending_uploads").insert([
      {
        course_code: item.courseCode,
        original_filename: item.originalFilename,
        pdf_url: `${config.supabaseUrl}/storage/v1/object/public/pending-pdfs/${filePath}`,
      },
    ]);
    if (dbError) return json({ message: dbError.message }, 500);

    uploaded.push({
      courseCode: item.courseCode,
      originalFilename: item.originalFilename,
      examDate: item.examDate,
      fileType: item.fileType,
    });
  }

  let notificationSent = false;
  try {
    notificationSent = await sendUploadNotification(uploaded);
  } catch (error) {
    console.error("Failed to send upload notification", error);
  }

  return json({ success: true, uploaded: uploaded.length, notificationSent });
};

export const config = { path: "/api/upload" };
