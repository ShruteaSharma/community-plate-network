import type { Database } from "@/integrations/supabase/types";

export type DonationStatus = Database["public"]["Enums"]["donation_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type DonationRow = Database["public"]["Tables"]["donations"]["Row"];

export const STATUS_STEPS: DonationStatus[] = ["posted", "claimed", "picked_up", "delivered"];

export const STATUS_LABEL: Record<DonationStatus, string> = {
  posted: "Posted",
  claimed: "Claimed",
  picked_up: "Picked up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  donor: "Donor",
  ngo: "NGO",
  volunteer: "Volunteer",
};

export const STORAGE_TYPES = ["ambient", "chilled", "frozen"] as const;

/** Great-circle distance in km between two coordinates. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number | null; lng: number | null },
): number | null {
  if (b.lat == null || b.lng == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number | null): string {
  if (km == null) return "location pending";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** "expires in 02:41" style countdown, or an expired label. */
export function countdown(expiresAt: string, now: number): string {
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return "expired";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `expires in ${days}d ${hours % 24}h`;
  }
  return `expires in ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function isUrgent(expiresAt: string, now: number): boolean {
  const diff = new Date(expiresAt).getTime() - now;
  return diff <= 1000 * 60 * 60 * 6;
}

export function timeOnly(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
