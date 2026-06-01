import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Panel.module.css";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  flush?: boolean;
  children: ReactNode;
}

export function Panel({ flush = false, className, children, ...rest }: PanelProps) {
  const cls = [styles.panel, flush && styles.flush, className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
