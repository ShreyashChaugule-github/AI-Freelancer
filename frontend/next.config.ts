import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Docker: produces .next/standalone/server.js
};

export default nextConfig;
