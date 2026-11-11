import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "San Cayetano School",
    short_name: "SCS",
    description: "Avisos, calendario, asistencia y estado de cuenta de San Cayetano School.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f6",
    theme_color: "#12463a",
    lang: "es-CR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
