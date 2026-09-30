import { toast } from "sonner";

function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function fetchBytes(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Downloads a (cross-origin) file under the given name, or opens it as a fallback. */
export async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    saveBlob(await res.blob(), filename);
  } catch {
    window.open(url, "_blank");
  }
}

/**
 * Downloads several files as one zip. PDFs are already compressed, so they're
 * stored as-is; fflate loads only when a zip is actually asked for.
 */
export async function downloadZip(
  files: { url: string; filename: string }[],
  zipName: string,
) {
  const [{ zipSync }, contents] = await Promise.all([
    import("fflate"),
    Promise.all(files.map((f) => fetchBytes(f.url))),
  ]);
  const zipped = zipSync(
    Object.fromEntries(files.map((f, i) => [f.filename, contents[i]])),
    { level: 0 },
  );
  saveBlob(new Blob([zipped], { type: "application/zip" }), zipName);
}

/** File names for an exam's PDFs, and the zip holding both. */
export function examFileNames(courseCode: string, examDate: string) {
  const base = `${courseCode}_${examDate}`;
  return { exam: `${base}_EXAM.pdf`, solution: `${base}_SOLUTION.pdf`, zip: `${base}.zip` };
}

/** Zips the exam and its solution into one download, with progress in a toast. */
export function downloadBoth(
  courseCode: string,
  examDate: string,
  examPdfUrl: string,
  solutionPdfUrl: string,
) {
  const names = examFileNames(courseCode, examDate);
  toast.promise(
    downloadZip(
      [
        { url: examPdfUrl, filename: names.exam },
        { url: solutionPdfUrl, filename: names.solution },
      ],
      names.zip,
    ),
    {
      loading: "Packar tenta och facit...",
      success: "Zip-filen laddas ned",
      error: "Kunde inte skapa zip-filen.",
    },
  );
}
