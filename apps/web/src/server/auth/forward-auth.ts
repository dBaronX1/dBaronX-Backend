import { NextRequest } from "next/server";

export interface ForwardedAuth {
  headers: Record<string, string>;
  authForwarded: boolean;
}

export function buildForwardedAuthHeaders(request: NextRequest): ForwardedAuth {
  const headers: Record<string, string> = {};
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");

  if (authorization) {
    headers.authorization = authorization;
  }

  if (cookie) {
    headers.cookie = cookie;
  }

  return {
    headers,
    authForwarded: Boolean(authorization || cookie),
  };
}