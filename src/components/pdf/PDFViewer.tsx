// src/components/pdf/PDFViewer.tsx

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { useNotes } from "./note/use-notes";
import { useChat } from "./chat/use-chat";
import { PDFNotes } from "./note/PDFNotes";
import { PDFChat } from "./chat/PDFChat";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup,
  type ImperativePanelGroupHandle
} from "@/components/ui/resizable";
import { ThumbnailSidebar, PDFToolbar } from "./pdf-ui-components";

// Set the workerSrc for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  file: File;
  onClose: () => void;
}

export const PDFViewer = ({ file, onClose }: PDFViewerProps) => {
  // Document and Page State
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1); // Most visible page
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  
  // Virtualization State
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isNotesViewActive, setIsNotesViewActive] = useState(false);
  const [isChatViewActive, setIsChatViewActive] = useState(false);
  const { toast } = useToast();

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<{ pageNumber: number }[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // Custom Hooks for features
  const { notes, activeNoteSheet, handleCreateNewNote, handleSelectNote, handleNoteChange, handleDeleteNote, handleRenameNote } = useNotes(file.name);
  const { chatMessages, isGeneratingResponse, selectedContextPages, setSelectedContextPages, handleSendMessage, clearChat } = useChat({ pdfProxy, toast });

  // Ephemeral note tracking state
  const [ephemeralNoteName, setEphemeralNoteName] = useState<string | null>(null);

  // Refs
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);

  // --- UI LOGIC ---
  
  useEffect(() => {
    const panelGroup = panelGroupRef.current;
    if (panelGroup) {
      if (isNotesViewActive || isChatViewActive) {
        panelGroup.setLayout([50, 50]);
      } else {
        panelGroup.setLayout([100, 0]);
      }
    }
  }, [isNotesViewActive, isChatViewActive]);

  const cleanupEphemeralNote = useCallback(() => {
    if (ephemeralNoteName && notes[ephemeralNoteName]?.trim() === '') {
        handleDeleteNote(ephemeralNoteName);
    }
    setEphemeralNoteName(null);
  }, [ephemeralNoteName, notes, handleDeleteNote]);

  const toggleNotesView = () => {
    const willBeActive = !isNotesViewActive;
    setIsNotesViewActive(willBeActive);

    if (willBeActive) {
      setIsChatViewActive(false); // Close chat when opening notes
      if (!activeNoteSheet) { // <<< THIS IS THE FIX
        const newNoteName = handleCreateNewNote();
        setEphemeralNoteName(newNoteName);
      }
    } else {
      cleanupEphemeralNote();
    }
  };
  
  const toggleChatView = () => {
    const willBeActive = !isChatViewActive;
    setIsChatViewActive(willBeActive);
    if (willBeActive) {
      setIsNotesViewActive(false); // Close notes when opening chat
    } else {
      setSelectedContextPages(new Set());
    }
  };

  // --- NOTES LOGIC WRAPPERS ---
  const handleSelectNoteWrapper = useCallback((name: string) => {
    cleanupEphemeralNote();
    handleSelectNote(name);
  }, [cleanupEphemeralNote, handleSelectNote]);

  const handleNoteChangeWrapper = useCallback((newText: string) => {
    if (ephemeralNoteName && newText.trim() !== '') {
      setEphemeralNoteName(null);
    }
    handleNoteChange(newText);
  }, [ephemeralNoteName, handleNoteChange]);

  // --- CORE PDF LOGIC ---

  const onPageRenderSuccess = useCallback((page: { originalWidth: number; originalHeight: number }) => {
    if (!pageDimensions) {
      setPageDimensions({ width: page.originalWidth, height: page.originalHeight });
    }
  }, [pageDimensions]);

  const onDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy) => {
    setPdfProxy(pdf);
    setNumPages(pdf.numPages);
    pageRefs.current = Array(pdf.numPages + 1).fill(null); 
    setIsLoading(false);
    const initialPages = new Set<number>();
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      initialPages.add(i);
    }
    setRenderedPages(initialPages);
    toast({ title: "PDF loaded successfully", description: `${file.name} contains ${pdf.numPages} pages.` });
  }, [toast, file.name]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("Error loading PDF:", error);
    setIsLoading(false);
    toast({ title: "Error loading PDF", description: "The selected file may be invalid or corrupted.", variant: "destructive" });
  }, [toast]);

  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, numPages || 1));
    const targetElement = pageRefs.current[newPage];
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        setPageNumber(newPage);
    }
  }, [numPages]);

  const goToPrevPage = useCallback(() => goToPage(pageNumber - 1), [pageNumber, goToPage]);
  const goToNextPage = useCallback(() => goToPage(pageNumber + 1), [pageNumber, goToPage]);

  useEffect(() => {
    if (!numPages || !viewerRef.current) return;
    const pageVisibilityObserver = new IntersectionObserver(
      (entries) => {
        const visiblePages = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visiblePages.length > 0) {
          const mostVisiblePage = visiblePages[0].target;
          const newPageNumber = parseInt(mostVisiblePage.getAttribute('data-page-number')!, 10);
          setPageNumber(current => current === newPageNumber ? current : newPageNumber);
        }
      },
      { root: viewerRef.current, threshold: 0.2 }
    );
    for (let i = 1; i <= numPages; i++) {
      if (pageRefs.current[i]) pageVisibilityObserver.observe(pageRefs.current[i]!);
    }
    return () => pageVisibilityObserver.disconnect();
  }, [numPages]);

  useEffect(() => {
    if (!numPages) return;
    const newPages = new Set<number>();
    const buffer = 2;
    for (let i = pageNumber - buffer; i <= pageNumber + buffer; i++) {
        if (i > 0 && i <= numPages) newPages.add(i);
    }
    setRenderedPages(newPages);
  }, [pageNumber, numPages]);

  const adjustScale = useCallback((getNewScale: (viewerRect: DOMRect) => number) => {
    if (!viewerRef.current || !pageDimensions) {
      toast({ title: "Cannot adjust zoom yet", description: "Page dimensions are still loading.", variant: "destructive" });
      return;
    }
    const viewerRect = viewerRef.current.getBoundingClientRect();
    const newScale = getNewScale(viewerRect);
    setScale(newScale);
  }, [pageDimensions, toast]);

  const fitToPage = useCallback(() => {
    adjustScale((viewerRect) => Math.min(viewerRect.width / pageDimensions!.width, viewerRect.height / pageDimensions!.height) * 0.95);
  }, [adjustScale, pageDimensions]);

  const fitToWidth = useCallback(() => {
    adjustScale((viewerRect) => (viewerRect.width / pageDimensions!.width) * 0.95);
  }, [adjustScale, pageDimensions]);

  // --- SEARCH LOGIC ---

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !pdfProxy) { setSearchResults([]); return; }
    setIsSearching(true);
    toast({ title: "Searching...", description: `Looking for "${searchQuery}"` });
    const newResults: { pageNumber: number }[] = [];
    const term = searchQuery.trim();
    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdfProxy.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join('');
        if (pageText.toLowerCase().includes(term.toLowerCase())) { newResults.push({ pageNumber: i }); }
      } catch (error) { console.error(`Error processing page ${i} for search:`, error); }
    }
    setSearchResults(newResults);
    setIsSearching(false);
    if (newResults.length > 0) {
      setCurrentMatchIndex(0);
      goToPage(newResults[0].pageNumber);
      toast({ title: "Search Complete", description: `Found matches on ${newResults.length} page(s).` });
    } else {
      toast({ title: "No Results", description: `Could not find "${term}".` });
    }
  }, [searchQuery, pdfProxy, numPages, toast, goToPage]);

  const goToNextMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex(prev => (prev + 1) % searchResults.length);
  }, [searchResults.length]);

  const goToPrevMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
  }, [searchResults.length]);

  useEffect(() => {
    if (searchResults.length > 0 && searchResults[currentMatchIndex]) {
      goToPage(searchResults[currentMatchIndex].pageNumber);
    }
  }, [currentMatchIndex, searchResults, goToPage]);
  
  useEffect(() => {
    const highlightTimer = setTimeout(() => {
      const term = searchQuery.trim();
      const shouldHighlight = term !== "";
      const regex = shouldHighlight ? new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
      renderedPages.forEach(pageNum => {
        const pageWrapper = pageRefs.current[pageNum];
        if (!pageWrapper) return;
        const textLayer = pageWrapper.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) return;
        textLayer.querySelectorAll('mark.search-highlight').forEach(mark => {
          const parent = mark.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
            parent.normalize();
          }
        });
        if (!shouldHighlight || !regex) return;
        const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT, null);
        const textNodes: Node[] = [];
        while(walker.nextNode()) textNodes.push(walker.currentNode);
        textNodes.forEach(node => {
          if (!node.textContent) return;
          const matches = [...node.textContent.matchAll(regex)];
          if (matches.length === 0) return;
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          matches.forEach(match => {
            const index = match.index!;
            if (index > lastIndex) { fragment.appendChild(document.createTextNode(node.textContent!.substring(lastIndex, index))); }
            const mark = document.createElement('mark');
            mark.className = 'search-highlight bg-yellow-400/80 dark:bg-yellow-500/80';
            mark.appendChild(document.createTextNode(match[0]));
            fragment.appendChild(mark);
            lastIndex = index + match[0].length;
          });
          if (lastIndex < node.textContent.length) { fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex))); }
          if (node.parentNode) { node.parentNode.replaceChild(fragment, node); }
        });
      });
    }, 100);
    return () => clearTimeout(highlightTimer);
  }, [searchQuery, renderedPages, scale]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('.wysiwyg-editor') || (event.target as HTMLElement).closest('.pdf-chat-input')) return;
      if ((event.target as HTMLElement).tagName === 'INPUT' || (event.target as HTMLElement).tagName === 'TEXTAREA') return;

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
      <div className="flex h-screen bg-gray-200 dark:bg-gray-800 font-sans overflow-hidden">
        <div className={cn("transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 flex-shrink-0", isSidebarOpen ? "w-48" : "w-0")}>
          <ThumbnailSidebar file={file} numPages={numPages} currentPage={pageNumber} goToPage={goToPage} onDocumentLoadError={onDocumentLoadError} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <Card className="rounded-none border-0 border-b z-10">
            <PDFToolbar {...{ file, onClose, isSidebarOpen, toggleSidebar: () => setIsSidebarOpen(o => !o), pageNumber, numPages, goToPage, goToPrevPage, goToNextPage, isLoading, scale, setScale, fitToPage, fitToWidth, searchQuery, setSearchQuery, handleSearch, isSearching, searchResults, setSearchResults, currentMatchIndex, setCurrentMatchIndex, goToPrevMatch, goToNextMatch, isNotesViewActive, onToggleNotesView: toggleNotesView, isChatViewActive, onToggleChatView: toggleChatView }} />
          </Card>
          <ResizablePanelGroup direction="horizontal" className="flex-1" ref={panelGroupRef}>
            <ResizablePanel defaultSize={isNotesViewActive || isChatViewActive ? 50 : 100}>
              <div className="flex-1 overflow-auto p-4 md:p-8 h-full" ref={viewerRef}>
                <Document file={file} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} loading={<div className="p-12 flex justify-center items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>} error={<div className="p-12 bg-destructive/10 text-destructive rounded-lg">Failed to load PDF.</div>}>
                  <div className="flex flex-col items-center gap-y-4">
                    {!isLoading && Array.from(new Array(numPages), (_, index) => {
                      const pageNum = index + 1;
                      const isPageRendered = renderedPages.has(pageNum);
                      return (
                        <div key={`page_wrapper_${pageNum}`} ref={(el) => (pageRefs.current[pageNum] = el)} data-page-number={pageNum}>
                          {isPageRendered ? (
                            <div style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)'}} className="rounded-lg overflow-hidden">
                              <Page pageNumber={pageNum} scale={scale} onRenderSuccess={onPageRenderSuccess} loading={<div className="bg-white dark:bg-gray-700 animate-pulse rounded-lg" style={{ width: `${(pageDimensions ? pageDimensions.width : 816) * scale}px`, height: `${(pageDimensions ? pageDimensions.height : 1056) * scale}px` }}/>} />
                            </div>
                          ) : (
                            <div style={{ width: `${(pageDimensions ? pageDimensions.width : 816) * scale}px`, height: `${(pageDimensions ? pageDimensions.height : 1056) * scale}px` }} className="bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Document>
              </div>
            </ResizablePanel>
            
            {(isNotesViewActive || isChatViewActive) && <ResizableHandle withHandle />}
            
            {isNotesViewActive && (
              <ResizablePanel defaultSize={50} minSize={25} collapsible>
                  <PDFNotes 
                    activeSheetName={activeNoteSheet} 
                    notes={notes} 
                    onNoteChange={handleNoteChangeWrapper}
                    onCreateNewNote={handleCreateNewNote}
                    onSelectNote={handleSelectNoteWrapper}
                    onRenameNote={handleRenameNote}
                    onDeleteNote={handleDeleteNote}
                  />
              </ResizablePanel>
            )}

            {isChatViewActive && (
              <ResizablePanel defaultSize={50} minSize={25} collapsible>
                  <PDFChat 
                    messages={chatMessages}
                    onSendMessage={handleSendMessage}
                    isGenerating={isGeneratingResponse}
                    currentPage={pageNumber}
                    totalPages={numPages}
                    selectedPages={selectedContextPages}
                    onSelectedPagesChange={setSelectedContextPages}
                  />
              </ResizablePanel>
            )}

          </ResizablePanelGroup>
        </div>
      </div>
    </TooltipProvider>
  );
};