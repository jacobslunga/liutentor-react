import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDialogPresence } from "@/hooks/use-dialog-presence";

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = "Avbryt",
  isPending = false,
  onConfirm,
  onCancel,
}: {
  title: ReactNode;
  children: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { open, onAnimationEnd } = useDialogPresence();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => !open && !isPending && onCancel()}
    >
      <AlertDialogContent onAnimationEnd={onAnimationEnd}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{children}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>

          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending && <Spinner />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
