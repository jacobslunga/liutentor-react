import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const WIDTHS = {
  medium: "sm:max-w-md",
  large: "sm:max-w-lg",
  xlarge: "sm:max-w-2xl",
} as const;

type AppDialogProps = {
  /** Heading; omit when `header` renders its own DialogTitle. */
  title?: ReactNode;
  description?: ReactNode;
  /** Replaces the default title/description block. */
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  onClose: () => void;
  width?: keyof typeof WIDTHS;
  role?: "dialog" | "alertdialog";
  className?: string;
};

/**
 * A shadcn Dialog with the usual parts (title, description, body, footer).
 * Rendered open; mount it conditionally.
 */
export function AppDialog({
  title,
  description,
  header,
  footer,
  children,
  onClose,
  width = "large",
  role,
  className,
}: AppDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        role={role}
        className={cn("flex max-h-[85dvh] flex-col", WIDTHS[width], className)}
      >
        {header ??
          (title && (
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </DialogHeader>
          ))}
        {children && (
          <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4">
            {children}
          </div>
        )}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
