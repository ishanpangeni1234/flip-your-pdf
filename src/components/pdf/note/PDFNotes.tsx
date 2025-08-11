// src/components/pdf/note/PDFNotes.tsx

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditorToolbar } from './EditorToolbar';
import { ToggleBlock } from '@/lib/tiptap-extensions/ToggleBlock';

interface PDFNotesProps {
  activeSheetName: string | null;
  notes: { [key: string]: string };
  onNoteChange: (newText: string) => void;
}

export const PDFNotes = ({ activeSheetName, notes, onNoteChange }: PDFNotesProps) => {
  const currentNote = activeSheetName ? notes[activeSheetName] ?? '' : '';
  const prevActiveSheetName = useRef(activeSheetName);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The ToggleBlock handles its own input rule
        heading: { levels: [1, 2, 3] },
        // Disable the default heading input rule if you want to use a different one
      }),
      Underline,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`;
          }
          if (node.type.name === 'toggleBlock') {
             return "Toggle Title";
          }
          return 'Start typing your notes...';
        },
      }),
      ToggleBlock, // Our custom node
    ],
    content: currentNote,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onNoteChange(editor.getHTML());
    },
  });

  // Effect to update the editor's content when the active note sheet changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    // Only update content if the active sheet has actually changed
    // or if the content is out of sync
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
    <Card className="h-full w-full flex flex-col rounded-none border-0 md:border-l">
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-base truncate flex items-center gap-2">
          <span className="text-base" role="img" aria-label="Notes">📝</span>
          <span className="font-medium text-muted-foreground">{activeSheetName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <EditorToolbar editor={editor} />
        <div className="flex-1 overflow-y-auto">
          <EditorContent 
            editor={editor} 
            className="h-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};