import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "quiet";
type Shape = "pill" | "solid";

const base =
  "inline-flex items-center justify-center gap-2 font-sans text-label-lg transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-container",
  outline: "border border-outline text-on-surface hover:bg-surface-container",
  quiet: "text-primary underline hover:opacity-80",
};

const shapes: Record<Shape, string> = {
  pill: "rounded-full px-10 py-4 shadow-md",
  solid: "rounded px-6 py-2.5",
};

export function Button({
  variant = "primary",
  shape = "solid",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; shape?: Shape }) {
  return <button className={`${base} ${variants[variant]} ${shapes[shape]} ${className}`} {...props} />;
}
