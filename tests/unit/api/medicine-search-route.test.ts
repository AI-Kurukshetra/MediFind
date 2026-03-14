import { beforeEach, describe, expect, it, vi } from "vitest";

const parseMock = vi.fn();
const rpcMock = vi.fn();
const createSupabaseServerClientMock = vi.fn(() => ({
  rpc: rpcMock
}));

vi.mock("@/lib/validations/medicine-search", () => ({
  medicineSearchSchema: {
    parse: parseMock
  }
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock
}));

describe("GET /api/medicines/search", () => {
  beforeEach(() => {
    parseMock.mockReset();
    rpcMock.mockReset();
    createSupabaseServerClientMock.mockClear();
  });

  it("returns results on successful RPC", async () => {
    parseMock.mockReturnValue({
      query: "paracetamol",
      latitude: 28.6,
      longitude: 77.2,
      radiusKm: 10
    });

    rpcMock.mockResolvedValue({
      data: [
        {
          pharmacy_id: "pharmacy-1",
          pharmacy_name: "MediCare Pharmacy",
          medicine_id: "medicine-1",
          medicine_name: "Paracetamol",
          quantity: 25,
          distance_km: 2.2
        }
      ],
      error: null
    });

    const { GET } = await import("@/app/api/medicines/search/route");
    const response = await GET(
      new Request(
        "http://localhost/api/medicines/search?query=para&latitude=28.6&longitude=77.2&radiusKm=10"
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      count: 1,
      results: [
        {
          pharmacyId: "pharmacy-1",
          medicineName: "Paracetamol"
        }
      ]
    });
  });

  it("returns 500 when RPC fails", async () => {
    parseMock.mockReturnValue({
      query: "paracetamol",
      latitude: 28.6,
      longitude: 77.2,
      radiusKm: 10
    });

    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "db failed" }
    });

    const { GET } = await import("@/app/api/medicines/search/route");
    const response = await GET(
      new Request(
        "http://localhost/api/medicines/search?query=para&latitude=28.6&longitude=77.2"
      )
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Failed to fetch medicine search results."
    });
  });
});