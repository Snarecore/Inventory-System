import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import moment from "moment";
import {
  numberToWords,
  type TradeInvoiceData,
} from "@/components/invoice/TradeInvoiceModal";
import { formatMoney } from "@/utils/formatters";
import { getUserInfo, getStoredUser } from "@/utils/auth-storage";
import { fetchLogoBase64 } from "@/utils/excel-export";
import {
  ensureBengaliFontLoaded,
  drawPdfTextSmart,
  renderBengaliLinesToCanvas,
} from "@/utils/trade-report-helpers";
import { openPdfPreview } from "@/services/pdf-preview-service";
import type { CollectionReceiptData } from "@/pages/admin/trade/customer-collection/components/CollectionReceiptModal";
import type { PaymentReceiptData } from "@/types/payment.types";

interface LogoDimensions {
  dataUri: string;
  format: "PNG" | "JPEG";
  widthMm: number;
  heightMm: number;
}

async function getInvoiceLogo(url?: string): Promise<LogoDimensions | null> {
  const logo = await fetchLogoBase64(url);
  if (!logo) return null;

  const format = logo.extension === "jpeg" ? "JPEG" : "PNG";
  const mime = logo.extension === "jpeg" ? "image/jpeg" : "image/png";
  const dataUri = `data:${mime};base64,${logo.base64}`;

  const dims = await new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ w: img.naturalWidth || 100, h: img.naturalHeight || 100 });
    img.onerror = () => resolve({ w: 100, h: 100 });
    img.src = dataUri;
  });

  const maxH = 14;
  const maxW = 16;
  const aspect = dims.w / Math.max(dims.h, 1);
  let widthMm = maxH * aspect;
  let heightMm = maxH;
  if (widthMm > maxW) {
    widthMm = maxW;
    heightMm = maxW / aspect;
  }

  return { dataUri, format, widthMm, heightMm };
}

function attachBengaliAutoTableHooks(tableFontSize: number) {
  return {
    didParseCell: (hookData: any) => {
      const cellText = Array.isArray(hookData.cell.text)
        ? hookData.cell.text
        : [String(hookData.cell.text || "")];
      const rawContent =
        typeof hookData.cell.raw === "object" && hookData.cell.raw !== null
          ? String((hookData.cell.raw as any).content ?? "")
          : String(hookData.cell.raw ?? "");

      const hasBengali =
        cellText.some((t: string) => /[\u0980-\u09FF]/.test(t)) ||
        /[\u0980-\u09FF]/.test(rawContent);

      if (hasBengali) {
        (hookData.cell as any)._bengaliLines =
          cellText.length > 0 && cellText.some((t: string) => t.trim().length > 0)
            ? [...cellText]
            : [rawContent];
      }
    },
    willDrawCell: (hookData: any) => {
      const cell = hookData.cell as any;
      if (cell._bengaliLines && cell._bengaliLines.length > 0) {
        const padL = cell.padding("left");
        const padR = cell.padding("right");
        const availW = Math.max(0, cell.width - padL - padR);

        const rendered = renderBengaliLinesToCanvas(cell._bengaliLines, {
          fontSize: cell.styles.fontSize || tableFontSize,
          fontStyle: cell.styles.fontStyle === "bold" ? "bold" : "normal",
          textColor: cell.styles.textColor,
          halign: cell.styles.halign,
          maxAllowedWidthMm: availW,
        });

        cell._bengaliImage = rendered;
        cell.text = [];
      }
    },
    didDrawCell: (hookData: any) => {
      const cell = hookData.cell as any;
      if (cell._bengaliImage) {
        const { dataUrl, widthMm, heightMm, padXMm, padYMm } = cell._bengaliImage;
        const padL = cell.padding("left");
        const padR = cell.padding("right");
        const padT = cell.padding("top");
        const padB = cell.padding("bottom");
        const padXOffset = padXMm || 0;

        let drawX = cell.x + padL - padXOffset;
        if (cell.styles.halign === "center") {
          drawX = cell.x + (cell.width - widthMm) / 2;
        } else if (cell.styles.halign === "right") {
          drawX = cell.x + cell.width - padR - widthMm + padXOffset;
        }

        let drawY = cell.y + (cell.height - heightMm) / 2;
        if (cell.styles.valign === "top") {
          drawY = cell.y + padT - (padYMm || 0);
        } else if (cell.styles.valign === "bottom") {
          drawY = cell.y + cell.height - padB - heightMm + (padYMm || 0);
        }

        try {
          hookData.doc.addImage(dataUrl, "PNG", drawX, drawY, widthMm, heightMm);
        } catch (err) {
          console.warn("Could not draw Bengali cell image:", err);
        }
      }
    },
  };
}

export async function buildTradeInvoicePdfDoc(params: {
  invoice: TradeInvoiceData;
  businessProfile?: any;
  invoiceSetup?: any;
}): Promise<{ doc: jsPDF; fileName: string }> {
  const { invoice: inv, businessProfile, invoiceSetup } = params;
  await ensureBengaliFontLoaded();

  const userInfo = getUserInfo();
  const user = getStoredUser();

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

  const isPurchase = inv.type === "PURCHASE" || inv.type === "PURCHASE_RETURN";
  const isReturn = inv.type === "SALES_RETURN" || inv.type === "PURCHASE_RETURN";

  const docTitle =
    inv.type === "SALE"
      ? "Invoice"
      : inv.type === "PURCHASE"
      ? "Material Receiving Report (MRR)"
      : inv.type === "SALES_RETURN"
      ? "SALES RETURN MEMO"
      : "PURCHASE RETURN MEMO";

  const partyRoleLabel =
    inv.type === "SALE"
      ? "Bill To"
      : inv.type === "PURCHASE"
      ? "Supplier"
      : inv.type === "SALES_RETURN"
      ? "Return From"
      : "Return To";

  const due = Number(inv.dueAmount ?? 0);
  const grandTotal = Number(inv.grandTotal ?? 0);
  const paid = Number(inv.paidAmount ?? 0);
  const currentInvNoKey = String(inv.invoiceNo ?? "").trim().toLowerCase();

  const filteredPreviousDueInvoices = Array.isArray(inv.previousDueInvoices)
    ? inv.previousDueInvoices.filter((dInv) => {
        if (!dInv || Number(dInv.dueAmount ?? 0) <= 0) return false;
        const dNo = String(dInv.invoiceNo ?? "").trim().toLowerCase();
        if (currentInvNoKey && dNo && dNo === currentInvNoKey) return false;
        return true;
      })
    : [];

  const previousDue = Array.isArray(inv.previousDueInvoices)
    ? filteredPreviousDueInvoices.reduce((s, d) => s + Number(d.dueAmount || 0), 0)
    : Number(inv.previousDue ?? 0);

  const paymentStatus =
    due <= 0
      ? { label: isReturn ? "REFUNDED" : "COMPLETED", color: [4, 120, 87] as [number, number, number] }
      : paid > 0
      ? { label: "PARTIAL", color: [180, 83, 9] as [number, number, number] }
      : { label: "PENDING", color: [185, 28, 28] as [number, number, number] };

  const businessName =
    businessProfile?.businessName || userInfo?.businessName || "Shaha Enterprise";
  const businessAddress = businessProfile?.address || "";
  const phone1 =
    businessProfile?.businessPhone1 || userInfo?.phone || userInfo?.phoneNumber || "";
  const phone2 = businessProfile?.businessPhone2 || "";
  const businessEmail = businessProfile?.businessEmail || user?.email || "";

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2; // 190mm

  let cursorY = 12;

  // 1. Top Corporate Header: Logo (Left) + Business Name & Details
  const logo = showLogo ? await getInvoiceLogo(businessProfile?.businessLogoUrl) : null;
  let textStartX = marginX;
  const headerStartY = cursorY;

  if (logo) {
    try {
      doc.addImage(logo.dataUri, logo.format, marginX, headerStartY, logo.widthMm, logo.heightMm);
      textStartX = marginX + logo.widthMm + 3;
    } catch {
      // ignore logo draw error
    }
  }

  let infoY = headerStartY + 4;
  if (showBusinessName) {
    drawPdfTextSmart(doc, businessName, textStartX, infoY, {
      fontSize: 15,
      fontStyle: "normal",
      textColor: [0, 0, 0],
      maxAllowedWidthMm: pageWidth - marginX - textStartX,
    });
    infoY += 4.5;
  }

  if (showAddress && businessAddress) {
    drawPdfTextSmart(doc, businessAddress, textStartX, infoY, {
      fontSize: 8.5,
      fontStyle: "normal",
      textColor: [0, 0, 0],
      maxAllowedWidthMm: pageWidth - marginX - textStartX,
    });
    infoY += 3.8;
  }

  if ((showPhone1 || showPhone2) && (phone1 || phone2)) {
    const phoneStr = `Phone: ${showPhone1 ? phone1 : ""}${
      showPhone1 && showPhone2 && phone1 && phone2 ? ", " : ""
    }${showPhone2 ? phone2 : ""}`;
    drawPdfTextSmart(doc, phoneStr, textStartX, infoY, {
      fontSize: 8,
      fontStyle: "normal",
      textColor: [0, 0, 0],
    });
    infoY += 3.6;
  }

  const emailWebParts: string[] = [];
  if (showEmail && businessEmail) emailWebParts.push(`Email: ${businessEmail}`);
  if (showWebsite && businessProfile?.website) emailWebParts.push(`Web: ${businessProfile.website}`);
  if (emailWebParts.length > 0) {
    drawPdfTextSmart(doc, emailWebParts.join("   "), textStartX, infoY, {
      fontSize: 8,
      fontStyle: "normal",
      textColor: [0, 0, 0],
    });
    infoY += 3.6;
  }

  const regParts: string[] = [];
  if (showTradeLicense && businessProfile?.tradeLicenseNo) {
    regParts.push(`TRAD: ${businessProfile.tradeLicenseNo}`);
  }
  if (showTin && businessProfile?.tinNo) regParts.push(`TIN: ${businessProfile.tinNo}`);
  if (showBin && businessProfile?.binNo) regParts.push(`BIN: ${businessProfile.binNo}`);
  if (regParts.length > 0) {
    drawPdfTextSmart(doc, regParts.join("   "), textStartX, infoY, {
      fontSize: 7.5,
      fontStyle: "normal",
      textColor: [0, 0, 0],
    });
    infoY += 3.5;
  }

  cursorY = Math.max(infoY + 1, logo ? headerStartY + logo.heightMm + 3 : infoY + 1);

  // 2. Centered Underlined Document Title
  cursorY += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, pageWidth / 2, cursorY, { align: "center" });
  const titleWidth = doc.getTextWidth(docTitle);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(
    pageWidth / 2 - titleWidth / 2,
    cursorY + 0.8,
    pageWidth / 2 + titleWidth / 2,
    cursorY + 0.8
  );
  cursorY += 4.5;

  // 3. Two Side-by-Side Bordered Info Boxes
  const boxGap = 3;
  const leftBoxW = (contentWidth - boxGap) * 0.535;
  const rightBoxW = contentWidth - boxGap - leftBoxW;
  const rightBoxX = marginX + leftBoxW + boxGap;

  const leftRows: Array<{ label: string; value: string }> = [
    {
      label: isPurchase ? "Supplier Name" : "Customer Name",
      value: inv.partyName || "Walk-in Customer",
    },
  ];
  if (inv.partyAddress) {
    leftRows.push({ label: "Address", value: inv.partyAddress });
  }
  leftRows.push({ label: "Phone No.", value: inv.partyPhone || "N/A" });
  leftRows.push({ label: "Party Type", value: partyRoleLabel });

  const payModeStr = (() => {
    const raw = String(inv.paymentMethod || "").trim().toUpperCase();
    if (raw.includes("MULTI")) return "MULTI";
    if (raw) return raw;
    return due > 0 ? "CREDIT" : isReturn ? "REFUND" : "CASH";
  })();

  const invoiceDateStr = inv.date
    ? moment(inv.date).format("DD-MMM-YYYY").toUpperCase()
    : moment().format("DD-MMM-YYYY").toUpperCase();

  const rightRows: Array<{ label: string; value: string; color?: [number, number, number] }> = [
    { label: "Pay Mode", value: payModeStr },
    { label: "Invoice No", value: inv.invoiceNo },
    { label: "Invoice Date", value: invoiceDateStr },
  ];
  if (isReturn) {
    rightRows.push({ label: "Status", value: paymentStatus.label, color: paymentStatus.color });
  }
  if (inv.challanNo) {
    rightRows.push({ label: "Challan No", value: inv.challanNo });
  }
  if (inv.vehicleNo) {
    rightRows.push({
      label: "Vehicle / By",
      value: `${inv.vehicleNo}${inv.driverName ? ` (${inv.driverName})` : ""}`,
    });
  }

  const rowLineH = 4.2;
  const boxPadY = 2.5;
  const boxHeight = Math.max(leftRows.length, rightRows.length) * rowLineH + boxPadY * 2;

  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.25);
  doc.rect(marginX, cursorY, leftBoxW, boxHeight);
  doc.rect(rightBoxX, cursorY, rightBoxW, boxHeight);

  // Render Left Box Rows
  leftRows.forEach((row, idx) => {
    const y = cursorY + boxPadY + 3 + idx * rowLineH;
    drawPdfTextSmart(doc, row.label, marginX + 2.5, y, {
      fontSize: 8.5,
      textColor: [0, 0, 0],
    });
    drawPdfTextSmart(doc, ":", marginX + 26, y, {
      fontSize: 8.5,
      textColor: [0, 0, 0],
    });
    drawPdfTextSmart(doc, row.value, marginX + 28.5, y, {
      fontSize: 8.5,
      textColor: [0, 0, 0],
      maxAllowedWidthMm: leftBoxW - 30.5,
    });
  });

  // Render Right Box Rows
  rightRows.forEach((row, idx) => {
    const y = cursorY + boxPadY + 3 + idx * rowLineH;
    drawPdfTextSmart(doc, row.label, rightBoxX + 2.5, y, {
      fontSize: 8.5,
      textColor: [0, 0, 0],
    });
    drawPdfTextSmart(doc, ":", rightBoxX + 24, y, {
      fontSize: 8.5,
      textColor: [0, 0, 0],
    });
    drawPdfTextSmart(doc, row.value, rightBoxX + 26.5, y, {
      fontSize: 8.5,
      fontStyle: row.color ? "bold" : "normal",
      textColor: row.color || [0, 0, 0],
      maxAllowedWidthMm: rightBoxW - 28.5,
    });
  });

  cursorY += boxHeight + 3.5;

  // 4. Full-Grid Bordered Items Table with Total Footer Row
  const items = inv.items || [];
  const itemBodyRows: RowInput[] =
    items.length > 0
      ? items.map((item, idx) => {
          const price = Number(item.price || 0);
          const qty = Number(item.quantity || 1);
          const itemDisc = Number(item.discount || 0);
          const itemVat = Number(item.vat || 0);
          const total = Number(item.total || price * qty);
          return [
            String(idx + 1),
            item.productCode || "-",
            item.productName || "",
            String(qty),
            item.unit || "Pcs",
            formatMoney(price),
            formatMoney(itemDisc),
            formatMoney(itemVat),
            formatMoney(total),
          ];
        })
      : [
          [
            {
              content: "No items recorded",
              colSpan: 9,
              styles: { halign: "center", textColor: [71, 85, 105], cellPadding: 4 },
            },
          ],
        ];

  const totalQty = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  const totalItemDisc = items.reduce((acc, it) => acc + Number(it.discount || 0), 0);
  const totalItemVat = items.reduce((acc, it) => acc + Number(it.vat || 0), 0);

  itemBodyRows.push([
    {
      content: "Total:",
      colSpan: 3,
      styles: { halign: "right", fontStyle: "bold" },
    },
    {
      content: String(totalQty),
      styles: { halign: "center", fontStyle: "bold" },
    },
    "",
    "",
    {
      content: formatMoney(totalItemDisc),
      styles: { halign: "right", fontStyle: "bold" },
    },
    {
      content: formatMoney(totalItemVat),
      styles: { halign: "right", fontStyle: "bold" },
    },
    {
      content: formatMoney(inv.subtotal),
      styles: { halign: "right", fontStyle: "bold" },
    },
  ]);

  const itemsTableHooks = attachBengaliAutoTableHooks(8.5);

  autoTable(doc, {
    head: [
      [
        "SL",
        "Code",
        "Product Name",
        "Qty",
        "Unit",
        "Unit Price",
        "Discount",
        "VAT",
        "Amount",
      ],
    ],
    body: itemBodyRows,
    startY: cursorY,
    margin: { top: 10, right: marginX, bottom: 14, left: marginX },
    theme: "grid",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [0, 0, 0],
      fontStyle: "normal",
      fontSize: 8.5,
      valign: "middle",
      lineWidth: 0.25,
      lineColor: [100, 116, 139],
      cellPadding: { top: 1.8, right: 1.6, bottom: 1.8, left: 1.6 },
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [0, 0, 0],
      valign: "middle",
      lineWidth: 0.25,
      lineColor: [100, 116, 139],
      cellPadding: { top: 1.5, right: 1.6, bottom: 1.5, left: 1.6 },
    },
    columnStyles: {
      0: { cellWidth: 11, halign: "center" },
      1: { cellWidth: 17, halign: "center" },
      2: { cellWidth: 61, halign: "left" },
      3: { cellWidth: 13, halign: "center" },
      4: { cellWidth: 14, halign: "center" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 16, halign: "right" },
      7: { cellWidth: 15, halign: "right" },
      8: { cellWidth: 23, halign: "right" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "head") {
        const alignMap: Record<number, "left" | "center" | "right"> = {
          0: "center",
          1: "center",
          2: "left",
          3: "center",
          4: "center",
          5: "right",
          6: "right",
          7: "right",
          8: "right",
        };
        hookData.cell.styles.halign = alignMap[hookData.column.index] || "left";
      }
      itemsTableHooks.didParseCell(hookData);
    },
    willDrawCell: itemsTableHooks.willDrawCell,
    didDrawCell: itemsTableHooks.didDrawCell,
  });

  cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY + 20) + 4;

  // Ensure enough space for Totals section; if near bottom, add page
  if (cursorY > pageHeight - 55) {
    doc.addPage();
    cursorY = 14;
  }

  // 5. In Word (Left) + Net Payable Breakdown (Right)
  const wordsAmount = numberToWords(grandTotal);
  const leftSummaryMaxW = 108;
  let leftY = cursorY + 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  const inWordPrefix = "In Word : ";
  doc.text(inWordPrefix, marginX, leftY);
  const prefixW = doc.getTextWidth(inWordPrefix);
  doc.setFont("helvetica", "normal");
  const wordLines = doc.splitTextToSize(wordsAmount, leftSummaryMaxW - prefixW);
  doc.text(wordLines, marginX + prefixW, leftY);
  leftY += wordLines.length * 3.8 + 1.5;

  const cashAmt = Number(inv.cashAmount || 0);
  const bankAmt = Number(inv.bankAmount || 0);
  const mfsAmt = Number(inv.mfsAmount || 0);
  if (cashAmt > 0 || bankAmt > 0 || mfsAmt > 0) {
    doc.setFontSize(8);
    if (cashAmt > 0) {
      doc.text(`Cash: ${formatMoney(cashAmt)}`, marginX, leftY);
      leftY += 3.5;
    }
    if (bankAmt > 0) {
      doc.text(
        `Bank${inv.accountNo ? ` (${inv.accountNo})` : ""}: ${formatMoney(bankAmt)}`,
        marginX,
        leftY
      );
      leftY += 3.5;
    }
    if (mfsAmt > 0) {
      doc.text(
        `MFS${inv.mfsPhone ? ` (${inv.mfsPhone})` : ""}: ${formatMoney(mfsAmt)}`,
        marginX,
        leftY
      );
      leftY += 3.5;
    }
  }

  if (inv.notes) {
    leftY += 1;
    const noteText = `Note: ${inv.notes}`;
    const noteLines = doc.splitTextToSize(noteText, leftSummaryMaxW - 5);
    const noteBoxH = noteLines.length * 3.8 + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.rect(marginX, leftY - 2.5, leftSummaryMaxW, noteBoxH, "FD");
    drawPdfTextSmart(doc, noteText, marginX + 2.5, leftY + 1, {
      fontSize: 8,
      textColor: [0, 0, 0],
      maxAllowedWidthMm: leftSummaryMaxW - 5,
    });
    leftY += noteBoxH;
  }

  // Right: Aligned Totals Breakdown
  const summaryRows: Array<{
    label: string;
    value: string;
    bold?: boolean;
    color?: [number, number, number];
  }> = [{ label: "Net Amount", value: formatMoney(inv.subtotal) }];

  if (Number(inv.discount ?? 0) > 0) {
    summaryRows.push({
      label: "Discount",
      value: `-${formatMoney(Number(inv.discount))}`,
    });
  }
  if (Number(inv.vat ?? 0) > 0) {
    summaryRows.push({
      label: "VAT",
      value: `+${formatMoney(Number(inv.vat))}`,
    });
  }
  if (Number(inv.deliveryCharge ?? 0) > 0) {
    summaryRows.push({
      label: "Delivery Charge",
      value: `+${formatMoney(Number(inv.deliveryCharge))}`,
    });
  }
  summaryRows.push({
    label: "Net Payable Amount [Tk.]",
    value: formatMoney(inv.grandTotal),
    bold: true,
  });
  summaryRows.push({
    label: isReturn ? "Refunded Amount" : "Paid Amount",
    value: formatMoney(paid),
  });
  if (due > 0) {
    summaryRows.push({
      label: "Outstanding",
      value: formatMoney(due),
      bold: true,
      color: [185, 28, 28],
    });
  }

  let rightY = cursorY + 3;
  const valRightX = pageWidth - marginX;
  const colonX = valRightX - 24;
  const labelRightX = colonX - 2.5;

  summaryRows.forEach((row) => {
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setFontSize(row.bold ? 9 : 8.5);
    const col = row.color || (row.bold ? [0, 0, 0] : [51, 65, 85]);
    doc.setTextColor(col[0], col[1], col[2]);
    doc.text(row.label, labelRightX, rightY, { align: "right" });
    doc.text(":", colonX, rightY, { align: "center" });
    doc.text(row.value, valRightX, rightY, { align: "right" });
    rightY += row.bold ? 4.4 : 4.0;
  });

  cursorY = Math.max(leftY, rightY) + 3;

  // 6. Outstanding Details Table (if previous due exists)
  if (filteredPreviousDueInvoices.length > 0 || previousDue > 0) {
    if (cursorY > pageHeight - 60) {
      doc.addPage();
      cursorY = 14;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const outTitle = "Outstanding Details";
    doc.text(`${outTitle} :`, marginX, cursorY);
    const outTitleW = doc.getTextWidth(outTitle);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.2);
    doc.line(marginX, cursorY + 0.6, marginX + outTitleW, cursorY + 0.6);
    cursorY += 2.5;

    const dueBody: RowInput[] =
      filteredPreviousDueInvoices.length > 0
        ? filteredPreviousDueInvoices.map((dInv, idx) => [
            String(idx + 1),
            dInv.invoiceNo,
            dInv.date ? moment(dInv.date).format("DD-MMM-YY").toUpperCase() : "-",
            dInv.payMode || "Credit",
            formatMoney(Number(dInv.invoiceAmount || 0)),
            formatMoney(Number(dInv.paidAmount || 0)),
            formatMoney(Number(dInv.dueAmount || 0)),
          ])
        : [
            [
              "1",
              "Previous Balance",
              "-",
              "Credit",
              "-",
              "-",
              formatMoney(previousDue),
            ],
          ];

    const dueHooks = attachBengaliAutoTableHooks(8);

    autoTable(doc, {
      head: [
        [
          "SN",
          "Invoice No",
          "Invoice Date",
          "Pay Mode",
          "Invoice Amt",
          "Paid Amount",
          "Outstanding",
        ],
      ],
      body: dueBody,
      startY: cursorY,
      margin: { top: 10, right: marginX, bottom: 14, left: marginX },
      theme: "grid",
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 8,
        valign: "middle",
        lineWidth: 0.25,
        lineColor: [100, 116, 139],
        cellPadding: { top: 1.5, right: 1.6, bottom: 1.5, left: 1.6 },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        valign: "middle",
        lineWidth: 0.25,
        lineColor: [100, 116, 139],
        cellPadding: { top: 1.3, right: 1.6, bottom: 1.3, left: 1.6 },
      },
      columnStyles: {
        0: { cellWidth: 11, halign: "center" },
        1: { cellWidth: 40, halign: "left" },
        2: { cellWidth: 27, halign: "center" },
        3: { cellWidth: 24, halign: "center" },
        4: { cellWidth: 29, halign: "right" },
        5: { cellWidth: 29, halign: "right" },
        6: { cellWidth: 30, halign: "right" },
      },
      didParseCell: (hookData) => {
        if (hookData.section === "head") {
          const alignMap: Record<number, "left" | "center" | "right"> = {
            0: "center",
            1: "left",
            2: "center",
            3: "center",
            4: "right",
            5: "right",
            6: "right",
          };
          hookData.cell.styles.halign = alignMap[hookData.column.index] || "left";
        }
        dueHooks.didParseCell(hookData);
      },
      willDrawCell: dueHooks.willDrawCell,
      didDrawCell: dueHooks.didDrawCell,
    });

    cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY + 15) + 4;

    const totalOutAmt =
      filteredPreviousDueInvoices.length > 0
        ? filteredPreviousDueInvoices.reduce((s, d) => s + Number(d.dueAmount || 0), 0)
        : previousDue;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Total Outstanding Amount : ${formatMoney(totalOutAmt)}`,
      pageWidth - marginX,
      cursorY,
      { align: "right" }
    );
    cursorY += 5;
  }

  // 7. Bottom Signatures anchored to bottom of page
  const footerHeightNeeded = 18;
  if (cursorY > pageHeight - footerHeightNeeded - 8) {
    doc.addPage();
  }

  const sigY = pageHeight - 14;
  const sigWidth = 44;

  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.25);
  doc.line(marginX, sigY, marginX + sigWidth, sigY);
  doc.line(pageWidth - marginX - sigWidth, sigY, pageWidth - marginX, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    isPurchase ? "Supplier Signature" : "Customer Signature",
    marginX + sigWidth / 2,
    sigY + 4,
    { align: "center" }
  );
  doc.text(
    "Authorized Signature",
    pageWidth - marginX - sigWidth / 2,
    sigY + 4,
    { align: "center" }
  );

  const safeInvNo = String(inv.invoiceNo || "invoice")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_");
  const fileName = `Invoice_${safeInvNo}.pdf`;

  return { doc, fileName };
}

export async function openTradeInvoicePdfPreview(params: {
  invoice: TradeInvoiceData;
  businessProfile?: any;
  invoiceSetup?: any;
}): Promise<void> {
  const { doc, fileName } = await buildTradeInvoicePdfDoc(params);
  openPdfPreview({
    doc,
    fileName,
    title: `Invoice #${params.invoice.invoiceNo}`,
    successMessage: "Invoice PDF downloaded successfully!",
  });
}

export async function buildCollectionReceiptPdfDoc(params: {
  receiptData: CollectionReceiptData;
}): Promise<{ doc: jsPDF; fileName: string }> {
  const { receiptData } = params;
  await ensureBengaliFontLoaded();

  const userInfo = getUserInfo();
  const businessName =
    receiptData.businessName || userInfo?.businessName || "Cash-Boi Business";
  const businessPhone =
    receiptData.businessPhone || userInfo?.phone || userInfo?.phoneNumber || "";

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 16;

  // 1. Receipt Header
  drawPdfTextSmart(doc, businessName.toUpperCase(), pageWidth / 2, cursorY, {
    fontSize: 15,
    fontStyle: "bold",
    textColor: [0, 0, 0],
    align: "center",
    maxAllowedWidthMm: contentWidth,
  });
  cursorY += 5.5;

  if (businessPhone) {
    drawPdfTextSmart(doc, `Phone: ${businessPhone}`, pageWidth / 2, cursorY, {
      fontSize: 9,
      textColor: [107, 114, 128],
      align: "center",
    });
    cursorY += 5;
  }

  // Badge: Payment Collection Receipt
  const badgeText = "Payment Collection Receipt";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const badgeW = doc.getTextWidth(badgeText) + 10;
  const badgeH = 6;
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.setLineWidth(0.25);
  doc.roundedRect(pageWidth / 2 - badgeW / 2, cursorY - 4, badgeW, badgeH, 1.5, 1.5, "FD");
  doc.setTextColor(3, 105, 161);
  doc.text(badgeText, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 5;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 5;

  // 2. Info Grid
  const dateStr = receiptData.collectionDate
    ? String(receiptData.collectionDate).replace("T", " ").split(" ")[0]
    : "-";
  const infoBoxH = 22;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.roundedRect(marginX, cursorY, contentWidth, infoBoxH, 2, 2, "FD");

  // Left: Customer Details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text("Customer Details", marginX + 4, cursorY + 4.5);

  drawPdfTextSmart(doc, receiptData.customerName || "Customer", marginX + 4, cursorY + 9.5, {
    fontSize: 9.5,
    fontStyle: "bold",
    textColor: [0, 0, 0],
    maxAllowedWidthMm: contentWidth * 0.48,
  });
  drawPdfTextSmart(
    doc,
    `Phone: ${receiptData.customerPhone || "-"}`,
    marginX + 4,
    cursorY + 14.5,
    { fontSize: 8.5, textColor: [75, 85, 99] }
  );
  drawPdfTextSmart(doc, `ID: ${receiptData.customerId}`, marginX + 4, cursorY + 19, {
    fontSize: 7.5,
    textColor: [107, 114, 128],
  });

  // Right: Receipt Info
  const rightX = pageWidth - marginX - 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text("Receipt Info", rightX, cursorY + 4.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`#${receiptData.receiptNo}`, rightX, cursorY + 9.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Date: ${dateStr}`, rightX, cursorY + 14.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(3, 105, 161);
  doc.text(`Method: ${receiptData.paymentMode}`, rightX, cursorY + 19, { align: "right" });

  cursorY += infoBoxH + 4;

  // 3. Bank / MFS / Split Banners
  if (receiptData.bankDetails) {
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(224, 242, 254);
    doc.roundedRect(marginX, cursorY, contentWidth, 8, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    doc.text("Bank Account:", marginX + 3, cursorY + 5.2);
    drawPdfTextSmart(
      doc,
      `${receiptData.bankDetails.bankName || ""} - ${receiptData.bankDetails.accountNumber || ""}`,
      pageWidth - marginX - 3,
      cursorY + 5.2,
      { fontSize: 8.5, fontStyle: "bold", textColor: [0, 0, 0], align: "right" }
    );
    cursorY += 10.5;
  }

  if (receiptData.mfsDetails) {
    doc.setFillColor(250, 245, 255);
    doc.setDrawColor(233, 213, 255);
    doc.roundedRect(marginX, cursorY, contentWidth, 8, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    doc.text("MFS Wallet:", marginX + 3, cursorY + 5.2);
    const mfsVal = `${receiptData.mfsDetails.mfsName || ""}${
      receiptData.mfsDetails.mfsPhone ? ` - ${receiptData.mfsDetails.mfsPhone}` : ""
    }`;
    drawPdfTextSmart(doc, mfsVal, pageWidth - marginX - 3, cursorY + 5.2, {
      fontSize: 8.5,
      fontStyle: "bold",
      textColor: [88, 28, 135],
      align: "right",
    });
    cursorY += 10.5;
  }

  const splitCount =
    (Number(receiptData.cashAmount || 0) > 0 ? 1 : 0) +
    (Number(receiptData.bankAmount || 0) > 0 ? 1 : 0) +
    (Number(receiptData.mfsAmount || 0) > 0 ? 1 : 0);

  if (splitCount > 1) {
    const splits: string[] = [];
    if (Number(receiptData.cashAmount || 0) > 0)
      splits.push(`Cash: Tk. ${formatMoney(receiptData.cashAmount || 0)}`);
    if (Number(receiptData.bankAmount || 0) > 0)
      splits.push(`Bank: Tk. ${formatMoney(receiptData.bankAmount || 0)}`);
    if (Number(receiptData.mfsAmount || 0) > 0)
      splits.push(`MFS: Tk. ${formatMoney(receiptData.mfsAmount || 0)}`);

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(marginX, cursorY, contentWidth, 8, 1.5, 1.5, "FD");
    drawPdfTextSmart(
      doc,
      `Payment Split:   ${splits.join("   |   ")}`,
      marginX + 3,
      cursorY + 5.2,
      { fontSize: 8.5, fontStyle: "bold", textColor: [55, 65, 81] }
    );
    cursorY += 10.5;
  }

  // 4. Total Received Strip
  const hasDiscount = Number(receiptData.totalDiscount || 0) > 0;
  const stripH = hasDiscount ? 16 : 10;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.25);
  doc.roundedRect(marginX, cursorY, contentWidth, stripH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text("TOTAL RECEIVED:", marginX + 4, cursorY + 6.5);

  drawPdfTextSmart(
    doc,
    `৳ ${formatMoney(receiptData.totalAmount)}`,
    pageWidth - marginX - 4,
    cursorY + 6.5,
    { fontSize: 11.5, fontStyle: "bold", textColor: [4, 120, 87], align: "right" }
  );

  if (hasDiscount) {
    doc.setDrawColor(167, 243, 208);
    doc.line(marginX + 3, cursorY + 9.5, pageWidth - marginX - 3, cursorY + 9.5);
    drawPdfTextSmart(doc, "Discount (ছাড়):", marginX + 4, cursorY + 13.8, {
      fontSize: 8.5,
      textColor: [75, 85, 99],
    });
    drawPdfTextSmart(
      doc,
      `৳ ${formatMoney(receiptData.totalDiscount || 0)}`,
      pageWidth - marginX - 4,
      cursorY + 13.8,
      { fontSize: 8.5, fontStyle: "bold", textColor: [180, 83, 9], align: "right" }
    );
  }

  cursorY += stripH + 5;

  // 5. Invoices Breakdown Table
  if (receiptData.allocations.length > 0) {
    const hasDiscountCol = receiptData.allocations.some(
      (a) => Number(a.discountAmount || 0) > 0
    );

    const headRow = hasDiscountCol
      ? ["Invoice No", "Amount Paid (৳)", "Discount (৳)", "Remaining Due (৳)"]
      : ["Invoice No", "Amount Paid (৳)", "Remaining Due (৳)"];

    const bodyRows: RowInput[] = receiptData.allocations.map((a) =>
      hasDiscountCol
        ? [
            a.invoiceNo,
            formatMoney(a.paidAmount),
            Number(a.discountAmount || 0) > 0 ? formatMoney(a.discountAmount || 0) : "-",
            formatMoney(a.dueAmount),
          ]
        : [a.invoiceNo, formatMoney(a.paidAmount), formatMoney(a.dueAmount)]
    );

    const hooks = attachBengaliAutoTableHooks(8.5);
    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY: cursorY,
      margin: { top: 10, right: marginX, bottom: 16, left: marginX },
      theme: "grid",
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        lineWidth: 0.2,
        lineColor: [203, 213, 225],
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [15, 23, 42],
        lineWidth: 0.2,
        lineColor: [229, 231, 235],
      },
      columnStyles: hasDiscountCol
        ? {
            0: { halign: "left" },
            1: { halign: "right", textColor: [4, 120, 87], fontStyle: "bold" },
            2: { halign: "right", textColor: [180, 83, 9], fontStyle: "bold" },
            3: { halign: "right", textColor: [75, 85, 99] },
          }
        : {
            0: { halign: "left" },
            1: { halign: "right", textColor: [4, 120, 87], fontStyle: "bold" },
            2: { halign: "right", textColor: [75, 85, 99] },
          },
      didParseCell: (hd) => {
        if (hd.section === "head" && hd.column.index > 0) {
          hd.cell.styles.halign = "right";
        }
        hooks.didParseCell(hd);
      },
      willDrawCell: hooks.willDrawCell,
      didDrawCell: hooks.didDrawCell,
    });

    cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY + 20) + 5;
  }

  // 6. Remark
  if (receiptData.remark) {
    const noteText = `Remark: ${receiptData.remark}`;
    const noteLines = doc.splitTextToSize(noteText, contentWidth - 8);
    const noteH = noteLines.length * 4 + 4;
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(marginX, cursorY, contentWidth, noteH, 1.5, 1.5, "FD");
    drawPdfTextSmart(doc, noteText, marginX + 4, cursorY + 4.5, {
      fontSize: 8.5,
      textColor: [55, 65, 81],
      maxAllowedWidthMm: contentWidth - 8,
    });
    cursorY += noteH + 6;
  }

  // 7. Signature Lines (anchored to bottom)
  const colBottomSigY = pageHeight - 18;
  if (cursorY + 14 > colBottomSigY) {
    doc.addPage();
  }
  const sigY = colBottomSigY;
  const sigW = 55;
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(marginX, sigY, marginX + sigW, sigY);
  doc.line(pageWidth - marginX - sigW, sigY, pageWidth - marginX, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text("Customer Signature", marginX + sigW / 2, sigY + 4.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Authorized Signature", pageWidth - marginX - sigW / 2, sigY + 4.5, {
    align: "center",
  });

  const safeNo = String(receiptData.receiptNo || "receipt").replace(/[^a-zA-Z0-9-_]/g, "_");
  return { doc, fileName: `Collection_Receipt_${safeNo}.pdf` };
}

export async function openCollectionReceiptPdfPreview(params: {
  receiptData: CollectionReceiptData;
}): Promise<void> {
  const { doc, fileName } = await buildCollectionReceiptPdfDoc(params);
  openPdfPreview({
    doc,
    fileName,
    title: `Money Receipt #${params.receiptData.receiptNo}`,
    successMessage: "Collection receipt PDF downloaded successfully!",
  });
}

export async function buildPaymentReceiptPdfDoc(params: {
  receiptData: PaymentReceiptData;
}): Promise<{ doc: jsPDF; fileName: string }> {
  const { receiptData } = params;
  await ensureBengaliFontLoaded();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 16;

  // 1. Header Banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("SUPPLIER PAYMENT VOUCHER", pageWidth / 2, cursorY, { align: "center" });
  cursorY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("Official Trade Disbursement Voucher", pageWidth / 2, cursorY, { align: "center" });
  cursorY += 4;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 5;

  // 2. Metadata Grid
  const hasBankOrMfs = Boolean(receiptData.bankDetails || receiptData.mfsDetails);
  const gridH = hasBankOrMfs ? 22 : 18;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.roundedRect(marginX, cursorY, contentWidth, gridH, 2, 2, "FD");

  const leftColX = marginX + 4;
  const rightColX = marginX + contentWidth * 0.52;

  drawPdfTextSmart(doc, `Voucher No: ${receiptData.receiptNo}`, leftColX, cursorY + 5.5, {
    fontSize: 8.5,
    fontStyle: "bold",
    textColor: [17, 24, 39],
  });
  drawPdfTextSmart(
    doc,
    `Payment Date: ${receiptData.paymentDate || "-"}`,
    leftColX,
    cursorY + 10.5,
    { fontSize: 8.5, textColor: [55, 65, 81] }
  );
  drawPdfTextSmart(
    doc,
    `Payment Mode: ${receiptData.paymentMode || "Cash"}`,
    leftColX,
    cursorY + 15.5,
    { fontSize: 8.5, fontStyle: "bold", textColor: [6, 95, 70] }
  );

  drawPdfTextSmart(
    doc,
    `Supplier: ${receiptData.supplierName || "Supplier"}`,
    rightColX,
    cursorY + 5.5,
    {
      fontSize: 8.5,
      fontStyle: "bold",
      textColor: [17, 24, 39],
      maxAllowedWidthMm: contentWidth * 0.44,
    }
  );
  drawPdfTextSmart(
    doc,
    `Phone: ${receiptData.supplierPhone || "-"}`,
    rightColX,
    cursorY + 10.5,
    { fontSize: 8.5, textColor: [55, 65, 81] }
  );

  if (receiptData.bankDetails) {
    drawPdfTextSmart(
      doc,
      `Bank: ${receiptData.bankDetails.bankName || ""} (${receiptData.bankDetails.accountNumber || ""})`,
      rightColX,
      cursorY + 15.5,
      { fontSize: 8, textColor: [12, 74, 110], maxAllowedWidthMm: contentWidth * 0.44 }
    );
  } else if (receiptData.mfsDetails) {
    drawPdfTextSmart(
      doc,
      `MFS: ${receiptData.mfsDetails.mfsName || ""} (${receiptData.mfsDetails.mfsPhone || ""})`,
      rightColX,
      cursorY + 15.5,
      { fontSize: 8, textColor: [88, 28, 135], maxAllowedWidthMm: contentWidth * 0.44 }
    );
  }

  cursorY += gridH + 5;

  // 3. Allocation Table
  if (receiptData.allocations.length > 0) {
    const bodyRows: RowInput[] = receiptData.allocations.map((item, idx) => [
      String(idx + 1),
      item.invoiceNo,
      `৳ ${formatMoney(item.paidAmount)}`,
      `৳ ${formatMoney(item.discountAmount || 0)}`,
      `৳ ${formatMoney(item.dueAmount)}`,
    ]);

    const hooks = attachBengaliAutoTableHooks(8.5);
    autoTable(doc, {
      head: [["#", "Invoice No", "Paid (৳)", "Discount (৳)", "Remaining (৳)"]],
      body: bodyRows,
      startY: cursorY,
      margin: { top: 10, right: marginX, bottom: 16, left: marginX },
      theme: "grid",
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        lineWidth: 0.2,
        lineColor: [203, 213, 225],
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [17, 24, 39],
        lineWidth: 0.2,
        lineColor: [229, 231, 235],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { halign: "left", fontStyle: "bold" },
        2: { halign: "right", textColor: [4, 120, 87], fontStyle: "bold" },
        3: { halign: "right", textColor: [180, 83, 9] },
        4: { halign: "right", textColor: [55, 65, 81] },
      },
      didParseCell: (hd) => {
        if (hd.section === "head") {
          hd.cell.styles.halign =
            hd.column.index === 0 ? "center" : hd.column.index === 1 ? "left" : "right";
        }
        hooks.didParseCell(hd);
      },
      willDrawCell: hooks.willDrawCell,
      didDrawCell: hooks.didDrawCell,
    });

    cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY + 20) + 5;
  }

  // 4. Summary Box
  const sumLabelX = pageWidth - marginX - 58;
  const sumValX = pageWidth - marginX;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text("Paid Amount:", sumLabelX, cursorY);
  drawPdfTextSmart(doc, `৳ ${formatMoney(receiptData.totalAmount)}`, sumValX, cursorY, {
    fontSize: 9,
    fontStyle: "bold",
    textColor: [17, 24, 39],
    align: "right",
  });
  cursorY += 5;

  if ((receiptData.totalDiscount || 0) > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text("Discount Availed:", sumLabelX, cursorY);
    drawPdfTextSmart(
      doc,
      `৳ ${formatMoney(receiptData.totalDiscount || 0)}`,
      sumValX,
      cursorY,
      { fontSize: 9, fontStyle: "bold", textColor: [146, 64, 14], align: "right" }
    );
    cursorY += 5;
  }

  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(sumLabelX, cursorY - 2, sumValX, cursorY - 2);
  cursorY += 2.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text("Total Settled:", sumLabelX, cursorY);
  drawPdfTextSmart(
    doc,
    `৳ ${formatMoney((receiptData.totalAmount || 0) + (receiptData.totalDiscount || 0))}`,
    sumValX,
    cursorY,
    { fontSize: 10.5, fontStyle: "bold", textColor: [6, 95, 70], align: "right" }
  );
  cursorY += 7;

  // 5. Note
  if (receiptData.remark) {
    const noteText = `Note: ${receiptData.remark}`;
    const noteLines = doc.splitTextToSize(noteText, contentWidth - 8);
    const noteH = noteLines.length * 4 + 4;
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(marginX, cursorY, contentWidth, noteH, 1.5, 1.5, "FD");
    drawPdfTextSmart(doc, noteText, marginX + 4, cursorY + 4.5, {
      fontSize: 8.5,
      textColor: [75, 85, 99],
      maxAllowedWidthMm: contentWidth - 8,
    });
    cursorY += noteH + 6;
  }

  // 6. Signature Lines (anchored to bottom)
  const payBottomSigY = pageHeight - 18;
  if (cursorY + 14 > payBottomSigY) {
    doc.addPage();
  }
  const sigY = payBottomSigY;
  const sigW = 55;
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(marginX, sigY, marginX + sigW, sigY);
  doc.line(pageWidth - marginX - sigW, sigY, pageWidth - marginX, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text("Supplier Signature", marginX + sigW / 2, sigY + 4.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Authorized Signature", pageWidth - marginX - sigW / 2, sigY + 4.5, {
    align: "center",
  });

  const safeNo = String(receiptData.receiptNo || "voucher").replace(/[^a-zA-Z0-9-_]/g, "_");
  return { doc, fileName: `Payment_Voucher_${safeNo}.pdf` };
}

export async function openPaymentReceiptPdfPreview(params: {
  receiptData: PaymentReceiptData;
}): Promise<void> {
  const { doc, fileName } = await buildPaymentReceiptPdfDoc(params);
  openPdfPreview({
    doc,
    fileName,
    title: `Payment Voucher #${params.receiptData.receiptNo}`,
    successMessage: "Payment voucher PDF downloaded successfully!",
  });
}
