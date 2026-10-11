"use client";

import { useRef, useState } from "react";
import {
  Camera,
  FileText,
  Image as ImageIcon,
  Loader2,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ReceiptScanner({
  onExtracted,
}) {
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const [loading, setLoading] = useState(false);

  const processFile = async (file) => {
    if (!file) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/receipt",
        {
          method: "POST",
          body: formData,
        }
      );

      const result =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Failed to scan receipt."
        );
      }

      onExtracted(result.data);

      toast.success(
        "Receipt scanned successfully!"
      );
    } catch (error) {
      console.error(
        "Receipt scanner error:",
        error
      );

      toast.error(
        error?.message ||
          "Could not scan the receipt."
      );
    } finally {
      setLoading(false);

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }

      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }

      if (pdfInputRef.current) {
        pdfInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (event) => {
    const file =
      event.target.files?.[0];

    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <ScanLine className="h-5 w-5 text-primary" />
        </div>

        <div>
          <h3 className="font-semibold">
            Scan Receipt
          </h3>

          <p className="text-sm text-muted-foreground">
            Upload or take a photo of your receipt
            and we will fill the expense details for you.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() =>
            cameraInputRef.current?.click()
          }
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-2 h-4 w-4" />
          )}

          Take Photo
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() =>
            imageInputRef.current?.click()
          }
        >
          <ImageIcon className="mr-2 h-4 w-4" />

          Upload Image
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() =>
            pdfInputRef.current?.click()
          }
        >
          <FileText className="mr-2 h-4 w-4" />

          Upload PDF
        </Button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleFileChange}
      />

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />

          Analyzing receipt with AI...
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Supported: JPG, PNG and PDF.
        Maximum size: 10 MB.
      </p>
    </div>
  );
}