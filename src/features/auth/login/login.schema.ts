import { z } from "zod";

export const PhoneStepSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .refine(
      (val) => {
        // Strip out spaces and dashes
        const clean = val.replace(/[\s-]/g, "");
        // Accept Bangladeshi mobile formats (e.g. 017xxxxxxxx, 88017xxxxxxxx, +88017xxxxxxxx) or 10-14 digits
        return /^(?:\+?88)?01[3-9]\d{8}$/.test(clean) || /^\d{10,14}$/.test(clean);
      },
      {
        message: "Please enter a valid mobile number",
      }
    ),
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

export type PhoneStepFormData = z.infer<typeof PhoneStepSchema>;
export type PinStepFormData = z.infer<typeof PinStepSchema>;