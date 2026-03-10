import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/ArtPort",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
