import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// ✅ CORRECT: Use the worker from public folder
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  file: File;
  onClose: () => void;
}

export const PDFViewer = ({ file, onClose }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const { toast } = useToast();

  // Debug worker setup
  useState(() => {
    console.log("🔧 PDF.js Worker Setup:", {
      workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
      version: pdfjs.version,
      baseUrl: window.location.origin
    });
  });

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log("✅ PDF loaded successfully:", { numPages, fileName: file.name });
    setNumPages(numPages);
    setIsLoading(false);
    setLoadError("");
    toast({
      title: "PDF loaded successfully",
      description: `Document contains ${numPages} pages`,
    });
  }, [toast, file.name]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("❌ Error loading PDF:", {
      error: error.message,
      stack: error.stack,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
      workerStatus: "Check if worker file exists at: " + window.location.origin + pdfjs.GlobalWorkerOptions.workerSrc
    });
    
    setIsLoading(false);
    setLoadError(error.message);
    
    let errorMessage = "Please make sure the file is a valid PDF document";
    if (error.message.includes("worker")) {
      errorMessage = "PDF worker failed to load. Make sure pdf.worker.min.js is in the public folder.";
    } else if (error.message.includes("Invalid PDF")) {
      errorMessage = "The selected file is not a valid PDF document.";
    } else if (error.message.includes("password")) {
      errorMessage = "This PDF is password protected and cannot be opened.";
    }
    
    toast({
      title: "Error loading PDF",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast, file.name, file.size, file.type]);

  const validateFile = useCallback(() => {
    console.log("🔍 Validating file:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    if (!file) {
      throw new Error("No file provided");
    }
    
    if (file.type !== "application/pdf") {
      throw new Error(`Invalid file type: ${file.type}. Expected: application/pdf`);
    }
    
    if (file.size === 0) {
      throw new Error("File is empty");
    }
    
    if (file.size > 50 * 1024 * 1024) {
      throw new Error("File too large (max 50MB)");
    }
    
    console.log("✅ File validation passed");
  }, [file]);

  useState(() => {
    try {
      validateFile();
    } catch (error) {
      console.error("❌ File validation failed:", error);
      onDocumentLoadError(error as Error);
    }
  });

  const goToPrevPage = useCallback(() => {
    setPageNumber(prev => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  }, [numPages]);

  const handlePageInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(event.target.value, 10);
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  }, [numPages]);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(3.0, prev + 0.2));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  }, []);

  const rotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-pdf-viewer-bg">
      {/* Toolbar */}
      <Card className="pdf-toolbar rounded-none border-x-0 border-t-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="h-6 w-px bg-border" />
            <span className="text-sm font-medium">{file.name}</span>
            {loadError && (
              <span className="text-sm text-destructive bg-destructive/10 px-2 py-1 rounded">
                Error: {loadError}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Page Navigation */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={pageNumber}
                onChange={handlePageInput}
                min={1}
                max={numPages}
                className="w-16 text-center"
                disabled={isLoading}
              />
              <span className="text-sm text-muted-foreground">
                of {numPages || "?"}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-border mx-2" />

            {/* Zoom Controls */}
            <Button variant="outline" size="sm" onClick={zoomOut} disabled={isLoading}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-muted-foreground min-w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <Button variant="outline" size="sm" onClick={zoomIn} disabled={isLoading}>
              <ZoomIn className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-border mx-2" />

            {/* Rotation */}
            <Button variant="outline" size="sm" onClick={rotate} disabled={isLoading}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* PDF Display */}
      <div className="flex-1 overflow-auto bg-pdf-viewer-bg p-8">
        <div className="flex justify-center">
          <div className="pdf-page">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex flex-col items-center justify-center p-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
                  <p className="text-sm text-muted-foreground">Loading PDF...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center p-12 bg-destructive/10 rounded-lg">
                  <p className="text-destructive text-center mb-2">Failed to load PDF</p>
                  <p className="text-sm text-muted-foreground text-center">{loadError}</p>
                  <Button variant="outline" onClick={onClose} className="mt-4">
                    Go Back
                  </Button>
                </div>
              }
            >
              {!isLoading && numPages > 0 && (
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  loading={
                    <div className="flex items-center justify-center p-12 bg-pdf-page-bg rounded-lg">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center p-12 bg-pdf-page-bg rounded-lg">
                      <p className="text-destructive">Error loading page {pageNumber}</p>
                    </div>
                  }
                />
              )}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
};