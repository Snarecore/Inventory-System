import React, { useRef, useEffect, useMemo } from "react";
import Modal from "@/components/modal/Modal";
import { FaPrint } from "react-icons/fa";
import { getUserInfo, getStoredUser } from "@/utils/auth-storage";
import { formatMoney } from "@/utils/formatters";
import { useBusinessProfileQuery } from "@/hooks/useBusinessProfile";
import { useInvoiceProfileSetupQuery } from "@/hooks/useInvoiceProfileSetup";
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
  previousDueInvoices?: TradeInvoiceDueItem[];
  totalDueWithCurrent?: number;

  notes?: string;
}

export interface TradeInvoiceDueItem {
  id?: string | number;
  invoiceNo: string;
  date?: string | null;
  payMode?: string;
  invoiceAmount: number;
  paidAmount: number;
  dueAmount: number;
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
  const { data: invoiceSetup } = useInvoiceProfileSetupQuery();
  const userInfo = getUserInfo();

  const showLogo = invoiceSetup?.showLogo ?? true;
  const showBusinessName = invoiceSetup?.showBusinessName ?? true;
  const showAddress = invoiceSetup?.showAddress ?? true;
  const showPhone1 = invoiceSetup?.showPhone1 ?? true;
  const showPhone2 = invoiceSetup?.showPhone2 ?? true;
  const showEmail = invoiceSetup?.showEmail ?? true;
  const showWebsite = invoiceSetup?.showWebsite ?? true;
  const showTradeLicense = invoiceSetup?.showTradeLicenseNo ?? true;
  const showTin = invoiceSetup?.showTinNo ?? true;
  const showBin = invoiceSetup?.showBinNo ?? true;
  const showFooterMessage = invoiceSetup?.showFooterMessage ?? true;

  const inv = invoice;
  const isPurchase = inv?.type === "PURCHASE" || inv?.type === "PURCHASE_RETURN";
  const isReturn = inv?.type === "SALES_RETURN" || inv?.type === "PURCHASE_RETURN";

  // Pure English document title
  const docTitle =
    inv?.type === "SALE"
      ? "Invoice"
      : inv?.type === "PURCHASE"
      ? "Material Receiving Report (MRR)"
      : inv?.type === "SALES_RETURN"
      ? "SALES RETURN MEMO"
      : "PURCHASE RETURN MEMO";

  const partyRoleLabel =
    inv?.type === "SALE"
      ? "Bill To"
      : inv?.type === "PURCHASE"
      ? "Supplier"
      : inv?.type === "SALES_RETURN"
      ? "Return From"
      : "Return To";

  const modalTitle = inv?.invoiceTitle || docTitle;

  const due = Number(inv?.dueAmount ?? 0);
  const grandTotal = Number(inv?.grandTotal ?? 0);
  const paid = Number(inv?.paidAmount ?? 0);
  const previousDue = Number(inv?.previousDue ?? 0);
  const totalDue = due + previousDue;

  const paymentStatus =
    due <= 0
      ? { label: isReturn ? "REFUNDED" : "PAID", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" }
      : paid > 0
      ? { label: "PARTIAL", color: "#b45309", bg: "#fffbeb", border: "#fde68a" }
      : { label: "UNPAID", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };

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
              height: 100%;
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
              min-height: 277mm;
              margin: 0 auto;
              background: #ffffff !important;
              padding: 0;
              display: flex;
              flex-direction: column;
            }
            #print-root > div {
              flex: 1;
              display: flex !important;
              flex-direction: column !important;
              min-height: 277mm !important;
              border: none !important;
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
          className="bg-white text-black font-sans border border-slate-300 rounded-sm shadow-xs"
          style={{
            backgroundColor: "#ffffff",
            color: "#000000",
            padding: "22px 26px",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "11px",
            lineHeight: "1.35",
            display: "flex",
            flexDirection: "column",
            minHeight: "540px",
          }}
        >
          {/* 1. Top Corporate Header: Logo (Left) + Business Name & Address */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              marginBottom: "8px",
            }}
          >
            {showLogo && businessProfile?.businessLogoUrl && (
              <img
                src={businessProfile.businessLogoUrl}
                alt="Logo"
                style={{
                  maxHeight: "54px",
                  maxWidth: "60px",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              {showBusinessName && (
                <h1
                  style={{
                    color: "#000",
                    fontSize: "19px",
                    fontWeight: 400,
                    letterSpacing: "-0.2px",
                    lineHeight: "1.15",
                    margin: 0,
                  }}
                >
                  {businessName}
                </h1>
              )}
              {showAddress && businessAddress && (
                <div style={{ fontSize: "10.5px", color: "#000", marginTop: "1.5px", lineHeight: "1.3" }}>
                  {businessAddress}
                </div>
              )}
              <div style={{ fontSize: "10px", color: "#000", marginTop: "1.5px", lineHeight: "1.35" }}>
                {(showPhone1 || showPhone2) && (phone1 || phone2) && (
                  <div>
                    Phone: {showPhone1 ? phone1 : ""}
                    {showPhone1 && showPhone2 && phone1 && phone2 ? ", " : ""}
                    {showPhone2 ? phone2 : ""}
                  </div>
                )}
                {((showEmail && businessEmail) || (showWebsite && businessProfile?.website)) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
                    {showEmail && businessEmail && <span>Email: {businessEmail}</span>}
                    {showWebsite && businessProfile?.website && <span>Web: {businessProfile.website}</span>}
                  </div>
                )}
                {((showTradeLicense && businessProfile?.tradeLicenseNo) ||
                  (showTin && businessProfile?.tinNo) ||
                  (showBin && businessProfile?.binNo)) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0 10px", fontSize: "9.5px" }}>
                    {showTradeLicense && businessProfile?.tradeLicenseNo && (
                      <span>TRAD: {businessProfile.tradeLicenseNo}</span>
                    )}
                    {showTin && businessProfile?.tinNo && <span>TIN: {businessProfile.tinNo}</span>}
                    {showBin && businessProfile?.binNo && <span>BIN: {businessProfile.binNo}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Centered Underlined Document Title */}
          <div style={{ textAlign: "center", margin: "6px 0 10px 0" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#0f172a",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                letterSpacing: "0.4px",
              }}
            >
              {docTitle}
            </span>
          </div>

          {/* 3. Two Side-by-Side Bordered Info Boxes (Party Info Left + Invoice Meta Right) */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "stretch",
              gap: "8px",
              width: "100%",
              marginBottom: "9px",
            }}
          >
            {/* Left Box: Customer / Supplier Info */}
            <div
              style={{
                flex: 1.15,
                border: "1px solid #475569",
                padding: "4px 10px",
                fontSize: "10.5px",
                lineHeight: "1.25",
                color: "#000",
                fontWeight: 400,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "96px", fontWeight: 400, padding: "1px 0", verticalAlign: "top", color: "#000" }}>
                      {isPurchase ? "Supplier Name" : "Customer Name"}
                    </td>
                    <td style={{ width: "10px", padding: "1px 0", verticalAlign: "top" }}>:</td>
                    <td style={{ fontWeight: 400, padding: "1px 0", color: "#000" }}>
                      {inv.partyName || "Walk-in Customer"}
                    </td>
                  </tr>
                  {inv.partyAddress && (
                    <tr>
                      <td style={{ fontWeight: 400, padding: "1px 0", verticalAlign: "top", color: "#000" }}>Address</td>
                      <td style={{ padding: "1px 0", verticalAlign: "top" }}>:</td>
                      <td style={{ padding: "1px 0", color: "#000" }}>{inv.partyAddress}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ fontWeight: 400, padding: "1px 0", verticalAlign: "top", color: "#000" }}>Phone No.</td>
                    <td style={{ padding: "1px 0", verticalAlign: "top" }}>:</td>
                    <td style={{ padding: "1px 0", fontFamily: "monospace", color: "#000" }}>
                      {inv.partyPhone || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 400, padding: "1px 0", verticalAlign: "top", color: "#000" }}>Party Type</td>
                    <td style={{ padding: "1px 0", verticalAlign: "top" }}>:</td>
                    <td style={{ padding: "1px 0", color: "#000" }}>{partyRoleLabel}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Box: Invoice / Pay Mode Info */}
            <div
              style={{
                flex: 1,
                border: "1px solid #475569",
                padding: "4px 10px",
                fontSize: "10.5px",
                lineHeight: "1.25",
                color: "#000",
                fontWeight: 400,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "84px", fontWeight: 400, padding: "1px 0", color: "#000" }}>Pay Mode</td>
                    <td style={{ width: "10px", padding: "1px 0" }}>:</td>
                    <td style={{ padding: "1px 0", color: "#000", fontWeight: 400 }}>
                      {(() => {
                        const raw = String(inv.paymentMethod || "").trim().toUpperCase();
                        if (raw.includes("MULTI")) return "MULTI";
                        if (raw) return raw;
                        return due > 0 ? "CREDIT" : isReturn ? "REFUND" : "CASH";
                      })()}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 400, padding: "1px 0", color: "#000" }}>Invoice No</td>
                    <td style={{ padding: "1px 0" }}>:</td>
                    <td style={{ fontWeight: 400, fontFamily: "monospace", padding: "1px 0", color: "#000" }}>
                      {inv.invoiceNo}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 400, padding: "1px 0", color: "#000" }}>Invoice Date</td>
                    <td style={{ padding: "1px 0" }}>:</td>
                    <td style={{ padding: "1px 0", fontFamily: "monospace", color: "#000" }}>
                      {inv.date ? moment(inv.date).format("DD-MMM-YYYY").toUpperCase() : moment().format("DD-MMM-YYYY").toUpperCase()}
                    </td>
                  </tr>
                  {isReturn && (
                    <tr>
                      <td style={{ fontWeight: 500, padding: "1.5px 0", color: "#475569" }}>Status</td>
                      <td style={{ padding: "1.5px 0" }}>:</td>
                      <td style={{ padding: "1.5px 0" }}>
                        <span
                          style={{
                            display: "inline-block",
                            fontWeight: 700,
                            fontSize: "9px",
                            letterSpacing: "0.5px",
                            color: paymentStatus.color,
                            backgroundColor: paymentStatus.bg,
                            border: `1px solid ${paymentStatus.border}`,
                            borderRadius: "4px",
                            padding: "1px 7px",
                            lineHeight: "1.25",
                          }}
                        >
                          {paymentStatus.label}
                        </span>
                      </td>
                    </tr>
                  )}
                  {inv.challanNo && (
                    <tr>
                      <td style={{ fontWeight: 500, padding: "1px 0", color: "#475569" }}>Challan No</td>
                      <td style={{ padding: "1px 0" }}>:</td>
                      <td style={{ padding: "1px 0", fontFamily: "monospace", color: "#0f172a" }}>{inv.challanNo}</td>
                    </tr>
                  )}
                  {inv.vehicleNo && (
                    <tr>
                      <td style={{ fontWeight: 500, padding: "1px 0", color: "#475569" }}>Vehicle / By</td>
                      <td style={{ padding: "1px 0" }}>:</td>
                      <td style={{ padding: "1px 0", color: "#0f172a" }}>
                        {inv.vehicleNo}
                        {inv.driverName ? ` (${inv.driverName})` : ""}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Full-Grid Bordered Items Table with Total Footer Row */}
          <div style={{ width: "100%", marginBottom: "8px" }}>
            <table
              className="invoice-print-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10.5px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", color: "#000", fontWeight: 400 }}>
                <th style={{ border: "1px solid #64748b", padding: "5px 6px", textAlign: "center", width: "42px", fontWeight: 400, whiteSpace: "nowrap" }}>
                    SL No
                  </th>
                  <th style={{ border: "1px solid #64748b", padding: "5px 6px", textAlign: "center", width: "68px", fontWeight: 400 }}>
                    Code
                  </th>
                  <th style={{ border: "1px solid #64748b", padding: "5px 8px", textAlign: "left", fontWeight: 400 }}>
                    Product Name
                  </th>
                  <th style={{ border: "1px solid #64748b", padding: "5px 6px", textAlign: "center", width: "48px", fontWeight: 400 }}>
                    Qty
                  </th>
                  <th style={{ border: "1px solid #64748b", padding: "5px 6px", textAlign: "center", width: "52px", fontWeight: 400 }}>
                    Unit
                  </th>
                  <th style={{ border: "1px solid #64748b", padding: "5px 6px", textAlign: "right", width: "70px", fontWeight: 400, whiteSpace: "nowrap" }}>
                    Unit Price
                  </th>
                  <th style={{ border: "1px solid #64748b", padding: "5px 6px", textAlign: "right", width: "58px", fontWeight: 400 }}>
                    Discount
                  </th>
                  <th style={{ border: "1px solid #64748b", padding: "5px 6px", textAlign: "right", width: "54px", fontWeight: 400 }}>
                    VAT
                  </th>
                  <th style={{ border: "1px solid #64748b", padding: "5px 8px", textAlign: "right", width: "82px", fontWeight: 400, whiteSpace: "nowrap" }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {inv.items && inv.items.length > 0 ? (
                  inv.items.map((item, idx) => {
                    const price = Number(item.price || 0);
                    const qty = Number(item.quantity || 1);
                    const itemDisc = Number(item.discount || 0);
                    const itemVat = Number(item.vat || 0);
                    const total = Number(item.total || price * qty);

                    return (
                      <tr key={idx}>
                        <td style={{ border: "1px solid #64748b", padding: "4px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                          {idx + 1}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center", fontFamily: "monospace", fontSize: "10px" }}>
                          {item.productCode || "-"}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 8px", textAlign: "left" }}>
                          <div style={{ fontWeight: 400 }}>{item.productName}</div>
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                          {qty}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center" }}>
                          {item.unit || "Pcs"}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                          {formatMoney(price)}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                          {formatMoney(itemDisc)}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                          {formatMoney(itemVat)}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                          {formatMoney(total)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        border: "1px solid #64748b",
                        padding: "12px 8px",
                        textAlign: "center",
                        color: "#475569",
                      }}
                    >
                      No items recorded
                    </td>
                  </tr>
                )}

                {/* Table Total Row (matching reference style) */}
                <tr style={{ fontWeight: 500, backgroundColor: "#ffffff" }}>
                  <td
                    colSpan={3}
                    style={{
                      border: "1px solid #64748b",
                      padding: "5px 10px",
                      textAlign: "right",
                    }}
                  >
                    Total:
                  </td>
                  <td
                    style={{
                      border: "1px solid #64748b",
                      padding: "5px 6px",
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {inv.items?.reduce((acc, it) => acc + Number(it.quantity || 0), 0) || 0}
                  </td>
                  <td style={{ border: "1px solid #64748b", padding: "5px 6px" }} />
                  <td style={{ border: "1px solid #64748b", padding: "5px 6px" }} />
                  <td
                    style={{
                      border: "1px solid #64748b",
                      padding: "5px 6px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatMoney(inv.items?.reduce((acc, it) => acc + Number(it.discount || 0), 0) || 0)}
                  </td>
                  <td
                    style={{
                      border: "1px solid #64748b",
                      padding: "5px 6px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatMoney(inv.items?.reduce((acc, it) => acc + Number(it.vat || 0), 0) || 0)}
                  </td>
                  <td
                    style={{
                      border: "1px solid #64748b",
                      padding: "5px 8px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatMoney(inv.subtotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. In Word (Left) + Net Payable Breakdown (Right) */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              width: "100%",
              marginBottom: "10px",
            }}
          >
            {/* Left: In Word + Payment Channels + Notes */}
            <div style={{ flex: 1, fontSize: "10.5px" }}>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ fontWeight: 600 }}>In Word : </span>
                <span style={{ fontWeight: 500 }}>{wordsAmount}</span>
              </div>

              {(Number(inv.cashAmount || 0) > 0 ||
                Number(inv.bankAmount || 0) > 0 ||
                Number(inv.mfsAmount || 0) > 0) && (
                <div style={{ fontSize: "10px", color: "#000", marginBottom: "5px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {Number(inv.cashAmount || 0) > 0 && (
                    <div>Cash: {formatMoney(Number(inv.cashAmount))}</div>
                  )}
                  {Number(inv.bankAmount || 0) > 0 && (
                    <div>Bank{inv.accountNo ? ` (${inv.accountNo})` : ""}: {formatMoney(Number(inv.bankAmount))}</div>
                  )}
                  {Number(inv.mfsAmount || 0) > 0 && (
                    <div>MFS{inv.mfsPhone ? ` (${inv.mfsPhone})` : ""}: {formatMoney(Number(inv.mfsAmount))}</div>
                  )}
                </div>
              )}

              {inv.notes && (
                <div
                  style={{
                    fontSize: "10px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f8fafc",
                    padding: "5px 8px",
                    marginTop: "4px",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Note: </span>
                  <span>{inv.notes}</span>
                </div>
              )}
            </div>

            {/* Right: Aligned Totals Breakdown */}
            <div style={{ width: "290px", flexShrink: 0, fontSize: "10.5px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ textAlign: "right", padding: "1.5px 8px 1.5px 0", color: "#334155" }}>Net Amount</td>
                    <td style={{ width: "10px", textAlign: "center" }}>:</td>
                    <td style={{ textAlign: "right", fontFamily: "monospace", width: "92px", fontVariantNumeric: "tabular-nums" }}>
                      {formatMoney(inv.subtotal)}
                    </td>
                  </tr>
                  {Number(inv.discount ?? 0) > 0 && (
                    <tr>
                      <td style={{ textAlign: "right", padding: "1.5px 8px 1.5px 0", color: "#334155" }}>Discount</td>
                      <td style={{ textAlign: "center" }}>:</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                        -{formatMoney(Number(inv.discount))}
                      </td>
                    </tr>
                  )}
                  {Number(inv.vat ?? 0) > 0 && (
                    <tr>
                      <td style={{ textAlign: "right", padding: "1.5px 8px 1.5px 0", color: "#334155" }}>VAT</td>
                      <td style={{ textAlign: "center" }}>:</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                        +{formatMoney(Number(inv.vat))}
                      </td>
                    </tr>
                  )}
                  {Number(inv.deliveryCharge ?? 0) > 0 && (
                    <tr>
                      <td style={{ textAlign: "right", padding: "1.5px 8px 1.5px 0", color: "#334155" }}>Delivery Charge</td>
                      <td style={{ textAlign: "center" }}>:</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                        +{formatMoney(Number(inv.deliveryCharge))}
                      </td>
                    </tr>
                  )}
                  <tr style={{ fontWeight: 600, fontSize: "11px" }}>
                    <td style={{ textAlign: "right", padding: "3px 8px 2px 0", whiteSpace: "nowrap" }}>
                      Net Payable Amount [Tk.]
                    </td>
                    <td style={{ textAlign: "center" }}>:</td>
                    <td style={{ textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                      {formatMoney(inv.grandTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: "right", padding: "1.5px 8px 1.5px 0", color: "#334155" }}>
                      {isReturn ? "Refunded Amount" : "Paid Amount"}
                    </td>
                    <td style={{ textAlign: "center" }}>:</td>
                    <td style={{ textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                      {formatMoney(paid)}
                    </td>
                  </tr>
                  {due > 0 && (
                    <tr style={{ color: "#b91c1c", fontWeight: 500 }}>
                      <td style={{ textAlign: "right", padding: "1.5px 8px 1.5px 0" }}>
                        Outstanding
                      </td>
                      <td style={{ textAlign: "center" }}>:</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                        {formatMoney(due)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Outstanding Details Table (Only shown when there are previous outstanding invoices) */}
          {((inv.previousDueInvoices && inv.previousDueInvoices.length > 0) || previousDue > 0) && (
            <div style={{ marginTop: "8px", marginBottom: "10px" }}>
              <div style={{ fontSize: "10.5px", fontWeight: 500, marginBottom: "4px", color: "#0f172a" }}>
                <span style={{ textDecoration: "underline" }}>Outstanding Details</span> :
              </div>
              <table
                className="invoice-print-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "10px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", fontWeight: 500, color: "#1e293b" }}>
                    <th style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center", width: "36px", fontWeight: 500 }}>
                      SN
                    </th>
                    <th style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "left", fontWeight: 500 }}>
                      Invoice No
                    </th>
                    <th style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center", fontWeight: 500 }}>
                      Invoice Date
                    </th>
                    <th style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center", fontWeight: 500 }}>
                      Pay Mode
                    </th>
                    <th style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right", fontWeight: 500 }}>
                      Invoice Amt
                    </th>
                    <th style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right", fontWeight: 500 }}>
                      Paid Amount
                    </th>
                    <th style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right", fontWeight: 500 }}>
                      Outstanding
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inv.previousDueInvoices && inv.previousDueInvoices.length > 0 ? (
                    inv.previousDueInvoices.map((dInv, idx) => (
                      <tr key={dInv.id ?? dInv.invoiceNo ?? idx}>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                          {idx + 1}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", fontFamily: "monospace" }}>
                          {dInv.invoiceNo}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center", fontFamily: "monospace" }}>
                          {dInv.date ? moment(dInv.date).format("DD-MMM-YY").toUpperCase() : "-"}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center" }}>
                          {dInv.payMode || "Credit"}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                          {formatMoney(Number(dInv.invoiceAmount || 0))}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                          {formatMoney(Number(dInv.paidAmount || 0))}
                        </td>
                        <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                          {formatMoney(Number(dInv.dueAmount || 0))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center" }}>1</td>
                      <td style={{ border: "1px solid #64748b", padding: "4px 6px" }}>Previous Balance</td>
                      <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center" }}>-</td>
                      <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "center" }}>Credit</td>
                      <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right" }}>-</td>
                      <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right" }}>-</td>
                      <td style={{ border: "1px solid #64748b", padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                        {formatMoney(previousDue)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div
                style={{
                  textAlign: "right",
                  marginTop: "5px",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Total Outstanding Amount :{" "}
                <span style={{ fontFamily: "monospace" }}>
                  {formatMoney(
                    inv.previousDueInvoices && inv.previousDueInvoices.length > 0
                      ? inv.previousDueInvoices.reduce((s, d) => s + Number(d.dueAmount || 0), 0)
                      : previousDue
                  )}
                </span>
              </div>
            </div>
          )}

          {/* 7 & 8. Bottom Signatures + Footer anchored to bottom of page */}
          <div style={{ marginTop: "auto", paddingTop: "32px", width: "100%" }}>
            {/* Signatures Area */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
                width: "100%",
                paddingTop: "8px",
              }}
            >
              <div
                style={{
                  width: "170px",
                  borderTop: "1px solid #475569",
                  textAlign: "center",
                  paddingTop: "4px",
                  fontSize: "10.5px",
                  fontWeight: 500,
                  color: "#334155",
                }}
              >
                {isPurchase ? "Supplier Signature" : "Customer Signature"}
              </div>
              <div
                style={{
                  width: "170px",
                  borderTop: "1px solid #475569",
                  textAlign: "center",
                  paddingTop: "4px",
                  fontSize: "10.5px",
                  fontWeight: 500,
                  color: "#334155",
                }}
              >
                Authorized Signature
              </div>
            </div>

            {/* Footer Policy Note */}
            {showFooterMessage && (
              <div
                style={{
                  borderTop: "1px solid #cbd5e1",
                  width: "100%",
                  marginTop: "14px",
                  paddingTop: "6px",
                  textAlign: "center",
                  fontSize: "9.5px",
                  color: "#475569",
                }}
              >
                {businessProfile?.description || "Goods once sold are not returnable. Thank you, visit again!"}
              </div>
            )}
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
