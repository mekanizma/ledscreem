"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DISPLAY_CONFIG } from "@/lib/config/display";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function slugCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
}

export function CreateDisplayForm({
  suggestedCode = "TV3",
}: {
  suggestedCode?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState(suggestedCode);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const displayCode = slugCode(code);
    const displayName = name.trim() || displayCode;
    if (!displayCode) {
      setError("Ekran kodu zorunludur (örn. TV1, TV2).");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: insErr } = await supabase.from("displays").insert({
        name: displayName,
        location: location.trim() || null,
        display_code: displayCode,
        width: DISPLAY_CONFIG.width,
        height: DISPLAY_CONFIG.height,
        orientation: DISPLAY_CONFIG.orientation,
        status: "unknown",
      });

      if (insErr) {
        const msg = insErr.message.toLowerCase();
        if (msg.includes("duplicate") || msg.includes("unique")) {
          setError("Bu ekran kodu zaten var.");
        } else {
          setError(insErr.message);
        }
        return;
      }

      setSuccess(`${displayCode} eklendi. URL: /display/${displayCode}`);
      setName("");
      setLocation("");
      setCode((c) => {
        const m = c.match(/^TV(\d+)$/i);
        if (m) return `TV${Number(m[1]) + 1}`;
        return c;
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ekran eklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Ad"
          name="display_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="TV 3"
        />
        <Input
          label="Kod"
          name="display_code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="TV3"
          hint="URL: /display/KOD"
          required
        />
        <Input
          label="Konum"
          name="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Giriş holü"
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
        Ekran ekle
      </Button>
    </form>
  );
}
