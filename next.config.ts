import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    webVitalsAttribution: ["CLS", "LCP", "FCP", "INP", "TTFB"],
    // Raise the body size limit so uploads under ~50MB reach route handlers intact
    proxyClientMaxBodySize: "50mb",
  }
};



export default nextConfig;
