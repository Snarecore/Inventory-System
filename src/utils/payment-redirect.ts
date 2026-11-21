const DEFAULT_PAYMENT_HOSTS = [
  "eps.com.bd",
];

const getConfiguredHosts = (): string[] => {
  const configured = String(import.meta.env.VITE_PAYMENT_REDIRECT_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...DEFAULT_PAYMENT_HOSTS, ...configured.map((host) => host.toLowerCase())])];
};

const isAllowedPaymentHostname = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  return getConfiguredHosts().some(
    (allowed) => normalized === allowed || normalized.endsWith(`.${allowed}`)
  );
};

export const validatePaymentRedirectUrl = (
  rawUrl: string | null | undefined
): { isValid: true; url: URL } | { isValid: false; message: string } => {
  if (!rawUrl) {
    return { isValid: false, message: "Payment gateway link was not received." };
  }

  try {
    const url = new URL(String(rawUrl).trim());
    if (url.protocol !== "https:") {
      return { isValid: false, message: "Invalid payment gateway redirect protocol. Only HTTPS is supported." };
    }
    if (!isAllowedPaymentHostname(url.hostname)) {
      return { isValid: false, message: "Untrusted payment gateway redirect domain. Please contact support." };
    }
    return { isValid: true, url };
  } catch {
    return { isValid: false, message: "Invalid payment gateway redirect URL format." };
  }
};
