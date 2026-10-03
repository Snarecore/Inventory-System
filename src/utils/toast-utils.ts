import toast from "react-hot-toast";

export const showToast = (type: "success" | "error" | "loading", message: string) => {
    switch (type) {
        case "success":
            toast.success(message);
            break;
        case "error":
            toast.error(message);
            break;
        case "loading":
            toast.loading(message);
            break;
        default:
            toast(message);
    }
};

export const showSuccessToast = (message?: string) => {
    if (message) toast.success(message);
};

export const showErrorToast = (message?: string) => {
    if (message) toast.error(message);
};
