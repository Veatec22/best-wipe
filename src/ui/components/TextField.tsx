import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import styles from "./TextField.module.css";

type CommonProps = {
  fill?: boolean;
  className?: string;
};

export type TextFieldProps = CommonProps &
  ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>);

export type TextInputProps = CommonProps &
  ({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>);

export function TextField(props: TextFieldProps | TextInputProps) {
  const { fill = false, className } = props;
  const cls = [styles.field, fill && styles.fill, className].filter(Boolean).join(" ");

  if ("multiline" in props && props.multiline) {
    const { multiline: _m, fill: _f, className: _c, ...rest } = props;
    return <textarea className={cls} {...rest} />;
  }

  const { multiline: _m, fill: _f, className: _c, ...rest } = props as TextInputProps;
  return <input className={cls} {...rest} />;
}
