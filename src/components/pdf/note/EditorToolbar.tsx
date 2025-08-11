// src/components/pdf/note/EditorToolbar.tsx

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, Code,
  List, ListOrdered, Quote, Link, Minus, CheckSquare,
  Heading1, Heading2, Heading3, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };
  
  const toolbarItems = [
    { type: 'group', items: [
      { icon: Bold, label: 'Bold', command: () => editor.chain().focus().toggleBold().run(), isActive: () => editor.isActive('bold'), shortcut: 'Ctrl+B' },
      { icon: Italic, label: 'Italic', command: () => editor.chain().focus().toggleItalic().run(), isActive: () => editor.isActive('italic'), shortcut: 'Ctrl+I' },
      { icon: Underline, label: 'Underline', command: () => editor.chain().focus().toggleUnderline().run(), isActive: () => editor.isActive('underline'), shortcut: 'Ctrl+U' },
      { icon: Strikethrough, label: 'Strikethrough', command: () => editor.chain().focus().toggleStrike().run(), isActive: () => editor.isActive('strike') },
      { icon: Code, label: 'Inline Code', command: () => editor.chain().focus().toggleCode().run(), isActive: () => editor.isActive('code') },
    ]},
    { type: 'separator' },
    { type: 'group', items: [
      { icon: Heading1, label: 'Heading 1', command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive('heading', { level: 1 }) },
      { icon: Heading2, label: 'Heading 2', command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive('heading', { level: 2 }) },
      { icon: Heading3, label: 'Heading 3', command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.isActive('heading', { level: 3 }) },
      { icon: Type, label: 'Normal Text', command: () => editor.chain().focus().setParagraph().run(), isActive: () => editor.isActive('paragraph') },
    ]},
    { type: 'separator' },
    { type: 'group', items: [
      { icon: List, label: 'Bullet List', command: () => editor.chain().focus().toggleBulletList().run(), isActive: () => editor.isActive('bulletList') },
      { icon: ListOrdered, label: 'Numbered List', command: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive('orderedList') },
      { icon: CheckSquare, label: 'Task List', command: () => editor.chain().focus().toggleTaskList().run(), isActive: () => editor.isActive('taskList') },
      { icon: Quote, label: 'Blockquote', command: () => editor.chain().focus().toggleBlockquote().run(), isActive: () => editor.isActive('blockquote') },
    ]},
    { type: 'separator' },
    { type: 'group', items: [
      { icon: Link, label: 'Link', command: addLink, isActive: () => editor.isActive('link') },
      { icon: Minus, label: 'Horizontal Rule', command: () => editor.chain().focus().setHorizontalRule().run(), isActive: () => false },
    ]}
  ];

  return (
    <div className="border-b border-editor-border bg-editor-background px-3 py-2">
      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-1">
          {toolbarItems.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {group.type === 'separator' ? (
                <Separator orientation="vertical" className="h-8 mx-1" />
              ) : (
                <div className="flex items-center gap-0.5">
                  {group.items.map((button) => {
                    const IconComponent = button.icon;
                    const tooltipText = button.shortcut ? `${button.label} (${button.shortcut})` : button.label;
                    
                    return (
                      <Tooltip key={button.label} delayDuration={300}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={button.isActive() ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={button.command}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label={button.label}
                          >
                            <IconComponent className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tooltipText}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}