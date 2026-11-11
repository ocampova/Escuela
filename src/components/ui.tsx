import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { initials } from "@/lib/format";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------- Botones ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,box-shadow,color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-[0_1px_2px_rgb(18_70_58/0.25)] hover:bg-brand-hover",
  secondary: "bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-canvas",
  ghost: "text-ink-2 hover:bg-brand-soft hover:text-brand-ink",
  danger: "bg-danger text-white hover:bg-[#912018]",
};
const buttonSizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-base" };

export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof buttonSizes = "md", extra?: string) {
  return cx(buttonBase, buttonVariants[variant], buttonSizes[size], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof buttonSizes }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: keyof typeof buttonSizes }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ---------- Superficies ---------- */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-xl bg-surface shadow-card", className)} {...props} />;
}

export function SectionHeading({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("mb-3 flex items-end justify-between gap-3", className)}>
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Etiquetas ---------- */

type Tone = "neutral" | "brand" | "ok" | "warn" | "danger" | "orange" | "green" | "blue";
const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-2 ring-line",
  brand: "bg-brand-soft text-brand-ink ring-[#cfe0d9]",
  ok: "bg-ok-soft text-ok ring-[#c5e5d2]",
  warn: "bg-warn-soft text-warn ring-[#f6dfb5]",
  danger: "bg-danger-soft text-danger ring-[#f7cdc8]",
  orange: "bg-scs-orange-soft text-scs-orange-ink ring-[#f8d6c4]",
  green: "bg-scs-green-soft text-scs-green-ink ring-[#cfe7c9]",
  blue: "bg-scs-blue-soft text-scs-blue-ink ring-[#c6e2f3]",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}>
      {children}
    </span>
  );
}

export function sectionTone(color: string): Tone {
  return color === "orange" || color === "blue" || color === "green" ? color : "brand";
}

const dot: Record<string, string> = { orange: "bg-scs-orange", green: "bg-scs-green", blue: "bg-scs-blue" };

export function SectionChip({ color, label, className }: { color: string; label: string; className?: string }) {
  return (
    <Badge tone={sectionTone(color)} className={className}>
      <span aria-hidden className={cx("size-1.5 rounded-full", dot[color] ?? "bg-brand")} />
      {label}
    </Badge>
  );
}

/* ---------- Avatares ---------- */

const avatarTones: Record<string, string> = {
  orange: "bg-scs-orange-strong text-white",
  green: "bg-scs-green-strong text-white",
  blue: "bg-scs-blue-strong text-white",
  brand: "bg-brand-soft text-brand-ink",
  onBrand: "bg-white/15 text-white",
};

export function Avatar({ name, color = "brand", size = 40, className }: { name: string; color?: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", avatarTones[color] ?? avatarTones.brand, className)}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Vacíos ---------- */

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Formularios ---------- */

export const inputClass =
  "block w-full rounded-lg border-0 bg-surface px-3 py-2.5 text-[15px] text-ink ring-1 ring-inset ring-line-strong placeholder:text-ink-3 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand";

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function DemoNotice({ className }: { className?: string }) {
  return (
    <p className={cx("text-xs text-ink-3", className)}>
      Prototipo con datos de demostración. Las personas, cédulas y montos son ficticios.
    </p>
  );
}

/* ---------- Franja SCS ---------- */

/** Las tres letras del logo como franja: el sello visual de la plataforma. */
export function BrandStripe({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx("flex h-1", className)}>
      <span className="flex-1 bg-scs-orange" />
      <span className="flex-1 bg-scs-green" />
      <span className="flex-1 bg-scs-blue" />
    </div>
  );
}

export const sectionSolid: Record<string, string> = {
  orange: "bg-scs-orange-strong ring-scs-orange-strong",
  green: "bg-scs-green-strong ring-scs-green-strong",
  blue: "bg-scs-blue-strong ring-scs-blue-strong",
};
