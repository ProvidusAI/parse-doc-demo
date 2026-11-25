import { NextResponse, type NextRequest } from "next/server";
import { HOME, LANG_COOKIE, landingLang } from "./lib/locale";

/** `/` sends GCC visitors (Vercel's country header) and anyone who picked Arabic to `/ar`. */
export function proxy(request: NextRequest) {
  const lang = landingLang(request.headers.get("x-vercel-ip-country"), request.cookies.get(LANG_COOKIE)?.value);
  return lang === "ar" ? NextResponse.redirect(new URL(HOME.ar, request.url)) : NextResponse.next();
}

export const config = { matcher: "/" };
