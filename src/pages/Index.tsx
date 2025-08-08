import { useState } from "react";
import { FileText } from "lucide-react";
import { PDFUploader } from "@/components/pdf/PDFUploader";
import { PDFViewer } from "@/components/pdf/PDFViewer";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    setSelectedFile(file);
    setIsLoading(false);
  };

  const handleClose = () => {
    setSelectedFile(null);
  };

  if (selectedFile) {
    return <PDFViewer file={selectedFile} onClose={handleClose} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">PDF Viewer</h1>
              <p className="text-sm text-muted-foreground">
                Upload and view PDF documents with ease
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              View Your PDF Documents
            </h2>
            <p className="text-lg text-muted-foreground">
              Upload a PDF file from your computer to view it with our built-in viewer. 
              Navigate pages, zoom, and rotate as needed.
            </p>
          </div>

          <PDFUploader 
            onFileSelect={handleFileSelect} 
            isLoading={isLoading}
          />

          {/* Features */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">Easy Upload</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to select PDF files
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <div className="h-6 w-6 flex items-center justify-center">📄</div>
              </div>
              <h3 className="font-semibold mb-1">Page Navigation</h3>
              <p className="text-sm text-muted-foreground">
                Browse through pages with intuitive controls
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <div className="h-6 w-6 flex items-center justify-center">🔍</div>
              </div>
              <h3 className="font-semibold mb-1">Zoom & Rotate</h3>
              <p className="text-sm text-muted-foreground">
                Adjust view with zoom and rotation controls
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;