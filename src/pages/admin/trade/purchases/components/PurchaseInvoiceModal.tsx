import React, { useRef } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import type { PurchaseItem } from "@/types";
import { FaPrint, FaDownload, FaBuilding, FaUserTie, FaPhone, FaMapMarkerAlt, FaFileInvoice, FaTruck, FaCalendarAlt } from "react-icons/fa";
import { getUserInfo } from "@/utils/auth-storage";

interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: PurchaseItem | null;
}

const PurchaseInvoiceModal: React.FC<PurchaseInvoiceModalProps> = ({
  isOpen,
  onClose,
  purchase,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const userInfo = getUserInfo();

  if (!purchase) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Invoice - ${purchase.invoiceNo || "Invoice"}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; font-size: 12px; line-height: 1.4; padding: 0; margin: 0; }
            .invoice-box { max-width: 100%; margin: auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #009fe3; padding-bottom: 8px; margin-bottom: 12px; }
            .company-title { font-size: 18px; font-weight: bold; color: #009fe3; }
            .invoice-title { font-size: 20px; font-weight: bold; text-align: right; color: #1f2937; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 12px; }
            .card-info { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; }
            .info-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th { background: #f3f4f6; color: #374151; font-weight: 600; text-align: left; padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 11px; }
            td { padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 11px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-table { width: 300px; margin-left: auto; margin-top: 8px; }
            .total-table td { padding: 4px 8px; }
            .grand-total { font-weight: bold; font-size: 13px; background: #f0f9ff; color: #0369a1; }
            .footer-sign { margin-top: 40px; display: flex; justify-content: space-between; }
            .sign-box { border-top: 1px dashed #9ca3af; width: 150px; text-align: center; padding-top: 4px; font-size: 11px; color: #4b5563; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatMoney = (amount: number | string | undefined) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const p: any = purchase;
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
                        <td className="py-1.5 px-2 text-center text-black font-mono">{idx + 1}</td>
                        <td className="py-1.5 px-2">
                          <span className="font-semibold text-black block">{item.productName || item.product_name || item.name || "Product"}</span>
                          {(item.pcode || item.productCode || item.product_code || item.code) && (
                            <span className="text-[10px] text-black/80 font-mono">
                              Code: {item.pcode || item.productCode || item.product_code || item.code}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center text-black">{item.unit || item.unitName || "pcs"}</td>
                        <td className="py-1.5 px-2 text-right text-black font-mono">৳ {formatMoney(itemPrice)}</td>
                        <td className="py-1.5 px-2 text-center font-semibold text-black">{itemQty}</td>
                        <td className="py-1.5 px-2 text-right text-black font-mono">৳ {formatMoney(itemDisc)}</td>
                        <td className="py-1.5 px-2 text-right text-black font-mono">৳ {formatMoney(itemVat)}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-black font-mono">
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
                <span className="font-mono text-right">৳ {formatMoney(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1 text-rose-700 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono text-right">- ৳ {formatMoney(discount)}</span>
                </div>
              )}
              {vat > 0 && (
                <div className="flex justify-between py-1 text-black font-medium">
                  <span>VAT / Tax:</span>
                  <span className="font-mono text-right">+ ৳ {formatMoney(vat)}</span>
                </div>
              )}
              {delivery > 0 && (
                <div className="flex justify-between py-1 text-black font-medium">
                  <span>Transport / Freight:</span>
                  <span className="font-mono text-right">+ ৳ {formatMoney(delivery)}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-t border-gray-300 font-bold text-sm text-[var(--color-primary)]">
                <span>Grand Total:</span>
                <span className="font-mono text-right">৳ {formatMoney(grandTotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-700 font-semibold border-t border-gray-200">
                <span>Paid Amount:</span>
                <span className="font-mono text-right">৳ {formatMoney(paid)}</span>
              </div>
              <div className={`flex justify-between py-1 font-bold border-t border-gray-200 ${due > 0 ? "text-rose-700" : "text-black"}`}>
                <span>Due Balance:</span>
                <span className="font-mono text-right">৳ {formatMoney(due)}</span>
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
