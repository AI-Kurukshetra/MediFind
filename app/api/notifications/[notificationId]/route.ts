import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { notificationParamsSchema } from "@/lib/validations/notifications";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ notificationId: string }> }
) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const params = notificationParamsSchema.parse(await context.params);
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", params.notificationId)
      .select("id, user_id, type, title, message, is_read, metadata, created_at, updated_at")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        {
          error:
            status === 404
              ? "Notification not found."
              : "Failed to update notification.",
          details: error.message
        },
        { status }
      );
    }

    return NextResponse.json({ notification: data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid notification parameters.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while updating notification." },
      { status: 500 }
    );
  }
}
