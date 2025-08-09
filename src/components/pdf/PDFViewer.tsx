import React, { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api"; 
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Search, FileUp, 
  PanelLeftClose, PanelLeftOpen, Rows, Columns, ChevronUp, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Set the workerSrc for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// --- Thumbnail Component ---
interface ThumbnailProps {
  pageNumber: number;
  onThumbnailClick: (page: number) => void;
  isActive: boolean;
}

const Thumbnail = ({ pageNumber, onThumbnailClick, isActive }: ThumbnailProps) => (
  <button
    type="button"
    className={cn(
      "mb-2 cursor-pointer p-1 border-2 rounded-md w-full",
      isActive ? "border-primary" : "border-transparent",
      "hover:border-primary/50 transition-colors"
    )}
    onClick={() => onThumbnailClick(pageNumber)}
  >
    <Page
      pageNumber={pageNumber}
      width={100}
      renderTextLayer={false}
      renderAnnotationLayer={false}
      className="shadow-md rounded"
      loading={<div className="w-[100px] h-[129px] bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />}
    />
    <p className="text-center text-xs mt-1 text-muted-foreground">{pageNumber}</p>
  </button>
);

// --- Main PDF Viewer Component ---
interface PDFViewerProps {
  file: File;
  onClose: () => void;
}

export const PDFViewer = ({ file, onClose }: PDFViewerProps) => {
  // Document and Page State
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1); // Represents the *current* most visible page
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // --- VIRTUALIZATION STATE ---
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const { toast } = useToast();

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<{ pageNumber: number }[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);

  // Refs for DOM elements
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]); // Ref to hold each page's container div

  // VIRTUALIZATION: Capture page dimensions on first render of any page
  const onPageRenderSuccess = useCallback((page: { originalWidth: number; originalHeight: number }) => {
    // Only set if not already set, ensures all placeholders have consistent dimensions
    if (!pageDimensions) {
      setPageDimensions({ width: page.originalWidth, height: page.originalHeight });
    }
  }, [pageDimensions]);

  // Document Callbacks
  const onDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy) => {
    setPdfProxy(pdf);
    setNumPages(pdf.numPages);
    // Initialize pageRefs with nulls for all pages (1-indexed)
    pageRefs.current = Array(pdf.numPages + 1).fill(null); 
    setIsLoading(false);

    // VIRTUALIZATION: Initially render the first few pages
    const initialPages = new Set<number>();
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) { // Render first 3 pages
      initialPages.add(i);
    }
    setRenderedPages(initialPages);

    toast({
      title: "PDF loaded successfully",
      description: `${file.name} contains ${pdf.numPages} pages`,
    });
  }, [toast, file.name]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("❌ Error loading PDF:", { error: error.message, fileName: file.name });
    setIsLoading(false);
    let errorMessage = "Please make sure the file is a valid PDF document.";
    if (error.message.includes("worker")) {
      errorMessage = "PDF worker failed to load. Ensure pdf.worker.min.js is in the /public folder.";
    } else if (error.message.includes("Invalid PDF")) {
      errorMessage = "The selected file is not a valid PDF document.";
    }
    toast({ title: "Error loading PDF", description: errorMessage, variant: "destructive" });
  }, [toast, file.name]);

  // --- Smooth Scroll Navigation ---
  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, numPages || 1));
    const targetElement = pageRefs.current[newPage];

    if (targetElement) {
        targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
        // Optimistically set page number for responsive UI, observer will confirm
        setPageNumber(newPage);
    }
  }, [numPages]);

  const goToPrevPage = useCallback(() => goToPage(pageNumber - 1), [pageNumber, goToPage]);
  const goToNextPage = useCallback(() => goToPage(pageNumber + 1), [pageNumber, goToPage]);

  // --- Intersection Observer to track current page & manage virtualization window ---
  useEffect(() => {
    if (!numPages || !viewerRef.current) return;

    // Observer for tracking the most visible page
    const pageVisibilityObserver = new IntersectionObserver(
      (entries) => {
        const visiblePages = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visiblePages.length > 0) {
          const mostVisiblePage = visiblePages[0].target;
          const newPageNumber = parseInt(mostVisiblePage.getAttribute('data-page-number')!, 10);
          
          setPageNumber(current => current === newPageNumber ? current : newPageNumber);
        }
      },
      { root: viewerRef.current, threshold: 0.2 } // Adjust threshold as needed
    );

    // Observe all page elements
    for (let i = 1; i <= numPages; i++) {
      const el = pageRefs.current[i];
      if (el) pageVisibilityObserver.observe(el);
    }

    return () => {
      pageVisibilityObserver.disconnect();
    };
  }, [numPages]); // Re-run when numPages changes (document loads)

  // VIRTUALIZATION: Update the set of rendered pages based on the current page
  useEffect(() => {
    if (!numPages) return;
    const newPages = new Set<number>();
    const buffer = 2; // Render 2 pages before and 2 pages after the current one
    for (let i = pageNumber - buffer; i <= pageNumber + buffer; i++) {
        if (i > 0 && i <= numPages) {
            newPages.add(i);
        }
    }
    setRenderedPages(newPages);
  }, [pageNumber, numPages]);


  // --- Zoom and Fit Logic (Corrected Dependencies) ---
  const adjustScale = useCallback((getScale: (viewerRect: DOMRect, pageRect: DOMRect) => number) => {
    if (!viewerRef.current) return;
    const currentPageWrapper = pageRefs.current[pageNumber];
    if (!currentPageWrapper) return;
    
    if (!pageDimensions) {
        toast({
            title: "Zoom Error",
            description: "Page dimensions not yet available. Please wait or scroll to a page first.",
            variant: "destructive"
        });
        return;
    }

    const originalPageWidth = pageDimensions.width;
    const originalPageHeight = pageDimensions.height;

    const viewerRect = viewerRef.current.getBoundingClientRect();
    
    // The `pageRect` passed to `getScale` is a virtual representation of the current page size
    // based on its original dimensions and the current scale.
    const newScale = getScale(viewerRect, { width: originalPageWidth * scale, height: originalPageHeight * scale } as DOMRect);
    setScale(newScale);
  }, [scale, pageNumber, pageDimensions, toast]); // Removed 'adjustScale' from its own dependencies

  const fitToPage = useCallback(() => {
    // `pageRect` received here is derived by `adjustScale` from `pageDimensions` and `scale`
    adjustScale((viewerRect, pageRect) => {
      // To calculate the NEW scale to fit, we need the ORIGINAL dimensions of the page.
      // We already have `pageDimensions` in the outer scope, or we can derive from `pageRect / scale` if `pageRect` represents current scaled size
      // It's safer to use the stored `pageDimensions` directly as they are stable original values.
      const originalPageWidth = pageDimensions!.width; // Use stored original dimensions
      const originalPageHeight = pageDimensions!.height; // Use stored original dimensions
      return Math.min(viewerRect.width / originalPageWidth, viewerRect.height / originalPageHeight) * 0.95;
    });
  }, [adjustScale, pageDimensions]); // Depend on adjustScale and pageDimensions

  const fitToWidth = useCallback(() => {
    adjustScale((viewerRect, pageRect) => {
      const originalPageWidth = pageDimensions!.width; // Use stored original dimensions
      return viewerRect.width / originalPageWidth * 0.95;
    });
  }, [adjustScale, pageDimensions]); // Depend on adjustScale and pageDimensions

  // Global Search Logic
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !pdfProxy) {
      setSearchResults([]);
      setCurrentMatchIndex(0);
      return;
    }

    setIsSearching(true);
    toast({ title: "Searching...", description: `Looking for "${searchQuery}" in the document.` });

    const newResults: { pageNumber: number }[] = [];
    const term = searchQuery.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdfProxy.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join('');
        if (regex.test(pageText)) {
            newResults.push({ pageNumber: i });
        }
        regex.lastIndex = 0; // Reset regex for next page
      } catch (error) {
        console.error(`Error processing page ${i} for search:`, error);
        toast({ title: "Search Error", description: `Could not process page ${i}.`, variant: "destructive" });
      }
    }

    setSearchResults(newResults);
    setIsSearching(false);

    if (newResults.length > 0) {
      setCurrentMatchIndex(0);
      goToPage(newResults[0].pageNumber); // Scroll to the first match
      toast({ title: "Search Complete", description: `Found matches on ${newResults.length} page(s).` });
    } else {
      toast({ title: "No Results", description: `Could not find "${term}".` });
    }
  }, [searchQuery, pdfProxy, numPages, toast, goToPage]);

  // Search Result Navigation
  const goToNextMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex(prev => (prev + 1) % searchResults.length);
  }, [searchResults.length]);

  const goToPrevMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
  }, [searchResults.length]);

  // --- [FIXED] ---
  // This effect scrolls to the active search result.
  // It ONLY runs when the search results change or the user clicks next/prev match.
  // Crucially, it does NOT depend on `pageNumber`, which prevents the "scroll lock" bug.
  useEffect(() => {
    if (searchResults.length > 0 && searchResults[currentMatchIndex]) {
      const targetPage = searchResults[currentMatchIndex].pageNumber;
      goToPage(targetPage);
    }
  }, [currentMatchIndex, searchResults, goToPage]);
  
  // --- Highlighting Logic ---
  useEffect(() => {
    // Function to remove existing highlights from a given textLayer element
    const removeHighlights = (textLayer: Element) => {
      textLayer.querySelectorAll('mark.search-highlight').forEach(mark => {
        const parent = mark.parentNode;
        if (parent) {
          // Replace the mark with its text content
          parent.insertBefore(document.createTextNode(mark.textContent || ''), mark);
          parent.removeChild(mark);
          parent.normalize(); // Merges adjacent text nodes
        }
      });
    };

    // Apply or remove highlights across all currently rendered pages
    const applyHighlights = () => {
      const term = searchQuery.trim();
      const shouldHighlight = term !== "";
      const regex = shouldHighlight ? new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;

      // Iterate only through currently rendered page wrappers
      renderedPages.forEach(pageNum => {
        const pageWrapper = pageRefs.current[pageNum];
        if (!pageWrapper) return;

        const textLayer = pageWrapper.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) return; // Text layer not yet rendered for this page

        // Always remove existing highlights first from this page
        removeHighlights(textLayer);

        if (!shouldHighlight || !regex) return; // Skip highlighting if no search query

        // Apply new highlights
        const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT, null);
        const textNodes: Node[] = [];
        while(walker.nextNode()) textNodes.push(walker.currentNode);

        textNodes.forEach(textNode => {
          if (!textNode.textContent || !regex.test(textNode.textContent)) return;

          regex.lastIndex = 0; // Reset regex state for global flag
          
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;

          textNode.textContent.replace(regex, (match, offset) => {
            if (offset > lastIndex) {
              fragment.appendChild(document.createTextNode(textNode.textContent!.substring(lastIndex, offset)));
            }
            const mark = document.createElement('mark');
            mark.className = 'search-highlight bg-yellow-400/80 dark:bg-yellow-500/80'; 
            mark.appendChild(document.createTextNode(match));
            fragment.appendChild(mark);

            lastIndex = offset + match.length;
            return match;
          });
          
          if (lastIndex < textNode.textContent.length) {
            fragment.appendChild(document.createTextNode(textNode.textContent.substring(lastIndex)));
          }

          // Only replace if changes were made and parent node exists
          if (fragment.childNodes.length > 0 && textNode.parentNode) {
              textNode.parentNode.replaceChild(fragment, textNode);
          }
        });
      });
    };

    // Use a timeout to ensure react-pdf has rendered the text layers for the *newly visible* pages.
    // This is crucial for virtualization as text layers might not be immediate.
    const highlightTimer = setTimeout(applyHighlights, 100); 

    return () => clearTimeout(highlightTimer);
  }, [searchQuery, renderedPages, scale]); // Re-run when search query changes, visible pages change, or zoom changes


  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).tagName === 'INPUT') return;
      
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'f': document.getElementById("search-input")?.focus(); event.preventDefault(); break;
          case 'b': setIsSidebarOpen(open => !open); event.preventDefault(); break;
          case '0': fitToPage(); event.preventDefault(); break;
          case '=': setScale(s => Math.min(3.0, s + 0.2)); event.preventDefault(); break;
          case '-': setScale(s => Math.max(0.2, s - 0.2)); event.preventDefault(); break;
        }
      } else {
        switch (event.key) {
          case "ArrowLeft": goToPrevPage(); break;
          case "ArrowRight": goToNextPage(); break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevPage, goToNextPage, fitToPage]);

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-200 dark:bg-gray-800 font-sans">
        {/* Sidebar */}
        <div className={cn("transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 flex-shrink-0", isSidebarOpen ? "w-48" : "w-0")}>
          <div className="p-2 h-full overflow-y-auto overflow-x-hidden">
            <Document file={file} loading="" onLoadError={onDocumentLoadError}>
              {Array.from(new Array(numPages), (_, index) => (
                 <Thumbnail
                    key={`thumb-${index + 1}`}
                    pageNumber={index + 1}
                    onThumbnailClick={goToPage}
                    isActive={pageNumber === index + 1}
                  />
              ))}
            </Document>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex flex-col flex-1 min-w-0">
          <Card className="rounded-none border-0 border-b z-10">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 gap-2 md:gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>{isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}</Button></TooltipTrigger><TooltipContent><p>Toggle Thumbnails (Ctrl+B)</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onClose}><FileUp className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Upload New PDF</p></TooltipContent></Tooltip>
                <div className="h-6 w-px bg-border hidden sm:block" />
                <span className="text-sm font-medium truncate max-w-28 sm:max-w-xs hidden sm:inline" title={file.name}>{file.name}</span>
              </div>
    
              <div className="flex items-center justify-center gap-2 flex-grow min-w-0">
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={pageNumber <= 1}><ChevronLeft className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Previous (←)</p></TooltipContent></Tooltip>
                <div className="flex items-center gap-1.5"><Input type="number" value={pageNumber} onChange={(e) => goToPage(parseInt(e.target.value, 10) || 1)} className="w-16 text-center h-8" disabled={isLoading} /><span className="text-sm text-muted-foreground">of {numPages || "..."}</span></div>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={goToNextPage} disabled={pageNumber >= numPages}><ChevronRight className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Next (→)</p></TooltipContent></Tooltip>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                 <div className="hidden md:flex items-center gap-2">
                    <div className="flex items-center p-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-transparent focus-within:border-primary">
                      <Input
                        id="search-input"
                        placeholder="Search document..."
                        value={searchQuery}
                        onChange={e => {
                          setSearchQuery(e.target.value);
                          if (e.target.value === "") {
                            setSearchResults([]);
                            setCurrentMatchIndex(0);
                          }
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="h-7 w-32 border-none bg-transparent focus-visible:ring-0"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                        {isSearching ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {searchResults.length > 0 && !isSearching && (
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground tabular-nums">
                          {currentMatchIndex + 1} of {searchResults.length}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMatch}><ChevronUp className="h-4 w-4" /></Button></TooltipTrigger>
                          <TooltipContent><p>Previous Match</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMatch}><ChevronDown className="h-4 w-4" /></Button></TooltipTrigger>
                          <TooltipContent><p>Next Match</p></TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                 </div>
                 <div className="h-6 w-px bg-border mx-1" />
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={()=> setScale(s => Math.max(0.2, s - 0.2))}><ZoomOut className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Zoom Out (Ctrl+-)</p></TooltipContent></Tooltip>
                <span className="text-sm font-semibold text-foreground min-w-12 text-center select-none">{Math.round(scale * 100)}%</span>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={()=> setScale(s => Math.min(3.0, s + 0.2))}><ZoomIn className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Zoom In (Ctrl++)</p></TooltipContent></Tooltip>
                <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-1">
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={fitToPage}><Rows className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Fit Page (Ctrl+0)</p></TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={fitToWidth}><Columns className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Fit Width</p></TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setRotation(r => (r + 90) % 360)}><RotateCw className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Rotate</p></TooltipContent></Tooltip>
                </div>
              </div>
            </div>
          </Card>

          {/* --- Main scrollable viewer area --- */}
          <div className="flex-1 overflow-auto p-4 md:p-8" ref={viewerRef}>
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="p-12 flex justify-center items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}
              error={<div className="p-12 bg-destructive/10 text-destructive rounded-lg">Failed to load PDF.</div>}
            >
              <div className="flex flex-col items-center gap-y-4">
                {!isLoading && Array.from(new Array(numPages), (_, index) => {
                  const pageNum = index + 1;
                  const isPageRendered = renderedPages.has(pageNum);

                  // Define a placeholder to maintain scroll height
                  let placeholder: React.ReactNode = null;
                  if (!isPageRendered) {
                      let height = 1056 * scale; // Default fallback height for 8.5x11 inch at 96 DPI
                      let width = 816 * scale;   // Default fallback width
                      if (pageDimensions) {
                          height = pageDimensions.height * scale;
                          width = pageDimensions.width * scale;
                      }
                      placeholder = (
                        <div 
                          style={{ width: `${width}px`, height: `${height}px` }} 
                          className="bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" 
                        />
                      );
                  }

                  return (
                    <div
                      key={`page_wrapper_${pageNum}`}
                      ref={(el) => (pageRefs.current[pageNum] = el)}
                      data-page-number={pageNum}
                    >
                      {isPageRendered ? (
                        <div style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)'}} className="rounded-lg overflow-hidden">
                          <Page
                            pageNumber={pageNum}
                            scale={scale}
                            rotate={rotation}
                            onRenderSuccess={onPageRenderSuccess}
                            loading={<div className="bg-white dark:bg-gray-700 animate-pulse rounded-lg" style={{ width: `${pageDimensions ? pageDimensions.width * scale : 816 * scale}px`, height: `${pageDimensions ? pageDimensions.height * scale : 1056 * scale}px` }}/>}
                            error={<p className="p-12 text-destructive">Error loading page {pageNum}</p>}
                          />
                        </div>
                      ) : (
                        placeholder
                      )}
                    </div>
                  )
                })}
              </div>
            </Document>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};