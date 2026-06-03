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
};

export default config;
