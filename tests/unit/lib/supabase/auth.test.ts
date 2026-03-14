import { describe, expect, it } from "vitest";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";

describe("getAccessTokenFromRequest", () => {
  it("returns token for valid bearer authorization header", () => {
    const request = new Request("http://localhost/test", {
      headers: {
        authorization: "Bearer token-123"
      }
    });

    expect(getAccessTokenFromRequest(request)).toBe("token-123");
  });

  it("returns null for invalid scheme", () => {
    const request = new Request("http://localhost/test", {
      headers: {
        authorization: "Basic token-123"
      }
    });

    expect(getAccessTokenFromRequest(request)).toBeNull();
  });

  it("returns null when header is absent", () => {
    const request = new Request("http://localhost/test");
    expect(getAccessTokenFromRequest(request)).toBeNull();
  });
});