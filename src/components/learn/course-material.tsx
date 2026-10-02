import { ConfirmationDialog, ProgressBar } from "@primer/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  FileTextIcon,
  LoaderCircleIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { formatFileSize } from "@/lib/format";
import {
  COURSE_QUOTA_BYTES,
  deleteCourseFile,
  uploadCourseFile,
  type CourseFile,
} from "@/lib/study-courses";
import { cn } from "@/lib/utils";
import { courseFilesKey, courseFilesQuery } from "@/queries/study-courses";
import { useUser } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/shared/icon-button";

interface PendingUpload {
  id: string;
  name: string;
  sizeBytes: number;
}

const isPdf = (file: File) =>
  file.type === "application/pdf" || /\.pdf$/i.test(file.name);

/**
 * A course's lecture material: PDFs the course's chats search. Drops here
 * upload material; the chat's own drop target is told to ignore them.
 */
export function CourseMaterial({ courseId }: { courseId: string }) {
  const user = useUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: files = [], isPending, isError } = useQuery(
    courseFilesQuery(courseId),
  );
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [isOver, setIsOver] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CourseFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const usedBytes =
    files.reduce((sum, f) => sum + f.sizeBytes, 0) +
    uploads.reduce((sum, u) => sum + u.sizeBytes, 0);

  async function upload(list: File[]) {
    if (!user) return;
    let budget = COURSE_QUOTA_BYTES - usedBytes;
    const accepted: File[] = [];
    for (const file of list) {
      if (!isPdf(file)) {
        toast.error(`${file.name}: bara PDF-filer stöds.`);
      } else if (file.size > budget) {
        toast.error(`${file.name} får inte plats (max 100 MB per kurs).`);
      } else {
        accepted.push(file);
        budget -= file.size;
      }
    }
    if (!accepted.length) return;

    const pending = accepted.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      sizeBytes: file.size,
    }));
    setUploads((current) => [...pending, ...current]);

    // One at a time: the API checks the quota against what is already saved.
    for (const [i, file] of accepted.entries()) {
      try {
        const saved = await uploadCourseFile(user.id, courseId, file);
        queryClient.setQueryData<CourseFile[]>(
          courseFilesKey(courseId),
          (old) => [saved, ...(old ?? []).filter((f) => f.id !== saved.id)],
        );
      } catch (error) {
        toast.error(
          `${file.name}: ${error instanceof Error ? error.message : "kunde inte laddas upp."}`,
        );
      } finally {
        setUploads((current) => current.filter((u) => u.id !== pending[i].id));
      }
    }
    // Starts the status polling for what is still being indexed.
    void queryClient.invalidateQueries({ queryKey: courseFilesKey(courseId) });
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteCourseFile(courseId, pendingDelete.id);
      queryClient.setQueryData<CourseFile[]>(courseFilesKey(courseId), (old) =>
        old?.filter((f) => f.id !== pendingDelete.id),
      );
      setPendingDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kunde inte ta bort filen.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const empty = !files.length && !uploads.length;

  return (
    <div className="space-y-4">
      <div
        data-material-drop
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors",
          isOver ? "border-primary bg-primary/5" : "border-border",
        )}
        onDragEnter={(e) => {
          if (e.dataTransfer.types.includes("Files")) setIsOver(true);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          void upload(Array.from(e.dataTransfer.files));
        }}
      >
        <UploadIcon className="size-5 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm">Dra hit föreläsningar eller annat kursmaterial</p>
          <p className="text-xs text-muted-foreground">
            PDF, högst 100 MB totalt per kurs
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void upload(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" disabled={usedBytes >= COURSE_QUOTA_BYTES} onClick={() => fileInputRef.current?.click()}>
          Välj filer
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Utrymme</span>
          <span>
            {usedBytes ? formatFileSize(usedBytes) : "0 MB"} av 100 MB
          </span>
        </div>
        <ProgressBar
          progress={Math.min(100, (usedBytes / COURSE_QUOTA_BYTES) * 100)}
          aria-label="Använt utrymme"
        />
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Hämtar material...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Kunde inte hämta materialet.</p>
      ) : empty ? (
        <p className="text-sm text-muted-foreground">
          Inget material än. Chattar i kursen söker i det du laddar upp och
          hänvisar till det.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {uploads.map((u) => (
            <FileRow
              key={u.id}
              name={u.name}
              sizeBytes={u.sizeBytes}
              status={
                <span className="flex items-center gap-1.5">
                  <LoaderCircleIcon className="size-3.5 animate-spin" />
                  Laddar upp...
                </span>
              }
            />
          ))}
          {files.map((file) => (
            <FileRow
              key={file.id}
              name={file.name}
              sizeBytes={file.sizeBytes}
              status={
                file.status === "processing" ? (
                  <span className="flex items-center gap-1.5">
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                    Läser in...
                  </span>
                ) : file.status === "failed" ? (
                  <span
                    className="flex items-center gap-1.5 text-destructive"
                    title={file.error ?? undefined}
                  >
                    <AlertCircleIcon className="size-3.5" />
                    Misslyckades
                  </span>
                ) : null
              }
              onDelete={() => setPendingDelete(file)}
            />
          ))}
        </ul>
      )}

      {pendingDelete && (
        <ConfirmationDialog
          title="Ta bort filen?"
          cancelButtonContent="Avbryt"
          confirmButtonContent="Ta bort"
          confirmButtonType="danger"
          confirmButtonLoading={deleting}
          onClose={(gesture) => {
            if (deleting) return;
            if (gesture === "confirm") void confirmDelete();
            else setPendingDelete(null);
          }}
        >
          "{pendingDelete.name}" tas bort från kursen, och chattarna kan inte
          längre söka i den.
        </ConfirmationDialog>
      )}
    </div>
  );
}

function FileRow({
  name,
  sizeBytes,
  status,
  onDelete,
}: {
  name: string;
  sizeBytes: number;
  status: React.ReactNode;
  onDelete?: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 px-3 py-2.5">
      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" title={name}>
          {name}
        </p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {formatFileSize(sizeBytes)}
          {status}
        </p>
      </div>
      {onDelete && (
        <IconButton variant="ghost" size="icon-sm" className="shrink-0 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100" aria-label={`Ta bort ${name}`} onClick={onDelete}><Trash2Icon /></IconButton>
      )}
    </li>
  );
}
