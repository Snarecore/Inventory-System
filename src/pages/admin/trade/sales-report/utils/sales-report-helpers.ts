import moment from "moment";
import { formatMoney } from "@/utils/formatters";
import { buildAndDownloadExcel, exportSalesToExcel } from "@/utils/excel-export";
import type { SaleItem } from "@/types";

export type ReportTab = "invoices" | "products" | "customers";

export interface ProductSummary {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  totalRevenue: number;
  totalDiscount: number;
  invoicesCount: number;
}

export interface CustomerSummary {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  invoicesCount: number;
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
  lastDate: string;
}

export interface ReportCompanyMeta {
  businessName: string;
  businessAddress: string;
  businessLogoUrl: string;
  startDate: string;
  endDate: string;
}

/**
 * Aggregates transaction line items into unique Product-Wise Sales summaries
 */
export function aggregateProductSales(transactions: SaleItem[]): ProductSummary[] {
  const map: Record<string, ProductSummary> = {};

  transactions.forEach((tx: any) => {
    const details =
      tx.salesDetails ||
      tx.saleDetails ||
      tx.details ||
      tx.items ||
      tx.productsList ||
      [];

    if (Array.isArray(details)) {
      details.forEach((line: any) => {
        const pId = String(
          line.productId || line.product_id || line.id || line.pcode || "unknown"
        );
        const pCode =
          line.productCode || line.product_code || line.pcode || line.code || "-";
        const pName =
          line.productName ||
          line.product_name ||
          line.name ||
          line.title ||
          "Unnamed Product";
        const unit = line.unit || "pcs";
        const qty = Number(line.quantity ?? line.qty ?? 1);
        const price = Number(
          line.sellPrice ?? line.sell_price ?? line.price ?? line.rate ?? 0
        );
        const lineTotal =
          Number(line.total ?? line.total_price ?? 0) || qty * price;
        const disc = Number(line.discount ?? 0);

        const key = pCode !== "-" ? pCode : pName;

        if (!map[key]) {
          map[key] = {
            productId: pId,
            productCode: pCode,
            productName: pName,
            unit,
            totalQuantity: 0,
            totalRevenue: 0,
            totalDiscount: 0,
            invoicesCount: 0,
          };
        }

        map[key].totalQuantity += qty;
        map[key].totalRevenue += lineTotal;
        map[key].totalDiscount += disc;
        map[key].invoicesCount += 1;
      });
    }
  });

  return Object.values(map);
}

/**
 * Aggregates transactions into unique Customer-Wise Sales summaries
 */
export function aggregateCustomerSales(transactions: SaleItem[]): CustomerSummary[] {
  const map: Record<string, CustomerSummary> = {};

  transactions.forEach((tx: any) => {
    const cId = String(
      tx.customerId || tx.customer_id || tx.partyId || "walkin"
    );
    const cName =
      tx.customerName ||
      tx.customer_name ||
      tx.partyName ||
      "Walk-in Customer";
    const cPhone = tx.customerPhone || tx.customer_phone || tx.partyPhone || "";
    const cAddr =
      tx.customerAddress || tx.customer_address || tx.partyAddress || "";
    const date = tx.salesDate || tx.saleDate || tx.date || "";

    const gt = Number(tx.grandTotal ?? tx.grand_total ?? tx.totalAmount ?? 0);
    const paid = Number(tx.paidAmount ?? tx.paid_amount ?? 0);
    const due = Number(tx.dueAmount ?? tx.due_amount ?? Math.max(0, gt - paid));

    const key = cPhone ? `${cName}_${cPhone}` : cName;

    if (!map[key]) {
      map[key] = {
        customerId: cId,
        customerName: cName,
        customerPhone: cPhone,
        customerAddress: cAddr,
        invoicesCount: 0,
        totalBilled: 0,
        totalPaid: 0,
        totalDue: 0,
        lastDate: date,
      };
    }

    map[key].invoicesCount += 1;
    map[key].totalBilled += gt;
    map[key].totalPaid += paid;
    map[key].totalDue += due;

    if (
      date &&
      (!map[key].lastDate || moment(date).isAfter(moment(map[key].lastDate)))
    ) {
      map[key].lastDate = date;
    }
  });

  return Object.values(map);
}

/**
 * Exports the currently active Sales Report tab (Invoices / Products / Customers) to designed Excel
 */
export async function exportTabReportToExcel(
  activeTab: ReportTab,
  transactions: SaleItem[],
  meta: ReportCompanyMeta
): Promise<number> {
  const { businessName, businessAddress, businessLogoUrl, startDate, endDate } = meta;
  const dateStamp = moment().format("YYYY-MM-DD");

  if (activeTab === "products") {
    const products = aggregateProductSales(transactions).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );
    if (products.length === 0) {
      throw new Error("No product sales records available to export");
    }

    const grandRevenue = products.reduce((acc, p) => acc + p.totalRevenue, 0);
    const data = products.map((p, idx) => ({
      SL: idx + 1,
      "Product Code": p.productCode,
      "Product Name": p.productName,
      Unit: p.unit,
      "Quantity Sold": p.totalQuantity,
      "Invoices Sold": p.invoicesCount,
      "Total Revenue (BDT)": p.totalRevenue,
      "Discount (BDT)": p.totalDiscount,
      "Share of Sales":
        grandRevenue > 0
          ? `${((p.totalRevenue / grandRevenue) * 100).toFixed(1)}%`
          : "0.0%",
    }));

    const totalQty = data.reduce((s, r) => s + (Number(r["Quantity Sold"]) || 0), 0);
    const totalRev = data.reduce((s, r) => s + (Number(r["Total Revenue (BDT)"]) || 0), 0);
    const totalDisc = data.reduce((s, r) => s + (Number(r["Discount (BDT)"]) || 0), 0);

    const totalRow = {
      SL: `TOTAL SUMMARY (${data.length} Products)`,
      "Product Code": "",
      "Product Name": "",
      Unit: "",
      "Quantity Sold": totalQty,
      "Invoices Sold": "",
      "Total Revenue (BDT)": Number(totalRev.toFixed(2)),
      "Discount (BDT)": Number(totalDisc.toFixed(2)),
      "Share of Sales": "100.0%",
    };

    await buildAndDownloadExcel(data, totalRow, {
      fileName: `Product_Sales_Report_${dateStamp}.xlsx`,
      sheetName: "Product Sales",
      reportTitle: "Product-Wise Sales Report",
      businessName,
      businessAddress,
      businessLogoUrl,
      startDate,
      endDate,
      totalLabel: "Total Products",
      totalSummarySpan: 4,
      includeSignatures: true,
    });
    return data.length;
  }

  if (activeTab === "customers") {
    const customers = aggregateCustomerSales(transactions).sort(
      (a, b) => b.totalBilled - a.totalBilled
    );
    if (customers.length === 0) {
      throw new Error("No customer sales records available to export");
    }

    const data = customers.map((c, idx) => ({
      SL: idx + 1,
      "Customer Name": c.customerName,
      Phone: c.customerPhone || "-",
      Address: c.customerAddress || "-",
      "Total Orders": c.invoicesCount,
      "Total Billed (BDT)": c.totalBilled,
      "Total Paid (BDT)": c.totalPaid,
      "Outstanding Due (BDT)": c.totalDue,
      "Last Order Date": c.lastDate ? moment(c.lastDate).format("DD MMM YYYY") : "-",
      Status: c.totalDue > 0 ? "Has Due" : "Settled",
    }));

    const totalBilled = data.reduce((s, r) => s + (Number(r["Total Billed (BDT)"]) || 0), 0);
    const totalPaid = data.reduce((s, r) => s + (Number(r["Total Paid (BDT)"]) || 0), 0);
    const totalDue = data.reduce((s, r) => s + (Number(r["Outstanding Due (BDT)"]) || 0), 0);

    const totalRow = {
      SL: `TOTAL SUMMARY (${data.length} Customers)`,
      "Customer Name": "",
      Phone: "",
      Address: "",
      "Total Orders": "",
      "Total Billed (BDT)": Number(totalBilled.toFixed(2)),
      "Total Paid (BDT)": Number(totalPaid.toFixed(2)),
      "Outstanding Due (BDT)": Number(totalDue.toFixed(2)),
      "Last Order Date": "",
      Status: "",
    };

    await buildAndDownloadExcel(data, totalRow, {
      fileName: `Customer_Sales_Report_${dateStamp}.xlsx`,
      sheetName: "Customer Sales",
      reportTitle: "Customer-Wise Sales Report",
      businessName,
      businessAddress,
      businessLogoUrl,
      startDate,
      endDate,
      totalLabel: "Total Customers",
      totalSummarySpan: 4,
      includeSignatures: true,
    });
    return data.length;
  }

  if (!transactions || transactions.length === 0) {
    throw new Error("No sales records available to export");
  }

  await exportSalesToExcel(transactions, {
    fileName: `Sales_Report_${dateStamp}.xlsx`,
    sheetName: "Sales Report",
    reportTitle: "Sales Report",
    businessName,
    businessAddress,
    businessLogoUrl,
    startDate,
    endDate,
  });
  return transactions.length;
}

export function downloadTabReportPdf(
  activeTab: ReportTab,
  transactions: SaleItem[],
  stats: {
    totalSalesVolume: number;
    totalCollected: number;
    totalDue: number;
    totalDiscount: number;
  },
  meta: ReportCompanyMeta
): void {
  const { businessName, businessAddress, businessLogoUrl, startDate, endDate } = meta;

  const rootStyle = getComputedStyle(document.documentElement);
  const primaryColor =
    rootStyle.getPropertyValue("--table-header-bg")?.trim() ||
    rootStyle.getPropertyValue("--primary-color")?.trim() ||
    "#009fe3";

  const printDate = moment().format("DD-MMM-YYYY").toUpperCase();
  const fromStr = startDate
    ? moment(startDate).format("DD-MMM-YYYY").toUpperCase()
    : "01-JAN-2020";
  const toStr = endDate
    ? moment(endDate).format("DD-MMM-YYYY").toUpperCase()
    : printDate;

  let reportTitle = "Sales Report";
  let fileTitle = `Sales_Report_${moment().format("YYYY-MM-DD")}`;
  let metaRightText = `Total Invoices: <b>${transactions.length}</b>`;
  let theadHtml = "";
  let tbodyHtml = "";

  if (activeTab === "products") {
    reportTitle = "Product-Wise Sales Report";
    fileTitle = `Product_Sales_Report_${moment().format("YYYY-MM-DD")}`;
    const products = aggregateProductSales(transactions).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );
    metaRightText = `Total Products: <b>${products.length}</b>`;

    const grandRev = products.reduce((s, p) => s + p.totalRevenue, 0);
    const totalQty = products.reduce((s, p) => s + p.totalQuantity, 0);
    const totalDisc = products.reduce((s, p) => s + p.totalDiscount, 0);

    theadHtml = `
      <tr>
        <th class="text-center" style="width: 32px;">SL</th>
        <th>Product Code</th>
        <th>Product Description</th>
        <th class="text-center">Unit</th>
        <th class="text-center">Orders</th>
        <th class="text-right">Qty Sold</th>
        <th class="text-right">Avg Rate (৳)</th>
        <th class="text-right">Discounts (৳)</th>
        <th class="text-right">Net Revenue (৳)</th>
        <th class="text-right">Share (%)</th>
      </tr>
    `;

    tbodyHtml =
      products
        .map((p, idx) => {
          const avgRate = p.totalQuantity > 0 ? p.totalRevenue / p.totalQuantity : 0;
          const share = grandRev > 0 ? ((p.totalRevenue / grandRev) * 100).toFixed(1) : "0.0";
          return `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td class="font-bold">${p.productCode}</td>
              <td>${p.productName}</td>
              <td class="text-center">${p.unit}</td>
              <td class="text-center">${p.invoicesCount}</td>
              <td class="text-right font-bold">${p.totalQuantity}</td>
              <td class="text-right">${formatMoney(avgRate)}</td>
              <td class="text-right">${p.totalDiscount > 0 ? formatMoney(p.totalDiscount) : "-"}</td>
              <td class="text-right font-bold">${formatMoney(p.totalRevenue)}</td>
              <td class="text-right font-bold">${share}%</td>
            </tr>
          `;
        })
        .join("") +
      `
      <tr class="total-row">
        <td colspan="5" class="text-center font-bold">TOTAL SUMMARY (${products.length} Products)</td>
        <td class="text-right font-bold">${totalQty}</td>
        <td></td>
        <td class="text-right">${totalDisc > 0 ? formatMoney(totalDisc) : "-"}</td>
        <td class="text-right font-bold" style="color: ${primaryColor};">${formatMoney(grandRev)}</td>
        <td class="text-right font-bold">100.0%</td>
      </tr>
    `;
  } else if (activeTab === "customers") {
    reportTitle = "Customer-Wise Sales Report";
    fileTitle = `Customer_Sales_Report_${moment().format("YYYY-MM-DD")}`;
    const customers = aggregateCustomerSales(transactions).sort(
      (a, b) => b.totalBilled - a.totalBilled
    );
    metaRightText = `Total Customers: <b>${customers.length}</b>`;

    const totalOrders = customers.reduce((s, c) => s + c.invoicesCount, 0);
    const totalBilled = customers.reduce((s, c) => s + c.totalBilled, 0);
    const totalPaid = customers.reduce((s, c) => s + c.totalPaid, 0);
    const totalDue = customers.reduce((s, c) => s + c.totalDue, 0);

    theadHtml = `
      <tr>
        <th class="text-center" style="width: 32px;">SL</th>
        <th>Customer Name</th>
        <th class="text-center">Phone</th>
        <th>Address</th>
        <th class="text-center">Orders</th>
        <th class="text-right">Gross Billed (৳)</th>
        <th class="text-right">Total Paid (৳)</th>
        <th class="text-right">Outstanding Due (৳)</th>
        <th class="text-center">Last Order</th>
        <th class="text-center">Status</th>
      </tr>
    `;

    tbodyHtml =
      customers
        .map((c, idx) => {
          const status = c.totalDue > 0 ? "Has Due" : "Settled";
          const lastStr = c.lastDate ? moment(c.lastDate).format("DD-MMM-YYYY").toUpperCase() : "-";
          return `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td class="font-bold">${c.customerName}</td>
              <td class="text-center">${c.customerPhone || "-"}</td>
              <td>${c.customerAddress || "-"}</td>
              <td class="text-center">${c.invoicesCount}</td>
              <td class="text-right font-bold">${formatMoney(c.totalBilled)}</td>
              <td class="text-right font-bold" style="color: #047857;">${formatMoney(c.totalPaid)}</td>
              <td class="text-right font-bold" style="color: #b91c1c;">${c.totalDue > 0 ? formatMoney(c.totalDue) : "-"}</td>
              <td class="text-center">${lastStr}</td>
              <td class="text-center font-bold">${status}</td>
            </tr>
          `;
        })
        .join("") +
      `
      <tr class="total-row">
        <td colspan="4" class="text-center font-bold">TOTAL SUMMARY (${customers.length} Customers)</td>
        <td class="text-center font-bold">${totalOrders}</td>
        <td class="text-right font-bold" style="color: ${primaryColor};">${formatMoney(totalBilled)}</td>
        <td class="text-right font-bold" style="color: #047857;">${formatMoney(totalPaid)}</td>
        <td class="text-right font-bold" style="color: #b91c1c;">${totalDue > 0 ? formatMoney(totalDue) : "-"}</td>
        <td colspan="2"></td>
      </tr>
    `;
  } else {
    // Invoices (default)
    const totalSubtotal = transactions.reduce((acc, t: any) => {
      const gt = Number(t.grandTotal ?? t.grand_total ?? t.totalAmount ?? 0);
      return acc + Number(t.totalAmount ?? t.total_amount ?? gt);
    }, 0);
    const totalVat = transactions.reduce((acc, t: any) => acc + Number(t.vat ?? 0), 0);
    const totalItemsCount = transactions.reduce((acc, t: any) => {
      const details = t.salesDetails || t.saleDetails || t.details || t.items || [];
      return (
        acc +
        (Array.isArray(details) && details.length > 0
          ? details.length
          : Number(t.itemsCount || 1))
      );
    }, 0);

    theadHtml = `
      <tr>
        <th class="text-center" style="width: 32px;">SL</th>
        <th>Order ID</th>
        <th class="text-center">Date</th>
        <th>Customer Name</th>
        <th class="text-center">Phone</th>
        <th class="text-center" style="width: 40px;">Items</th>
        <th class="text-right">Subtotal (৳)</th>
        <th class="text-right">Discount (৳)</th>
        <th class="text-right">VAT (৳)</th>
        <th class="text-right">Grand Total (৳)</th>
        <th class="text-right">Paid (৳)</th>
        <th class="text-right">Due (৳)</th>
        <th class="text-center">Method</th>
        <th class="text-center">Status</th>
      </tr>
    `;

    tbodyHtml =
      transactions
        .map((t: any, idx: number) => {
          const gt = Number(t.grandTotal ?? t.grand_total ?? t.totalAmount ?? 0);
          const paid = Number(t.paidAmount ?? t.paid_amount ?? 0);
          const due = Number(t.dueAmount ?? t.due_amount ?? Math.max(0, gt - paid));
          const sub = Number(t.totalAmount ?? t.total_amount ?? gt);
          const disc = Number(t.discount ?? 0);
          const vat = Number(t.vat ?? 0);
          const pType = String(t.paymentType || t.payment_type || "CASH").toUpperCase();
          const details = t.salesDetails || t.saleDetails || t.details || t.items || [];
          const itemsCount =
            Array.isArray(details) && details.length > 0
              ? details.length
              : Number(t.itemsCount || 1);
          const status = due <= 0 && gt > 0 ? "PAID" : due > 0 && paid > 0 ? "PARTIAL" : "DUE";
          const dateStr =
            t.salesDate || t.date
              ? moment(t.salesDate || t.date).format("DD-MMM-YYYY").toUpperCase()
              : "-";

          return `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td class="font-bold">${t.orderNo || t.invoiceNo || `ORD-${t.id || idx + 1}`}</td>
              <td class="text-center">${dateStr}</td>
              <td>${t.customerName || t.customer_name || "Walk-in Customer"}</td>
              <td class="text-center">${t.customerPhone || t.customer_phone || "-"}</td>
              <td class="text-center">${itemsCount}</td>
              <td class="text-right">${formatMoney(sub)}</td>
              <td class="text-right">${disc > 0 ? formatMoney(disc) : "-"}</td>
              <td class="text-right">${vat > 0 ? formatMoney(vat) : "-"}</td>
              <td class="text-right font-bold">${formatMoney(gt)}</td>
              <td class="text-right font-bold" style="color: #047857;">${formatMoney(paid)}</td>
              <td class="text-right font-bold" style="color: #b91c1c;">${due > 0 ? formatMoney(due) : "-"}</td>
              <td class="text-center">${pType}</td>
              <td class="text-center font-bold">${status}</td>
            </tr>
          `;
        })
        .join("") +
      `
      <tr class="total-row">
        <td colspan="5" class="text-center font-bold">TOTAL SUMMARY (${transactions.length} Invoices)</td>
        <td class="text-center">${totalItemsCount}</td>
        <td class="text-right">${formatMoney(totalSubtotal)}</td>
        <td class="text-right">${stats.totalDiscount > 0 ? formatMoney(stats.totalDiscount) : "-"}</td>
        <td class="text-right">${totalVat > 0 ? formatMoney(totalVat) : "-"}</td>
        <td class="text-right font-bold" style="color: ${primaryColor};">${formatMoney(stats.totalSalesVolume)}</td>
        <td class="text-right font-bold" style="color: #047857;">${formatMoney(stats.totalCollected)}</td>
        <td class="text-right font-bold" style="color: #b91c1c;">${stats.totalDue > 0 ? formatMoney(stats.totalDue) : "-"}</td>
        <td colspan="2"></td>
      </tr>
    `;
  }

  const printWindow = window.open("", "_blank", "width=1200,height=900");
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
        <title>${fileTitle}</title>
        <style>
          @page {
            size: landscape;
            margin: 6mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 4px;
            color: #0f172a;
            background: #ffffff;
          }
          .header-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding-bottom: 2px;
            margin-bottom: 0px;
          }
          .company-info {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .company-logo {
            height: 36px;
            max-width: 120px;
            object-fit: contain;
          }
          .company-name {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.15;
          }
          .company-sub {
            font-size: 10px;
            color: #475569;
            line-height: 1.2;
            margin-top: 1px;
          }
          .print-date {
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
            text-align: right;
            padding-top: 2px;
          }
          .report-title {
            font-size: 14px;
            font-weight: 800;
            text-align: center;
            text-transform: uppercase;
            margin: 2px 0 3px 0;
            color: #0f172a;
            letter-spacing: 0.5px;
            line-height: 1.2;
          }
          .filter-row {
            font-size: 10px;
            font-weight: 600;
            color: #334155;
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 3px;
            margin-bottom: 4px;
            line-height: 1.2;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 2px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th, td {
            border: 1px solid #94a3b8;
            padding: 4px 5px;
            font-size: 9.5px;
          }
          th {
            background-color: ${primaryColor} !important;
            color: #ffffff !important;
            font-weight: 700;
            text-align: left;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          tfoot {
            display: table-row-group !important;
          }
          .total-row {
            background-color: #f1f5f9 !important;
            font-weight: 800;
            border-top: 2px solid #64748b;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .signatures {
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #475569;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .sig-block {
            text-align: center;
            width: 140px;
          }
          .sig-line {
            border-bottom: 1px solid #94a3b8;
            margin-bottom: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div class="company-info">
            ${
              businessLogoUrl
                ? `<img src="${businessLogoUrl}" class="company-logo" crossOrigin="anonymous" />`
                : ""
            }
            <div>
              <div class="company-name">${businessName}</div>
              ${businessAddress ? `<div class="company-sub">${businessAddress}</div>` : ""}
            </div>
          </div>
          <div class="print-date">
            Print Date: ${printDate}
          </div>
        </div>

        <div class="report-title">${reportTitle}</div>

        <div class="filter-row">
          <div>
            From Date: <b>${fromStr}</b> &nbsp;&nbsp; To Date: <b>${toStr}</b>
          </div>
          <div>
            ${metaRightText}
          </div>
        </div>

        <table>
          <thead>${theadHtml}</thead>
          <tbody>${tbodyHtml}</tbody>
        </table>

        <div class="signatures">
          <div class="sig-block">
            <div class="sig-line"></div>
            <span>Prepared By</span>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <span>Checked By</span>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <span>Authorized Signatory</span>
          </div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  printWindow.focus();
  setTimeout(() => {
    try {
      printWindow.print();
    } catch (err) {
      console.error("Print trigger error:", err);
    }
  }, 450);
  printWindow.onafterprint = () => {
    printWindow.close();
  };
}
