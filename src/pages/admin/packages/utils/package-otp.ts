/**
 * OTP Encryption & Verification Utilities for Subscription Checkout
 * Matches the cashboi-v2 implementation using Web Crypto AES-GCM and SHA-256
 */

const OTP_SECRET = "cashboi-otp-key-2026";
export const TEST_MOBILE = "01734305691";
export const TEST_OTP_CODE = "1111";

export function isTestMobile(mobile: string): boolean {
  const clean = String(mobile || "").trim().replace(/[+\s-]/g, "");
  return clean === TEST_MOBILE || clean === `88${TEST_MOBILE}`;
}

export function generateRandomOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000)).padStart(4, "0");
}

export async function digestSha256(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function encryptOtpMessage(otpCode: string): Promise<string> {
  const hashedKey = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(OTP_SECRET)
  );

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    hashedKey,
    "AES-GCM",
    false,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(`Cash Boi varification otp is ${otpCode}`);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );

  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);

  let binary = "";
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }

  return window.btoa(binary);
}
