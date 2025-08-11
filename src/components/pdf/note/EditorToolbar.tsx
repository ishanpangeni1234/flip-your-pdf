// src/components/pdf/note/EditorToolbar.tsx

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';

interface EditorToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function EditorToolbar({ onZoomIn, onZoomOut }: EditorToolbarProps) {
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);

  return (
    <div className="border-b border-editor-border bg-editor-background px-3 py-2">
      <TooltipProvider>
        <div 
          className="flex items-center gap-1"
          onMouseEnter={() => setIsZoomMenuOpen(true)}
          onMouseLeave={() => setIsZoomMenuOpen(false)}
        >
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom</p>
            </TooltipContent>
          </Tooltip>

          {isZoomMenuOpen && (
            <>
              <Separator orientation="vertical" className="h-8 mx-1" />
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onZoomIn}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Zoom In</p></TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onZoomOut}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Zoom Out</p></TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}