import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_DOMAINS = ["@columbia.edu", "@barnard.edu"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email ?? "";
      const isAllowed = ALLOWED_DOMAINS.some((domain) =>
        email.endsWith(domain)
      );

      if (!isAllowed) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${siteUrl}/login?error=domain`
        );
      }

      return NextResponse.redirect(`${siteUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=auth_failed`);
}
