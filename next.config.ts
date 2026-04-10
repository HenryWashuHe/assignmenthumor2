import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let supabaseHostname = "**.supabase.co";
try {
  if (supabaseUrl) supabaseHostname = new URL(supabaseUrl).hostname;
} catch {
  // use wildcard fallback
}

const nextConfig: NextConfig = {
  transpilePackages: ["@mediapipe/tasks-vision"],
  images: {
    remotePatterns: [
      // Supabase Storage — gallery images
      {
        protocol: "https",
        hostname: supabaseHostname,
      },
      // almostcrackd.ai CDN — covers images.almostcrackd.ai, presigned-url-uploads.almostcrackd.ai, etc.
      {
        protocol: "https",
        hostname: "**.almostcrackd.ai",
      },
      // Wikimedia — user-submitted image URLs
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
};

export default nextConfig;
