/**
 * Company addresses are stored as one string. The registration form collects up to
 * three lines (street, suite/floor, city/state/zip) and joins them with ", ".
 * These helpers keep that format for the company create/edit forms.
 */

export function joinCompanyAddress(...lines: (string | undefined | null)[]): string {
  return lines
    .map((line) => (line ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

/** Splits a stored address back into the three form lines (lossless when re-joined). */
export function splitCompanyAddress(address?: string | null): [string, string, string] {
  const parts = (address ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return [parts[0] ?? "", parts[1] ?? "", parts.slice(2).join(", ")];
}
