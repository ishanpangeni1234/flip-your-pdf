// src/components/pdf/pdf-ui-components.tsx

import React, { useState } from 'react';
import { Document, Page } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search,
  PanelLeftClose, PanelLeftOpen, Rows, Columns, ChevronUp, ChevronDown, X,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ThumbnailProps {
  pageNumber: number;
  onThumbnailClick: (page: number) => void;
  isActive: boolean;
}

export const Thumbnail = React.memo(({ pageNumber, onThumbnailClick, isActive }: ThumbnailProps) => (
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
));

interface ThumbnailSidebarProps {
  file: File;
  numPages: number;
  currentPage: number;
  goToPage: (page: number) => void;
  onDocumentLoadError: (error: Error) => void;
}

export const ThumbnailSidebar = ({ file, numPages, currentPage, goToPage, onDocumentLoadError }: ThumbnailSidebarProps) => {
  return (
    <div className="p-2 h-full overflow-y-auto overflow-x-hidden">
      <Document file={file} loading="" onLoadError={onDocumentLoadError}>
        {Array.from(new Array(numPages), (_, index) => (
            <Thumbnail
              key={`thumb-${index + 1}`}
              pageNumber={index + 1}
              onThumbnailClick={goToPage}
              isActive={currentPage === index + 1}
            />
        ))}
      </Document>
    </div>
  );
};

interface PDFToolbarProps {
  file: File;
  onClose: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  pageNumber: number;
  numPages: number;
  goToPage: (page: number) => void;
  goToPrevPage: () => void;
  goToNextPage: () => void;
  isLoading: boolean;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  fitToPage: () => void;
  fitToWidth: () => void;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: () => void;
  isSearching: boolean;
  searchResults: { pageNumber: number }[];
  setSearchResults: React.Dispatch<React.SetStateAction<{ pageNumber: number }[]>>;
  currentMatchIndex: number;
  setCurrentMatchIndex: React.Dispatch<React.SetStateAction<number>>;
  goToPrevMatch: () => void;
  goToNextMatch: () => void;
  isNotesViewActive: boolean;
  onToggleNotesView: () => void; // Updated prop
  isChatViewActive: boolean;
  onToggleChatView: () => void;
}

export const PDFToolbar = ({
  file, onClose, isSidebarOpen, toggleSidebar, pageNumber, numPages, goToPage, goToPrevPage, goToNextPage, isLoading,
  scale, setScale, fitToPage, fitToWidth,
  searchQuery, setSearchQuery, handleSearch, isSearching, searchResults, setSearchResults, currentMatchIndex, setCurrentMatchIndex, goToPrevMatch, goToNextMatch,
  isNotesViewActive, onToggleNotesView,
  isChatViewActive, onToggleChatView
}: PDFToolbarProps) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <div className="flex items-center justify-between p-2 gap-2 md:gap-4">
      {/* Left Section */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={toggleSidebar}>{isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}</Button></TooltipTrigger><TooltipContent><p>Toggle Thumbnails (Ctrl+B)</p></TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Close PDF</p></TooltipContent></Tooltip>
        <div className="h-6 w-px bg-border hidden sm:block mx-1" />
        <span className="text-sm font-medium truncate max-w-24 sm:max-w-48 hidden sm:inline" title={file.name}>{file.name}</span>
      </div>

      {/* Center Section: Page Navigation */}
      <div className="flex items-center justify-center gap-1 flex-grow min-w-0">
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={pageNumber <= 1}><ChevronLeft className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Previous (←)</p></TooltipContent></Tooltip>
        <div className="flex items-center gap-1"><Input type="number" value={pageNumber} onChange={(e) => goToPage(parseInt(e.target.value, 10) || 1)} className="w-14 text-center h-8" disabled={isLoading} /><span className="text-sm text-muted-foreground">/ {numPages || "..."}</span></div>
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={goToNextPage} disabled={pageNumber >= numPages}><ChevronRight className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Next (→)</p></TooltipContent></Tooltip>
      </div>
      
      {/* Right Section: Tools */}
      <div className="flex items-center gap-1 flex-shrink-0">
          {/* Search */}
          <div className="flex items-center justify-end">
            {isSearchExpanded ? (
              <div className="flex items-center gap-1 p-1 rounded-md bg-muted/50 dark:bg-muted/20 border">
                <Input
                  id="search-input"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    if (e.target.value === "") { setSearchResults([]); setCurrentMatchIndex(0); }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); if (e.key === 'Escape') setIsSearchExpanded(false); }}
                  className="h-7 w-32 md:w-40 border-none bg-transparent focus-visible:ring-0"
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Search className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsSearchExpanded(false)}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsSearchExpanded(true)}><Search className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Search (Ctrl+F)</p></TooltipContent></Tooltip>
            )}
              {searchResults.length > 0 && !isSearching && (
              <div className="flex items-center gap-1 text-sm ml-2">
                <span className="text-muted-foreground tabular-nums">{currentMatchIndex + 1} of {searchResults.length}</span>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMatch}><ChevronUp className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Previous Match</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMatch}><ChevronDown className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Next Match</p></TooltipContent></Tooltip>
              </div>
            )}
          </div>
          
          <div className="h-6 w-px bg-border mx-1" />
          
          {/* Chat Button (Enlarged) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={isChatViewActive ? "secondary" : "ghost"} size="icon" onClick={onToggleChatView}>
                  <MessageSquare className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Toggle AI Chat</p></TooltipContent>
          </Tooltip>

          {/* Notes Button (Redesigned & Enlarged) */}
          <Tooltip>
            <TooltipTrigger asChild>
                <Button variant={isNotesViewActive ? "secondary" : "ghost"} size="icon" onClick={onToggleNotesView}>
                    <span className="text-2xl" role="img" aria-label="Notes">📝</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent><p>Toggle Notes</p></TooltipContent>
          </Tooltip>
  
          <div className="h-6 w-px bg-border mx-1" />
  
          {/* Zoom & View */}
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={()=> setScale(s => Math.max(0.2, s - 0.2))}><ZoomOut className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Zoom Out (Ctrl+-)</p></TooltipContent></Tooltip>
          <span className="text-sm font-semibold text-foreground min-w-[3rem] text-center select-none">{Math.round(scale * 100)}%</span>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={()=> setScale(s => Math.min(3.0, s + 0.2))}><ZoomIn className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Zoom In (Ctrl++)</p></TooltipContent></Tooltip>
          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
          <div className="hidden sm:flex items-center">
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={fitToPage}><Rows className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Fit Page (Ctrl+0)</p></TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={fitToWidth}><Columns className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Fit Width</p></TooltipContent></Tooltip>
          </div>
      </div>
    </div>
  );
};