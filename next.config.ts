import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add this line to make it compatible with Cloudflare
  output: "standalone",
  // ... rest of your config
};

export default nextConfig;