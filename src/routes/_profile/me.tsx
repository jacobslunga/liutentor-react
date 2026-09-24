import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckIcon, LoaderCircleIcon, LogOutIcon, PlusIcon } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/lib/auth";
import { AVATAR_BG, AVATAR_BORDER, AVATAR_COLORS } from "@/lib/avatar-colors";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { activityQuery, profileQuery, useProfile, useUpdateProfile, type Profile } from "@/queries/profile";
import { useSettingsStore } from "@/stores/settings";

export const Route = createFileRoute("/_profile/me")({
  component: ProfilePage,
});

const dateFormatter = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "long", day: "numeric" });

function ProfilePage() {
  const { user, isPending, displayName } = useProfile();

  useEffect(() => {
    document.title = "Min profil | LiU Tentor";
  }, []);

  if (!user) return null;
  if (isPending) return <ProfileSkeleton />;

  const memberSince = user.created_at ? dateFormatter.format(new Date(user.created_at)) : "—";

  return (
    <div className="flex flex-col gap-8">
      <section className="relative p-6 sm:p-8">
        <div className="relative z-10 flex flex-col items-center text-center">
          <AvatarUpload />
          <h1 className="mt-4 text-2xl font-medium">{displayName || "Din profil"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground/80">Medlem sedan {memberSince}</p>
          <ActivityStats userId={user.id} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Inställningar</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <NameForm />
          <div className="divide-y rounded-md border bg-muted/40">
            <div className="p-5">
              <p className="mb-3 text-sm font-medium">Kontodetaljer</p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">E-post</span>
                  <span className="truncate font-medium">{user.email ?? "—"}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Registrerad</span>
                  <span className="font-medium">{memberSince}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Kontostatus</span>
                  <Badge variant="secondary">Aktiv</Badge>
                </p>
              </div>
            </div>
            <AvatarColorPicker />
            <SignOutRow />
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-muted/40 p-8">
      <Skeleton className="mx-auto h-8 w-40" />
      <Skeleton className="mx-auto mt-5 size-28 rounded-full" />
      <Skeleton className="mx-auto mt-4 h-4 w-56" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-18" />
        ))}
      </div>
    </section>
  );
}

function ActivityStats({ userId }: { userId: string }) {
  const { data, isPending } = useQuery(activityQuery(userId));
  const stats = [
    { label: "Quiz", value: data?.quizCount },
    { label: "AI Chattar", value: data?.conversationCount },
    { label: "Meddelanden", value: data?.chatMessageCount },
  ];

  return (
    <div className="mt-6 w-full max-w-2xl rounded-md border bg-muted/40 p-5 sm:p-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md border bg-background/70 p-3 sm:p-4">
            <p className="text-2xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-xl font-medium tabular-nums sm:text-2xl">
              {isPending ? "..." : stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AvatarUpload() {
  const { user, profile, initials, avatarColor } = useProfile();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    setUploading(true);
    const path = `${user.id}/avatar.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      setUploading(false);
      toast.error("Kunde inte ladda upp bilden", { description: "Försök igen om en stund." });
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    queryClient.setQueryData<Profile | null>(profileQuery(user.id).queryKey, (old) =>
      old ? { ...old, avatar_url: avatarUrl } : old,
    );
    setUploading(false);
    toast.success("Profilbild uppdaterad!");
  }

  return (
    <>
      <button
        type="button"
        className="group relative mt-4 shrink-0"
        disabled={uploading}
        aria-label="Byt profilbild"
        onClick={() => fileInput.current?.click()}
      >
        {profile?.avatar_url ? (
          <div
            className={cn(
              "relative size-30 overflow-hidden rounded-full border-4 sm:size-36",
              AVATAR_BORDER[avatarColor],
            )}
          >
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className={cn(
                "size-full object-cover",
                uploading ? "opacity-40" : "transition-opacity group-hover:opacity-85",
              )}
            />
          </div>
        ) : (
          <div
            className={cn(
              "relative flex size-30 items-center justify-center rounded-full border-4 text-5xl font-medium text-white sm:size-36",
              uploading ? "opacity-40" : "transition-opacity group-hover:opacity-85",
              AVATAR_BG[avatarColor],
              AVATAR_BORDER[avatarColor],
            )}
          >
            {initials}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <LoaderCircleIcon className="size-7 animate-spin text-white" />
          </div>
        )}
        <div className="absolute right-1 bottom-1 z-10 flex size-8 items-center justify-center rounded-full border bg-background">
          {uploading ? (
            <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <PlusIcon className="size-4" />
          )}
        </div>
      </button>
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </>
  );
}

function NameForm() {
  const { firstName, lastName } = useProfile();
  const update = useUpdateProfile();
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [saved, setSaved] = useState(false);
  const hasChanges = first.trim() !== firstName || last.trim() !== lastName;

  function save() {
    update.mutate(
      { first_name: first.trim() || null, last_name: last.trim() || null },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          toast.success("Profilen sparad!");
        },
        onError: () =>
          toast.error("Kunde inte spara profilen", { description: "Försök igen om en stund." }),
      },
    );
  }

  return (
    <div className="rounded-md border bg-muted/40 p-5">
      <p className="mb-3 text-sm font-medium">Namn</p>
      <div className="space-y-3">
        <Field>
          <FieldLabel htmlFor="profile-first" className="text-xs text-muted-foreground">
            Förnamn
          </FieldLabel>
          <Input
            id="profile-first"
            placeholder="Ditt förnamn"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-last" className="text-xs text-muted-foreground">
            Efternamn
          </FieldLabel>
          <Input
            id="profile-last"
            placeholder="Ditt efternamn"
            value={last}
            onChange={(e) => setLast(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button size="sm" disabled={update.isPending || !hasChanges} onClick={save}>
          {update.isPending ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : saved ? (
            <CheckIcon data-icon="inline-start" />
          ) : null}
          {saved ? "Sparat!" : "Spara"}
        </Button>
      </div>
    </div>
  );
}

function AvatarColorPicker() {
  const { avatarColor } = useProfile();
  const update = useUpdateProfile();
  const setLocalColor = useSettingsStore((s) => s.setAvatarColor);

  return (
    <div className="p-5">
      <p className="mb-3 text-sm font-medium">Avatarfärg</p>
      <div className="flex items-center gap-2">
        {AVATAR_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            aria-pressed={avatarColor === color}
            className={cn(
              "size-6 rounded-full transition-all duration-150",
              AVATAR_BG[color],
              avatarColor === color
                ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background"
                : "opacity-60 hover:opacity-100",
            )}
            onClick={() => {
              setLocalColor(color);
              update.mutate({ avatar_color: color });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SignOutRow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 p-5">
      <div>
        <p className="text-sm font-medium">Logga ut</p>
        <p className="text-xs text-muted-foreground">Avsluta din nuvarande session</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await signOut();
          void navigate({ to: "/", replace: true });
        }}
      >
        {loading ? <LoaderCircleIcon className="animate-spin" /> : <LogOutIcon data-icon="inline-start" />}
        {!loading && "Logga ut"}
      </Button>
    </div>
  );
}
