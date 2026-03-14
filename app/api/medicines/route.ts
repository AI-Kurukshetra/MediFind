import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { createMedicineSchema } from "@/lib/validations/medicine";

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const payload = createMedicineSchema.parse(await request.json());
    const requestClient = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await requestClient.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await requestClient
      .from("users")
      .select("id, role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "pharmacy_owner") {
      return NextResponse.json(
        { error: "Only pharmacy owners can create medicines." },
        { status: 403 }
      );
    }

    const { data: pharmacy } = await requestClient
      .from("pharmacies")
      .select("id")
      .eq("owner_user_id", authData.user.id)
      .limit(1)
      .maybeSingle();

    if (!pharmacy) {
      return NextResponse.json(
        { error: "No pharmacy linked to this account." },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();
    const cleanedName = payload.name.trim();
    const cleanedStrength = payload.strength?.trim() || null;
    const cleanedDosageForm = payload.dosageForm?.trim() || null;

    let existingQuery = adminClient
      .from("medicines")
      .select("id, name, generic_name, manufacturer, dosage_form, strength, requires_prescription")
      .ilike("name", cleanedName)
      .eq("is_active", true)
      .limit(1);

    if (cleanedStrength) {
      existingQuery = existingQuery.eq("strength", cleanedStrength);
    }

    if (cleanedDosageForm) {
      existingQuery = existingQuery.eq("dosage_form", cleanedDosageForm);
    }

    const { data: existingMedicine } = await existingQuery.maybeSingle();

    if (existingMedicine) {
      return NextResponse.json(
        {
          created: false,
          medicine: existingMedicine
        },
        { status: 200 }
      );
    }

    const { data: createdMedicine, error: createError } = await adminClient
      .from("medicines")
      .insert({
        name: cleanedName,
        generic_name: payload.genericName?.trim() || null,
        manufacturer: payload.manufacturer?.trim() || null,
        dosage_form: cleanedDosageForm,
        strength: cleanedStrength,
        requires_prescription: payload.requiresPrescription ?? false,
        is_active: true
      })
      .select("id, name, generic_name, manufacturer, dosage_form, strength, requires_prescription")
      .single();

    if (createError || !createdMedicine) {
      return NextResponse.json(
        {
          error: "Failed to create medicine.",
          details: createError?.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        created: true,
        medicine: createdMedicine
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid medicine payload.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error while creating medicine.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
