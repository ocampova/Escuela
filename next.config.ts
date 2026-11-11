import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Documentos de matrícula e importación de Excel (hasta 5 MB por archivo)
    serverActions: { bodySizeLimit: "16mb" },
  },
};

export default nextConfig;
