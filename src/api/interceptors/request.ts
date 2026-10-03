import { axiosInstance } from "../axios-instance";

axiosInstance.interceptors.request.use(
    (config) => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            config.headers["ngrok-skip-browser-warning"] = "true";
        }

        return config;
    },
    (error) => Promise.reject(error)
);
