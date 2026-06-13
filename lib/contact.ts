// Contact details for the business deploying this POS. Values come from
// BRAND.business (lib/brand.ts), which reads env vars — so a fork sets its
// own details in .env.local with no code edits. These exports are kept stable
// for the many components that import them.

import { BRAND } from "./brand";

const b = BRAND.business;

export const PHONE_PRIMARY = b.phone;
export const PHONE_SECONDARY = b.phone;
export const WHATSAPP = (b.whatsapp || b.phone).replace(/\D/g, ""); // wa.me target
export const EMAIL = b.email;
export const INSTAGRAM_HANDLE = b.instagram;
export const INSTAGRAM_URL = b.instagram ? `https://instagram.com/${b.instagram}` : "#";

export const ADDRESS_LINE1 = b.addressLine1;
export const ADDRESS_LINE2 = b.addressLine2;

export const OPENING = b.opening;

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}

const MAPS_Q = `${b.addressLine1}, ${b.addressLine2}`;
export const MAPS_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(MAPS_Q)}&z=15&output=embed`;
export const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_Q)}`;
