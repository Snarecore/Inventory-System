import { postData } from "@/services/api-service";
import { LoginPayload, LoginApiResponse } from "./login.types";

export const loginApi = {
  /**
   * Check if an identifier is registered and retrieve user profile & pin.
   * NOTE: the API only exposes an "authentication.phone_number" field, so an
   * email identifier is sent through that same field.
   * @param identifier Mobile number or email address
   * @returns LoginApiResponse containing user details & PIN
   */
  checkUser: async (identifier: string): Promise<LoginApiResponse> => {
    const res = await postData<LoginApiResponse>({
      url: "authorization-check-user",
      body: {
        authentication: {
          phone_number: identifier,
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
