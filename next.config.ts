import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimiza el build para despliegues en servicios como Render
  output: "standalone",
};

export default nextConfig;
