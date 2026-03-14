import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { signUpSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const payload = signUpSchema.parse(await request.json());
    const supabase = createSupabaseRequestClient();

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          phone: payload.phone ?? null,
          role: payload.role ?? "patient"
        }
      }
    });

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to create account.",
          details: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Account created successfully.",
        needsEmailVerification: !data.session,
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email
            }
          : null,
        session: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
              expiresAt: data.session.expires_at
            }
          : null
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid sign-up payload.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    const details = error instanceof Error ? error.message : "Unknown error";
    const configHint = details.includes("Missing Supabase public environment variables")
      ? "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
      : undefined;

    return NextResponse.json(
      {
        error: "Unexpected error during sign-up.",
        details,
        hint: configHint
      },
      { status: 500 }
    );
  }
}
