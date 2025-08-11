// src/components/pdf/note/EditorToolbar.tsx

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, List, ListOrdered, ChevronRight,
  Heading1, Heading2, Heading3, Type, Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  const toolbarButtonGroups = [
    {
      group: 'text',
      buttons: [
        { icon: Bold, label: 'Bold', command: () => editor.chain().focus().toggleBold().run(), isActive: () => editor.isActive('bold'), shortcut: 'Ctrl+B' },
        { icon: Italic, label: 'Italic', command: () => editor.chain().focus().toggleItalic().run(), isActive: () => editor.isActive('italic'), shortcut: 'Ctrl+I' },
        { icon: Underline, label: 'Underline', command: () => editor.chain().focus().toggleUnderline().run(), isActive: () => editor.isActive('underline'), shortcut: 'Ctrl+U' }
      ]
    },
    {
      group: 'headings',
      buttons: [
        { icon: Heading1, label: 'Heading 1', command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive('heading', { level: 1 }) },
        { icon: Heading2, label: 'Heading 2', command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive('heading', { level: 2 }) },
        { icon: Heading3, label: 'Heading 3', command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.isActive('heading', { level: 3 }) },
        { icon: Type, label: 'Normal Text', command: () => editor.chain().focus().setParagraph().run(), isActive: () => editor.isActive('paragraph') }
      ]
    },
    {
      group: 'blocks',
      buttons: [
        { icon: List, label: 'Bullet List', command: () => editor.chain().focus().toggleBulletList().run(), isActive: () => editor.isActive('bulletList') },
        { icon: ListOrdered, label: 'Numbered List', command: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive('orderedList') },
        { icon: Quote, label: 'Blockquote', command: () => editor.chain().focus().toggleBlockquote().run(), isActive: () => editor.isActive('blockquote') },
        { icon: ChevronRight, label: 'Toggle Block', command: () => editor.chain().focus().setToggleBlock().run(), isActive: () => editor.isActive('toggleBlock') }
      ]
    }
  ];

  return (
    <div className="border-b bg-muted/30 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">
        {toolbarButtonGroups.map((group, groupIndex) => (
          <React.Fragment key={group.group}>
            {groupIndex > 0 && <div className="w-px h-6 bg-border mx-2" />}
            <div className="flex items-center gap-0.5">
              {group.buttons.map((button) => {
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
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}