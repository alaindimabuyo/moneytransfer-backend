import type { Request, Response, NextFunction } from "express";

process.env.DATABASE_URL = "postgres://test";
process.env.JWT_SECRET = "test_secret_for_unit_tests_only";
process.env.NODE_ENV = "test";

import { requireAuth } from "../src/middleware/requireAuth";
import { signToken } from "../src/services/auth.service";
import { env } from "../src/config/env";

function mockReq(cookies: Record<string, string>): Request {
  return { cookies } as unknown as Request;
}
function mockRes(): Response {
  return {} as Response;
}

describe("requireAuth", () => {
  it("calls next with 401 when no cookie is present", () => {
    const next: NextFunction = jest.fn();
    requireAuth(mockReq({}), mockRes(), next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401 })
    );
  });

  it("calls next with 401 when token is invalid", () => {
    const next: NextFunction = jest.fn();
    requireAuth(
      mockReq({ [env.cookieName]: "not-a-real-token" }),
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401 })
    );
  });

  it("attaches userId and userEmail when token is valid", () => {
    const token = signToken({ sub: "user-123", email: "a@b.com" });
    const req = mockReq({ [env.cookieName]: token });
    const next: NextFunction = jest.fn();
    requireAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(); // no args = success
    expect(req.userId).toBe("user-123");
    expect(req.userEmail).toBe("a@b.com");
  });
});
