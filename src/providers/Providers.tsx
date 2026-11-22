import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "@/api/query-client";
import { AppearanceProvider, useAppearance } from "@/theme";
import { PdfPreviewModal } from "@/components/modal/PdfPreviewModal";

function ThemedToaster() {
  const { resolved } = useAppearance();
  const alertStyle = resolved.alertStyle;

  const makeStyle = (status: "success" | "error" | "loading") => {
    const colors = {
      success: {
        solid: ["var(--ui-success)", "#ffffff", "var(--ui-success)"],
        soft: ["var(--ui-success-light)", "var(--ui-success-dark)", "var(--ui-success-border)"],
        outlined: ["var(--ui-surface)", "var(--ui-success-dark)", "var(--ui-success-border)"],
      },
      error: {
        solid: ["var(--ui-danger)", "#ffffff", "var(--ui-danger)"],
        soft: ["var(--ui-danger-light)", "var(--ui-danger-dark)", "var(--ui-danger-border)"],
        outlined: ["var(--ui-surface)", "var(--ui-danger-dark)", "var(--ui-danger-border)"],
      },
      loading: {
        solid: ["var(--primary-color)", "var(--ui-on-accent)", "var(--primary-color)"],
        soft: ["var(--primary-color-light)", "var(--primary-color-dark)", "var(--primary-color-muted)"],
        outlined: ["var(--ui-surface)", "var(--ui-text)", "var(--ui-border)"],
      },
    } as const;
    const [background, color, border] = colors[status][alertStyle];
    return {
      background,
      color,
      border: `1px solid ${border}`,
      borderRadius: "var(--ui-radius)",
    };
  };

  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 3500,
        style: {
          ...makeStyle("loading"),
          fontSize: "var(--ui-font-size)",
          fontWeight: 500,
          padding: "12px 18px",
          boxShadow: "var(--ui-shadow-card)",
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: alertStyle === "solid" ? "#ffffff" : "var(--ui-success)",
            secondary: alertStyle === "solid" ? "var(--ui-success)" : "var(--ui-surface)",
          },
          style: makeStyle("success"),
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: alertStyle === "solid" ? "#ffffff" : "var(--ui-danger)",
            secondary: alertStyle === "solid" ? "var(--ui-danger)" : "var(--ui-surface)",
          },
          style: makeStyle("error"),
        },
        loading: { style: makeStyle("loading") },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppearanceProvider>
        {children}
        <ThemedToaster />
        <PdfPreviewModal />
      </AppearanceProvider>
    </QueryClientProvider>
  );
}
