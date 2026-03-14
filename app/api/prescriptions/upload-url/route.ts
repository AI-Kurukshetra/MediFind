import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { createPrescriptionUploadUrlSchema } from "@/lib/validations/prescriptions";

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png"
};

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const payload = createPrescriptionUploadUrlSchema.parse(await request.json());
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const extension = EXTENSION_BY_CONTENT_TYPE[payload.contentType];
    const sanitizedBaseName = payload.fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);
    const filePath = `${authData.user.id}/${Date.now()}-${randomUUID()}-${sanitizedBaseName}.${extension}`;

    const { data, error } = await supabase.storage
      .from("prescriptions")
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to generate upload URL.", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      filePath,
      orderId: payload.orderId ?? null,
      upload: data
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid upload URL request payload.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while creating upload URL." },
      { status: 500 }
    );
  }
}
