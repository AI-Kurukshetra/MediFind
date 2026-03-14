import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { updateProfileSchema } from "@/lib/validations/auth";

export async function GET(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Unauthorized. Bearer token is required." },
      { status: 401 }
    );
  }

  const supabase = createSupabaseRequestClient(accessToken);
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, full_name, phone, role, is_active, created_at, updated_at")
    .eq("id", authData.user.id)
    .single();

  if (profileError) {
    return NextResponse.json(
      {
        error: "Failed to load user profile.",
        details: profileError.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    user: {
      id: authData.user.id,
      email: authData.user.email
    },
    profile
  });
}

export async function PATCH(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const payload = updateProfileSchema.parse(await request.json());
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const updatePayload: {
      full_name?: string;
      phone?: string | null;
      role?: "patient" | "pharmacy_owner";
    } = {};

    if (payload.fullName !== undefined) {
      updatePayload.full_name = payload.fullName;
    }

    if (payload.phone !== undefined) {
      updatePayload.phone = payload.phone;
    }

    if (payload.role !== undefined) {
      updatePayload.role = payload.role;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", authData.user.id)
      .select("id, full_name, phone, role, is_active, created_at, updated_at")
      .single();

    if (profileError) {
      return NextResponse.json(
        {
          error: "Failed to update user profile.",
          details: profileError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid profile update payload.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error while updating profile."
      },
      { status: 500 }
    );
  }
}