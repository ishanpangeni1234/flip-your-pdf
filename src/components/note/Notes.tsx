// src/components/note/Notes.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import { PanelLeftClose, ChevronRight, FileText, ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BubbleToolbar } from './BubbleToolbar';
import SlashCommand from '@/lib/tiptap-extensions/slash-command';
import { FolderSidebar } from '@/components/common/FolderSidebar';
import type { FolderStructure } from '@/lib/folder-types';

interface NotesProps {
  activeSheetName: string | null;
  notes: { [key: string]: string };
  onNoteChange: (newText: string) => void;
  onCreateNewNote: () => void;
  onSelectNote: (name: string) => void;
  onRenameNote: (oldName: string, newName: string) => boolean;
  onDeleteNote: (name: string) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  defaultSidebarOpen?: boolean;
  // Folder props
  folderStructure: FolderStructure;
  onCreateFolder: () => void;
  onRenameFolder: (folderId: string, newName: string) => boolean;
  onDeleteFolder: (folderId: string) => void;
  onMoveNote: (noteName: string, targetFolderId: string | null) => void;
}

export const Notes = ({
  activeSheetName,
  notes,
  onNoteChange,
  onCreateNewNote,
  onSelectNote,
  onRenameNote,
  onDeleteNote,
  isFocusMode,
  onToggleFocusMode,
  defaultSidebarOpen = false,
  folderStructure,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveNote
}: NotesProps) => {
  const currentNote = activeSheetName ? notes[activeSheetName] ?? '' : '';
  const prevActiveSheetName = useRef(activeSheetName);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [isNoteListOpen, setIsNoteListOpen] = useState(defaultSidebarOpen); // Pinned state
  const [isHoverMode, setIsHoverMode] = useState(false); // Temporary hover state
  const [renamingNoteName, setRenamingNoteName] = useState<string | null>(null);

  const showSidebar = isNoteListOpen || isHoverMode;

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, bulletList: { keepMarks: true, keepAttributes: false }, orderedList: { keepMarks: true, keepAttributes: false } }),
      Underline, Typography,
      Link.configure({ openOnClick: true, autolink: true, defaultProtocol: 'https' }),
      Placeholder.configure({ placeholder: ({ node }) => { if (node.type.name === 'heading') { return `Heading ${node.attrs.level}`; } return "Type '/' for commands or start writing..."; } }),
      SlashCommand,
    ],
    content: currentNote,
    editorProps: { attributes: { class: 'tiptap' } },
    onUpdate: ({ editor }) => { onNoteChange(editor.getHTML()); },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const hasActiveSheetChanged = activeSheetName !== prevActiveSheetName.current;
    if (hasActiveSheetChanged) {
      editor.commands.setContent(currentNote, false);
      setRenamingNoteName(null);
      prevActiveSheetName.current = activeSheetName;
    }
    else if (editor.getHTML() !== currentNote) {
      editor.commands.setContent(currentNote, false);
    }
  }, [activeSheetName, currentNote, editor]);

  const handlePinClick = () => { setIsNoteListOpen(true); setIsHoverMode(false); };
  const handlePeekHover = () => { if (!isNoteListOpen) setIsHoverMode(true); };
  const handleSidebarLeave = () => { if (isHoverMode) setIsHoverMode(false); };
  const handleUnpinClick = () => { setIsNoteListOpen(false); setIsHoverMode(false); };

  return (
    <TooltipProvider>
      <Card className={cn("h-full w-full flex flex-col rounded-none border-0 md:border-l bg-editor-background", isFocusMode && 'md:border-l-0')}>

        <div className="flex items-center justify-between p-1 border-b border-editor-border flex-shrink-0">
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isNoteListOpen ? handleUnpinClick : handlePinClick}
                  onMouseEnter={handlePeekHover}
                >
                  {isNoteListOpen ? <PanelLeftClose className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{isNoteListOpen ? 'Close notes list' : 'Hover to peek, click to pin'}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center">
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleZoomOut}><ZoomOut className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Zoom Out</p></TooltipContent></Tooltip>
            <span className="text-sm font-semibold text-foreground min-w-[3rem] text-center select-none">{Math.round(zoomLevel * 100)}%</span>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleZoomIn}><ZoomIn className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Zoom In</p></TooltipContent></Tooltip>
            <div className="h-6 w-px bg-editor-border mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onToggleFocusMode}>
                  {isFocusMode ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}</p></TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div
            className={cn(
              "flex flex-col bg-muted/20 transition-all duration-300 ease-in-out",
              showSidebar ? "w-64 border-r border-editor-border" : "w-0 overflow-hidden"
            )}
            onMouseLeave={handleSidebarLeave}
          >
            <div className="flex items-center justify-between p-2 border-b border-editor-border flex-shrink-0">
              <h3 className="font-semibold text-sm truncate ml-2">My Notes</h3>
            </div>
            <FolderSidebar
              folders={folderStructure.folders}
              itemFolderMap={folderStructure.itemFolderMap}
              allItems={Object.keys(notes)}
              activeItem={activeSheetName}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onSelectItem={onSelectNote}
              onMoveItem={onMoveNote}
              onRenameItem={onRenameNote}
              onDeleteItem={onDeleteNote}
              createNewItemLabel="Create New Note"
              onCreateNewItem={onCreateNewNote}
              isRenamingItem={renamingNoteName}
              setIsRenamingItem={setRenamingNoteName}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {!activeSheetName ? (
              <div className="h-full flex items-center justify-center p-4">
                <p className="text-muted-foreground text-center">Select or create a note to begin.</p>
              </div>
            ) : (
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                {editor && <BubbleMenu editor={editor}><BubbleToolbar editor={editor} /></BubbleMenu>}
                <div className="flex-1 overflow-y-auto editor-scroll-container">
                  <EditorContent editor={editor} className="h-full" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }} />
                </div>
              </CardContent>
            )}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};