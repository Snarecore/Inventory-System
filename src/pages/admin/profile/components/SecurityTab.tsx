import React, { useState, useEffect } from "react";
import InputField from "@/components/form/TextInput";
import Button from "@/components/button/Button";
import {
  FaKey,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaCheckCircle,
  FaMobileAlt,
  FaRedo,
} from "react-icons/fa";
import {
  useSendOtpMutation,
  useChangePinWithOtpMutation,
} from "@/hooks/useUserProfile";
import { showErrorToast } from "@/utils/toast-utils";
import { getUserInfo } from "@/utils/auth-storage";
import type { UserProfileData } from "@/types/user-profile.types";

interface SecurityTabProps {
  phone: string;
  profile?: UserProfileData | null;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ phone, profile }) => {
  const sendOtpMutation = useSendOtpMutation();
  const changePinMutation = useChangePinWithOtpMutation();

  // PIN visibility toggle
  const [showCurrentPin, setShowCurrentPin] = useState(false);

  // Change PIN flow state
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Form inputs
  const [otpCode, setOtpCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Current PIN value (from profile or session fallback)
  const sessionPin = getUserInfo()?.pin ? String(getUserInfo()?.pin) : "";
  const currentPin = profile?.pin ? String(profile.pin) : sessionPin;

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleStartChange = () => {
    setIsChangingPin(true);
    setOtpSent(false);
    setOtpCode("");
    setNewPin("");
    setConfirmPin("");
    setFormErrors({});
  };

  const handleCancelChange = () => {
    setIsChangingPin(false);
    setOtpSent(false);
    setOtpCode("");
    setNewPin("");
    setConfirmPin("");
    setFormErrors({});
    setCountdown(0);
  };

  const handleSendOtp = async () => {
    try {
      await sendOtpMutation.mutateAsync(phone);
      setOtpSent(true);
      setCountdown(120); // 2 minute countdown
    } catch {
      // toast is handled in mutation onError
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    try {
      await sendOtpMutation.mutateAsync(phone);
      setCountdown(120);
    } catch {
      // toast is handled in mutation onError
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    const cleanOtp = otpCode.trim();
    const cleanNewPin = newPin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!cleanOtp) {
      errors.otp = "Verification OTP is required";
    }

    if (!cleanNewPin) {
      errors.newPin = "New 4-digit PIN is required";
    } else if (!/^\d{4}$/.test(cleanNewPin)) {
      errors.newPin = "PIN must be exactly 4 numeric digits";
    }

    if (!cleanConfirmPin) {
      errors.confirmPin = "Please confirm your new PIN";
    } else if (cleanNewPin !== cleanConfirmPin) {
      errors.confirmPin = "PINs do not match";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showErrorToast("Please correct the form errors");
      return;
    }

    try {
      await changePinMutation.mutateAsync({
        otp: cleanOtp,
        newPin: cleanNewPin,
        profile,
        phone,
      });

      // Reset on success
      handleCancelChange();
    } catch {
      // toast is handled in mutation onError
    }
  };

  const clearFieldError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#009fe3] flex items-center justify-center text-xs font-bold">
            <FaKey />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">
              Login PIN Management
            </h3>
            <p className="text-[11px] text-gray-500">
              This 4-digit PIN is required to authenticate and log into Cash-Boi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
          <FaShieldAlt className="text-emerald-500 text-[11px]" />
          <span>SMS OTP Protected</span>
        </div>
      </div>

      {/* ── Current PIN Row ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[10px] font-bold text-black uppercase tracking-wider block leading-tight">
              Current Login PIN
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {currentPin ? (
                <span className="font-mono text-sm font-bold text-black tracking-widest bg-white px-2 py-0.5 rounded border border-gray-200">
                  {showCurrentPin ? currentPin : "••••"}
                </span>
              ) : (
                <span className="text-xs text-black italic">PIN not set</span>
              )}

              {currentPin && (
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  className="text-black hover:text-gray-700 text-xs p-1 rounded cursor-pointer transition-colors"
                  title={showCurrentPin ? "Hide PIN" : "Show PIN"}
                >
                  {showCurrentPin ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                </button>
              )}
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-gray-300" />

          <div className="text-[11px] text-black">
            <span className="text-[10px] text-black font-bold uppercase tracking-wider block leading-tight">
              Registered Phone
            </span>
            <span className="font-mono font-bold text-black text-xs">
              {phone || "N/A"}
            </span>
          </div>
        </div>

        {!isChangingPin && (
          <Button
            type="button"
            label="Change Login PIN"
            onClick={handleStartChange}
            color="var(--primary-color)"
            hoverColor="var(--primary-color-hover)"
            buttonClass="!text-xs !py-1.5 font-bold cursor-pointer"
          />
        )}
      </div>

      {/* ── In-card PIN Change / OTP Flow ── */}
      {isChangingPin && (
        <form onSubmit={handlePinSubmit} className="pt-2 border-t border-gray-100 space-y-2.5">
          {!otpSent ? (
            /* Step 1: Request Security OTP */
            <div className="bg-sky-50/70 border border-sky-100 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs text-sky-900 min-w-0">
                <FaMobileAlt className="text-[#009fe3] text-sm shrink-0" />
                <div>
                  <p className="font-bold text-xs text-sky-950">Security Verification Required</p>
                  <p className="text-[11px] text-sky-700">
                    A 6-digit verification code will be sent to <strong>{phone}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  label="Cancel"
                  onClick={handleCancelChange}
                  color="#6b7280"
                  hoverColor="#4b5563"
                  buttonClass="!text-xs !py-1.5 cursor-pointer"
                />
                <Button
                  type="button"
                  label={sendOtpMutation.isPending ? "Sending OTP..." : "Send Verification OTP"}
                  onClick={handleSendOtp}
                  color="var(--primary-color)"
                  hoverColor="var(--primary-color-hover)"
                  isLoading={sendOtpMutation.isPending}
                  disabled={sendOtpMutation.isPending}
                  buttonClass="!text-xs !py-1.5 font-bold cursor-pointer"
                />
              </div>
            </div>
          ) : (
            /* Step 2: OTP & New PIN Inputs */
            <div className="space-y-2.5 pt-0.5">
              {/* Notice Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 px-2.5 text-xs text-emerald-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <FaCheckCircle className="text-emerald-500 text-xs shrink-0" />
                  <span className="text-[11px]">
                    OTP code sent to <strong>{phone}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {countdown > 0 ? (
                    <span className="text-[10px] font-mono text-gray-500">
                      Resend in {Math.floor(countdown / 60)}:
                      {String(countdown % 60).padStart(2, "0")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={sendOtpMutation.isPending}
                      className="inline-flex items-center gap-1 text-[11px] text-[#009fe3] hover:underline font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <FaRedo size={10} />
                      <span>Resend OTP</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* OTP Code */}
                <InputField
                  label="Verification OTP"
                  name="otpCode"
                  type="text"
                  value={otpCode}
                  onChange={(val) => {
                    const clean = val.replace(/\D/g, "").slice(0, 6);
                    setOtpCode(clean);
                    clearFieldError("otp");
                  }}
                  placeholder="e.g. 123456"
                  error={formErrors.otp}
                  icon={<FaMobileAlt className="text-gray-400 text-xs" />}
                  required
                />

                {/* New 4-Digit PIN */}
                <div className="relative">
                  <InputField
                    label="New 4-Digit PIN"
                    name="newPin"
                    type={showNewPin ? "text" : "password"}
                    value={newPin}
                    onChange={(val) => {
                      const clean = val.replace(/\D/g, "").slice(0, 4);
                      setNewPin(clean);
                      clearFieldError("newPin");
                    }}
                    placeholder="••••"
                    error={formErrors.newPin}
                    icon={<FaKey className="text-gray-400 text-xs" />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-2.5 top-[27px] text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                  >
                    {showNewPin ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                  </button>
                </div>

                {/* Confirm New 4-Digit PIN */}
                <InputField
                  label="Confirm New PIN"
                  name="confirmPin"
                  type={showNewPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={(val) => {
                    const clean = val.replace(/\D/g, "").slice(0, 4);
                    setConfirmPin(clean);
                    clearFieldError("confirmPin");
                  }}
                  placeholder="••••"
                  error={formErrors.confirmPin}
                  icon={<FaCheckCircle className="text-gray-400 text-xs" />}
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                <Button
                  type="button"
                  label="Cancel"
                  onClick={handleCancelChange}
                  color="#6b7280"
                  hoverColor="#4b5563"
                  buttonClass="!text-xs !py-1.5 cursor-pointer"
                />
                <Button
                  type="submit"
                  label={changePinMutation.isPending ? "Updating PIN..." : "Verify & Update PIN"}
                  color="var(--primary-color)"
                  hoverColor="var(--primary-color-hover)"
                  isLoading={changePinMutation.isPending}
                  disabled={
                    changePinMutation.isPending ||
                    !otpCode ||
                    newPin.length !== 4 ||
                    confirmPin.length !== 4
                  }
                  buttonClass="!text-xs !py-1.5 font-bold cursor-pointer"
                />
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
