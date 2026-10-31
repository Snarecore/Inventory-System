import { z } from "zod";

// Bangladeshi mobile formats (e.g. 017xxxxxxxx, 88017xxxxxxxx, +88017xxxxxxxx)
const BD_MOBILE_PATTERN = /^(?:\+?88)?01[3-9]\d{8}$/;
// Fallback for other international numbers entered as plain digits
const PLAIN_DIGITS_PATTERN = /^\d{10,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/** An identifier is treated as an email as soon as it contains "@" */
export const isEmailIdentifier = (value: string): boolean => value.includes("@");

/** Lowercase emails; strip spaces and dashes from numbers */
export const normalizeIdentifier = (value: string): string => {
  const trimmed = value.trim();
  return isEmailIdentifier(trimmed)
    ? trimmed.toLowerCase()
    : trimmed.replace(/[\s-]/g, "");
};

export const IdentifierStepSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Mobile number or email is required")
    .superRefine((val, ctx) => {
      const clean = normalizeIdentifier(val);

      if (isEmailIdentifier(clean)) {
        if (!EMAIL_PATTERN.test(clean)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please enter a valid email address",
          });
        }
        return;
      }

      if (!BD_MOBILE_PATTERN.test(clean) && !PLAIN_DIGITS_PATTERN.test(clean)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid mobile number or email address",
        });
      }
    }),
  rememberMe: z.boolean().default(true),
});

export const PinStepSchema = z.object({
  pin: z
    .string()
    .trim()
    .min(4, "4-digit PIN is required")
    .max(6, "PIN cannot exceed 6 digits")
    .regex(/^\d+$/, "PIN must contain only numbers"),
});

export type IdentifierStepFormData = z.infer<typeof IdentifierStepSchema>;
export type PinStepFormData = z.infer<typeof PinStepSchema>;
