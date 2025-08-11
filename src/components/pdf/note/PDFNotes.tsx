// src/components/pdf/note/PDFNotes.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditorToolbar } from './EditorToolbar';
import { BubbleToolbar } from './BubbleToolbar';
import SlashCommand from '@/lib/tiptap-extensions/slash-command';

interface PDFNotesProps {
  activeSheetName: string | null;
  notes: { [key: string]: string };
  onNoteChange: (newText: string) => void;
}

export const PDFNotes = ({ activeSheetName, notes, onNoteChange }: PDFNotesProps) => {
  const currentNote = activeSheetName ? notes[activeSheetName] ?? '' : '';
  const prevActiveSheetName = useRef(activeSheetName);
  // --- The state now represents a scale factor ---
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100% scale

  // --- The zoom step is adjusted for a better feel with scale() ---
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.05, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.05, 0.5));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Typography,
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`;
          }
          return "Type '/' for commands or start writing...";
        },
      }),
      SlashCommand,
    ],
    content: currentNote,
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
    onUpdate: ({ editor }) => {
      onNoteChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    if (activeSheetName !== prevActiveSheetName.current || editor.getHTML() !== currentNote) {
        editor.commands.setContent(currentNote, false);
        prevActiveSheetName.current = activeSheetName;
    }
  }, [activeSheetName, currentNote, editor]);

  if (!activeSheetName) {
    return (
      <Card className="h-full w-full flex flex-col rounded-none border-0 md:border-l">
        <div className="h-full flex items-center justify-center p-4 bg-muted/20">
          <p className="text-muted-foreground text-center">Select or create a note sheet to begin.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full flex flex-col rounded-none border-0 md:border-l bg-editor-background">
      <CardHeader className="p-3 border-b border-editor-border">
        <CardTitle className="text-base truncate flex items-center gap-2 text-editor-foreground">
          <span className="text-base" role="img" aria-label="Notes">📝</span>
          <span className="font-medium">{activeSheetName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <EditorToolbar onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
        {editor && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
              <BubbleToolbar editor={editor} />
            </BubbleMenu>
        )}
        <div className="flex-1 overflow-y-auto editor-scroll-container">
          <EditorContent 
            editor={editor} 
            className="h-full"
            style={{ 
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
             }}
          />
        </div>
      </CardContent>
    </Card>
  );
};