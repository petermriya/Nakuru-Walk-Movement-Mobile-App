import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Badge } from "@/components/tab-bar";

type Look = "raised" | "plain" | "danger";
type Common = {
  /** What it does, read out by screen readers and shown on hover. Required: the button has no words. */
  label: string;
  look?: Look;
  /** A count in the corner, such as unread messages. */
  badge?: number;
  className?: string;
  children: ReactNode;
};

const classes = (look: Look, className = "") => `icon-btn ${look === "raised" ? "icon-btn-raised" : look === "danger" ? "icon-btn-danger" : ""} ${className}`;
const named = (label: string, badge?: number) => (badge ? `${label}, ${badge} new` : label);

/** The one round icon button: 44px, for a finger. A link when it has href, otherwise a button. */
export function IconButton(props: Common & ({ href: string } | Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">)) {
  const { label, look = "plain", badge, className, children, ...rest } = props;
  const inside = (
    <>
      {children}
      {badge ? <Badge n={badge} className="absolute -top-0.5 -right-0.5" /> : null}
    </>
  );
  if ("href" in rest && typeof rest.href === "string") {
    return (
      <Link href={rest.href} aria-label={named(label, badge)} title={label} className={classes(look, className)}>
        {inside}
      </Link>
    );
  }
  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type="button" {...buttonProps} aria-label={named(label, badge)} title={label} className={classes(look, className)}>
      {inside}
    </button>
  );
}
