import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Link, type LinkProps } from "react-router";
import styles from "./Button.module.css";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-solid";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

interface StyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

const VARIANTS: Record<ButtonVariant, string | undefined> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
  "danger-solid": styles.dangerSolid,
};

export function buttonClassName({
  variant = "secondary",
  size = "md",
  fullWidth,
  iconOnly,
}: StyleOptions) {
  return cx(
    styles.button,
    VARIANTS[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    iconOnly && styles.iconOnly,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleOptions {
  icon?: IconName;
  iconEnd?: IconName;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant,
  size,
  fullWidth,
  icon,
  iconEnd,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const iconSize = size === "xl" ? 28 : size === "sm" ? 16 : 20;
  return (
    <button
      type={type}
      className={cx(buttonClassName({ variant, size, fullWidth, iconOnly: !children }), className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size={iconSize} /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconEnd && !loading ? <Icon name={iconEnd} size={iconSize} /> : null}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps, StyleOptions {
  icon?: IconName;
  iconEnd?: IconName;
  children: ReactNode;
}

export function ButtonLink({
  variant,
  size,
  fullWidth,
  icon,
  iconEnd,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const iconSize = size === "xl" ? 28 : size === "sm" ? 16 : 20;
  return (
    <Link className={cx(buttonClassName({ variant, size, fullWidth }), className)} {...props}>
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} size={iconSize} /> : null}
    </Link>
  );
}
