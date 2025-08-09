// src/components/pdf/PDFNotes.tsx

import React, { useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditorToolbar } from './EditorToolbar';

interface PDFNotesProps {
  activeSheetName: string | null;
  notes: { [key: string]: string };
  onNoteChange: (newText: string) => void;
}

export const PDFNotes = ({ activeSheetName, notes, onNoteChange }: PDFNotesProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  const currentNote = activeSheetName ? notes[activeSheetName] ?? '' : '';

  // Effect to update the editor's content when the active note sheet changes
  useEffect(() => {
    if (editorRef.current) {
        const editorContent = editorRef.current.innerHTML;
        if (editorContent !== currentNote) {
            isInternalUpdate.current = true;
            editorRef.current.innerHTML = currentNote || '<p data-placeholder="Start typing your notes..."><br/></p>';
            setTimeout(() => { isInternalUpdate.current = false; }, 50);
        }
    }
  }, [currentNote]);

  // Main callback to bubble up changes to the PDFViewer
  const handleInput = useCallback(() => {
    if (isInternalUpdate.current) return;
    if (editorRef.current && activeSheetName) {
      onNoteChange(editorRef.current.innerHTML);
    }
  }, [onNoteChange, activeSheetName]);

  const createToggleBlock = useCallback((title: string = '') => {
    return `
      <div class="toggle-block">
        <div class="toggle-header">
          <span class="toggle-arrow">▼</span>
          <span class="toggle-title" contenteditable="true">${title}</span>
        </div>
        <div class="toggle-content">
          <p data-placeholder="Add content here..."><br/></p>
        </div>
      </div>
    `;
  }, []);

  // Keyboard handling for smart shortcuts and navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const parentElement = startContainer.nodeType === 3 ? startContainer.parentElement! : startContainer as HTMLElement;

    const createAndFocusNewParagraph = (afterElement: Element) => {
        const newP = document.createElement('p');
        newP.innerHTML = '<br/>'; // Use <br> to ensure it has height and is focusable
        afterElement.after(newP);
        const newRange = document.createRange();
        newRange.setStart(newP, 0);
        selection.removeAllRanges();
        selection.addRange(newRange);
        handleInput();
    };

    // --- NEW: Handle Down Arrow at the end of the document ---
    if (e.key === 'ArrowDown') {
        const lastElement = editorRef.current.lastElementChild;
        if (lastElement) {
            const lastElementRect = lastElement.getBoundingClientRect();
            const selectionRect = range.getBoundingClientRect();
            // Check if anchorNode is valid before using contains
            const isSelectionInLastElement = selection.anchorNode && lastElement.contains(selection.anchorNode);
            
            // If cursor is in the last element AND visually at the bottom of it
            if (isSelectionInLastElement && selectionRect.bottom >= lastElementRect.bottom - 5) {
                e.preventDefault();
                createAndFocusNewParagraph(lastElement);
                return;
            }
        }
    }

    // Handle Backspace on an empty list item to convert it to a paragraph
    if (e.key === 'Backspace' && range.collapsed && range.startOffset === 0) {
        const parentLi = parentElement.closest('li');
        if (parentLi && !parentLi.textContent?.trim()) {
            e.preventDefault();
            document.execCommand('outdent');
            handleInput();
            return;
        }
    }

    // --- UPDATED: Handle Enter key with special logic ---
    if (e.key === 'Enter') {
        // --- NEW: Handle Enter in a blockquote to "escape" it ---
        const blockquote = parentElement.closest('blockquote');
        if (blockquote && range.collapsed) {
            const currentBlock = parentElement.closest('p, div'); // A <p> is usually inside the quote
            // If the current paragraph inside the quote is empty, we escape
            if (currentBlock && !currentBlock.textContent?.trim()) {
                e.preventDefault();
                // Move this empty block to be *after* the quote, effectively creating a new line outside
                blockquote.after(currentBlock);
                selection.collapse(currentBlock, 0);

                // If the quote is now empty because we moved its only content, remove it
                if (!blockquote.textContent?.trim()) {
                    blockquote.remove();
                }
                handleInput();
                return;
            }
        }
      
        // Check if we are inside a toggle title
        const toggleTitle = parentElement.closest('.toggle-title');
        if (toggleTitle) {
            e.preventDefault();
            const toggleBlock = toggleTitle.closest('.toggle-block');
            const toggleContent = toggleBlock?.querySelector('.toggle-content') as HTMLElement | null;

            if (toggleBlock && toggleContent && toggleContent.style.display !== 'none') {
                const firstEditable = toggleContent.querySelector('p, li');
                if (firstEditable) { selection.collapse(firstEditable, 0); }
            } else if (toggleBlock) {
                createAndFocusNewParagraph(toggleBlock);
            }
            handleInput();
            return;
        }

        // Handle Enter on an empty list item to outdent
        const parentLi = parentElement.closest('li');
        if (parentLi && !parentLi.textContent?.trim()) {
            e.preventDefault();
            document.execCommand('outdent');
            handleInput();
            return;
        }
    }
    
    // Handle '---' for horizontal rule
    if (e.key === '-') {
      if (startContainer.nodeType === Node.TEXT_NODE && range.startOffset >= 2) {
        const text = startContainer.textContent || '';
        if (text.substring(range.startOffset - 2, range.startOffset) === '--') {
          e.preventDefault();
          range.setStart(startContainer, range.startOffset - 2);
          range.deleteContents();
          document.execCommand('insertHorizontalRule', false);
          handleInput();
          return;
        }
      }
    }

    // Handle space key for auto-formatting
    if (e.key === ' ') {
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const text = startContainer.textContent || '';
        const beforeCursor = text.substring(0, range.startOffset);
        
        const parentLi = (startContainer.parentElement as HTMLElement)?.closest('li');
        if (parentLi && parentLi.textContent.trim() === beforeCursor) {
            let listType: 'insertOrderedList' | 'insertUnorderedList' | null = null;
            if (beforeCursor.match(/^1\.$/)) listType = 'insertOrderedList';
            else if (beforeCursor === '-' || beforeCursor === '*') listType = 'insertUnorderedList';

            if (listType) {
                e.preventDefault();
                range.setStart(startContainer, 0);
                range.deleteContents(); 
                document.execCommand('outdent', false);
                document.execCommand(listType, false);
                handleInput();
                return;
            }
        }
        
        const formatAndReplace = (charsToRemove: number, command: string, value?: string) => {
          e.preventDefault();
          range.setStart(startContainer, range.startOffset - charsToRemove);
          range.deleteContents();
          document.execCommand(command, false, value);
          handleInput();
        };

        if (beforeCursor.match(/^1\.$/)) return formatAndReplace(2, 'insertOrderedList');
        if (beforeCursor === '>') {
            e.preventDefault();
            range.setStart(startContainer, range.startOffset - 1);
            range.deleteContents();
            const parser = new DOMParser();
            const doc = parser.parseFromString(createToggleBlock(), 'text/html');
            const newToggleBlock = doc.body.firstChild;

            if (newToggleBlock) {
                range.insertNode(newToggleBlock);
                const titleSpan = (newToggleBlock as HTMLElement).querySelector('.toggle-title');
                if (titleSpan) {
                    const newRange = document.createRange();
                    newRange.selectNodeContents(titleSpan);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            }
            handleInput();
            return;
        }
        if (beforeCursor === '-' || beforeCursor === '*') return formatAndReplace(1, 'insertUnorderedList');
      }
    }

  }, [handleInput, createToggleBlock, editorRef]);

  // Click handler for toggles and for adding new paragraphs in empty space
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // --- NEW: Click-to-add-paragraph logic ---
    if (target === editorRef.current && editorRef.current) {
        const lastElement = editorRef.current.lastElementChild;
        const addAndFocusNewParagraph = () => {
            const newP = document.createElement('p');
            newP.innerHTML = '<br/>';
            editorRef.current!.appendChild(newP);
            const selection = window.getSelection();
            const range = document.createRange();
            if (selection) {
                range.setStart(newP, 0);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            handleInput();
        };

        if (lastElement) { // If there's content, check if click was below it
            const lastElementRect = lastElement.getBoundingClientRect();
            if (e.clientY > lastElementRect.bottom) {
                addAndFocusNewParagraph();
            }
        } else { // Editor is completely empty
            addAndFocusNewParagraph();
        }
    }

    // --- EXISTING: Toggle Block logic ---
    const header = target.closest('.toggle-header');
    if (header && !target.closest('.toggle-title')) {
        const content = header?.nextElementSibling as HTMLElement;
        if (content) {
            const isExpanded = content.style.display !== 'none';
            content.style.display = isExpanded ? 'none' : 'block';
            const arrow = header.querySelector('.toggle-arrow');
            if(arrow) arrow.innerHTML = isExpanded ? '▶' : '▼';
            handleInput();
        }
    }
  }, [handleInput]);

  // Apply formatting from the toolbar
  const applyFormat = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    if (command === 'toggleBlock') {
      document.execCommand('insertHTML', false, createToggleBlock());
    } else {
      document.execCommand(command, false, value);
    }
    handleInput();
  }, [handleInput, createToggleBlock]);

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
        <EditorToolbar onFormat={applyFormat} />
        <div className="flex-1 overflow-y-auto relative wysiwyg-editor-container">
          <div
            ref={editorRef}
            contentEditable="true"
            spellCheck="true"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            className="wysiwyg-editor p-4 md:p-6 h-full focus:outline-none"
          />
        </div>
      </CardContent>
    </Card>
  );
};