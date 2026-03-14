import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const medicineOptionsSchema = z.object({
  query: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(25).default(8)
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const input = medicineOptionsSchema.parse({
      query: searchParams.get("query"),
      limit: searchParams.get("limit") ?? undefined
    });

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("medicines")
      .select("id, name, strength, dosage_form")
      .ilike("name", `%${input.query}%`)
      .order("name", { ascending: true })
      .limit(input.limit);

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to load medicine options.",
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: data?.length ?? 0,
      results: data ?? []
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid medicine options query parameters.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error while loading medicine options."
      },
      { status: 500 }
    );
  }
}
