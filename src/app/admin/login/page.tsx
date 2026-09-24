"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Radio } from "lucide-react";

function safeInternalPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) {
    return "/admin";
  }
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "unauthorized"
      ? "Bu hesap admin yetkisine sahip değil."
      : null,
  );
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("E-posta veya şifre hatalı.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Oturum açılamadı.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      await supabase.auth.signOut();
      setError("Bu hesap admin yetkisine sahip değil.");
      setLoading(false);
      return;
    }

    router.push(safeInternalPath(searchParams.get("redirect")));
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <Input
        label="E-posta"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="admin@ornek.edu"
      />
      <Input
        label="Şifre"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" loading={loading}>
        Giriş yap
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Radio className="h-5 w-5" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Ekran Yönlendirme
          </h1>
          <p className="mt-1 text-sm text-slate-500">Yönetici girişi</p>
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-slate-100" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
