// src/components/pdf/note/CommandList.tsx

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

type CommandListProps = {
  items: Array<{ title: string; icon: React.ReactNode; command: (props: any) => void }>;
  command: (item: any) => void;
};

export const CommandList = forwardRef((props: CommandListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className="command-list-popup">
      {props.items.map((item, index) => (
        <button
          key={item.title}
          className={`command-list-item ${index === selectedIndex ? 'is-selected' : ''}`}
          onClick={() => selectItem(index)}
        >
          <div className="command-list-icon">{item.icon}</div>
          <span>{item.title}</span>
        </button>
      ))}
    </div>
  );
});

CommandList.displayName = 'CommandList';