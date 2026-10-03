import { AI_API_BASE } from "@/lib/chat-api";
import { getAuthHeaders, supabase } from "@/lib/supabase";







export const MATERIAL_BUCKET = "study-materials";

export const COURSE_QUOTA_BYTES = 100 * 1024 * 1024;
export const COURSE_NAME_MAX = 80;

export interface StudyCourse {
  id: string;
  name: string;
  createdAt: string;
}

export type CourseFileStatus = "processing" | "ready" | "failed";

export interface CourseFile {
  id: string;
  name: string;
  sizeBytes: number;
  status: CourseFileStatus;
  error: string | null;
  createdAt: string;
}

const COURSES_URL = `${AI_API_BASE}/study-courses`;


async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${COURSES_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(await getAuthHeaders()),
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    payload?: T;
  } | null;
  if (!response.ok) {
    throw new Error(body?.message || "Något gick fel. Försök igen.");
  }
  return body?.payload as T;
}

export async function listStudyCourses(userId: string): Promise<StudyCourse[]> {
  const { data, error } = await supabase
    .from("study_courses")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export async function createStudyCourse(
  userId: string,
  name: string,
): Promise<StudyCourse> {
  const { data, error } = await supabase
    .from("study_courses")
    .insert({ user_id: userId, name: name.trim() })
    .select("id, name, created_at")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, createdAt: data.created_at };
}

export async function renameStudyCourse(id: string, name: string) {
  const { error } = await supabase
    .from("study_courses")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}


export function deleteStudyCourse(id: string) {
  return api<null>(`/${id}`, { method: "DELETE" });
}

export function listCourseFiles(courseId: string) {
  return api<CourseFile[]>(`/${courseId}/files`);
}





export async function uploadCourseFile(
  userId: string,
  courseId: string,
  file: File,
): Promise<CourseFile> {
  const storagePath = `${userId}/${courseId}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .upload(storagePath, file, { contentType: "application/pdf" });
  if (error) throw new Error("Kunde inte ladda upp filen.");
  return api<CourseFile>(`/${courseId}/files`, {
    method: "POST",
    body: JSON.stringify({ storagePath, name: file.name }),
  });
}

export function deleteCourseFile(courseId: string, fileId: string) {
  return api<null>(`/${courseId}/files/${fileId}`, { method: "DELETE" });
}





export async function courseFileUrl(openaiFileId: string): Promise<string | null> {
  const { data } = await supabase
    .from("study_course_files")
    .select("storage_path")
    .eq("openai_file_id", openaiFileId)
    .maybeSingle();
  if (!data) return null;
  const { data: signed } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .createSignedUrl(data.storage_path, 60 * 10);
  return signed?.signedUrl ?? null;
}
