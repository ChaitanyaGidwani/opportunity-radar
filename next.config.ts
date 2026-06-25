import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // web-push uses dynamic requires; keep it external to the server bundle.
  serverExternalPackages: ["web-push"],
};

export default nextConfig;
