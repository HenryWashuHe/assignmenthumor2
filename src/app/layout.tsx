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
  title: "The Punchline",
  description: "A humor magazine for Columbia & Barnard — captions, context, and community wit.",
};

const navItems = [
  { href: "/news", label: "Feed" },
  { href: "/caption-lab", label: "Gallery" },
  { href: "/chaos-wall", label: "Chaos Wall" },
  { href: "/create", label: "Studio" },
  { href: "/genome", label: "The Index" },
];

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
            padding: "0 var(--page-pad)",
            height: "56px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-display), serif",
              fontSize: "1.15rem",
              color: "var(--ink)",
              letterSpacing: "-0.01em",
            }}
          >
            The Punchline
          </Link>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "28px",
            }}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "var(--ink-secondary)",
                  transition: "color 150ms",
                  letterSpacing: "0.01em",
                }}
              >
                {item.label}
              </Link>
            ))}

            {user ? (
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  style={{
                    padding: "5px 14px",
                    border: "1px solid var(--border-strong)",
                    background: "var(--bg)",
                    color: "var(--ink)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    borderRadius: "var(--radius-sm)",
                    transition: "border-color 150ms",
                  }}
                >
                  {user.email?.split("@")[0]}
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                style={{
                  padding: "5px 14px",
                  border: "1px solid var(--border-accent)",
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  borderRadius: "var(--radius-sm)",
                  transition: "background 150ms",
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
