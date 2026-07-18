import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // web-push and pdf-parse use dynamic requires; keep them external to the
  // server bundle so Next's bundler (Turbopack) doesn't try to trace/transform
  // them (pdf-parse's vendored pdf.js build breaks under bundling, which was
  // silently causing resume text extraction to fail on every upload).
  serverExternalPackages: ["web-push", "pdf-parse"],

  // Conservative security headers applied to every response. Deliberately does
  // NOT set a restrictive Content-Security-Policy for scripts/styles (that
  // would need careful allow-listing of Firebase, reCAPTCHA, image CDNs, etc.
  // and risks breaking the app); instead it locks down framing, MIME sniffing,
  // referrer leakage, and unused browser features.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking protection — the app may not be embedded in a frame.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Block MIME-type sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs to third-party origins.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable powerful features the app doesn't use.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
