declare module "compression" {
  import type { RequestHandler } from "express";
  function compression(...args: unknown[]): RequestHandler;
  export default compression;
}

declare module "cookie-parser" {
  import type { RequestHandler } from "express";
  function cookieParser(secret?: string | string[], options?: Record<string, unknown>): RequestHandler;
  export default cookieParser;
}

declare module "jsonwebtoken" {
  export type Secret = string | Buffer;
  export interface SignOptions {
    expiresIn?: string | number;
    issuer?: string;
    audience?: string;
    algorithm?: string;
  }
  export interface VerifyOptions {
    issuer?: string;
    audience?: string;
    algorithms?: string[];
  }
  export function sign(payload: string | object | Buffer, secretOrPrivateKey: Secret, options?: SignOptions): string;
  export function verify(token: string, secretOrPublicKey: Secret, options?: VerifyOptions): string | object;
  export function decode(token: string): null | string | object;
  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
    decode: typeof decode;
  };
  export default jwt;
}
