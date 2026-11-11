"use client";

import { useEffect, useState } from "react";
import { buttonClass, cx } from "./ui";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5.1 5.2-1.4A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3a8.2 8.2 0 1 1 7 3.9Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3c.2-.4.2-.8.2-.9l-.6-.2Z" />
    </svg>
  );
}

/**
 * Abre WhatsApp con el aviso resumido y el enlace para leerlo y confirmar.
 * La docente lo pega en el grupo de su sección, como hace hoy.
 */
export function ShareWhatsApp({
  title,
  body,
  path,
  size = "md",
  className,
  label = "Compartir en WhatsApp",
}: {
  title: string;
  body: string;
  path: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}) {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    const link = window.location.origin + path;
    const summary = body.replace(/\s+/g, " ").trim();
    const short = summary.length > 220 ? summary.slice(0, 217).trimEnd() + "…" : summary;
    const text = short
      ? `*${title}*\n\n${short}\n\n👉 Lea el aviso completo y confirme que lo leyó aquí:\n${link}`
      : `*${title}*\n\n👉 Vea el aviso y confirme que lo leyó aquí:\n${link}`;
    setHref(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }, [title, body, path]);

  return (
    <a
      href={href ?? undefined}
      target="_blank"
      rel="noreferrer"
      aria-disabled={!href}
      className={cx(buttonClass("primary", size), "bg-[#1b7a43] hover:bg-[#156337]", className)}
    >
      <WhatsAppIcon className="size-[18px]" />
      {label}
    </a>
  );
}
