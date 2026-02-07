import type { Metadata } from "next";
import { Shrikhand, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 22px",
            borderBottom: "3px solid #1b1a17",
            background: "#fff8ea",
            color: "#1b1a17",
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-display), serif",
              fontSize: "1.1rem",
              color: "#1b1a17",
            }}
          >
            Stormboard
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <Link
              href="/news"
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#5a574e",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              News
            </Link>
            <Link
              href="/caption-lab"
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#5a574e",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Caption Lab
            </Link>
            <Link
              href="/create"
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#5a574e",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Create
            </Link>

            {user ? (
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  style={{
                    padding: "5px 14px",
                    border: "2px solid #1b1a17",
                    background: "#1b1a17",
                    color: "#fff8ea",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Sign out ({user.email})
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                style={{
                  padding: "5px 14px",
                  border: "2px solid #1b1a17",
                  background: "#f5a623",
                  color: "#1b1a17",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Sign in
              </Link>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
