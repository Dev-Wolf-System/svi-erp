import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  outputFileTracingIncludes: {
    // Los assets del package @repo/pdf (logo, fuentes opcionales) los lee
    // el render del PDF desde filesystem en runtime. Sin este include no
    // los copia al bundle standalone y el build de prod falla.
    "/api/**/*": ["../../packages/pdf/assets/**/*"],
    "/(dashboard)/**/*": ["../../packages/pdf/assets/**/*"],
  },
  transpilePackages: ["@repo/ui", "@repo/utils", "@repo/database", "@repo/config"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "supabase-svi.srv878399.hstgr.cloud" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
