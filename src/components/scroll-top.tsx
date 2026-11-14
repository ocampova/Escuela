"use client";

import { useEffect } from "react";

/**
 * Cada página abre desde arriba. Algunos navegadores de iPhone (Safari y los que usan su
 * motor, como DuckDuckGo) restauran una posición anterior o mueven la página al cargar,
 * y el inicio quedaba escondido. Se lleva al inicio al cargar y unos instantes después,
 * salvo que el enlace apunte a una sección (#), la página abra al final (conversaciones)
 * o la persona ya haya tocado la pantalla.
 */
export function ScrollTop() {
  useEffect(() => {
    // Con ancla (#) o en páginas que abren al final (conversaciones), no se toca
    if (location.hash || document.querySelector("[data-scroll-end]")) return;
    try {
      history.scrollRestoration = "manual";
    } catch {}
    let touched = false;
    const stop = () => (touched = true);
    const top = () => {
      if (!touched && window.scrollY > 0 && !document.activeElement?.matches("input, textarea, select")) window.scrollTo(0, 0);
    };
    const events = ["touchstart", "wheel", "keydown", "mousedown"] as const;
    events.forEach((e) => window.addEventListener(e, stop, { passive: true, once: true }));
    top();
    const timers = [50, 250, 600].map((ms) => setTimeout(top, ms));
    const onShow = (e: PageTransitionEvent) => e.persisted && window.scrollTo(0, 0);
    window.addEventListener("pageshow", onShow);
    return () => {
      timers.forEach(clearTimeout);
      events.forEach((e) => window.removeEventListener(e, stop));
      window.removeEventListener("pageshow", onShow);
    };
  }, []);
  return null;
}
