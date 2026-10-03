import { useParams } from "@tanstack/react-router";
import { MessageCircleIcon, UploadIcon } from "lucide-react";
import { AuthActions } from "@/components/auth/auth-actions";
import { RouterLinkButton } from "@/components/shared/router-link";
import { cn } from "@/lib/utils";
import { useUploadModal } from "@/stores/upload-modal";
import { Button } from "@/components/ui/button";

export function HeaderActions({ className }: { className?: string }) {
  const openUploadModal = useUploadModal((s) => s.open);

  const { courseCode } = useParams({ strict: false });

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <div className="sm:hidden">
        <RouterLinkButton
          to="/chatt"
          size="icon-sm"
          variant="ghost"
          aria-label="Chatt"
        >
          <MessageCircleIcon />
        </RouterLinkButton>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <RouterLinkButton to="/chatt" size="sm" variant="ghost">
          <MessageCircleIcon />
          Chatt
        </RouterLinkButton>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openUploadModal(courseCode)}
        >
          <UploadIcon />
          Ladda upp
        </Button>
      </div>
      <AuthActions showSettings />
    </div>
  );
}
