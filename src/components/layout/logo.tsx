import { cn } from "@/lib/utils";
import { LogoIcon } from "./logo-icon";

interface LogoProps {
  showIcon?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export function Logo({
  showIcon = true,
  className,
  iconClassName,
  textClassName,
}: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {showIcon && <LogoIcon className={cn("size-7", iconClassName)} />}
      <span
        className={cn(
          "font-logo text-lg font-bold tracking-tighter",
          textClassName,
        )}
      >
        LiU Tentor
      </span>
    </span>
  );
}
