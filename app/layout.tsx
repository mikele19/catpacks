import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
});

export const metadata: Metadata = {
  title: "CatPacks",
  description: "CatPacks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${baloo.variable} antialiased`}>{children}</body>
    </html>
  );
}
