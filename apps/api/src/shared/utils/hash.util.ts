import { SecurityUtil } from "./security.util";

export class HashUtil {
  static sha256(value: string): string {
    return SecurityUtil.sha256(value);
  }
}
