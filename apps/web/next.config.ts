import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // typedRoutes off for now — too strict while routes are being added in phases.
  typedRoutes: false,
  transpilePackages: [
    "@operate/db-control",
    "@operate/db-tenant",
    "@operate/providers",
    "@operate/tenant-router",
  ],
  images: {
    // Public-site marquee uses Wikimedia-hosted brand logos.
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default config;
