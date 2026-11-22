import { useSyncExternalStore } from "react";
import type { jsPDF } from "jspdf";
import { showSuccessToast } from "@/utils/toast-utils";

export interface PdfPreviewData {
  doc?: jsPDF | null;
  blob?: Blob | null;
  blobUrl?: string | null;
  fileName: string;
  title: string;
  subtitle?: string;
  successMessage?: string;
}

export interface PdfPreviewState {
  isOpen: boolean;
  data: PdfPreviewData | null;
}

const initialState: PdfPreviewState = {
  isOpen: false,
  data: null,
};

let currentState: PdfPreviewState = { ...initialState };
const listeners = new Set<() => void>();

export function getPdfPreviewSnapshot(): PdfPreviewState {
  return currentState;
}

export function subscribePdfPreview(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Open the PDF Preview modal with either a jsPDF instance or a Blob/blobUrl
 */
export function openPdfPreview(params: {
  doc?: jsPDF | null;
  blob?: Blob | null;
  blobUrl?: string | null;
  fileName: string;
  title: string;
  subtitle?: string;
  successMessage?: string;
}): void {
  // Clean up any previously created object URL if it was generated internally
  if (currentState.data?.blobUrl && currentState.data.doc) {
    try {
      URL.revokeObjectURL(currentState.data.blobUrl);
    } catch {
      // ignore
    }
  }

  let finalBlob = params.blob || null;
  let finalBlobUrl = params.blobUrl || null;

  if (params.doc && !finalBlob) {
    try {
      finalBlob = params.doc.output("blob");
    } catch (e) {
      console.warn("Could not extract blob from jsPDF instance:", e);
    }
  }

  if (finalBlob && !finalBlobUrl) {
    try {
      finalBlobUrl = URL.createObjectURL(finalBlob);
    } catch (e) {
      console.warn("Could not create object URL from blob:", e);
    }
  }

  currentState = {
    isOpen: true,
    data: {
      ...params,
      blob: finalBlob,
      blobUrl: finalBlobUrl,
    },
  };
  notify();
}

/**
 * Close the PDF Preview modal and clean up object URLs to prevent memory leaks
 */
export function closePdfPreview(): void {
  if (currentState.data?.blobUrl && currentState.data.doc) {
    try {
      URL.revokeObjectURL(currentState.data.blobUrl);
    } catch {
      // ignore
    }
  }
  currentState = {
    isOpen: false,
    data: null,
  };
  notify();
}

/**
 * Trigger the actual download of the previewed PDF file
 */
export function downloadPdfFromPreview(): void {
  if (!currentState.data) return;
  const { doc, blobUrl, fileName, title, successMessage } = currentState.data;

  try {
    if (doc) {
      doc.save(fileName);
    } else if (blobUrl) {
      const a = document.createElement("a");
      a.style.position = "fixed";
      a.style.left = "-9999px";
      a.style.top = "-9999px";
      a.style.opacity = "0";
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    const msg =
      successMessage || `${title || "Report"} PDF downloaded successfully!`;
    showSuccessToast(msg);
  } catch (err: any) {
    console.error("Failed to download PDF from preview:", err);
  } finally {
    closePdfPreview();
  }
}

/**
 * React hook to subscribe to PDF preview state
 */
export function usePdfPreview(): PdfPreviewState {
  return useSyncExternalStore(subscribePdfPreview, getPdfPreviewSnapshot);
}
