import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";

import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        {/* BACKGROUND GLOBALE */}
        <div className="fixed inset-0 -z-10">
          <img
            src="/ui/bg.png"
            alt="background"
            className="w-full h-full object-cover"
          />
        </div>

        {/* CONTENUTO APP */}
        {children}
      </body>
    </html>
  );
}
