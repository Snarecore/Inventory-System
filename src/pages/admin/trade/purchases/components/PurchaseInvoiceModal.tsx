import React, { useRef, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import type { PurchaseItem } from "@/types";
import { FaPrint, FaDownload, FaBuilding, FaUserTie, FaPhone, FaMapMarkerAlt, FaFileInvoice, FaTruck, FaCalendarAlt } from "react-icons/fa";
import { getUserInfo } from "@/utils/auth-storage";

interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: PurchaseItem | null;
  autoPrint?: boolean;
}

const PurchaseInvoiceModal: React.FC<PurchaseInvoiceModalProps> = ({
  isOpen,
  onClose,
  purchase,
  autoPrint = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const userInfo = getUserInfo();

  const p: any = purchase || {};
  const rawDetails =
    p.purchaseDetails ||
    p.purchasesDetails ||
    p.purchase_details ||
    p.details ||
    p.items ||
    p.products ||
    p.purchaseListDetails ||
    p.salesDetails ||
    p.saleDetails ||
    p.productList ||
    p.productsList ||
    [];
  const details: any[] = Array.isArray(rawDetails) ? rawDetails : [];

  const delivery = Number(p.transportCost ?? p.transport_cost ?? p.delivery_charge ?? p.deliveryCharge ?? 0);
  const discount = Number(p.discount ?? p.discount_amount ?? p.discountAmount ?? 0);
  const vat = Number(p.vat ?? p.vat_amount ?? p.vatAmount ?? p.invoiceVat ?? 0);
  const subtotal =
    Number(p.totalAmount ?? p.total_amount ?? p.subtotal ?? 0) ||
    details.reduce((acc, item: any) => {
      const price = Number(item.buyPrice ?? item.buy_price ?? item.price ?? item.rate ?? 0);
      const qty = Number(item.quantity ?? item.qty ?? 1);
      return acc + (Number(item.total) || price * qty);
    }, 0);

  const grandTotal = Number(p.grandTotal ?? p.grand_total ?? p.total ?? (subtotal - discount + vat + delivery));
  const paid = Number(p.paidAmount ?? p.paid_amount ?? p.paid ?? p.cashReceived ?? 0);
  const due = Number(p.dueAmount ?? p.due_amount ?? p.due ?? Math.max(0, grandTotal - paid));

  const supplierName = p.supplierName || p.supplier_name || p.partyName || p.party_name || p.customerName || "Direct Supplier";
  const supplierPhone = p.supplierPhone || p.supplier_phone || p.partyPhone || p.party_phone || p.customerPhone;
  const supplierAddress = p.supplierAddress || p.supplier_address || p.partyAddress || p.party_address || p.customerAddress;

  const vehicleNo = p.vehicleNo || p.vehicle_no || p.truckNo || p.truck_no || "N/A";
  const driverName = p.driverName || p.driver_name || "N/A";
  const driverPhone = p.driverPhone || p.driver_phone || "N/A";
  const challanNo = p.challanNo || p.challan_no || p.challanRefNo;
  const invoiceNo = p.invoiceNo || p.invoice_no || p.billNo || "N/A";
  const invoiceDate = p.purchaseDate || p.salesDate || p.date || p.created_at || p.createdAt || "N/A";

  const formatMoney = (amount: number | string | undefined) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHtml = details.length > 0 ? details.map((item: any, idx) => {
      const itemPrice = Number(item.buyPrice ?? item.buy_price ?? item.price ?? item.rate ?? item.unitPrice ?? item.sellPrice ?? 0);
      const itemQty = Number(item.quantity ?? item.qty ?? item.count ?? 1);
      const itemDisc = Number(item.discount ?? item.discount_amount ?? 0);
      const itemVat = Number(item.vat ?? item.vat_amount ?? 0);
      const itemTotal = Number(item.total ?? item.total_price ?? item.subtotal ?? (itemPrice * itemQty - itemDisc + itemVat));
      const code = item.pcode || item.productCode || item.product_code || item.code;

      return `
        <tr>
          <td style="text-align: center; padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #111827;">${item.productName || item.product_name || item.name || "Product"}</div>
            ${code ? `<div style="font-size: 10px; color: #6b7280;">Code: ${code}</div>` : ""}
          </td>
          <td style="text-align: center; padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${item.unit || item.unitName || "PCS"}</td>
          <td style="text-align: right; padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">৳ ${formatMoney(itemPrice)}</td>
          <td style="text-align: center; font-weight: 600; padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${itemQty}</td>
          <td style="text-align: right; padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">৳ ${formatMoney(itemDisc)}</td>
          <td style="text-align: right; padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">৳ ${formatMoney(itemVat)}</td>
          <td style="text-align: right; font-weight: 700; padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">৳ ${formatMoney(itemTotal)}</td>
        </tr>
      `;
    }).join("") : `
      <tr>
        <td colspan="8" style="text-align: center; padding: 15px; color: #6b7280;">No line items recorded for this purchase.</td>
      </tr>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Invoice - ${invoiceNo}</title>
          <meta charset="utf-8" />
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #111827;
              background: #fff;
              font-size: 12px;
              line-height: 1.4;
              padding: 8mm 12mm;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .invoice-wrapper {
              max-width: 100%;
              margin: 0 auto;
              padding: 0;
              border: none;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #009fe3;
              padding-bottom: 12px;
              margin-bottom: 12px;
            }
            .biz-title {
              font-size: 18px;
              font-weight: 800;
              color: #009fe3;
              margin-bottom: 2px;
            }
            .biz-text {
              font-size: 11px;
              color: #374151;
            }
            .inv-title {
              font-size: 18px;
              font-weight: 800;
              color: #111827;
              text-align: right;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .inv-meta {
              font-size: 11px;
              color: #374151;
              text-align: right;
              margin-top: 2px;
            }
            .cards-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 14px;
            }
            .info-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 10px 12px;
            }
            .card-heading {
              font-size: 10px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .table-container {
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              overflow: hidden;
              margin-bottom: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            thead {
              background-color: #f1f5f9;
            }
            th {
              padding: 8px 8px;
              font-weight: 700;
              color: #1e293b;
              border-bottom: 1px solid #cbd5e1;
              text-align: left;
            }
            .bottom-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              margin-top: 12px;
            }
            .totals-card {
              width: 260px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 10px 12px;
              font-size: 11px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              color: #334155;
            }
            .grand-total-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0 4px 0;
              border-top: 1px solid #cbd5e1;
              margin-top: 4px;
              font-weight: 800;
              font-size: 13px;
              color: #009fe3;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              padding-top: 10px;
              border-top: 1px dashed #cbd5e1;
            }
            .sign-item {
              text-align: center;
              width: 140px;
              border-top: 1px solid #64748b;
              padding-top: 4px;
              font-size: 11px;
              font-weight: 500;
              color: #334155;
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <div class="header-row">
              <div>
                <div class="biz-title">${userInfo?.businessName || userInfo?.organizationName || "Zia Enterprise"}</div>
                <div class="biz-text">Phone: ${userInfo?.phone || userInfo?.phoneNumber || "N/A"}</div>
                <div class="biz-text">Branch: ${userInfo?.branchName || `Branch #${userInfo?.branchId || 1}`}</div>
              </div>
              <div>
                <div class="inv-title">PURCHASE INVOICE</div>
                <div class="inv-meta">Invoice #: <strong>${invoiceNo}</strong></div>
                <div class="inv-meta">Date: ${invoiceDate}</div>
                ${challanNo ? `<div class="inv-meta">Challan Ref: ${challanNo}</div>` : ""}
              </div>
            </div>

            <div class="cards-grid">
              <div class="info-card">
                <div class="card-heading">SUPPLIER INFORMATION</div>
                <div style="font-weight: 700; color: #000000; font-size: 12px; margin-bottom: 4px;">${supplierName}</div>
                ${supplierPhone ? `
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #000000; margin-top: 4px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#000000" style="flex-shrink: 0;">
                      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                    <span>${supplierPhone}</span>
                  </div>
                ` : ""}
                ${supplierAddress ? `
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #000000; margin-top: 4px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#000000" style="flex-shrink: 0;">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                    </svg>
                    <span>${supplierAddress}</span>
                  </div>
                ` : ""}
              </div>

              <div class="info-card">
                <div class="card-heading">LOGISTICS & TRANSPORT</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; font-size: 11px; color: #000000; margin-top: 4px;">
                  <div>Vehicle No: <strong style="color: #000000;">${vehicleNo}</strong></div>
                  <div>Driver: <strong style="color: #000000;">${driverName}</strong></div>
                  <div>Driver Phone: <strong style="color: #000000;">${driverPhone}</strong></div>
                  <div>Transport: <strong style="color: #000000;">৳ ${formatMoney(delivery)}</strong></div>
                </div>
              </div>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th style="text-align: center; width: 35px;">#</th>
                    <th>Item Description</th>
                    <th style="text-align: center; width: 60px;">Unit</th>
                    <th style="text-align: right; width: 90px;">Buy Price</th>
                    <th style="text-align: center; width: 45px;">Qty</th>
                    <th style="text-align: right; width: 75px;">Discount</th>
                    <th style="text-align: right; width: 75px;">VAT</th>
                    <th style="text-align: right; width: 100px;">Total (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>

            <div class="bottom-section">
              <div style="max-width: 350px; font-size: 11px; color: #475569;">
                ${p.note ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px;"><strong>Note:</strong> ${p.note}</div>` : ""}
              </div>

              <div class="totals-card">
                <div class="totals-row">
                  <span>Subtotal:</span>
                  <span>৳ ${formatMoney(subtotal)}</span>
                </div>
                ${discount > 0 ? `
                  <div class="totals-row" style="color: #be123c;">
                    <span>Discount:</span>
                    <span>- ৳ ${formatMoney(discount)}</span>
                  </div>
                ` : ""}
                ${vat > 0 ? `
                  <div class="totals-row">
                    <span>VAT:</span>
                    <span>+ ৳ ${formatMoney(vat)}</span>
                  </div>
                ` : ""}
                ${delivery > 0 ? `
                  <div class="totals-row">
                    <span>Transport:</span>
                    <span>+ ৳ ${formatMoney(delivery)}</span>
                  </div>
                ` : ""}
                <div class="grand-total-row">
                  <span>Grand Total:</span>
                  <span>৳ ${formatMoney(grandTotal)}</span>
                </div>
                <div class="totals-row" style="color: #047857; font-weight: 600; border-top: 1px solid #e2e8f0; margin-top: 3px; padding-top: 3px;">
                  <span>Paid Amount:</span>
                  <span>৳ ${formatMoney(paid)}</span>
                </div>
                <div class="totals-row" style="color: ${due > 0 ? '#be123c' : '#334155'}; font-weight: 700;">
                  <span>Due Balance:</span>
                  <span>৳ ${formatMoney(due)}</span>
                </div>
              </div>
            </div>

            <div class="signatures">
              <div class="sign-item">Received By</div>
              <div class="sign-item">Store In-Charge</div>
              <div class="sign-item">Authorized Signature</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (isOpen && autoPrint && purchase) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, purchase]);

  if (!purchase) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Purchase Invoice - ${invoiceNo}`}
      maxWidth="w-full max-w-[800px]"
      footerButtons={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800">
              Payment: {p.paymentType || p.payment_type || (paid > 0 ? "CASH" : "CREDIT")}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                due <= 0
                  ? "bg-emerald-100 text-emerald-800"
                  : paid > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              Status: {p.status || p.paymentStatus || (due <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "DUE")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <Button
              label="Print Invoice"
              onClick={handlePrint}
              color="#009fe3"
              hoverColor="#0085be"
              icon={<FaPrint className="text-white text-xs" />}
            />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        {/* Printable View Container */}
        <div ref={printRef} className="p-3 sm:p-4 bg-white border border-gray-200 rounded-lg text-xs text-black">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-[var(--color-primary)] pb-3 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--color-primary)]">
                {userInfo?.businessName || userInfo?.organizationName || "Cash Boi Inventory"}
              </h2>
              <p className="text-[11px] text-black">
                Phone: {userInfo?.phone || userInfo?.phoneNumber || "N/A"}
              </p>
              <p className="text-[11px] text-black">
                Branch: {userInfo?.branchName || `Branch #${userInfo?.branchId || 1}`}
              </p>
            </div>
            <div className="sm:text-right">
              <h1 className="text-base sm:text-lg font-bold text-black uppercase tracking-tight">
                Purchase Invoice
              </h1>
              <p className="text-xs font-medium text-black">
                Invoice #: <span className="font-semibold">{invoiceNo}</span>
              </p>
              <p className="text-[11px] text-black">
                Date: {invoiceDate}
              </p>
              {challanNo && (
                <p className="text-[11px] text-black">
                  Challan Ref: <span className="font-medium text-black">{challanNo}</span>
                </p>
              )}
            </div>
          </div>

          {/* Supplier and Challan Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
            <div className="bg-gray-50 p-2.5 rounded-md border border-gray-200">
              <span className="text-[10px] font-bold text-black uppercase tracking-wider block mb-1">
                Supplier Information
              </span>
              <p className="font-bold text-black text-xs">{supplierName}</p>
              {supplierPhone && (
                <p className="text-black text-[11px] flex items-center gap-1.5 mt-0.5">
                  <FaPhone size={10} className="text-black" /> {supplierPhone}
                </p>
              )}
              {supplierAddress && (
                <p className="text-black text-[11px] flex items-center gap-1.5 mt-0.5">
                  <FaMapMarkerAlt size={10} className="text-black" /> {supplierAddress}
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-2.5 rounded-md border border-gray-200">
              <span className="text-[10px] font-bold text-black uppercase tracking-wider block mb-1">
                Logistics & Transport
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-black">
                <div>
                  <span className="text-black font-normal">Vehicle No:</span>{" "}
                  <span className="font-medium text-black">{vehicleNo}</span>
                </div>
                <div>
                  <span className="text-black font-normal">Driver:</span>{" "}
                  <span className="font-medium text-black">{driverName}</span>
                </div>
                <div>
                  <span className="text-black font-normal">Driver Phone:</span>{" "}
                  <span className="font-medium text-black">{driverPhone}</span>
                </div>
                <div>
                  <span className="text-black font-normal">Transport:</span>{" "}
                  <span className="font-medium text-black">৳ {formatMoney(delivery)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto my-2 border border-gray-200 rounded-md">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-gray-100 text-black font-semibold border-b border-gray-200 text-xs">
                <tr>
                  <th className="py-2 px-2 text-center w-8">#</th>
                  <th className="py-2 px-2">Item Description</th>
                  <th className="py-2 px-2 text-center">Unit</th>
                  <th className="py-2 px-2 text-right">Buy Price</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Discount</th>
                  <th className="py-2 px-2 text-right">VAT</th>
                  <th className="py-2 px-2 text-right">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-black">
                {details.length > 0 ? (
                  details.map((item: any, idx) => {
                    const itemPrice = Number(item.buyPrice ?? item.buy_price ?? item.price ?? item.rate ?? item.unitPrice ?? item.sellPrice ?? 0);
                    const itemQty = Number(item.quantity ?? item.qty ?? item.count ?? 1);
                    const itemDisc = Number(item.discount ?? item.discount_amount ?? 0);
                    const itemVat = Number(item.vat ?? item.vat_amount ?? 0);
                    const itemTotal = Number(item.total ?? item.total_price ?? item.subtotal ?? (itemPrice * itemQty - itemDisc + itemVat));

                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-1.5 px-2 text-center text-black">{idx + 1}</td>
                        <td className="py-1.5 px-2">
                          <span className="font-semibold text-black block">{item.productName || item.product_name || item.name || "Product"}</span>
                          {(item.pcode || item.productCode || item.product_code || item.code) && (
                            <span className="text-[10px] text-black/80">
                              Code: {item.pcode || item.productCode || item.product_code || item.code}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center text-black">{item.unit || item.unitName || "pcs"}</td>
                        <td className="py-1.5 px-2 text-right text-black">৳ {formatMoney(itemPrice)}</td>
                        <td className="py-1.5 px-2 text-center font-semibold text-black">{itemQty}</td>
                        <td className="py-1.5 px-2 text-right text-black">৳ {formatMoney(itemDisc)}</td>
                        <td className="py-1.5 px-2 text-right text-black">৳ {formatMoney(itemVat)}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-black">
                          ৳ {formatMoney(itemTotal)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-black font-medium">
                      No line items recorded for this purchase.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mt-3">
            <div className="text-[11px] text-black max-w-sm">
              {purchase.note && (
                <div className="bg-amber-50 p-2 rounded border border-amber-200">
                  <span className="font-semibold text-amber-900 block">Note / Instructions:</span>
                  <p className="text-black mt-0.5">{purchase.note}</p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-64 bg-gray-50 p-2.5 rounded-md border border-gray-200 text-xs text-black">
              <div className="flex justify-between py-1 text-black font-medium">
                <span>Subtotal:</span>
                <span className="text-right">৳ {formatMoney(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1 text-rose-700 font-medium">
                  <span>Discount:</span>
                  <span className="text-right">- ৳ {formatMoney(discount)}</span>
                </div>
              )}
              {vat > 0 && (
                <div className="flex justify-between py-1 text-black font-medium">
                  <span>VAT / Tax:</span>
                  <span className="text-right">+ ৳ {formatMoney(vat)}</span>
                </div>
              )}
              {delivery > 0 && (
                <div className="flex justify-between py-1 text-black font-medium">
                  <span>Transport / Freight:</span>
                  <span className="text-black text-right">+ ৳ {formatMoney(delivery)}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-t border-gray-300 font-bold text-sm text-[var(--color-primary)]">
                <span>Grand Total:</span>
                <span className="text-right">৳ {formatMoney(grandTotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-700 font-semibold border-t border-gray-200">
                <span>Paid Amount:</span>
                <span className="text-right">৳ {formatMoney(paid)}</span>
              </div>
              <div className={`flex justify-between py-1 font-bold border-t border-gray-200 ${due > 0 ? "text-rose-700" : "text-black"}`}>
                <span>Due Balance:</span>
                <span className="text-right">৳ {formatMoney(due)}</span>
              </div>
            </div>
          </div>

          {/* Signature Footer */}
          <div className="hidden sm:flex justify-between items-center mt-12 pt-4 border-t border-dashed border-gray-300 text-[11px] text-black">
            <div className="text-center w-36 border-t border-gray-400 pt-1 font-medium text-black">
              Received By
            </div>
            <div className="text-center w-36 border-t border-gray-400 pt-1 font-medium text-black">
              Store In-Charge
            </div>
            <div className="text-center w-36 border-t border-gray-400 pt-1 font-medium text-black">
              Authorized Signature
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseInvoiceModal;
