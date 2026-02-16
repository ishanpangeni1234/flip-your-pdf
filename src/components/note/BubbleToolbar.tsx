// src/components/pdf/note/BubbleToolbar.tsx

import React from 'react';
import { Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Strikethrough, Code, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BubbleToolbarProps {
  editor: Editor;
}

export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const buttons = [
    { icon: Bold, label: 'Bold', command: () => editor.chain().focus().toggleBold().run(), isActive: () => editor.isActive('bold') },
    { icon: Italic, label: 'Italic', command: () => editor.chain().focus().toggleItalic().run(), isActive: () => editor.isActive('italic') },
    { icon: Underline, label: 'Underline', command: () => editor.chain().focus().toggleUnderline().run(), isActive: () => editor.isActive('underline') },
    { icon: Strikethrough, label: 'Strikethrough', command: () => editor.chain().focus().toggleStrike().run(), isActive: () => editor.isActive('strike') },
    { icon: Code, label: 'Inline Code', command: () => editor.chain().focus().toggleCode().run(), isActive: () => editor.isActive('code') },
    { icon: Link, label: 'Link', command: addLink, isActive: () => editor.isActive('link') },
  ];

  return (
    <div className="bubble-menu-toolbar">
      <TooltipProvider>
        <div className="flex items-center gap-0.5">
          {buttons.map((button) => {
            const IconComponent = button.icon;
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
                  <p>{button.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}