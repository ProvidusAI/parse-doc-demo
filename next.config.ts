import type { NextConfig } from "next";

// the Docker build sets NEXT_OUTPUT=standalone for a small self-contained server; `next start` stays as it was
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // dev only: let phones and laptops on the office Wi-Fi open `next dev` by this PC's address. Without it Next blocks
  // its dev connection for any host but localhost and the page never turns interactive (nothing clicks). The ngrok
  // domain is the shared preview link for reviewers.
  allowedDevOrigins: ["172.16.0.105", "192.168.100.93", "bottling-juiciness-apricot.ngrok-free.dev"],
  ...(process.env.NEXT_OUTPUT === "standalone" && { output: "standalone" }),
  // With NEXT_PUBLIC_DATA_URL (the R2 bucket) set, browsers still ask this site for /showcase/...: the files come from
  // the bucket through here, same origin and HTTP/2, and Vercel's CDN caches them (vercel.json opts in). Straight from
  // r2.dev every file waited 0.4–1 s (no CDN cache, HTTP/1.1). Files in public/showcase (wall.jpg) are served first.
  async rewrites() {
    const bucket = (process.env.NEXT_PUBLIC_DATA_URL ?? "").replace(/\/+$/, "");
    return bucket ? [{ source: "/showcase/:path*", destination: `${bucket}/:path*` }] : [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // page files from disk: Next's default is max-age=0, which re-checks ~1000 thumbnails on every visit. Not
      // content-hashed, so a day rather than forever. From the bucket, its own header passes through instead: every
      // file carries this one (upload-r2.sh), while a 404 or a refused request carries none, so a browser does not
      // keep a broken thumbnail for a day.
      ...(process.env.NEXT_PUBLIC_DATA_URL
        ? []
        : [{ source: "/showcase/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] }]),
    ];
  },
};
export default config;
