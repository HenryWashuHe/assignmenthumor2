import type { Metadata } from "next";
import { Shrikhand, Space_Grotesk } from "next/font/google";
import "./globals.css";

const displayFont = Shrikhand({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Context Stormboard",
  description: "Neon community contexts and lightning caption duels.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
