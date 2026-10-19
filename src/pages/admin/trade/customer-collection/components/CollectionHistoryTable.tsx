import React, { useState } from "react";
import moment from "moment";
import { useCollectionReportQuery } from "@/hooks/useCollectionReport";
import type { CollectionReceiptData } from "./CollectionReceiptModal";
import { TradeSettlementHistoryTable } from "@/components/settlement/TradeSettlementHistoryTable";

interface CollectionHistoryTableProps {
  onPrintReceipt: (receipt: CollectionReceiptData) => void;
}

export const CollectionHistoryTable: React.FC<CollectionHistoryTableProps> = ({
  onPrintReceipt,
}) => {
  const [startDate, setStartDate] = useState<string>(
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );

  const { data: rawReportList = [], isLoading } = useCollectionReportQuery({
    startDate,
    endDate,
  });

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <TradeSettlementHistoryTable
      partyType="customer"
      dataList={rawReportList}
      isLoading={isLoading}
      onDateRangeChange={handleDateRangeChange}
      onPrintReceipt={onPrintReceipt}
      storageKey="collection_history_columns"
      excelFileName="Customer_Collections.xlsx"
    />
  );
};

export default CollectionHistoryTable;
