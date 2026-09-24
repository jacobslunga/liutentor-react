/** Finds an exam date in a filename: YYYY-MM-DD (any separator) or YYMMDD. */
export function parseDateFromFilename(name: string): string | null {
  const pad = (n: number) => String(n).padStart(2, "0");
  const full = name.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  if (full) {
    const [year, month, day] = [Number(full[1]), Number(full[2]), Number(full[3])];
    if (year > 1990 && year < 2050 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }
  const short = name.match(/(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)/);
  if (short) {
    const [year, month, day] = [Number(short[1]), Number(short[2]), Number(short[3])];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${2000 + year}-${pad(month)}-${pad(day)}`;
    }
  }
  return null;
}

const SOLUTION_KEYWORDS = [
  "lösningsförslag",
  "facit",
  "solution",
  "losning",
  "sol",
  "lsn",
  "lösning",
  "tenlsg",
  "lf",
  "svar",
];

/** Guesses whether a file is a solution (facit) from its name. */
export function isSolution(name: string): boolean {
  const n = name.toLowerCase();
  if (n.includes("tenta_och_svar")) return false;
  return SOLUTION_KEYWORDS.some((k) => n.includes(k));
}

export interface UploadMetadata {
  courseCode: string;
  originalFilename: string;
  normalizedFilename: string;
  examDate: string;
  fileType: "EXAM" | "SOLUTION";
}

/** Uploads exam PDFs for review. Throws with a user-facing message. */
export async function uploadExams(courseCode: string, files: File[]) {
  const code = courseCode.toUpperCase().trim();
  const formData = new FormData();
  const metadata: UploadMetadata[] = files.map((file) => {
    const examDate = parseDateFromFilename(file.name);
    if (!examDate) throw new Error(`Kunde inte hitta ett datum i filnamnet: ${file.name}`);
    const fileType = isSolution(file.name) ? "SOLUTION" : "EXAM";
    formData.append("files", file);
    return {
      courseCode: code,
      originalFilename: file.name,
      normalizedFilename: `${code}_${examDate}_${fileType}.pdf`,
      examDate,
      fileType,
    };
  });
  formData.append("metadata", JSON.stringify(metadata));

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Ett fel uppstod vid uppladdningen.");
  }
}
