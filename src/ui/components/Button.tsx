import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "default" | "primary" | "ok" | "danger";
type Size = "default" | "compact";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: Variant;
  size?: Size;
  type?: "button" | "submit" | "reset";
  children?: ReactNode;
}

export function Button({
  variant = "default",
  size = "default",
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    variant === "primary" && styles.primary,
    variant === "ok" && styles.ok,
    variant === "danger" && styles.danger,
    size === "compact" && styles.compact,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
