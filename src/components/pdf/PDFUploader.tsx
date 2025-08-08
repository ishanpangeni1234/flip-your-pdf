import { useCallback } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export const PDFUploader = ({ onFileSelect, isLoading }: PDFUploaderProps) => {
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <Card className="p-8">
      <div
        className={cn(
          "upload-zone relative rounded-lg border-2 border-dashed border-border p-12 text-center transition-all duration-300",
          "hover:border-primary/50 hover:bg-gradient-subtle",
          isLoading && "pointer-events-none opacity-50"
        )}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
        </div>
        
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {isLoading ? "Loading PDF..." : "Upload PDF Document"}
        </h3>
        
        <p className="mb-6 text-sm text-muted-foreground">
          Drag and drop your PDF file here, or click to browse
        </p>

        <div className="flex items-center justify-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Supports PDF files only</span>
        </div>

        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={isLoading}
        />
      </div>

      <div className="mt-6 text-center">
        <Button variant="outline" className="relative overflow-hidden">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={isLoading}
          />
          Choose File
        </Button>
      </div>
    </Card>
  );
};