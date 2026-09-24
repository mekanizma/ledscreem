import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAdminUserViaDb } from "@/lib/auth/create-admin-user-db";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: { email?: string; password?: string; full_name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const fullName = body.full_name?.trim() || email.split("@")[0] || "Admin";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta girin." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Şifre en az 8 karakter olmalı." },
      { status: 400 },
    );
  }

  // Prefer service role; fall back to DATABASE_URL (local / scripts setup).
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return NextResponse.json(
        {
          error:
            "Sunucu yapılandırması eksik: SUPABASE_SERVICE_ROLE_KEY tanımlayın.",
        },
        { status: 503 },
      );
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "admin",
      },
    });

    if (error || !data.user) {
      const msg = error?.message?.toLowerCase() ?? "";
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        return NextResponse.json(
          { error: "Bu e-posta ile kayıtlı bir hesap zaten var." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: error?.message || "Hesap oluşturulamadı." },
        { status: 400 },
      );
    }

    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      role: "admin",
    });

    if (profileError) {
      return NextResponse.json(
        {
          error:
            "Kullanıcı oluştu ancak profil admin yapılamadı: " +
            profileError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        email,
        full_name: fullName,
        role: "admin" as const,
      },
    });
  }

  const viaDb = await createAdminUserViaDb({ email, password, fullName });
  if ("error" in viaDb) {
    return NextResponse.json({ error: viaDb.error }, { status: viaDb.status });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: viaDb.id,
      email,
      full_name: fullName,
      role: "admin" as const,
    },
  });
}
