import { afterEach, expect, test, vi } from "vitest";
import config from "../next.config";

const showcaseCache = async () =>
  (await config.headers!()).find((h) => h.source === "/showcase/:path*")?.headers.find((h) => h.key === "Cache-Control");

afterEach(() => vi.unstubAllEnvs());

test("files served from disk are kept a day by browsers", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_URL", "");
  expect((await showcaseCache())?.value).toBe("public, max-age=86400");
});

test("with the bucket, the site adds no cache header: a failed file must not be kept for a day", async () => {
  // the bucket's own files carry Cache-Control (upload-r2.sh); its 404s and refusals carry none (user report, 2026-11-23)
  vi.stubEnv("NEXT_PUBLIC_DATA_URL", "https://pub-example.r2.dev");
  expect(await showcaseCache()).toBeUndefined();
});
