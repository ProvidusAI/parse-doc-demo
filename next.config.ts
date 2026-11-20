import type { NextConfig } from "next";

// the Docker build sets NEXT_OUTPUT=standalone for a small self-contained server; `next start` stays as it was
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(process.env.NEXT_OUTPUT === "standalone" && { output: "standalone" }),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // page files served by this server (Docker, no NEXT_PUBLIC_DATA_URL); Next's default is max-age=0, which
      // re-checks ~1000 thumbnails on every visit. Not content-hashed, so a day rather than forever.
      { source: "/showcase/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
    ];
  },
};
export default config;
