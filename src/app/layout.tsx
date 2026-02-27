import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "./UserMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Punchline",
  description: "A humor magazine for Columbia & Barnard — captions, context, and community wit.",
};

const navItems = [
  { href: "/news", label: "Feed" },
  { href: "/caption-lab", label: "Gallery" },
  { href: "/chaos-wall", label: "Chaos Wall" },
  { href: "/rate", label: "Rate" },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
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
              <UserMenu displayName={user.email?.split("@")[0] ?? "user"} />
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
