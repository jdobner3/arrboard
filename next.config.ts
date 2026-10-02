import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // self-contained server for the Docker image
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
