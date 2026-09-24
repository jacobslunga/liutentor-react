import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUploadModal } from "@/stores/upload-modal";
import { ExamUploadForm } from "./exam-upload-form";

/** The global upload dialog, opened from anywhere via useUploadModal. */
export function ExamUploadDialog() {
  const isOpen = useUploadModal((s) => s.isOpen);
  const courseCode = useUploadModal((s) => s.prefilledCourseCode);
  const close = useUploadModal((s) => s.close);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ladda upp tenta eller facit</DialogTitle>
          <DialogDescription>
            Hjälp andra studenter på Linköpings Universitet genom att dela gamla tentor och lösningar.
          </DialogDescription>
        </DialogHeader>
        <ExamUploadForm key={courseCode} initialCourseCode={courseCode} fixedCourseCode={!!courseCode} />
      </DialogContent>
    </Dialog>
  );
}
