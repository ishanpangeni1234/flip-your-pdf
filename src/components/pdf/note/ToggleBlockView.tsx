// src/components/pdf/note/ToggleBlockView.tsx

import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export const ToggleBlockView: React.FC<NodeViewProps> = ({ node, getPos, editor }) => {
  const [isExpanded, setIsExpanded] = useState(node.attrs.isExpanded);

  const toggle = () => {
    setIsExpanded(!isExpanded);
    // Persist the state to the Tiptap document
    if (typeof getPos === 'function') {
      editor.view.dispatch(
        editor.view.state.tr.setNodeMarkup(getPos(), undefined, {
          isExpanded: !isExpanded,
        })
      );
    }
  };

  return (
    <NodeViewWrapper className="toggle-block">
      <div className="toggle-header" onClick={toggle}>
        <button className="toggle-arrow">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {/* The title will be the first element inside the content */}
      </div>
      <NodeViewContent
        className="toggle-content"
        style={{ display: isExpanded ? 'block' : 'none' }}
      />
    </NodeViewWrapper>
  );
};