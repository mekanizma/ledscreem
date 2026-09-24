"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function CreateAdminForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; user?: { email: string } };
      if (!res.ok) {
        setError(data.error || "Hesap oluşturulamadı.");
        return;
      }
      setSuccess(`${data.user?.email ?? email} admin olarak oluşturuldu.`);
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirm("");
      router.refresh();
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Ad soyad"
          name="full_name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Sistem Yöneticisi"
        />
        <Input
          label="E-posta"
          type="email"
          name="new_admin_email"
          autoComplete="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@ornek.edu"
        />
        <Input
          label="Şifre"
          type="password"
          name="new_admin_password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="En az 8 karakter"
        />
        <Input
          label="Şifre tekrar"
          type="password"
          name="new_admin_password_confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          role="status"
        >
          {success}
        </p>
      ) : null}

      <Button type="submit" loading={loading} className="w-full sm:w-auto">
        Admin hesap oluştur
      </Button>
    </form>
  );
}
