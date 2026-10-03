import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AVATAR_BG } from "@/lib/avatar-colors";
import { cn } from "@/lib/utils";
import { useProfile } from "@/queries/profile";


export function UserAvatar({
  className,
  fallbackClassName,
}: {
  className?: string;
  fallbackClassName?: string;
}) {
  const { profile, initials, avatarColor, isPending } = useProfile();

  return (
    <Avatar className={cn("size-8", className)}>
      {profile?.avatar_url && (
        <AvatarImage src={profile.avatar_url} alt="Avatar" />
      )}
      <AvatarFallback
        className={cn(
          "text-sm font-medium text-white",
          AVATAR_BG[avatarColor],
          fallbackClassName,
        )}
      >
        {isPending ? "" : initials}
      </AvatarFallback>
    </Avatar>
  );
}
