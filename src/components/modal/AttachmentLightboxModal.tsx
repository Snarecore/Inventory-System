import React, { useState } from "react";
import { FiDownload, FiPrinter, FiZoomIn, FiZoomOut, FiRotateCw, FiX, FiMaximize2 } from "react-icons/fi";
import { IoDocumentTextOutline } from "react-icons/io5";

interface AttachmentLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  invoiceNo?: string;
}

export const AttachmentLightboxModal: React.FC<AttachmentLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = "Challan / Invoice Attachment",
  invoiceNo,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const downloadFileName = invoiceNo
    ? `challan-attachment-${invoiceNo}.png`
    : "challan-attachment.png";

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!imageUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${invoiceNo || ""}</title>
          <style>
            body { margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; }
            .header { margin-bottom: 12px; text-align: center; }
            h2 { margin: 0 0 4px 0; font-size: 16px; color: #111827; }
            p { margin: 0; font-size: 12px; color: #4b5563; }
            img { max-width: 95vw; max-height: 85vh; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 6px; }
            @media print {
              body { padding: 0; }
              img { max-width: 100%; max-height: 95vh; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${title}</h2>
            ${invoiceNo ? `<p>Invoice / Ref: <strong>${invoiceNo}</strong></p>` : ""}
          </div>
          <img src="${imageUrl}" onload="window.print();window.close();" alt="Attachment" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-sky-100 text-[var(--color-primary)] shrink-0">
              <IoDocumentTextOutline size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-black truncate">{title}</h2>
              {invoiceNo && (
                <span className="text-[10px] text-gray-500 block truncate">
                  Invoice: <span className="font-semibold text-black">{invoiceNo}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <FiZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <FiZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
              title="Rotate 90°"
            >
              <FiRotateCw size={14} />
            </button>
            {(zoom !== 1 || rotation !== 0) && (
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1 text-[10px] font-semibold text-gray-600 hover:text-black hover:bg-gray-200 rounded transition-colors cursor-pointer"
                title="Reset Zoom & Rotation"
              >
                Reset
              </button>
            )}
            <div className="h-4 w-px bg-gray-300 mx-0.5" />
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
              title="Print Attachment"
            >
              <FiPrinter size={14} />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 rounded-md transition-all shadow-xs cursor-pointer"
              title="Download File"
            >
              <FiDownload size={12} />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Image Preview Canvas */}
        <div className="flex-1 bg-gray-900/90 min-h-[300px] max-h-[75vh] overflow-auto flex items-center justify-center p-3 select-none relative">
          <div
            className="transition-transform duration-200 flex items-center justify-center origin-center"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={imageUrl}
              alt="Challan Attachment"
              className="max-w-full max-h-[70vh] object-contain rounded-md shadow-2xl border border-gray-700"
            />
          </div>
        </div>

        {/* Footer Info & Action */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-white border-t border-gray-200 text-xs">
          <span className="text-[11px] text-gray-500">
            Zoom: <strong>{Math.round(zoom * 100)}%</strong> {rotation > 0 && `| Rotation: ${rotation}°`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs cursor-pointer"
            >
              <FiDownload size={13} />
              <span>Download Original File</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttachmentLightboxModal;
