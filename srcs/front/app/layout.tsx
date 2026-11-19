import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ToastProvider";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";

export const metadata: Metadata = { title: "ENEADE FUT", description: "Gestão da Liga dos 6 Clubes" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
        <ToastProvider />
      </body>
    </html>
  );
}