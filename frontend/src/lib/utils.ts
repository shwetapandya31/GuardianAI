import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


/**
 * Masks an email address for privacy and security.
 * Example: "aaapandya.03@gmail.com" -> "aa***03@gmail.com"
 * Example: "john.doe@company.org" -> "jo***oe@company.org"
 * Example: "test@example.com" -> "t**t@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const parts = email.trim().split("@");
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (!local || !domain) return email;

  let maskedLocal = "";
  if (local.length <= 2) {
    maskedLocal = local[0] + "*".repeat(Math.max(1, local.length - 1));
  } else if (local.length <= 4) {
    maskedLocal = local[0] + "*".repeat(local.length - 2) + local[local.length - 1];
  } else {
    // Keep first 2 and last 2 characters, and match the exact length of middle characters with asterisks
    const hiddenCount = local.length - 4;
    maskedLocal = local.slice(0, 2) + "*".repeat(hiddenCount) + local.slice(-2);
  }

  return `${maskedLocal}@${domain}`;
}
