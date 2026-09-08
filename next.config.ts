import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://consumer-iq-01.netlify.app',
  },
};

export default nextConfig;
