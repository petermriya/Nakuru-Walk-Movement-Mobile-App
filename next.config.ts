import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen is personal to the signed-in member, so nothing is prerendered.
  cacheComponents: false,
  experimental: {
    // Keep each visited screen for 30s, so going back to a tab is instant. Your own changes still refresh it straight away.
    staleTimes: { dynamic: 30 },
    // Posts and market listings carry up to 3 photos, each shrunk on the phone to well under 1 MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
