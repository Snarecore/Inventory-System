const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

export function toBengaliNumber(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => BENGALI_DIGITS[Number(digit)] || digit);
}

export function formatPackageMoney(amount: number | null | undefined, isBengali = false): string {
  if (amount === null || amount === undefined) return isBengali ? "যোগাযোগ করুন" : "Contact Us";
  if (amount === 0) return isBengali ? "ফ্রি" : "Free";
  const rounded = Math.round(amount).toLocaleString("en-IN");
  return `৳ ${isBengali ? toBengaliNumber(rounded) : rounded}`;
}

export const VALUE_TRANSLATIONS: Record<string, string> = {
  Limited: "সীমিত",
  Unlimited: "আনলিমিটেড",
  Multiple: "একাধিক",
  Single: "একক",
  Regular: "নিয়মিত",
  Priority: "অগ্রাধিকার",
  Dedicated: "নির্ধারিত",
  Custom: "কাস্টম",
};

export function translateFeatureValue(value: string, isBengali = false): string {
  if (isBengali && VALUE_TRANSLATIONS[value]) {
    return VALUE_TRANSLATIONS[value];
  }
  return value;
}

export function normalizeBdMobile(value: string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "").replace(/^00/, "");
  const local = digits.startsWith("880") ? `0${digits.slice(3)}` : digits;
  return /^01\d{9}$/.test(local) ? local : "";
}

export function isEmailAddress(value: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

export function formatDateForPayment(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = date.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

