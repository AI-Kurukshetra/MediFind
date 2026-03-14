import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { signInSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const payload = signInSchema.parse(await request.json());
    const supabase = createSupabaseRequestClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    });

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        {
          error: "Invalid credentials.",
          details: error?.message
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: "Sign-in successful.",
      user: {
        id: data.user.id,
        email: data.user.email
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid sign-in payload.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error during sign-in."
      },
      { status: 500 }
    );
  }
}