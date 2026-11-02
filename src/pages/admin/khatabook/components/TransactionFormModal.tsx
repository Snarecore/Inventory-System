import React, { useState, useEffect } from "react";
import DrawerModal from "@/components/modal/DrawerModal";
import TextInput from "@/components/form/TextInput";
import Button from "@/components/button/Button";
import type {
  LedgerPerson,
  LedgerTransaction,
  CreateLedgerTransactionPayload,
  UpdateLedgerTransactionPayload,
} from "@/types";
import {
  useCreateLedgerTransactionMutation,
  useUpdateLedgerTransactionMutation,
  useLedgerPersonsQuery,
} from "@/hooks/useKhatabook";
import { useBankInfoListQuery } from "@/hooks/useBankQueries";
import { useMfsUserListQuery } from "@/hooks/useMfsQueries";
import {
  FaMoneyBillWave,
  FaLandmark,
  FaMobileAlt,
  FaFileAlt,
  FaArrowDown,
  FaArrowUp,
} from "react-icons/fa";

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPersonId?: number | null;
  defaultType?: "PABO" | "DIBO";
  transactionToEdit?: LedgerTransaction | null;
  onSuccess?: () => void;
  zIndex?: string;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  defaultPersonId,
  defaultType = "PABO",
  transactionToEdit,
  onSuccess,
  zIndex = "z-[60]",
}) => {
  const isEdit = Boolean(transactionToEdit?.id);

  const [personId, setPersonId] = useState<number | "">("");
  const [transactionType, setTransactionType] = useState<"PABO" | "DIBO">("PABO");
  const [paymentType, setPaymentType] = useState<"CASH" | "BANK" | "MFS">("CASH");
  const [amount, setAmount] = useState<string>("");
  const [bankAccountNo, setBankAccountNo] = useState<string>("");
  const [mfsUserId, setMfsUserId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [refNo, setRefNo] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Queries for bank and MFS lists
  const { data: bankData } = useBankInfoListQuery();
  const { data: mfsData } = useMfsUserListQuery();
  const { data: personsData } = useLedgerPersonsQuery();

  const bankAccounts = bankData?.bankAccounts || [];
  const mfsAccounts = mfsData?.mfsUsers || [];
  const persons: LedgerPerson[] = personsData?.data || [];

  useEffect(() => {
    if (transactionToEdit) {
      setPersonId(Number(transactionToEdit.personId));
      const isDibo = (transactionToEdit.transactionType || "").toUpperCase().includes("DIBO");
      setTransactionType(isDibo ? "DIBO" : "PABO");

      const pType = (transactionToEdit.paymentType || "CASH").toUpperCase();
      if (pType === "BANK") setPaymentType("BANK");
      else if (pType === "MFS") setPaymentType("MFS");
      else setPaymentType("CASH");

      setAmount(String(transactionToEdit.amount || ""));
      setBankAccountNo(transactionToEdit.bankAccountNo || "");
      setMfsUserId(transactionToEdit.mfsUserId ? String(transactionToEdit.mfsUserId) : "");
      setNote(transactionToEdit.note || "");
      setRefNo(transactionToEdit.refNo || "");

      const tDate = transactionToEdit.createdDate || transactionToEdit.createdAt || "";
      if (tDate) {
        setDate(tDate.split("T")[0]);
      } else {
        setDate(new Date().toISOString().split("T")[0]);
      }
    } else {
      setPersonId(defaultPersonId ? Number(defaultPersonId) : "");
      setTransactionType(defaultType);
      setPaymentType("CASH");
      setAmount("");
      setBankAccountNo("");
      setMfsUserId("");
      setNote("");
      setRefNo(`TXN-${Date.now()}`);
      setDate(new Date().toISOString().split("T")[0]);
    }
    setErrors({});
  }, [transactionToEdit, defaultPersonId, defaultType, isOpen]);

  // Set default bank/MFS when payment type changes
  useEffect(() => {
    if (paymentType === "BANK" && !bankAccountNo && bankAccounts.length > 0) {
      setBankAccountNo(String(bankAccounts[0].accountNo || ""));
    }
    if (paymentType === "MFS" && !mfsUserId && mfsAccounts.length > 0) {
      setMfsUserId(String(mfsAccounts[0].id || mfsAccounts[0].userId || ""));
    }
  }, [paymentType, bankAccounts, mfsAccounts]);

  const createMutation = useCreateLedgerTransactionMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const updateMutation = useUpdateLedgerTransactionMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!personId) {
      errs.personId = "Please select a person";
    }
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errs.amount = "Please enter a valid amount greater than 0";
    }
    if (paymentType === "BANK" && !bankAccountNo) {
      errs.bankAccountNo = "Please select a bank account";
    }
    if (paymentType === "MFS" && !mfsUserId) {
      errs.mfsUserId = "Please select an MFS account";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    if (isEdit && transactionToEdit?.id) {
      const payload: UpdateLedgerTransactionPayload = {
        transactionId: transactionToEdit.id,
        personId: Number(personId),
        transactionType,
        paymentType,
        amount: Number(amount),
        note: note.trim(),
        refNo: refNo.trim(),
        transactionDate: date,
      };

      if (paymentType === "BANK") {
        payload.bankAccountNo = bankAccountNo;
      } else if (paymentType === "MFS") {
        payload.mfsUserId = Number(mfsUserId);
      }

      updateMutation.mutate(payload);
    } else {
      const payload: CreateLedgerTransactionPayload = {
        personId: Number(personId),
        transactionType,
        paymentType,
        amount: Number(amount),
        note: note.trim(),
        refNo: refNo.trim(),
        transactionDate: date,
      };

      if (paymentType === "BANK") {
        payload.bankAccountNo = bankAccountNo;
      } else if (paymentType === "MFS") {
        payload.mfsUserId = Number(mfsUserId);
      }

      createMutation.mutate(payload);
    }
  };

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Transaction" : "Record Transaction"}
      maxWidth="max-w-[340px]"
      zIndex={zIndex}
      onSubmit={handleSubmit}
      footerButtons={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            label="Cancel"
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting}
            buttonClass="!bg-[var(--ui-surface)] hover:!bg-[var(--ui-surface-sunken)] !border-[var(--ui-border)] !text-[var(--ui-text)] font-medium !rounded-lg !py-1.5 !px-3 text-xs"
          />
          <Button
            label={
              isSubmitting
                ? "Saving..."
                : isEdit
                ? "Update Transaction"
                : transactionType === "PABO"
                ? "Record Receivable"
                : "Record Payable"
            }
            type="submit"
            color={transactionType === "PABO" ? "#059669" : "#dc2626"}
            hoverColor={transactionType === "PABO" ? "#047857" : "#b91c1c"}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            buttonClass="font-semibold !rounded-lg !py-1.5 !px-4 text-xs text-white"
          />
        </div>
      }
    >
      <div className="flex flex-col gap-2.5 text-left">
        {/* Transaction Type Segmented Selector */}
        <div>
          <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
            Transaction Type <span className="text-[var(--ui-danger)]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--ui-surface-sunken)] rounded-xl border border-[var(--ui-border)]">
            <button
              type="button"
              onClick={() => setTransactionType("PABO")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                transactionType === "PABO"
                  ? "bg-[var(--ui-surface)] text-[var(--ui-success)] shadow-xs border border-[var(--ui-success-border)]"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface)]/50 border border-transparent"
              }`}
            >
              <FaArrowDown className={transactionType === "PABO" ? "text-[var(--ui-success)] text-xs" : "text-[var(--ui-text-subtle)] text-xs"} />
              Receivable (Pabo)
            </button>
            <button
              type="button"
              onClick={() => setTransactionType("DIBO")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                transactionType === "DIBO"
                  ? "bg-[var(--ui-surface)] text-[var(--ui-danger)] shadow-xs border border-[var(--ui-danger-border)]"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface)]/50 border border-transparent"
              }`}
            >
              <FaArrowUp className={transactionType === "DIBO" ? "text-[var(--ui-danger)] text-xs" : "text-[var(--ui-text-subtle)] text-xs"} />
              Payable (Dibo)
            </button>
          </div>
        </div>

        {/* Person Selector */}
        <div>
          <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
            Select Person <span className="text-[var(--ui-danger)]">*</span>
          </label>
          <select
            value={personId}
            onChange={(e) => {
              setPersonId(Number(e.target.value) || "");
              if (errors.personId) setErrors((prev) => ({ ...prev, personId: "" }));
            }}
            disabled={Boolean(defaultPersonId)}
            className="w-full h-9 px-2.5 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)] focus:border-[var(--primary-color,#009fe3)] cursor-pointer"
          >
            <option value="">-- Choose Person --</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.phone})
              </option>
            ))}
          </select>
          {errors.personId && <p className="text-[11px] text-[var(--ui-danger)] mt-1">{errors.personId}</p>}
        </div>

        {/* Amount */}
        <div>
          <TextInput
            label="Amount (৳)"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(val: any) => {
              setAmount(typeof val === "string" ? val : (val?.target?.value ?? ""));
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
            }}
            required
            message={errors.amount}
            icon={<FaMoneyBillWave className="text-[var(--ui-text-subtle)] text-xs" />}
          />
        </div>

        {/* Tender Type Selector */}
        <div>
          <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--ui-surface-sunken)] rounded-xl border border-[var(--ui-border)]">
            {[
              { id: "CASH", label: "Cash", icon: FaMoneyBillWave },
              { id: "BANK", label: "Bank", icon: FaLandmark },
              { id: "MFS", label: "MFS", icon: FaMobileAlt },
            ].map((tender) => {
              const Icon = tender.icon;
              const isSelected = paymentType === tender.id;
              return (
                <button
                  key={tender.id}
                  type="button"
                  onClick={() => setPaymentType(tender.id as any)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--ui-surface)] text-[var(--primary-color)] shadow-xs border border-[var(--primary-color)]/30"
                      : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface)]/50 border border-transparent"
                  }`}
                >
                  <Icon className="text-xs" />
                  <span>{tender.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bank Account Selection (when BANK) */}
        {paymentType === "BANK" && (
          <div className="p-2.5 rounded-xl bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--ui-text)]">
              Select Bank Account <span className="text-[var(--ui-danger)]">*</span>
            </label>
            <select
              value={bankAccountNo}
              onChange={(e) => {
                setBankAccountNo(e.target.value);
                if (errors.bankAccountNo) setErrors((prev) => ({ ...prev, bankAccountNo: "" }));
              }}
              className="w-full h-8 px-2.5 text-xs bg-[var(--ui-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)] cursor-pointer"
            >
              <option value="">-- Select Bank Account --</option>
              {bankAccounts.map((b) => (
                <option key={b.bankId || b.id} value={b.accountNo}>
                  {b.bankName} - {b.bankAccountName || b.accountName} ({b.accountNo})
                </option>
              ))}
            </select>
            {errors.bankAccountNo && (
              <p className="text-[11px] text-[var(--ui-danger)]">{errors.bankAccountNo}</p>
            )}
          </div>
        )}

        {/* MFS Account Selection (when MFS) */}
        {paymentType === "MFS" && (
          <div className="p-2.5 rounded-xl bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--ui-text)]">
              Select MFS Provider Account <span className="text-[var(--ui-danger)]">*</span>
            </label>
            <select
              value={mfsUserId}
              onChange={(e) => {
                setMfsUserId(e.target.value);
                if (errors.mfsUserId) setErrors((prev) => ({ ...prev, mfsUserId: "" }));
              }}
              className="w-full h-8 px-2.5 text-xs bg-[var(--ui-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)] cursor-pointer"
            >
              <option value="">-- Select MFS Account --</option>
              {mfsAccounts.map((m) => (
                <option key={m.id || m.userId} value={m.id || m.userId}>
                  {m.mfsName || m.providerName} - {m.accountNumber || m.accountNo} (
                  {m.accountType || "Agent"})
                </option>
              ))}
            </select>
            {errors.mfsUserId && (
              <p className="text-[11px] text-[var(--ui-danger)]">{errors.mfsUserId}</p>
            )}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-9 px-2.5 text-xs bg-[var(--ui-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)]"
          />
        </div>

        {/* Reference / Invoice No */}
        <div>
          <TextInput
            label="Reference / Invoice No (Optional)"
            placeholder="TXN-001"
            value={refNo}
            onChange={(val: any) => setRefNo(typeof val === "string" ? val : (val?.target?.value ?? ""))}
            icon={<FaFileAlt className="text-[var(--ui-text-subtle)] text-xs" />}
          />
        </div>

        {/* Note / Description */}
        <div>
          <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
            Note / Description
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any notes about this transaction..."
            className="w-full px-2.5 py-1.5 text-xs bg-[var(--ui-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)] resize-none"
          />
        </div>
      </div>
    </DrawerModal>
  );
};

export default TransactionFormModal;
