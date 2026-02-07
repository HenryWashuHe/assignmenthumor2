"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

const ERROR_MESSAGES: Record<string, string> = {
  domain:
    "Only @columbia.edu and @barnard.edu accounts are allowed. Please sign in with your university email.",
  auth_failed: "Authentication failed. Please try again.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const errorParam = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.gateCard}>
          <div className={styles.lockIcon}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h1 className={styles.title}>Sign in to continue</h1>
          <p className={styles.subtitle}>
            This app is restricted to Columbia University and Barnard College
            students. Sign in with your school Google account to access the
            stormboard.
          </p>

          <div className={styles.hint}>
            Allowed:{" "}
            <span className={styles.hintDomains}>
              @columbia.edu &middot; @barnard.edu
            </span>
          </div>

          {errorParam && (
            <div className={styles.errorBanner}>
              {ERROR_MESSAGES[errorParam] ?? "Something went wrong. Try again."}
            </div>
          )}

          <button
            className={styles.googleButton}
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {loading ? "Redirecting..." : "Sign in with Google"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
