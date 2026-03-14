import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock
}));

describe("createSupabaseServerClient", () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("creates client when env vars exist", async () => {
    createClientMock.mockReturnValue({ ok: true });

    const module = await import("@/lib/supabase/server");
    const client = module.createSupabaseServerClient();

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key"
    );
    expect(client).toEqual({ ok: true });
  });

  it("throws when required env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const module = await import("@/lib/supabase/server");
    expect(() => module.createSupabaseServerClient()).toThrow(
      "Missing Supabase public environment variables."
    );
  });
});