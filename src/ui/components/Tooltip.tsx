import { type ReactNode, useId, useState } from "react";
import styles from "./Tooltip.module.css";

type Side = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  label: string;
  side?: Side;
  children: ReactNode;
}

export function Tooltip({ label, side = "top", children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const bubbleCls = [styles.bubble, styles[side]].join(" ");

  return (
    <span
      className={styles.wrap}
      role="group"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span id={id} role="tooltip" className={bubbleCls}>
          {label}
        </span>
      )}
    </span>
  );
}
