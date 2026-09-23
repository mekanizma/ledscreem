import type { Metadata } from "next";
import { LedDisplayApp } from "@/components/display/LedDisplayApp";

export const metadata: Metadata = {
  title: "LED Display",
  robots: { index: false, follow: false },
};

export default async function DisplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ debug?: string }>;
}) {
  const { code } = await params;
  const { debug } = await searchParams;

  return (
    <div className="display-root fixed inset-0 h-[100dvh] w-[100vw] overflow-hidden bg-black">
      <LedDisplayApp displayCode={code} debug={debug === "1"} />
    </div>
  );
}
