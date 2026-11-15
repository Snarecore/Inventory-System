import { useState, useRef, useEffect, useCallback } from "react";
import { verifyAuthorizationPin } from "@/services/authorization-service";
import { showErrorToast, showSuccessToast } from "@/utils/toast-utils";

export interface UsePinVerificationOptions {
  pinLength?: number;
  phone?: string;
  token?: string;
  onSuccess?: (pin: string) => void | Promise<void>;
  onError?: (message: string) => void;
  autoResetOnError?: boolean;
  showToasts?: boolean;
}

export interface UsePinVerificationReturn {
  pin: string;
  pinDigits: string[];
  isComplete: boolean;
  isVerifying: boolean;
  error: string | null;
  focusedIndex: number;
  inputRefs: React.RefObject<HTMLInputElement | null>[];
  setFocusedIndex: (index: number) => void;
  handleDigitChange: (index: number, value: string) => void;
  handleKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  resetPin: () => void;
  verifyPin: (overridePin?: string) => Promise<boolean>;
}

/**
 * Headless custom hook for managing 4-digit PIN authentication & verification.
 * Follows Senior Frontend Architecture: handles all state, navigation, pasting,
 * and API verification cleanly without cluttering UI components.
 */
export function usePinVerification({
  pinLength = 4,
  phone,
  token,
  onSuccess,
  onError,
  autoResetOnError = true,
  showToasts = true,
}: UsePinVerificationOptions = {}): UsePinVerificationReturn {
  const [pinDigits, setPinDigits] = useState<string[]>(Array(pinLength).fill(""));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic input refs for the PIN fields
  const inputRefs = useRef<React.RefObject<HTMLInputElement | null>[]>([]);
  if (inputRefs.current.length !== pinLength) {
    inputRefs.current = Array(pinLength)
      .fill(null)
      .map((_, i) => inputRefs.current[i] || { current: null });
  }

  const pin = pinDigits.join("");
  const isComplete = pin.length === pinLength;

  const resetPin = useCallback(() => {
    setPinDigits(Array(pinLength).fill(""));
    setError(null);
    setFocusedIndex(0);
    setTimeout(() => {
      inputRefs.current[0]?.current?.focus();
    }, 50);
  }, [pinLength]);

  // Handle single digit input
  const handleDigitChange = useCallback(
    (index: number, rawValue: string) => {
      setError(null);
      const digit = rawValue.replace(/\D/g, "").slice(-1);

      const nextDigits = [...pinDigits];
      nextDigits[index] = digit;
      setPinDigits(nextDigits);

      // Auto-advance focus if digit entered
      if (digit && index < pinLength - 1) {
        setFocusedIndex(index + 1);
        inputRefs.current[index + 1]?.current?.focus();
      }
    },
    [pinDigits, pinLength]
  );

  // Handle keyboard navigation (Backspace, Left/Right arrows)
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (!pinDigits[index] && index > 0) {
          const nextDigits = [...pinDigits];
          nextDigits[index - 1] = "";
          setPinDigits(nextDigits);
          setFocusedIndex(index - 1);
          inputRefs.current[index - 1]?.current?.focus();
        } else {
          const nextDigits = [...pinDigits];
          nextDigits[index] = "";
          setPinDigits(nextDigits);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        setFocusedIndex(index - 1);
        inputRefs.current[index - 1]?.current?.focus();
      } else if (e.key === "ArrowRight" && index < pinLength - 1) {
        setFocusedIndex(index + 1);
        inputRefs.current[index + 1]?.current?.focus();
      }
    },
    [pinDigits, pinLength]
  );

  // Handle pasting full PIN from clipboard
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, pinLength);
      if (!pasted) return;

      const nextDigits = Array(pinLength).fill("");
      for (let i = 0; i < pasted.length; i++) {
        nextDigits[i] = pasted[i];
      }
      setPinDigits(nextDigits);

      const nextFocus = Math.min(pasted.length, pinLength - 1);
      setFocusedIndex(nextFocus);
      inputRefs.current[nextFocus]?.current?.focus();
    },
    [pinLength]
  );

  // Execute verification against backend
  const verifyPin = useCallback(
    async (overridePin?: string): Promise<boolean> => {
      const codeToVerify = overridePin !== undefined ? overridePin : pinDigits.join("");

      if (codeToVerify.length !== pinLength) {
        const msg = `Please enter a complete ${pinLength}-digit PIN.`;
        setError(msg);
        if (showToasts) showErrorToast(msg);
        return false;
      }

      setIsVerifying(true);
      setError(null);

      try {
        const result = await verifyAuthorizationPin(codeToVerify, phone, token);

        if (!result.isValid) {
          setError(result.message);
          if (showToasts) showErrorToast(result.message || "Invalid PIN. Please try again.");
          if (autoResetOnError) {
            resetPin();
          }
          onError?.(result.message);
          return false;
        }

        if (showToasts && result.message) {
          showSuccessToast(result.message);
        }
        await onSuccess?.(codeToVerify);
        return true;
      } catch (err: any) {
        const msg = err?.message || "Failed to verify PIN. Please try again.";
        setError(msg);
        if (showToasts) showErrorToast(msg);
        if (autoResetOnError) {
          resetPin();
        }
        onError?.(msg);
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [pinDigits, pinLength, phone, token, showToasts, autoResetOnError, resetPin, onSuccess, onError]
  );

  return {
    pin,
    pinDigits,
    isComplete,
    isVerifying,
    error,
    focusedIndex,
    inputRefs: inputRefs.current,
    setFocusedIndex,
    handleDigitChange,
    handleKeyDown,
    handlePaste,
    resetPin,
    verifyPin,
  };
}
