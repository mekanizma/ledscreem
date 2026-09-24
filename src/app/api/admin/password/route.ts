import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: {
    current_password?: string;
    new_password?: string;
    confirm_password?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const currentPassword = body.current_password ?? "";
  const newPassword = body.new_password ?? "";
  const confirmPassword = body.confirm_password ?? "";

  if (!currentPassword) {
    return NextResponse.json(
      { error: "Mevcut şifrenizi girin." },
      { status: 400 },
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Yeni şifre en az 8 karakter olmalı." },
      { status: 400 },
    );
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Yeni şifreler eşleşmiyor." },
      { status: 400 },
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Yeni şifre mevcut şifreden farklı olmalı." },
      { status: 400 },
    );
  }

  const email = gate.user.email;
  if (!email) {
    return NextResponse.json(
      { error: "Hesap e-postası bulunamadı." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (reauthError) {
    return NextResponse.json(
      { error: "Mevcut şifre hatalı." },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || "Şifre güncellenemedi." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
