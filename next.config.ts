import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimiza el build para despliegues en servicios como Render
  output: "standalone",
  // Evita que el build falle por errores de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  // (Opcional) evita que el build falle por errores de TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
