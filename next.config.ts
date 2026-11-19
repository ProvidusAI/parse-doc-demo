import type { NextConfig } from "next";

// the Docker build sets NEXT_OUTPUT=standalone for a small self-contained server; `next start` stays as it was
const config: NextConfig = { reactStrictMode: true, ...(process.env.NEXT_OUTPUT === "standalone" && { output: "standalone" }) };
export default config;
