import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EditorToolbarProps {
  onFormat: (command: string, value?: string) => void;
}

export function EditorToolbar({ onFormat }: EditorToolbarProps) {
  const toolbarButtonGroups = [
    {
      group: 'text',
      buttons: [
        { icon: Bold, label: 'Bold', command: 'bold', shortcut: 'Ctrl+B' },
        { icon: Italic, label: 'Italic', command: 'italic', shortcut: 'Ctrl+I' },
        { icon: Underline, label: 'Underline', command: 'underline', shortcut: 'Ctrl+U' }
      ]
    },
    {
      group: 'headings',
      buttons: [
        { icon: Heading1, label: 'Heading 1', command: 'formatBlock', value: 'h1' },
        { icon: Heading2, label: 'Heading 2', command: 'formatBlock', value: 'h2' },
        { icon: Heading3, label: 'Heading 3', command: 'formatBlock', value: 'h3' },
        { icon: Type, label: 'Normal Text', command: 'formatBlock', value: 'p' }
      ]
    },
    {
      group: 'blocks',
      buttons: [
        { icon: List, label: 'Bullet List', command: 'insertUnorderedList' },
        { icon: ListOrdered, label: 'Numbered List', command: 'insertOrderedList' },
        { icon: Quote, label: 'Blockquote', command: 'formatBlock', value: 'blockquote' },
        { icon: ChevronRight, label: 'Toggle List', command: 'toggleBlock' }
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
                  <Tooltip key={button.command + (button.value || '')} delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onFormat(button.command, button.value)}
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