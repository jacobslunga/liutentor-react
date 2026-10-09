import { DialogPresence } from "@/components/shared/dialog-presence";
import { useUploadModal } from "@/stores/upload-modal";
import { ExamUploadForm } from "./exam-upload-form";
import { AppDialog } from "@/components/shared/app-dialog";

export function ExamUploadDialog() {
  const isOpen = useUploadModal((s) => s.isOpen);
  const courseCode = useUploadModal((s) => s.prefilledCourseCode);
  const close = useUploadModal((s) => s.close);

  return (
    <DialogPresence>
      {isOpen && (
        <AppDialog
          width="xlarge"
          title="Ladda upp tenta eller facit"
          description="Hjälp andra studenter på Linköpings Universitet genom att dela gamla tentor och lösningar."
          onClose={close}
        >
          <ExamUploadForm
            key={courseCode}
            initialCourseCode={courseCode}
            fixedCourseCode={!!courseCode}
          />
        </AppDialog>
      )}
    </DialogPresence>
  );
}
