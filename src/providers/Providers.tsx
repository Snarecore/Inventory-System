import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "@/api/query-client";
import { ThemeProvider } from "@/context/ThemeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 3500,
            style: {
              background: "#ffffff",
              color: "#1e293b",
              fontSize: "14px",
              fontWeight: 500,
              padding: "12px 18px",
              borderRadius: "12px",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05)",
              border: "1px solid #f1f5f9",
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: "#10b981",
                secondary: "#ffffff",
              },
              style: {
                border: "1px solid #d1fae5",
                background: "#ffffff",
                color: "#065f46",
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#ffffff",
              },
              style: {
                border: "1px solid #fee2e2",
                background: "#ffffff",
                color: "#991b1b",
              },
            },
            loading: {
              style: {
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#334155",
              },
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
