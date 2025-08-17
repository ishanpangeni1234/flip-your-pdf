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

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PaperSet {
  id: string;
  series: string;
  qp: { name: string; path: string } | null;
  ms: { name: string; path: string } | null;
  in: { name: string; path: string } | null;
}

interface PDFViewerProps {
  initialFile: File;
  paperSet: PaperSet | null;
  initialFileType: 'qp' | 'ms' | 'in' | null;
  onClose: () => void;
}

type DocType = 'qp' | 'ms';

interface DocumentState {
  numPages: number;
  pdfProxy: PDFDocumentProxy | null;
  renderedPages: Set<number>;
  pageDimensions: { width: number; height: number } | null;
  searchQuery: string;
  searchResults: { pageNumber: number }[];
  currentMatchIndex: number;
  isSearching: boolean;
}

export const PDFViewer = ({ initialFile, paperSet, initialFileType, onClose }: PDFViewerProps) => {
  // --- State Management for Multi-Document Handling ---
  const [documents, setDocuments] = useState<{ qp: File | null; ms: File | null }>({
    qp: initialFileType === 'qp' ? initialFile : null,
    ms: initialFileType === 'ms' ? initialFile : null,
  });
  const [activeDocumentType, setActiveDocumentType] = useState<DocType>(initialFileType === 'ms' ? 'ms' : 'qp');
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const canSwitch = !!(paperSet?.qp && paperSet?.ms);

  // Decoupled state for each document
  const [pageStates, setPageStates] = useState({ 
    qp: { page: 1, scale: 1.0 }, 
    ms: { page: 1, scale: 1.0 } 
  });
  const [docStates, setDocStates] = useState<Record<DocType, DocumentState>>({
    qp: { numPages: 0, pdfProxy: null, renderedPages: new Set(), pageDimensions: null, searchQuery: "", searchResults: [], currentMatchIndex: 0, isSearching: false },
    ms: { numPages: 0, pdfProxy: null, renderedPages: new Set(), pageDimensions: null, searchQuery: "", searchResults: [], currentMatchIndex: 0, isSearching: false },
  });

  // Global loading state for initial load or switching to an unloaded doc
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isNotesViewActive, setIsNotesViewActive] = useState(false);
  const [isChatViewActive, setIsChatViewActive] = useState(false);
  const [isNotesFocusMode, setIsNotesFocusMode] = useState(false);
  const [isChatFocusMode, setIsChatFocusMode] = useState(false);
  const { toast } = useToast();
  
  // Hooks for Notes and Chat (linked to initial file name for storage key)
  const { notes, activeNoteSheet, handleCreateNewNote, handleSelectNote, handleNoteChange, handleDeleteNote, handleRenameNote } = useNotes(initialFile.name);
  const { allChats, activeChatName, isGeneratingResponse, selectedContextPages, setSelectedContextPages, handleCreateNewChat, handleSelectChat, handleDeleteChat, handleRenameChat, handleSendMessage } = useChat({ fileName: initialFile.name });

  const [ephemeralNoteName, setEphemeralNoteName] = useState<string | null>(null);
  const [ephemeralChatName, setEphemeralChatName] = useState<string | null>(null);

  const viewerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<DocType, (HTMLDivElement | null)[]>>({ qp: [], ms: [] });
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  
  // --- Active State Accessors ---
  // These make it easy to work with the state of the currently active document
  const activeFile = documents[activeDocumentType];
  const activeState = docStates[activeDocumentType];
  const pageNumber = pageStates[activeDocumentType].page;
  const scale = pageStates[activeDocumentType].scale;

  const setPageNumber = (updater: number | ((prev: number) => number)) => {
    const newPage = typeof updater === 'function' ? updater(pageNumber) : updater;
    setPageStates(p => ({ ...p, [activeDocumentType]: { ...p[activeDocumentType], page: newPage }}));
  };
  const setScale = (updater: number | ((prev: number) => number)) => {
    const newScale = typeof updater === 'function' ? updater(scale) : updater;
    setPageStates(p => ({ ...p, [activeDocumentType]: { ...p[activeDocumentType], scale: newScale }}));
  };
  const setDocState = (updater: Partial<DocumentState> | ((prev: DocumentState) => Partial<DocumentState>)) => {
    setDocStates(prev => ({
      ...prev,
      [activeDocumentType]: {
        ...prev[activeDocumentType],
        ...(typeof updater === 'function' ? updater(prev[activeDocumentType]) : updater)
      }
    }));
  };

  // --- Pre-loading and Switching Logic ---
  useEffect(() => {
    if (!canSwitch) return;
    const preloadDocument = async (type: DocType) => {
      if (documents[type] || !paperSet?.[type]) return;
      setIsPreloading(true);
      try {
        const pdfData = paperSet[type]!;
        const response = await fetch(pdfData.path);
        if (!response.ok) throw new Error(`Failed to fetch ${type}`);
        const file = new File([await response.blob()], pdfData.name, { type: 'application/pdf' });
        setDocuments(prev => ({ ...prev, [type]: file }));
      } catch (error) {
        console.error("Failed to preload document:", error);
        toast({ title: "Preload Failed", description: "Could not load the other document.", variant: "destructive" });
      } finally {
        setIsPreloading(false);
      }
    };
    preloadDocument(activeDocumentType === 'qp' ? 'ms' : 'qp');
  }, [paperSet, documents, canSwitch, activeDocumentType, toast]);

  const handleSwitchDocument = useCallback((targetType: DocType) => {
    if (targetType === activeDocumentType || !documents[targetType]) return;
    if (!docStates[targetType].pdfProxy) {
      setIsLoading(true);
    }
    setActiveDocumentType(targetType);
  }, [activeDocumentType, documents, docStates]);

  // --- CORE PDF LOGIC ---
  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, activeState.numPages || 1));
    const targetElement = pageRefs.current[activeDocumentType][newPage];
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setPageNumber(newPage);
    }
  }, [activeState.numPages, activeDocumentType]);

  const onDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy, docType: DocType) => {
    setDocStates(prev => {
      const initialPages = new Set<number>();
      for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
        initialPages.add(i);
      }
      return {
        ...prev,
        [docType]: {
          ...prev[docType],
          pdfProxy: pdf,
          numPages: pdf.numPages,
          renderedPages: initialPages,
        },
      };
    });
    pageRefs.current[docType] = Array(pdf.numPages + 1).fill(null);
    if (docType === activeDocumentType) {
      setIsLoading(false);
      toast({ title: "PDF Loaded", description: `${documents[docType]?.name} is ready.` });
      setTimeout(() => goToPage(pageStates[docType].page), 100);
    }
  }, [activeDocumentType, documents, toast, goToPage, pageStates]);

  const onPageRenderSuccess = useCallback((page: { originalWidth: number; originalHeight: number }) => {
    if (!activeState.pageDimensions) {
      setDocState({ pageDimensions: { width: page.originalWidth, height: page.originalHeight } });
    }
  }, [activeState.pageDimensions]);

  // (All other functions now use the `activeState` accessors)
  // ... [UNCHANGED UI LOGIC: toggleNotesFocusMode, etc.] ...
  
  // --- UI LOGIC ---
    const toggleNotesFocusMode = () => { setIsNotesFocusMode(p => !p); if (!isNotesFocusMode) setIsChatFocusMode(false); };
    const toggleChatFocusMode = () => { setIsChatFocusMode(p => !p); if (!isChatFocusMode) setIsNotesFocusMode(false); };
    useEffect(() => {
      if (panelGroupRef.current) {
        panelGroupRef.current.setLayout(isNotesViewActive || isChatViewActive ? [50, 50] : [100, 0]);
      }
    }, [isNotesViewActive, isChatViewActive]);
    const cleanupEphemeralNote = useCallback(() => {
      if (ephemeralNoteName && notes[ephemeralNoteName]?.trim() === '') handleDeleteNote(ephemeralNoteName);
      setEphemeralNoteName(null);
    }, [ephemeralNoteName, notes, handleDeleteNote]);
    const cleanupEphemeralChat = useCallback(() => {
      if (ephemeralChatName && allChats[ephemeralChatName]?.length === 0) handleDeleteChat(ephemeralChatName);
      setEphemeralChatName(null);
    }, [ephemeralChatName, allChats, handleDeleteChat]);
    const toggleNotesView = () => {
      const willBeActive = !isNotesViewActive;
      setIsNotesViewActive(willBeActive);
      if (willBeActive) {
        setIsChatViewActive(false); cleanupEphemeralChat();
        if (!activeNoteSheet) setEphemeralNoteName(handleCreateNewNote());
      } else {
        cleanupEphemeralNote(); setIsNotesFocusMode(false);
      }
    };
    const toggleChatView = () => {
      const willBeActive = !isChatViewActive;
      setIsChatViewActive(willBeActive);
      if (willBeActive) {
        setIsNotesViewActive(false); cleanupEphemeralNote(); setIsNotesFocusMode(false);
        if (!activeChatName) setEphemeralChatName(handleCreateNewChat());
      } else {
        cleanupEphemeralChat(); setSelectedContextPages(new Set()); setIsChatFocusMode(false);
      }
    };
    const handleSelectNoteWrapper = useCallback((name: string) => { cleanupEphemeralNote(); handleSelectNote(name); }, [cleanupEphemeralNote, handleSelectNote]);
    const handleNoteChangeWrapper = useCallback((newText: string) => { if (ephemeralNoteName && newText.trim() !== '') setEphemeralNoteName(null); handleNoteChange(newText); }, [ephemeralNoteName, handleNoteChange]);
    const handleSelectChatWrapper = useCallback((name: string) => { cleanupEphemeralChat(); handleSelectChat(name); }, [cleanupEphemeralChat, handleSelectChat]);
    const handleDeleteChatWrapper = useCallback((name: string) => { if (name === ephemeralChatName) setEphemeralChatName(null); handleDeleteChat(name); }, [ephemeralChatName, handleDeleteChat]);
    const handleSendMessageWrapper = useCallback((prompt: string) => { if (ephemeralChatName) setEphemeralChatName(null); handleSendMessage(prompt, activeState.pdfProxy); }, [ephemeralChatName, handleSendMessage, activeState.pdfProxy]);
    const onDocumentLoadError = useCallback((error: Error) => { console.error("Error loading PDF:", error); setIsLoading(false); toast({ title: "Error loading PDF", description: "The file may be invalid or corrupted.", variant: "destructive" }); }, [toast]);
    const goToPrevPage = useCallback(() => goToPage(pageNumber - 1), [pageNumber, goToPage]);
    const goToNextPage = useCallback(() => goToPage(pageNumber + 1), [pageNumber, goToPage]);

  // Observer for setting current page number based on scroll
  useEffect(() => {
    if (!activeState.numPages || !viewerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const newPage = parseInt(visible[0].target.getAttribute('data-page-number')!, 10);
          setPageNumber(curr => curr === newPage ? curr : newPage);
        }
      }, { root: viewerRef.current, threshold: 0.2 }
    );
    for (let i = 1; i <= activeState.numPages; i++) {
      if (pageRefs.current[activeDocumentType][i]) observer.observe(pageRefs.current[activeDocumentType][i]!);
    }
    return () => observer.disconnect();
  }, [activeState.numPages, activeDocumentType]); // Re-run when active doc changes

  // Eager loading of nearby pages
  useEffect(() => {
    if (!activeState.numPages) return;
    const newPages = new Set<number>();
    for (let i = pageNumber - 2; i <= pageNumber + 2; i++) {
      if (i > 0 && i <= activeState.numPages) newPages.add(i);
    }
    setDocState(prev => ({ renderedPages: new Set([...prev.renderedPages, ...newPages]) }));
  }, [pageNumber, activeState.numPages]);

  // Zoom/Fit controls
  const adjustScale = useCallback((getNewScale: (viewerRect: DOMRect) => number) => {
    if (!viewerRef.current || !activeState.pageDimensions) return;
    setScale(getNewScale(viewerRef.current.getBoundingClientRect()));
  }, [activeState.pageDimensions]);
  const fitToPage = useCallback(() => { adjustScale(rect => Math.min(rect.width / activeState.pageDimensions!.width, rect.height / activeState.pageDimensions!.height) * 0.95); }, [adjustScale, activeState.pageDimensions]);
  const fitToWidth = useCallback(() => { adjustScale(rect => (rect.width / activeState.pageDimensions!.width) * 0.95); }, [adjustScale, activeState.pageDimensions]);
  
  // Search logic
  const handleSearch = useCallback(async () => {
    if (!activeState.searchQuery.trim() || !activeState.pdfProxy) { setDocState({ searchResults: [] }); return; }
    setDocState({ isSearching: true });
    toast({ title: "Searching...", description: `Looking for "${activeState.searchQuery}"` });
    const newResults: { pageNumber: number }[] = [];
    const term = activeState.searchQuery.trim().toLowerCase();
    for (let i = 1; i <= activeState.numPages; i++) {
      try {
        const page = await activeState.pdfProxy.getPage(i);
        const textContent = await page.getTextContent();
        if (textContent.items.map((item: any) => item.str).join('').toLowerCase().includes(term)) {
          newResults.push({ pageNumber: i });
        }
      } catch (error) { console.error(`Error processing page ${i} for search:`, error); }
    }
    setDocState({ searchResults: newResults, isSearching: false });
    if (newResults.length > 0) {
      setDocState({ currentMatchIndex: 0 });
      goToPage(newResults[0].pageNumber);
      toast({ title: "Search Complete", description: `Found ${newResults.length} match(es).` });
    } else {
      toast({ title: "No Results", description: `Could not find "${term}".` });
    }
  }, [activeState, toast, goToPage]);
  const goToNextMatch = useCallback(() => { if (activeState.searchResults.length === 0) return; setDocState(p => ({ currentMatchIndex: (p.currentMatchIndex + 1) % p.searchResults.length })); }, [activeState.searchResults.length]);
  const goToPrevMatch = useCallback(() => { if (activeState.searchResults.length === 0) return; setDocState(p => ({ currentMatchIndex: (p.currentMatchIndex - 1 + p.searchResults.length) % p.searchResults.length })); }, [activeState.searchResults.length]);
  useEffect(() => { if (activeState.searchResults.length > 0) goToPage(activeState.searchResults[activeState.currentMatchIndex].pageNumber); }, [activeState.currentMatchIndex, activeState.searchResults, goToPage]);
  useEffect(() => {
    const highlightTimer = setTimeout(() => {
      const term = activeState.searchQuery.trim();
      const regex = term ? new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
      activeState.renderedPages.forEach(pageNum => {
        const pageWrapper = pageRefs.current[activeDocumentType][pageNum];
        if (!pageWrapper) return;
        const textLayer = pageWrapper.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) return;
        textLayer.querySelectorAll('mark.search-highlight').forEach(mark => { const p = mark.parentNode; if(p){ p.replaceChild(document.createTextNode(mark.textContent || ''), mark); p.normalize(); } });
        if (!regex) return;
        const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT, null);
        let node; while(node = walker.nextNode()){
          if (!node.textContent) continue;
          const matches = [...node.textContent.matchAll(regex)];
          if (matches.length > 0) {
            const fragment = document.createDocumentFragment(); let lastIndex = 0;
            matches.forEach(match => {
              const index = match.index!;
              if (index > lastIndex) fragment.appendChild(document.createTextNode(node.textContent!.substring(lastIndex, index)));
              const mark = document.createElement('mark');
              mark.className = 'search-highlight bg-yellow-400/80 dark:bg-yellow-500/80';
              mark.appendChild(document.createTextNode(match[0]));
              fragment.appendChild(mark);
              lastIndex = index + match[0].length;
            });
            if (lastIndex < node.textContent.length) fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex)));
            if (node.parentNode) node.parentNode.replaceChild(fragment, node);
          }
        }
      });
    }, 100);
    return () => clearTimeout(highlightTimer);
  }, [activeState.searchQuery, activeState.renderedPages, scale, activeDocumentType]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('.wysiwyg-editor, .pdf-chat-input, input, textarea')) return;
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f': document.getElementById("search-input")?.focus(); e.preventDefault(); break;
          case 'b': setIsSidebarOpen(o => !o); e.preventDefault(); break;
          case 'x':
            if (canSwitch) {
              handleSwitchDocument(activeDocumentType === 'qp' ? 'ms' : 'qp');
            }
            e.preventDefault();
            break;
          case '0': fitToPage(); e.preventDefault(); break;
          case '=': setScale(s => Math.min(3.0, s + 0.2)); e.preventDefault(); break;
          case '-': setScale(s => Math.max(0.2, s - 0.2)); e.preventDefault(); break;
        }
      } else if (e.key === "ArrowLeft") goToPrevPage(); else if (e.key === "ArrowRight") goToNextPage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevPage, goToNextPage, fitToPage, setScale, canSwitch, activeDocumentType, handleSwitchDocument]);
  
  // Render logic for pages to avoid duplication
  const renderPagesForDoc = (docType: DocType) => {
    const state = docStates[docType];
    const docFile = documents[docType];
    if (!docFile) return null;
    return (
      <Document
        key={docFile.name}
        file={docFile}
        onLoadSuccess={(pdf) => onDocumentLoadSuccess(pdf, docType)}
        onLoadError={onDocumentLoadError}
        loading={null} // Handled by global isLoading state
        error={<div className="p-12 bg-destructive/10 text-destructive rounded-lg">Failed to load PDF.</div>}
      >
        <div className="flex flex-col items-center gap-y-4">
          {Array.from(new Array(state.numPages), (_, index) => {
            const pageNum = index + 1;
            const isPageRendered = state.renderedPages.has(pageNum);
            return (
              <div key={`${docType}_page_${pageNum}`} ref={(el) => (pageRefs.current[docType][pageNum] = el)} data-page-number={pageNum}>
                {isPageRendered ? (
                  <div style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)'}} className="rounded-lg overflow-hidden">
                    <Page pageNumber={pageNum} scale={pageStates[docType].scale} onRenderSuccess={docType === activeDocumentType ? onPageRenderSuccess : undefined} loading={<div className="bg-white dark:bg-gray-700 animate-pulse rounded-lg" style={{ width: `${(state.pageDimensions?.width ?? 816) * pageStates[docType].scale}px`, height: `${(state.pageDimensions?.height ?? 1056) * pageStates[docType].scale}px` }}/>} />
                  </div>
                ) : (
                  <div style={{ width: `${(state.pageDimensions?.width ?? 816) * pageStates[docType].scale}px`, height: `${(state.pageDimensions?.height ?? 1056) * pageStates[docType].scale}px` }} className="bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </Document>
    );
  };
  
  if (isNotesFocusMode) return <div className="h-screen w-screen bg-editor-background"><PDFNotes {...{activeSheetName: activeNoteSheet, notes, onNoteChange: handleNoteChangeWrapper, onCreateNewNote: handleCreateNewNote, onSelectNote: handleSelectNoteWrapper, onRenameNote: handleRenameNote, onDeleteNote: handleDeleteNote, isFocusMode: isNotesFocusMode, onToggleFocusMode: toggleNotesFocusMode}} /></div>;
  if (isChatFocusMode) return <div className="h-screen w-screen bg-background"><PDFChat {...{allChats, activeChatName, onSendMessage: handleSendMessageWrapper, isGenerating: isGeneratingResponse, currentPage: pageNumber, totalPages: activeState.numPages, selectedPages: selectedContextPages, onSelectedPagesChange: setSelectedContextPages, onCreateNewChat: handleCreateNewChat, onSelectChat: handleSelectChatWrapper, onRenameChat: handleRenameChat, onDeleteChat: handleDeleteChatWrapper, isFocusMode: isChatFocusMode, onToggleFocusMode: toggleChatFocusMode}} /></div>;

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-200 dark:bg-gray-800 font-sans overflow-hidden">
        <div className={cn("transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 flex-shrink-0", isSidebarOpen ? "w-48" : "w-0")}>
          <ThumbnailSidebar file={activeFile} numPages={activeState.numPages} currentPage={pageNumber} goToPage={goToPage} onDocumentLoadError={onDocumentLoadError} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <Card className="rounded-none border-0 border-b z-10">
            <PDFToolbar {...{ fileName: activeFile?.name || 'Loading...', onClose, isSidebarOpen, toggleSidebar: () => setIsSidebarOpen(o => !o), pageNumber, numPages: activeState.numPages, goToPage, goToPrevPage, goToNextPage, isLoading, scale, setScale, fitToPage, fitToWidth, searchQuery: activeState.searchQuery, setSearchQuery: (q) => setDocState({ searchQuery: q }), handleSearch, isSearching: activeState.isSearching, searchResults: activeState.searchResults, setSearchResults: (r) => setDocState({ searchResults: r }), currentMatchIndex: activeState.currentMatchIndex, setCurrentMatchIndex: (i) => setDocState(p => ({ currentMatchIndex: typeof i === 'function' ? i(p.currentMatchIndex) : i})), goToPrevMatch, goToNextMatch, isNotesViewActive, onToggleNotesView: toggleNotesView, isChatViewActive, onToggleChatView: toggleChatView, activeDocumentType, onSwitchDocument: handleSwitchDocument, isPreloading, canSwitch }} />
          </Card>
          <ResizablePanelGroup direction="horizontal" className="flex-1" ref={panelGroupRef}>
            <ResizablePanel defaultSize={isNotesViewActive || isChatViewActive ? 50 : 100}>
              <div className="flex-1 overflow-auto p-4 md:p-8 h-full" ref={viewerRef}>
                {isLoading && <div className="absolute inset-0 flex justify-center items-center bg-background/50 z-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}
                
                <div className={cn({ 'hidden': activeDocumentType !== 'qp' })}>{renderPagesForDoc('qp')}</div>
                <div className={cn({ 'hidden': activeDocumentType !== 'ms' })}>{renderPagesForDoc('ms')}</div>

              </div>
            </ResizablePanel>
            {(isNotesViewActive || isChatViewActive) && <ResizableHandle withHandle />}
            {isNotesViewActive && <ResizablePanel defaultSize={50} minSize={25} collapsible><PDFNotes {...{activeSheetName: activeNoteSheet, notes, onNoteChange: handleNoteChangeWrapper, onCreateNewNote: handleCreateNewNote, onSelectNote: handleSelectNoteWrapper, onRenameNote: handleRenameNote, onDeleteNote: handleDeleteNote, isFocusMode: isNotesFocusMode, onToggleFocusMode: toggleNotesFocusMode}} /></ResizablePanel>}
            {isChatViewActive && <ResizablePanel defaultSize={50} minSize={25} collapsible><PDFChat {...{allChats, activeChatName, onSendMessage: handleSendMessageWrapper, isGenerating: isGeneratingResponse, currentPage: pageNumber, totalPages: activeState.numPages, selectedPages: selectedContextPages, onSelectedPagesChange: setSelectedContextPages, onCreateNewChat: handleCreateNewChat, onSelectChat: handleSelectChatWrapper, onRenameChat: handleRenameChat, onDeleteChat: handleDeleteChatWrapper, isFocusMode: isChatFocusMode, onToggleFocusMode: toggleChatFocusMode}} /></ResizablePanel>}
          </ResizablePanelGroup>
        </div>
      </div>
    </TooltipProvider>
  );
};