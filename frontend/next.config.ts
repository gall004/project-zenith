import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.env.NODE_ENV === "development" ? path.join(__dirname, "..") : undefined,
  },
};

export default nextConfig;
