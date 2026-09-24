import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AVATAR_BG } from "@/lib/avatar-colors";
import { cn } from "@/lib/utils";
import { useProfile } from "@/queries/profile";

/** The signed-in user's avatar image, or initials on their avatar color. */
export function UserAvatar({ className, fallbackClassName }: { className?: string; fallbackClassName?: string }) {
  const { profile, initials, avatarColor, isPending } = useProfile();

  return (
    <Avatar className={className}>
      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
      <AvatarFallback
        className={cn("font-medium text-white", AVATAR_BG[avatarColor], fallbackClassName)}
      >
        {isPending ? "" : initials}
      </AvatarFallback>
    </Avatar>
  );
}
