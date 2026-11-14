import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";

// Lexend: diseñada para facilitar la lectura; familias de todas las edades leen avisos y estados de cuenta
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });

export const metadata: Metadata = {
  title: { default: "San Cayetano School", template: "%s · San Cayetano School" },
  description: "Plataforma escolar de San Cayetano School: avisos, calendario, asistencia y estado de cuenta.",
  applicationName: "SCS",
  appleWebApp: { capable: true, title: "SCS", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#12463a",
  width: "device-width",
  initialScale: 1,
  // Sin viewportFit "cover": con él la página se dibuja detrás de la barra de estado y de la
  // barra translúcida del navegador (Safari reciente, DuckDuckGo) y el inicio queda tapado.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CR" className={lexend.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
