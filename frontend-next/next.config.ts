import type { NextConfig } from "next";

const configuredBasePath = ""; // comment out for github pages
// const configuredBasePath = "/ArtPort"; // Uncomment for GitHub Pages deployment

const nextConfig: NextConfig = {
  basePath: configuredBasePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: configuredBasePath,
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
