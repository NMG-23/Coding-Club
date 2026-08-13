import { Elysia } from "elysia";
import { ForbiddenError } from "../utils/errors";

/**
 * Admin-only route guard.
 * Must be used AFTER authMiddleware.
 */
export const adminMiddleware = new Elysia({ name: "admin-middleware" })
  .derive(({ user }: any) => {
    if (!user || user.role !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
    return {};
  });
