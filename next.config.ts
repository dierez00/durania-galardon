import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // Raise the body size limit so uploads under ~50MB reach route handlers intact
    proxyClientMaxBodySize: "50mb",
  }
};



export default nextConfig;
