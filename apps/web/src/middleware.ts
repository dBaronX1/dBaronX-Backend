import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_CUSTOMER_ROUTES = new Set([
  "/",
  "/home",
  "/register",
  "/login",
  "/signin",
  "/signup",
  "/shop",
  "/products",
  "/dashboard",
  "/account",
  "/profile",
  "/wallet",
  "/affiliates",
  "/watch-earn",
  "/ai-stories",
  "/dbx-token",
  "/pricing",
  "/support",
  "/contact",
  "/contact_support",
  "/terms",
  "/privacy",
  "/onboarding",
  "/referrals",
]);

function isCustomerProductRoute(pathname: string) {
  return pathname.startsWith("/products/");
}

function isBlockedPublicOpsRoute(pathname: string) {
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.startsWith("/assets/")) return false;
  if (PUBLIC_CUSTOMER_ROUTES.has(pathname) || isCustomerProductRoute(pathname)) return false;
  return (
    pathname.endsWith("-ops") ||
    pathname.includes("-ops/") ||
    pathname.endsWith("-review") ||
    pathname.includes("-review/") ||
    pathname.startsWith("/internal/") ||
    pathname.includes("ops") ||
    pathname.includes("review") ||
    pathname.includes("launch") ||
    pathname.includes("readiness") ||
    pathname.includes("closure") ||
    pathname.includes("release") ||
    pathname.includes("audit") ||
    pathname.includes("surface") ||
    pathname.includes("medusa") ||
    pathname.includes("completion") ||
    pathname.includes("deployment") ||
    pathname.includes("startup") ||
    pathname.includes("canonical") ||
    pathname.includes("controller")
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  if (!isBlockedPublicOpsRoute(pathname)) return NextResponse.next();
  return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
