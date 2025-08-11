import { Node, mergeAttributes, textblockTypeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ToggleBlockView } from '@/components/pdf/note/ToggleBlockView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleBlock: {
      /**
       * Set a toggle block
       */
      setToggleBlock: () => ReturnType,
      /**
       * Toggle a toggle block
       */
      toggleToggleBlock: () => ReturnType,
    }
  }
}

export const ToggleBlock = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+', // Can contain one or more blocks
  defining: true,

  addAttributes() {
    return {
      isExpanded: {
        default: true,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggle-block"]',
        getAttrs: (dom) => {
            const element = dom as HTMLElement;
            return { isExpanded: element.getAttribute('data-is-expanded') === 'true' }
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // The ReactNodeViewRenderer will handle the actual rendering
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle-block' }), 0];
  },

  addCommands() {
    return {
      setToggleBlock: () => ({ commands }) => {
        return commands.wrapIn(this.name);
      },
      toggleToggleBlock: () => ({ commands }) => {
        return commands.toggleWrap(this.name);
      },
    };
  },
  
  // Use a Regex to convert '> ' at the beginning of a line to a toggle block
  addInputRules() {
    return [
        textblockTypeInputRule({
            find: /^\s*>\s$/,
            type: this.type,
        }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockView);
  },
});