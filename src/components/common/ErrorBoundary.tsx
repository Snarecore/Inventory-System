import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/common/Button";
import { HiOutlineRefresh, HiOutlineExclamationCircle } from "react-icons/hi";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  resetKeys?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an unhandled error]:", error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, idx) => key !== (prevProps.resetKeys ? prevProps.resetKeys[idx] : undefined)
      );
      if (hasChanged) {
        this.resetError();
      }
    }
  }

  private resetError = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "একটি অনাকাঙ্ক্ষিত ত্রুটি ঘটেছে";
      const isDynamicImportError =
        errorMessage.includes("Failed to fetch dynamically imported module") ||
        errorMessage.includes("Importing a module script failed") ||
        errorMessage.includes("error loading dynamically imported module") ||
        this.state.error?.name === "ChunkLoadError";

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-5 my-auto">
          <div className="p-4 rounded-3xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-sm">
            <HiOutlineExclamationCircle className="h-12 w-12" />
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-xl font-bold text-[var(--ui-text,#1e293b)] dark:text-white">
              {isDynamicImportError ? "মডিউল লোড করতে সমস্যা হয়েছে" : "একটি ত্রুটি ঘটেছে"}
            </h2>
            <p className="text-sm text-[var(--ui-text-muted,#64748b)] dark:text-[var(--ui-text-subtle,#94a3b8)]">
              {isDynamicImportError
                ? "নতুন ভার্সন আপডেট অথবা নেটওয়ার্কজনিত কারণে পেজের মডিউলটি লোড হয়নি। অনুগ্রহ করে রিলোড দিন।"
                : errorMessage}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                if (isDynamicImportError) {
                  window.location.reload();
                } else {
                  this.resetError();
                }
              }}
              variant="primary"
              icon={<HiOutlineRefresh className="h-4 w-4" />}
            >
              {isDynamicImportError ? "পৃষ্ঠা রিলোড করুন" : "পুনরায় চেষ্টা করুন"}
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
            >
              রিফ্রেশ
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
