import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un servidor autocontenido en .next/standalone para la imagen Docker.
  output: "standalone",
};

export default nextConfig;
