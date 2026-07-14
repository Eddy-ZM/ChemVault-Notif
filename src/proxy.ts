import { NextRequest, NextResponse } from "next/server";

const legacySurfacePattern = /^\/projects\/[^/]+\/(datasets|files|results|tasks)(?:\/|$)/;

export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(legacySurfacePattern);
  if (match) {
    console.info(JSON.stringify({
      event: "legacy_compatibility_route_viewed",
      surface: match[1],
      occurredAt: new Date().toISOString(),
    }));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/projects/:path*"],
};
