import {
  BookIcon,
  FileTextIcon,
  InfoIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { useTypingPlaceholder } from "@/hooks/use-typing-placeholder";
import { uploadExams } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/shared/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { AppDialog } from "@/components/shared/app-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExamUploadFormProps {
  initialCourseCode?: string;

  fixedCourseCode?: boolean;
}

export function ExamUploadForm({
  initialCourseCode = "",
  fixedCourseCode = false,
}: ExamUploadFormProps) {
  const [courseCode, setCourseCode] = useState(initialCourseCode.toUpperCase());
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  useTypingPlaceholder(codeInputRef, "", !fixedCourseCode);

  const addFiles = (incoming: File[]) =>
    setFiles((current) => [
      ...current,
      ...incoming.filter((f) => f.type === "application/pdf"),
    ]);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setIsOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  async function upload() {
    if (!files.length || !courseCode) return;
    setLoading(true);
    try {
      await uploadExams(courseCode, files);
      setResult({ ok: true });
      setFiles([]);
      if (!fixedCourseCode) setCourseCode("");
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "Okänt fel",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {fixedCourseCode ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Kurskod</p>
          <div className="flex items-center justify-center gap-2 rounded-md border bg-muted/30 px-4 py-3">
            <BookIcon className="size-4 text-muted-foreground" />
            <span className="font-mono text-lg font-medium">{courseCode}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label
            htmlFor="upload-course-code"
            className="block text-sm font-medium text-muted-foreground"
          >
            Kurskod
          </label>
          <input
            id="upload-course-code"
            ref={codeInputRef}
            value={courseCode}
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
            className="w-full border-0 border-b-2 border-foreground/20 bg-transparent p-2 text-center text-4xl font-medium transition-colors outline-none placeholder:text-muted-foreground/40 focus:border-brand"
            onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
          />
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-all duration-150",
          isOver
            ? "scale-[1.02] border-primary bg-primary/5"
            : "hover:border-primary/50",
          loading && "pointer-events-none opacity-50",
        )}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()
        }
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <UploadIcon className="size-8" />
          <p className="font-medium">
            Dra och släpp PDF-filer här, eller klicka för att välja
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-2 rounded-md border p-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                </div>
                <IconButton
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Ta bort ${file.name}`}
                  onClick={() =>
                    setFiles((current) => current.filter((_, i) => i !== index))
                  }
                >
                  <XIcon />
                </IconButton>
              </div>
            ))}
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={loading || !courseCode}
            onClick={() => void upload()}
          >
            {loading && <Spinner />}
            Ladda upp
          </Button>
        </div>
      )}

      <Alert>
        <InfoIcon />
        <AlertDescription>
          Uppladdade tentor granskas innan de blir tillgängliga för andra
          studenter.
        </AlertDescription>
      </Alert>

      {result && (
        <AppDialog
          role="alertdialog"
          title={result.ok ? "Uppladdning lyckades!" : "Något gick fel"}
          onClose={() => setResult(null)}
          footer={<Button onClick={() => setResult(null)}>OK</Button>}
        >
          {result.ok
            ? "Tack! Din tenta har laddats upp och granskas inom kort."
            : result.message || "Ett fel uppstod vid uppladdningen."}
        </AppDialog>
      )}
    </div>
  );
}
