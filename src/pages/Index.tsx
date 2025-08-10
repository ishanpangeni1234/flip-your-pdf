// src/pages/Index.tsx

import { useState, useEffect, useCallback } from "react";
import { FileText, Search as SearchIcon, GalleryThumbnails, Save, Notebook } from "lucide-react";
import { PDFUploader } from "@/components/pdf/PDFUploader";
import { PDFViewer } from "@/components/pdf/PDFViewer"; // <--- THIS LINE IS CORRECTED
import { getStoredPDF, clearStoredPDF, storePDF, clearStoredNotes } from "@/lib/pdf-storage";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout"; // Import the Layout component

// Feature Card Component
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <Card className="text-center bg-card/80 backdrop-blur-sm h-full">
    <CardHeader>
       <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-lg">
        {icon}
      </div>
      <CardTitle className="text-lg font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        {children}
      </p>
    </CardContent>
  </Card>
);

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true to check storage
  const { toast } = useToast();

  // Check for a stored PDF on initial component mount
  useEffect(() => {
    const loadStoredPDF = async () => {
      try {
        const file = await getStoredPDF();
        if (file) {
          setSelectedFile(file);
          toast({
            title: "Restored previous session",
            description: `Loaded "${file.name}" from your last session.`,
          });
        }
      } catch (error) {
        console.error("Failed to load stored PDF:", error);
        toast({
          title: "Could not load stored PDF",
          description: "There was an error trying to restore your previous session.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredPDF();
  }, [toast]);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      await storePDF(file);
      setSelectedFile(file);
    } catch (error) {
        console.error("Failed to store PDF:", error);
        toast({
          title: "Could not save PDF for next session",
          description: "The file will work for now, but won't be remembered.",
          variant: "destructive",
        });
        // Still load the viewer for the current session even if storage fails
        setSelectedFile(file);
    } finally {
        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsLoading(false);
    }
  }, [toast]);

  const handleClose = useCallback(async () => {
    const fileName = selectedFile?.name;
    setSelectedFile(null);
    try {
      await clearStoredPDF();
      if (fileName) {
        await clearStoredNotes(fileName);
      }
       toast({
        title: "Session cleared",
        description: "The PDF and notes have been removed from local storage.",
      });
    } catch (error) {
       console.error("Failed to clear stored PDF/Notes:", error);
       toast({
          title: "Could not clear PDF session",
          description: "There was an error clearing the stored data.",
          variant: "destructive",
        });
    }
  }, [toast, selectedFile]);

  // If a file is selected, show the PDFViewer directly without the layout wrapper
  // as PDFViewer is likely a full-page component itself.
  if (selectedFile) {
    return <PDFViewer file={selectedFile} onClose={handleClose} />;
  }

  // Otherwise, show the landing page content wrapped in the global Layout
  return (
    <Layout>
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,rgba(200,200,255,0.1),transparent)] dark:bg-[radial-gradient(circle_500px_at_50%_200px,rgba(40,50,80,0.3),transparent)]"></div>
      </div>
      
      {/* Removed original Header - now handled by Layout/Navbar */}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 sm:py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl mb-4">
              View Your PDF Instantly
            </h2>
            <p className="max-w-xl mx-auto text-lg text-muted-foreground">
              Drag & drop a PDF to get started. Your files and notes are stored locally in your browser — private and secure.
            </p>
          </div>

          <PDFUploader 
            onFileSelect={handleFileSelect} 
            isLoading={isLoading}
          />

          {/* Features */}
          <div className="mt-20">
             <h3 className="text-2xl font-bold text-center tracking-tight mb-8">Powerful Features Included</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <FeatureCard icon={<SearchIcon className="h-6 w-6" />} title="Full-Text Search">
                  Quickly find any text within your document and jump between matches.
                </FeatureCard>
                <FeatureCard icon={<GalleryThumbnails className="h-6 w-6" />} title="Thumbnail View">
                  Navigate your document with ease using a sidebar of page thumbnails.
                </FeatureCard>
                <FeatureCard icon={<Notebook className="h-6 w-6" />} title="Side-by-Side Notes">
                    Take notes alongside your PDF. All your notes are saved per document.
                </FeatureCard>
                <FeatureCard icon={<Save className="h-6 w-6" />} title="Persistent Storage">
                  Your PDF and notes are automatically saved locally for your next session.
                </FeatureCard>
            </div>
          </div>
        </div>
      </div>

      {/* Removed original Footer - now handled by Layout/Footer */}
    </Layout>
  );
};

export default Index;