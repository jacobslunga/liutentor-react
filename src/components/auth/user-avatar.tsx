import { Avatar } from "@primer/react";
import { AVATAR_BG } from "@/lib/avatar-colors";
import { cn } from "@/lib/utils";
import { useProfile } from "@/queries/profile";

/** The signed-in user's avatar image, or initials on their avatar color. */
export function UserAvatar({ className, fallbackClassName }: { className?: string; fallbackClassName?: string }) {
  const { profile, initials, avatarColor, isPending } = useProfile();

  if (profile?.avatar_url) {
    return <Avatar src={profile.avatar_url} alt="Avatar" className={cn("size-8", className)} />;
  }

  // Primer's Avatar is image-only, so initials get the same round frame by hand.
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full text-sm font-medium text-white select-none",
        AVATAR_BG[avatarColor],
        className,
        fallbackClassName,
      )}
    >
      {isPending ? "" : initials}
    </span>
  );
}
