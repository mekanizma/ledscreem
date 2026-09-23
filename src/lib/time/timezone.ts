import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { format, parseISO, isValid } from "date-fns";
import { TIMEZONE } from "@/lib/config/display";

export function nowInTimezone(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function formatNicosia(
  date: string | Date | null | undefined,
  pattern = "dd.MM.yyyy HH:mm",
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return formatInTimeZone(d, TIMEZONE, pattern);
}

export function formatRelativeTr(date: string | Date | null | undefined): string {
  if (!date) return "Hiç görülmedi";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "Hiç görülmedi";
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return "az önce";
  if (sec < 60) return `${sec} saniye önce`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dakika önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  return formatNicosia(d, "dd.MM.yyyy HH:mm");
}

/** Convert local datetime-local input value (Europe/Nicosia) to ISO UTC string */
export function nicosiaLocalToIso(localValue: string): string | null {
  if (!localValue) return null;
  const iso = fromZonedTime(localValue, TIMEZONE).toISOString();
  return iso;
}

/** Convert ISO UTC to datetime-local value in Europe/Nicosia */
export function isoToNicosiaLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return formatInTimeZone(iso, TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sn`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} dk` : `${m} dk ${s} sn`;
}

export { format };
