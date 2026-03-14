import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import {
  prescriptionParamsSchema,
  updatePrescriptionSchema
} from "@/lib/validations/prescriptions";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ prescriptionId: string }> }
) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const params = prescriptionParamsSchema.parse(await context.params);
    const payload = updatePrescriptionSchema.parse(await request.json());
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { data: actorProfile, error: actorProfileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (actorProfileError || !actorProfile) {
      return NextResponse.json(
        { error: "Failed to load actor profile.", details: actorProfileError?.message },
        { status: 500 }
      );
    }

    if (
      ["verified", "rejected", "under_review"].includes(payload.status) &&
      !["pharmacy_owner", "admin"].includes(actorProfile.role)
    ) {
      return NextResponse.json(
        {
          error:
            "Only pharmacy owners or admins can set review/verification states."
        },
        { status: 403 }
      );
    }

    const updatePayload: {
      status: string;
      notes?: string | null;
      verified_by?: string | null;
      verified_at?: string | null;
    } = {
      status: payload.status
    };

    if (payload.notes !== undefined) {
      updatePayload.notes = payload.notes;
    }

    if (payload.status === "verified") {
      updatePayload.verified_by = authData.user.id;
      updatePayload.verified_at = new Date().toISOString();
    }

    if (payload.status !== "verified") {
      updatePayload.verified_by = null;
      updatePayload.verified_at = null;
    }

    const { data, error } = await supabase
      .from("prescriptions")
      .update(updatePayload)
      .eq("id", params.prescriptionId)
      .select(
        "id, user_id, order_id, file_path, verified_by, verified_at, status, notes, created_at, updated_at"
      )
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        {
          error:
            status === 404
              ? "Prescription not found."
              : "Failed to update prescription.",
          details: error.message
        },
        { status }
      );
    }

    return NextResponse.json({ prescription: data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid prescription update payload.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while updating prescription." },
      { status: 500 }
    );
  }
}
