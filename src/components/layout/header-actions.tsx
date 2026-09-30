import { Button } from "@primer/react";
import { useParams } from "@tanstack/react-router";
import { MessageCircleIcon, UploadIcon } from "lucide-react";
import { AuthActions } from "@/components/auth/auth-actions";
import { RouterLinkButton } from "@/components/primer/router-link-button";
import { cn } from "@/lib/utils";
import { useUploadModal } from "@/stores/upload-modal";

/** The top-right links shared by the home page and the search header. */
export function HeaderActions({ className }: { className?: string }) {
  const openUploadModal = useUploadModal((s) => s.open);
  // On a course or exam page, the upload starts on that course.
  const { courseCode } = useParams({ strict: false });

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <RouterLinkButton
        to="/chatt"
        size="small"
        variant="invisible"
        leadingVisual={MessageCircleIcon}
      >
        Chatt
      </RouterLinkButton>
      <Button
        size="small"
        variant="invisible"
        leadingVisual={UploadIcon}
        onClick={() => openUploadModal(courseCode)}
      >
        Ladda upp
      </Button>
      <AuthActions showSettings />
    </div>
  );
}
