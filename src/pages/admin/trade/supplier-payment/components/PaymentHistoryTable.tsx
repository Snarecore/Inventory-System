import React, { useState } from "react";
import moment from "moment";
import { usePaymentReportQuery } from "@/hooks/usePaymentReport";
import type { PaymentReceiptData } from "@/types/payment.types";
import { TradeSettlementHistoryTable } from "@/components/settlement/TradeSettlementHistoryTable";

interface PaymentHistoryTableProps {
  onPrintReceipt: (receipt: PaymentReceiptData) => void;
}

export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
  onPrintReceipt,
}) => {
  const [startDate, setStartDate] = useState<string>(
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );

  const { data: rawReportList = [], isLoading } = usePaymentReportQuery({
    startDate,
    endDate,
  });

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <TradeSettlementHistoryTable
      partyType="supplier"
      dataList={rawReportList}
      isLoading={isLoading}
      onDateRangeChange={handleDateRangeChange}
      onPrintReceipt={onPrintReceipt}
      storageKey="payment_history_columns"
      excelFileName="Supplier_Payments.xlsx"
    />
  );
};

export default PaymentHistoryTable;
