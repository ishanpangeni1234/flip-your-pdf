// src/components/pdf/note/PDFNotes.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import { PanelLeftClose, ChevronRight, PlusCircle, FileText, Trash2, Pencil, ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BubbleToolbar } from './BubbleToolbar';
import SlashCommand from '@/lib/tiptap-extensions/slash-command';

interface PDFNotesProps {
  activeSheetName: string | null;
  notes: { [key: string]: string };
  onNoteChange: (newText: string) => void;
  onCreateNewNote: () => void;
  onSelectNote: (name: string) => void;
  onRenameNote: (oldName: string, newName: string) => boolean;
  onDeleteNote: (name: string) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export const PDFNotes = ({ activeSheetName, notes, onNoteChange, onCreateNewNote, onSelectNote, onRenameNote, onDeleteNote, isFocusMode, onToggleFocusMode }: PDFNotesProps) => {
  const currentNote = activeSheetName ? notes[activeSheetName] ?? '' : '';
  const prevActiveSheetName = useRef(activeSheetName);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [isNoteListOpen, setIsNoteListOpen] = useState(false); // Pinned state
  const [isHoverMode, setIsHoverMode] = useState(false); // Temporary hover state

  const [renamingName, setRenamingName] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
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

  useEffect(() => { if (renamingName) inputRef.current?.focus(); }, [renamingName]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const hasActiveSheetChanged = activeSheetName !== prevActiveSheetName.current;
    if (hasActiveSheetChanged) {
        editor.commands.setContent(currentNote, false);
        setRenamingName(null);
        prevActiveSheetName.current = activeSheetName;
    } 
    else if (editor.getHTML() !== currentNote) {
        editor.commands.setContent(currentNote, false);
    }
  }, [activeSheetName, currentNote, editor]);

  const handleFinishRename = () => {
    if (renamingName) {
        const success = onRenameNote(renamingName, inputValue);
        if (success) {
            setRenamingName(null);
            setInputValue("");
        }
    } else {
        setInputValue("");
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleFinishRename();
    if (e.key === 'Escape') { setRenamingName(null); setInputValue(""); }
  };
  
  const startRename = (name: string) => { setRenamingName(name); setInputValue(name); };

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
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleZoomOut}><ZoomOut className="h-5 w-5"/></Button></TooltipTrigger><TooltipContent><p>Zoom Out</p></TooltipContent></Tooltip>
            <span className="text-sm font-semibold text-foreground min-w-[3rem] text-center select-none">{Math.round(zoomLevel * 100)}%</span>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleZoomIn}><ZoomIn className="h-5 w-5"/></Button></TooltipTrigger><TooltipContent><p>Zoom In</p></TooltipContent></Tooltip>
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
            <div className="flex-1 overflow-y-auto p-2">
              <Button onClick={onCreateNewNote} className="w-full justify-start mb-2" disabled={!!renamingName}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Note
              </Button>
              <div className="my-2 h-px bg-border" />
              <div className="flex flex-col gap-1 mt-1">
                  {Object.keys(notes).map(name => (
                      renamingName === name ? (
                          <div key={`renaming-${name}`} className="p-1">
                              <Input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleFinishRename} className="h-9"/>
                          </div>
                      ) : (
                          <Button key={name} variant={activeSheetName === name ? "secondary" : "ghost"} onClick={() => onSelectNote(name)} className="w-full justify-start truncate h-9 group pr-2">
                              <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="truncate flex-1 text-left">{name}</span>
                              <div className="flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); startRename(name);}}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Rename</p></TooltipContent></Tooltip>
                                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteNote(name);}}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Delete</p></TooltipContent></Tooltip>
                              </div>
                          </Button>
                      )
                  ))}
              </div>
            </div>
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
                  <EditorContent editor={editor} className="h-full" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}/>
                </div>
              </CardContent>
            )}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};