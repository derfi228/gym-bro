import type { NextConfig } from "next";

// На GitHub Pages сайт живёт по адресу /gym-bro, локально — в корне.
// Значение приходит из workflow (NEXT_PUBLIC_BASE_PATH=/gym-bro).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
