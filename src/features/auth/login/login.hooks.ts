import { useMutation } from "@tanstack/react-query";
import { loginApi } from "./login.api";
import { LoginPayload, LoginApiResponse, LoginSuccessResponse } from "./login.types";
import { saveLoginSession } from "@/utils/auth-storage";

interface UseCheckUserOptions {
  onSuccess?: (data: LoginSuccessResponse) => void;
  onError?: (error: string) => void;
}

export function useCheckUserMutation(options?: UseCheckUserOptions) {
  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response: LoginApiResponse = await loginApi.checkUser(phoneNumber);

      if (
        (response as any).error ||
        String(response.status).toLowerCase() === "error"
      ) {
        const errorMsg =
          (response as any).msg === "Phone number is available"
            ? "এই মোবাইল নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি।"
            : (response as any).msg || (response as any).message || "অ্যাকাউন্ট যাচাই ব্যর্থ হয়েছে।";
        throw new Error(errorMsg);
      }

      return response as LoginSuccessResponse;
    },
    onSuccess: (data: LoginSuccessResponse) => {
      options?.onSuccess?.(data);
    },
    onError: (err: any) => {
      const msg = err?.message || "অ্যাকাউন্ট যাচাই করতে সমস্যা হয়েছে।";
      options?.onError?.(msg);
    },
  });
}

interface UseLoginOptions {
  onSuccess?: (data: LoginSuccessResponse) => void;
  onError?: (error: string) => void;
  rememberMe?: boolean;
}

export function useLoginMutation(options?: UseLoginOptions) {
  return useMutation({
    mutationFn: async ({
      payload,
      cachedUser,
    }: {
      payload: LoginPayload;
      cachedUser?: LoginSuccessResponse | null;
    }) => {
      const enteredPin = payload.authentication.password || payload.authentication.pin || "";

      // 1. If we already validated the user profile in Step 1 and received their PIN
      if (cachedUser && cachedUser.pin) {
        if (cachedUser.pin === enteredPin) {
          return cachedUser;
        } else {
          throw new Error("ভুল পিন দিয়েছেন! সঠিক পিন দিন।");
        }
      }

      // 2. Fallback: Check via checkUser or user-login
      const checkRes = await loginApi.checkUser(payload.authentication.phone_number);
      if (
        !(checkRes as any).error &&
        String(checkRes.status).toLowerCase() === "success" &&
        (checkRes as LoginSuccessResponse).pin
      ) {
        const userRes = checkRes as LoginSuccessResponse;
        if (userRes.pin === enteredPin) {
          return userRes;
        } else {
          throw new Error("ভুল পিন দিয়েছেন! সঠিক পিন দিন।");
        }
      }

      // 3. Fallback to user-login endpoint
      const response: LoginApiResponse = await loginApi.loginUser(payload);

      if (
        (response as any).error ||
        String(response.status).toLowerCase() === "error" ||
        !response.token
      ) {
        const rawMsg = (response as any).msg || (response as any).message;
        const errorMsg =
          rawMsg === "Invalid password"
            ? "ভুল পিন দিয়েছেন! সঠিক পিন দিন।"
            : rawMsg || "লগইন ব্যর্থ হয়েছে। নম্বর এবং পিন যাচাই করুন।";
        throw new Error(errorMsg);
      }

      return response as LoginSuccessResponse;
    },
    onSuccess: (data: LoginSuccessResponse) => {
      // Save complete session with token and orgId/branchId
      saveLoginSession(data, options?.rememberMe ?? true);
      options?.onSuccess?.(data);
    },
    onError: (err: any) => {
      const msg = err?.message || "লগইন করতে সমস্যা হয়েছে।";
      options?.onError?.(msg);
    },
  });
}
