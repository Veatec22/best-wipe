export type AvatarGender = "m" | "f" | "n";

export type AvatarRef =
  | { kind: "static"; id: string }
  | { kind: "generic"; gender: AvatarGender; index: number }
  | { kind: "generic-seeded"; gender: AvatarGender; seed: string }
  | { kind: "system"; id: string }
  | { kind: "player"; id: string }
  | { kind: "initials"; label: string; tone?: "ink" | "paper" };

export const initialsAvatar = (label: string, tone: "ink" | "paper" = "paper"): AvatarRef => ({
  kind: "initials",
  label,
  tone,
});
