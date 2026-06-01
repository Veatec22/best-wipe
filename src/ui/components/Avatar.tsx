import type { CSSProperties } from "react";
import type { AvatarRef } from "../../game/campaign/avatarTypes";
import { resolveAvatar } from "../../services/avatars";

export interface AvatarProps {
  avatar: AvatarRef;
  size?: number;
  alt: string;
  title?: string;
  className?: string;
}

export const Avatar = ({ avatar, size = 32, alt, title, className }: AvatarProps) => {
  const { url } = resolveAvatar(avatar);
  const style: CSSProperties = {
    width: size,
    height: size,
    imageRendering: "pixelated",
    display: "block",
    border: "1px solid var(--ink)",
    background: "var(--paper)",
    flex: "0 0 auto",
  };
  return (
    <img
      src={url}
      alt={alt}
      title={title ?? alt}
      width={size}
      height={size}
      style={style}
      className={className}
      draggable={false}
    />
  );
};
