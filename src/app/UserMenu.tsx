"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  displayName: string;
}

export default function UserMenu({ displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const menuRef = useRef<HTMLDivElement>(null);

  /* read persisted theme on mount */
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const initial =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  /* toggle dark/light */
  const toggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }, [theme]);

  /* close dropdown on outside click */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", onClick);
    }
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  /* close on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", onKey);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
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
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {displayName}
        <span
          style={{
            fontSize: "0.6rem",
            transition: "transform 150ms",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          &#x25BE;
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "180px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            padding: "6px 0",
            zIndex: 200,
            animation: "menuFadeIn 150ms ease",
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "10px 16px",
              border: "none",
              background: "transparent",
              color: "var(--ink)",
              fontSize: "0.82rem",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              transition: "background 100ms",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-warm)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>
              {theme === "light" ? "\u263D" : "\u2600"}
            </span>
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>

          <div
            style={{
              height: "1px",
              background: "var(--border)",
              margin: "4px 0",
            }}
          />

          <form action="/auth/signout" method="post" style={{ margin: 0 }}>
            <button
              type="submit"
              role="menuitem"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 16px",
                border: "none",
                background: "transparent",
                color: "var(--ink)",
                fontSize: "0.82rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                transition: "background 100ms",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-warm)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>
                &#x2192;
              </span>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
