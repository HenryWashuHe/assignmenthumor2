import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_DOMAINS = ["@columbia.edu", "@barnard.edu"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  const nextCookie = request.cookies.get("auth_next")?.value;
  const next = nextCookie ? decodeURIComponent(nextCookie) : "/";

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
        const response = NextResponse.redirect(
          `${siteUrl}/login?error=domain`
        );
        response.cookies.delete("auth_next");
        return response;
      }

      const response = NextResponse.redirect(`${siteUrl}${next}`);
      response.cookies.delete("auth_next");
      return response;
    }
  }

  const response = NextResponse.redirect(`${siteUrl}/login?error=auth_failed`);
  response.cookies.delete("auth_next");
  return response;
}
