import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // web-push and pdf-parse use dynamic requires; keep them external to the
  // server bundle so Next's bundler (Turbopack) doesn't try to trace/transform
  // them (pdf-parse's vendored pdf.js build breaks under bundling, which was
  // silently causing resume text extraction to fail on every upload).
  serverExternalPackages: ["web-push", "pdf-parse"],
};

export default nextConfig;
