import { SYSTEM_CONSTANTS } from "../constants/system.constants";

export class PaginationUtil {
  static fromQuery(query: Record<string, unknown>) {
    const page = Math.max(
      1,
      Number(query.page || SYSTEM_CONSTANTS.DEFAULT_PAGE),
    );

    const limit = Math.min(
      SYSTEM_CONSTANTS.MAX_LIMIT,
      Math.max(
        1,
        Number(query.limit || SYSTEM_CONSTANTS.DEFAULT_LIMIT),
      ),
    );

    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }
}
