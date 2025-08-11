// src/lib/tiptap-extensions/slash-command.tsx

import React from 'react';
import { Editor, Extension, Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import suggestion, { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import tippy, { Instance } from 'tippy.js';
import {
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Type, Minus
} from 'lucide-react';

import { CommandList } from '@/components/pdf/note/CommandList';

type CommandItemProps = {
  title: string;
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
  icon: React.ReactNode;
};

const getCommandItems = (): CommandItemProps[] => [
  {
    title: 'Normal Text',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
    icon: <Type className="h-4 w-4" />,
  },
  {
    title: 'Heading 1',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
    icon: <Heading1 className="h-4 w-4" />,
  },
  {
    title: 'Heading 2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
    icon: <Heading2 className="h-4 w-4" />,
  },
  {
    title: 'Heading 3',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
    icon: <Heading3 className="h-4 w-4" />,
  },
  {
    title: 'Bullet List',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
    icon: <List className="h-4 w-4" />,
  },
  {
    title: 'Numbered List',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
    icon: <ListOrdered className="h-4 w-4" />,
  },
  {
    title: 'Blockquote',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
    icon: <Quote className="h-4 w-4" />,
  },
  {
    title: 'Horizontal Rule',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
    icon: <Minus className="h-4 w-4" />,
  },
];

const commandRenderer = () => {
  let component: ReactRenderer<any>;
  let popup: Instance[];

  return {
    onStart: (props: SuggestionProps<CommandItemProps>) => {
      component = new ReactRenderer(CommandList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
    },

    onUpdate: (props: SuggestionProps<CommandItemProps>) => {
      component.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      popup[0].setProps({
        getReferenceClientRect: props.clientRect,
      });
    },

    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === 'Escape') {
        popup[0].hide();
        return true;
      }
      return component.ref?.onKeyDown(props.event);
    },

    onExit: () => {
      popup[0].destroy();
      component.destroy();
    },
  };
};

const SlashCommand = Extension.create({
  name: 'slash-command',
  addProseMirrorPlugins() {
    return [
      suggestion({
        editor: this.editor,
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        items: ({ query }) => {
          return getCommandItems()
            .filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
            .slice(0, 10);
        },
        render: commandRenderer,
      }),
    ];
  },
});

export default SlashCommand;