import { Button } from "@primer/react";
import { useParams } from "@tanstack/react-router";
import { MessageCircleIcon, UploadIcon } from "lucide-react";
import { AuthActions } from "@/components/auth/auth-actions";
import {
  RouterLinkButton,
  RouterLinkIconButton,
} from "@/components/primer/router-link-button";
import { cn } from "@/lib/utils";
import { useUploadModal } from "@/stores/upload-modal";

/** The top-right links shared by the home page and the search header. */
export function HeaderActions({ className }: { className?: string }) {
  const openUploadModal = useUploadModal((s) => s.open);
  // On a course or exam page, the upload starts on that course.
  const { courseCode } = useParams({ strict: false });

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      {/* Phones get an icon-only chat link and no upload, so the row fits. */}
      <div className="sm:hidden">
        <RouterLinkIconButton
          to="/chatt"
          size="small"
          variant="invisible"
          icon={MessageCircleIcon}
          aria-label="Chatt"
        />
      </div>
      <div className="hidden items-center gap-2 sm:flex">
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
      </div>
      <AuthActions showSettings />
    </div>
  );
}
