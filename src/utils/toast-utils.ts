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

export const showDeleteToast = (message?: string) => {
    if (message) {
        toast.error(message, {
            style: {
                borderRadius: "8px",
                background: "#fff1f2",
                color: "#be123c",
                border: "1px solid #fecdd3",
                fontWeight: 600,
                fontSize: "13px",
            },
            iconTheme: {
                primary: "#e11d48",
                secondary: "#ffffff",
            },
        });
    }
};
