// src/components/pdf/note/PDFNotes.tsx

import React, { useEffect, useRef, useState } from 'react'; // Added useState
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditorToolbar } from './EditorToolbar';

interface PDFNotesProps {
  activeSheetName: string | null;
  notes: { [key: string]: string };
  onNoteChange: (newText: string) => void;
}

export const PDFNotes = ({ activeSheetName, notes, onNoteChange }: PDFNotesProps) => {
  const currentNote = activeSheetName ? notes[activeSheetName] ?? '' : '';
  const prevActiveSheetName = useRef(activeSheetName);
  const [zoom, setZoom] = useState(1); // 1 = 100%

  // Zoom control handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2)); // Max 200%
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5)); // Min 50%
  const handleResetZoom = () => setZoom(1);

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
        autolink: true,
        defaultProtocol: 'https',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`;
          }
          return 'Start typing your notes...';
        },
      }),
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

  // Effect to update the editor's content when the active note sheet changes
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
        <EditorToolbar 
            editor={editor}
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
        />
        <div className="flex-1 overflow-y-auto" style={{ zoom: zoom }}>
          <EditorContent 
            editor={editor} 
            className="h-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};