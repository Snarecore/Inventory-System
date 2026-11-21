import React, { useRef, useEffect, useMemo } from "react";
import Modal from "@/components/modal/Modal";
import { FaPrint } from "react-icons/fa";
import { getUserInfo, getStoredUser } from "@/utils/auth-storage";
import { formatMoney } from "@/utils/formatters";
import { useBusinessProfileQuery } from "@/hooks/useBusinessProfile";
import moment from "moment";

export type TradeInvoiceType = "SALE" | "PURCHASE" | "SALES_RETURN" | "PURCHASE_RETURN";

export interface TradeInvoiceLineItem {
  id?: string | number;
  productName: string;
  productCode?: string;
  unit?: string;
  price: number;
  quantity: number;
  discount?: number;
  vat?: number;
  total: number;
  returnReason?: string;
  returnRemarks?: string;
}

export interface TradeInvoiceData {
  type: TradeInvoiceType;
  invoiceTitle?: string;
  invoiceNo: string;
  date?: string;
  status?: string;

  // Party
  partyTypeTitle?: string;
  partyName: string;
  partyPhone?: string;
  partyAddress?: string;

  // Payment / Channel
  paymentMethod?: string;
  cashAmount?: number;
  bankName?: string;
  bankAmount?: number;
  accountNo?: string;
  mfsName?: string;
  mfsAmount?: number;
  mfsPhone?: string;
  customerPaid?: number;
  returnAmount?: number;

  // Logistics & Attachments
  challanNo?: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  attachmentUrl?: string | null;

  // Items
  items: TradeInvoiceLineItem[];

  // Totals
  subtotal: number;
  discount?: number;
  vat?: number;
  deliveryCharge?: number;
  grandTotal: number;
  paidAmount?: number;
  dueAmount?: number;
  refundAmount?: number;
  previousDue?: number;
  totalDueWithCurrent?: number;

  notes?: string;
}

export interface TradeInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: TradeInvoiceData | null;
  autoPrint?: boolean;
}

/**
 * Converts a numeric amount to English currency words (Taka)
 */
export function numberToWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return "Zero taka only";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const formatTens = (n: number): string => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10].toLowerCase() : "");
  };

  const formatHundreds = (n: number): string => {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " hundred ";
      n %= 100;
    }
    if (n > 0) {
      str += formatTens(n) + " ";
    }
    return str.trim();
  };

  let n = Math.floor(Math.abs(num));
  let words = "";

  if (n >= 10000000) {
    words += formatHundreds(Math.floor(n / 10000000)) + " crore ";
    n %= 10000000;
  }
  if (n >= 100000) {
    words += formatHundreds(Math.floor(n / 100000)) + " lakh ";
    n %= 100000;
  }
  if (n >= 1000) {
    words += formatHundreds(Math.floor(n / 1000)) + " thousand ";
    n %= 1000;
  }
  if (n > 0) {
    words += formatHundreds(n) + " ";
  }

  const result = (words.trim() ? words.trim() : "Zero") + " taka only";
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export const TradeInvoiceModal: React.FC<TradeInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  autoPrint = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: businessProfile } = useBusinessProfileQuery();
  const userInfo = getUserInfo();

  const inv = invoice;
  const isPurchase = inv?.type === "PURCHASE";

  // Pure English document title
  const docTitle =
    inv?.type === "SALE"
      ? "CASH MEMO"
      : inv?.type === "PURCHASE"
      ? "PURCHASE MEMO"
      : inv?.type === "SALES_RETURN"
      ? "SALES RETURN MEMO"
      : "PURCHASE RETURN MEMO";

  const modalTitle = inv?.invoiceTitle || docTitle;

  const due = Number(inv?.dueAmount ?? 0);
  const grandTotal = Number(inv?.grandTotal ?? 0);
  const paid = Number(inv?.paidAmount ?? 0);
  const previousDue = Number(inv?.previousDue ?? 0);
  const totalDue = due + previousDue;

  // Words representation
  const wordsAmount = useMemo(() => {
    return numberToWords(grandTotal);
  }, [grandTotal]);

  // Business details
  const businessName =
    businessProfile?.businessName ||
    userInfo?.businessName ||
    "Shaha Enterprise";

  const user = getStoredUser();
  const businessAddress = businessProfile?.address || "";

  const phone1 = businessProfile?.businessPhone1 || userInfo?.phone || userInfo?.phoneNumber || "";
  const phone2 = businessProfile?.businessPhone2 || "";
  const businessEmail = businessProfile?.businessEmail || user?.email || "";

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank", "width=880,height=960");
    if (!printWindow) {
      window.print();
      return;
    }

    const doc = printWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              background: #ffffff !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 11px;
              line-height: 1.35;
              color: #0f172a;
              -webkit-font-smoothing: antialiased;
            }
            .a4-container {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
              background: #ffffff !important;
              padding: 0;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body style="background: #ffffff; margin: 0; padding: 0;">
          <div id="print-root" class="a4-container"></div>
        </body>
      </html>
    `);
    doc.close();

    // Safely assign title as a DOM property
    doc.title = `${docTitle} - ${inv?.invoiceNo || ""}`;

    // Safely clone DOM node to avoid HTML injection
    const container = doc.getElementById("print-root");
    if (container && printRef.current) {
      container.appendChild(printRef.current.cloneNode(true));
    }

    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (err) {
        console.error("Print trigger error:", err);
      }
    }, 300);
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };

  useEffect(() => {
    if (isOpen && autoPrint && invoice) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, invoice]);

  if (!isOpen || !inv) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="w-full max-w-[760px]"
    >
      <div className="space-y-4">
        {/* Printable Paper A4 Area - Pure English Design with Strict Inline Flex Layouts */}
        <div
          ref={printRef}
          className="bg-white p-6 sm:p-8 text-slate-900 font-sans border border-slate-200 rounded-lg shadow-xs"
        >
          {/* Top Section: Shop Name & Contacts (Left) + Outlined Memo Box (Right) */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
              paddingBottom: "12px",
            }}
          >
            {/* Left: Business Information */}
            <div style={{ flex: 1, maxWidth: "420px" }}>
              <h1
                style={{
                  color: "#01306B",
                  fontSize: "22px",
                  fontWeight: 900,
                  letterSpacing: "-0.5px",
                  lineHeight: "1.2",
                  margin: "0 0 4px 0",
                }}
              >
                {businessName}
              </h1>

              <div
                style={{
                  fontSize: "11px",
                  color: "#334155",
                  lineHeight: "1.45",
                }}
              >
                {businessAddress && <div>{businessAddress}</div>}
                {(phone1 || phone2) && (
                  <div>
                    <span style={{ fontWeight: 600 }}>Mobile:</span> {phone1}
                    {phone2 ? `, ${phone2}` : ""}
                  </div>
                )}
                {businessEmail && (
                  <div>
                    <span style={{ fontWeight: 600 }}>Email:</span> {businessEmail}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Cash Memo Box with #01306B Primary Border */}
            <div
              style={{
                width: "185px",
                border: "2px solid #01306B",
                borderRadius: "4px",
                padding: "8px 14px",
                textAlign: "center",
                backgroundColor: "#ffffff",
                flexShrink: 0,
              }}
            >
              <h2
                style={{
                  color: "#01306B",
                  fontSize: "16px",
                  fontWeight: 900,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  margin: "0 0 6px 0",
                  lineHeight: "1",
                }}
              >
                {docTitle}
              </h2>

              <div
                style={{
                  fontSize: "11px",
                  color: "#0f172a",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#475569", fontWeight: 600 }}>No:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                    {inv.invoiceNo}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#475569", fontWeight: 600 }}>Date:</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {inv.date ? moment(inv.date).format("DD/MM/YYYY") : moment().format("DD/MM/YYYY")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information Bar (Clean without background) */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              padding: "6px 2px",
              marginTop: "4px",
              marginBottom: "10px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            <div>
              <span style={{ color: "#475569" }}>
                {isPurchase ? "Supplier Name:" : "Name:"}
              </span>{" "}
              <strong style={{ color: "#0f172a", fontWeight: "bold", marginLeft: "4px" }}>
                {inv.partyName || "Walk-in Customer"}
              </strong>
            </div>
            <div>
              <span style={{ color: "#475569" }}>Mobile:</span>{" "}
              <strong style={{ color: "#0f172a", fontFamily: "monospace", marginLeft: "4px" }}>
                {inv.partyPhone || "N/A"}
              </strong>
            </div>
          </div>

          {/* Items Table with Slate Gray Header */}
          <div style={{ width: "100%" }}>
            <table className="invoice-print-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "#475569",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "11px",
                  }}
                >
                  <th style={{ textAlign: "left", width: "32px", padding: "6px 4px", borderRight: "1px solid rgba(255,255,255,0.2)" }}>
                    SL
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderRight: "1px solid rgba(255,255,255,0.2)" }}>
                    Item
                  </th>
                  <th style={{ textAlign: "center", width: "55px", padding: "6px 6px", borderRight: "1px solid rgba(255,255,255,0.2)" }}>
                    Qty
                  </th>
                  <th style={{ textAlign: "right", width: "85px", padding: "6px 8px", borderRight: "1px solid rgba(255,255,255,0.2)" }}>
                    Rate
                  </th>
                  <th style={{ textAlign: "right", width: "105px", padding: "6px 8px" }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {inv.items && inv.items.length > 0 ? (
                  inv.items.map((item, idx) => {
                    const price = Number(item.price || 0);
                    const qty = Number(item.quantity || 1);
                    const total = Number(item.total || price * qty);

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: "1px dotted #cbd5e1",
                        }}
                      >
                        <td style={{ padding: "6px 4px", textAlign: "left", color: "#475569", fontWeight: 500 }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "6px 8px", fontWeight: 700, color: "#0f172a" }}>
                          {item.productName}
                        </td>
                        <td style={{ padding: "6px 6px", textAlign: "center", color: "#0f172a", fontFamily: "monospace" }}>
                          {qty} {item.unit || "pcs"}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", color: "#334155" }}>
                          {formatMoney(price)}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#0f172a" }}>
                          {formatMoney(total)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
                      No items recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Solid #01306B Bottom Line under table */}
            <div
              style={{
                borderBottom: "2px solid #01306B",
                width: "100%",
                marginTop: "1px",
              }}
            />
          </div>

          {/* Bottom Section: Words & Notes (Left) + Totals Breakdown (Right) strictly side-by-side */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
              paddingTop: "12px",
              gap: "24px",
            }}
          >
            {/* Left Column: Words & Notes */}
            <div
              style={{
                flex: 1,
                maxWidth: "340px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* Words */}
              <div style={{ fontSize: "11px" }}>
                <div style={{ color: "#64748b", fontWeight: 600, marginBottom: "2px" }}>
                  In words:
                </div>
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "11px", lineHeight: "1.4" }}>
                  {wordsAmount}
                </div>
              </div>

              {/* Customer Note if present */}
              {inv.notes && (
                <div
                  style={{
                    fontSize: "10.5px",
                    color: "#475569",
                    backgroundColor: "#f8fafc",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <strong style={{ color: "#0f172a" }}>Note: </strong>
                  <span>{inv.notes}</span>
                </div>
              )}
            </div>

            {/* Right Column: Financial Breakdown */}
            <div
              style={{
                width: "260px",
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                fontSize: "11px",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "1px 0" }}>
                <span style={{ color: "#334155", fontWeight: 500 }}>Subtotal</span>
                <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "#0f172a" }}>
                  {formatMoney(inv.subtotal)}
                </span>
              </div>

              {Number(inv.discount ?? 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "1px 0", color: "#e11d48" }}>
                  <span style={{ fontWeight: 500 }}>Discount</span>
                  <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                    -{formatMoney(Number(inv.discount))}
                  </span>
                </div>
              )}

              {Number(inv.vat ?? 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "1px 0", color: "#334155" }}>
                  <span style={{ fontWeight: 500 }}>VAT</span>
                  <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "#0f172a" }}>
                    +{formatMoney(Number(inv.vat))}
                  </span>
                </div>
              )}

              {Number(inv.deliveryCharge ?? 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "1px 0", color: "#334155" }}>
                  <span style={{ fontWeight: 500 }}>Delivery</span>
                  <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "#0f172a" }}>
                    +{formatMoney(Number(inv.deliveryCharge))}
                  </span>
                </div>
              )}

              {/* Net Total with border */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  borderTop: "1.5px solid #01306B",
                  marginTop: "2px",
                  paddingTop: "3px",
                  fontWeight: "bold",
                }}
              >
                <span style={{ color: "#01306B", fontWeight: 900, textTransform: "uppercase" }}>
                  Net Total
                </span>
                <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "12px", color: "#0f172a" }}>
                  {formatMoney(inv.grandTotal)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "1px 0" }}>
                <span style={{ color: "#334155", fontWeight: 500 }}>Paid</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#0f172a" }}>
                  {formatMoney(paid)}
                </span>
              </div>

              {due > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "1px 0" }}>
                  <span style={{ color: "#334155", fontWeight: 500 }}>Today's Due</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#0f172a" }}>
                    {formatMoney(due)}
                  </span>
                </div>
              )}

              {previousDue > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "1px 0" }}>
                  <span style={{ color: "#334155", fontWeight: 500 }}>Previous Due</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#0f172a" }}>
                    {formatMoney(previousDue)}
                  </span>
                </div>
              )}

              {/* Total Due highlighted in Red Box, or Centered PAID Badge */}
              {totalDue > 0 ? (
                <div
                  style={{
                    border: "2px solid #b91c1c",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    marginTop: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <span style={{ color: "#b91c1c", fontWeight: 900, textTransform: "uppercase" }}>
                    Total Due
                  </span>
                  <span style={{ color: "#b91c1c", fontWeight: 900, fontFamily: "monospace", fontSize: "12px" }}>
                    {formatMoney(totalDue)}
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    border: "1.5px solid #059669",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    marginTop: "4px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    color: "#059669",
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                    fontWeight: 900,
                    letterSpacing: "1.5px",
                    fontSize: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  PAID
                </div>
              )}
            </div>
          </div>

          {/* Signatures Area strictly side-by-side */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              width: "100%",
              marginTop: "40px",
              paddingTop: "14px",
            }}
          >
            <div
              style={{
                width: "160px",
                borderTop: "1.5px solid #01306B",
                textAlign: "center",
                paddingTop: "4px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#334155",
              }}
            >
              {isPurchase ? "Seller Signature" : "Customer Signature"}
            </div>
            <div
              style={{
                width: "160px",
                borderTop: "1.5px solid #01306B",
                textAlign: "center",
                paddingTop: "4px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#334155",
              }}
            >
              Authorized Signature
            </div>
          </div>

          {/* Bottom Policy & Thank You Note */}
          <div
            style={{
              borderTop: "1.5px solid #01306B",
              width: "100%",
              marginTop: "16px",
              paddingTop: "6px",
              textAlign: "center",
              fontSize: "10.5px",
              color: "#475569",
            }}
          >
            Goods once sold are not returnable. Thank you, visit again!
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={{ backgroundColor: "#01306B" }}
            className="px-5 py-1.5 text-xs font-bold text-white hover:opacity-95 border border-transparent rounded transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <FaPrint className="text-xs" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TradeInvoiceModal;
