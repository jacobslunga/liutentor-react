export const AVATAR_COLORS = [
  "rose-500",
  "orange-500",
  "amber-500",
  "emerald-500",
  "cyan-500",
  "blue-500",
  "violet-500",
  "pink-500",
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

// Full class names so Tailwind picks them up.
export const AVATAR_BG: Record<string, string> = {
  "rose-500": "bg-rose-500",
  "orange-500": "bg-orange-500",
  "amber-500": "bg-amber-500",
  "emerald-500": "bg-emerald-500",
  "cyan-500": "bg-cyan-500",
  "blue-500": "bg-blue-500",
  "violet-500": "bg-violet-500",
  "pink-500": "bg-pink-500",
};

export const AVATAR_BORDER: Record<string, string> = {
  "rose-500": "border-rose-500",
  "orange-500": "border-orange-500",
  "amber-500": "border-amber-500",
  "emerald-500": "border-emerald-500",
  "cyan-500": "border-cyan-500",
  "blue-500": "border-blue-500",
  "violet-500": "border-violet-500",
  "pink-500": "border-pink-500",
};

export function randomAvatarColor(): AvatarColor {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
