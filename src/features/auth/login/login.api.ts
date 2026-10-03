import { postData } from "@/services/api-service";
import { LoginPayload, LoginApiResponse } from "./login.types";

export const loginApi = {
  /**
   * Check if phone number is registered and retrieve user profile & pin
   * @param phoneNumber Mobile phone number
   * @returns LoginApiResponse containing user details & PIN
   */
  checkUser: async (phoneNumber: string): Promise<LoginApiResponse> => {
    const res = await postData<LoginApiResponse>({
      url: "authorization-check-user",
      body: {
        authentication: {
          phone_number: phoneNumber,
        },
      },
    });

    return res as LoginApiResponse;
  },

  /**
   * Authenticate user with phone number and PIN / password
   * @param payload LoginPayload containing phone_number, password (PIN), fcm_token, and login_version
   * @returns LoginApiResponse
   */
  loginUser: async (payload: LoginPayload): Promise<LoginApiResponse> => {
    const res = await postData<LoginApiResponse>({
      url: "user-login",
      body: {
        authentication: {
          phone_number: payload.authentication.phone_number,
          password: payload.authentication.password || payload.authentication.pin,
        },
        fcm_token: payload.fcm_token || "web_client_token",
        login_version: payload.login_version || "1.0.1",
      },
    });

    return res as LoginApiResponse;
  },
};
