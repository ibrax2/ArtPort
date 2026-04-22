import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "artport_token";

function tokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(AUTH_COOKIE_NAME)?.value || null;
}

function tokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return true;
    }

    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4;
    const padded = pad === 0 ? normalized : normalized + "=".repeat(4 - pad);
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson) as { exp?: number };

    if (typeof payload.exp !== "number") {
      return false;
    }

    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function proxy(req: NextRequest) {
  const token = tokenFromRequest(req);

  if (!token || tokenExpired(token)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/me/:path*", "/upload/:path*", "/feedback/:path*"],
};
