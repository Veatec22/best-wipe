import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./IconButton.module.css";

type Variant = "bare" | "framed" | "outline";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: Variant;
  type?: "button" | "submit" | "reset";
  label: string;
  children: ReactNode;
}

export function IconButton({
  variant = "bare",
  type = "button",
  label,
  className,
  children,
  ...rest
}: IconButtonProps) {
  const classes = [
    styles.iconButton,
    variant === "framed" && styles.framed,
    variant === "outline" && styles.outline,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      aria-label={label}
      title={rest.title ?? label}
      {...rest}
    >
      {children}
    </button>
  );
}
