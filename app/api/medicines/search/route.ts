import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { medicineSearchSchema } from "@/lib/validations/medicine-search";

type MedicineSearchRow = {
  pharmacy_id: string;
  pharmacy_name: string;
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  distance_km: number;
};

const DEFAULT_RESULT_LIMIT = 50;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const parsedInput = medicineSearchSchema.parse({
      query: searchParams.get("query"),
      latitude: Number(searchParams.get("latitude")),
      longitude: Number(searchParams.get("longitude")),
      radiusKm: searchParams.get("radiusKm")
        ? Number(searchParams.get("radiusKm"))
        : undefined,
      sortBy: searchParams.get("sortBy") ?? undefined
    });

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("search_medicines_nearby", {
      search_query: parsedInput.query,
      user_latitude: parsedInput.latitude,
      user_longitude: parsedInput.longitude,
      max_distance_km: parsedInput.radiusKm,
      result_limit: DEFAULT_RESULT_LIMIT
    });

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to fetch medicine search results.",
          details: error.message
        },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as MedicineSearchRow[];
    const pharmacyIds = Array.from(new Set(rows.map((row) => row.pharmacy_id)));

    let pharmacyCoordinates: Record<
      string,
      { latitude: number | null; longitude: number | null }
    > = {};
    let unitPrices: Record<string, number | null> = {};
    let ratingsByPharmacy: Record<string, { avg: number; count: number }> = {};

    if (rows.length > 0) {
      const [pharmacyRes, inventoryRes, ratingsRes] = await Promise.all([
        pharmacyIds.length > 0
          ? supabase
              .from("pharmacies")
              .select("id, latitude, longitude")
              .in("id", pharmacyIds)
          : { data: [] },
        supabase
          .from("inventory")
          .select("pharmacy_id, medicine_id, unit_price")
          .in("pharmacy_id", pharmacyIds),
        pharmacyIds.length > 0
          ? supabase
              .from("pharmacy_reviews")
              .select("pharmacy_id, rating")
              .in("pharmacy_id", pharmacyIds)
              .then((r) => (r.error ? { data: [] } : r))
          : Promise.resolve({ data: [] })
      ]);

      pharmacyCoordinates =
        pharmacyRes.data?.reduce<Record<string, { latitude: number | null; longitude: number | null }>>(
          (acc, row) => {
            acc[row.id] = { latitude: Number(row.latitude) ?? null, longitude: Number(row.longitude) ?? null };
            return acc;
          },
          {}
        ) ?? {};

      inventoryRes.data?.forEach((inv: { pharmacy_id: string; medicine_id: string; unit_price: number | null }) => {
        unitPrices[`${inv.pharmacy_id}:${inv.medicine_id}`] = inv.unit_price != null ? Number(inv.unit_price) : null;
      });

      (ratingsRes.data ?? []).forEach((r: { pharmacy_id: string; rating: number }) => {
        if (!ratingsByPharmacy[r.pharmacy_id]) {
          ratingsByPharmacy[r.pharmacy_id] = { avg: 0, count: 0 };
        }
        const b = ratingsByPharmacy[r.pharmacy_id];
        b.avg = (b.avg * b.count + r.rating) / (b.count + 1);
        b.count += 1;
      });
      Object.keys(ratingsByPharmacy).forEach((pid) => {
        ratingsByPharmacy[pid].avg = Math.round(ratingsByPharmacy[pid].avg * 10) / 10;
      });
    }

    let results = rows.map((row) => ({
      pharmacyId: row.pharmacy_id,
      pharmacyName: row.pharmacy_name,
      pharmacyLatitude: pharmacyCoordinates[row.pharmacy_id]?.latitude ?? null,
      pharmacyLongitude: pharmacyCoordinates[row.pharmacy_id]?.longitude ?? null,
      medicineId: row.medicine_id,
      medicineName: row.medicine_name,
      quantity: row.quantity,
      distanceKm: row.distance_km,
      unitPrice: unitPrices[`${row.pharmacy_id}:${row.medicine_id}`] ?? null,
      pharmacyRating: ratingsByPharmacy[row.pharmacy_id]?.avg ?? null,
      pharmacyReviewCount: ratingsByPharmacy[row.pharmacy_id]?.count ?? 0
    }));

    if (parsedInput.sortBy === "price") {
      results = [...results].sort((a, b) => {
        const pa = a.unitPrice ?? Infinity;
        const pb = b.unitPrice ?? Infinity;
        return pa - pb;
      });
    }

    return NextResponse.json({
      query: parsedInput.query,
      latitude: parsedInput.latitude,
      longitude: parsedInput.longitude,
      radiusKm: parsedInput.radiusKm,
      count: results.length,
      results
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid medicine search query parameters.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error while searching medicines."
      },
      { status: 500 }
    );
  }
}
