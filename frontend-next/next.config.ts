import type { NextConfig } from "next";

// const configuredBasePath = ""; // comment out for github pages
const configuredBasePath = "/ArtPort"; // Uncomment for GitHub Pages deployment

const nextConfig: NextConfig = {
  basePath: configuredBasePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: configuredBasePath,
  },
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
