import type { NextConfig } from "next";

const repoBasePath = "/sakura.github.io";

const nextConfig: NextConfig = {
  output: "export",
  basePath: repoBasePath,
  assetPrefix: `${repoBasePath}/`,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
