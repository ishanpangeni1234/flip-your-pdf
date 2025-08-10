// src/components/pdf/note/use-notes.ts

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { getStoredNotes, storeNotes } from "@/lib/pdf-storage";

export const useNotes = (fileName: string) => {
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [activeNoteSheet, setActiveNoteSheet] = useState<string | null>(null);
  const debouncedNotes = useDebounce(notes, 1000);
  const { toast } = useToast();

  // Load notes from storage on initial render or when file changes
  useEffect(() => {
    const loadNotes = async () => {
      const storedNotes = await getStoredNotes(fileName);
      if (storedNotes) {
        setNotes(storedNotes);
      }
    };
    loadNotes();
  }, [fileName]);

  // Save notes to storage when they change (debounced)
  useEffect(() => {
    if (Object.keys(debouncedNotes).length > 0) {
      storeNotes(fileName, debouncedNotes);
    }
  }, [debouncedNotes, fileName]);

  // Handler for creating a new note sheet
  const handleCreateNewNote = useCallback(() => {
    const name = prompt("Enter a name for your new note sheet:");
    if (name && !notes[name]) {
      setNotes(prev => ({ ...prev, [name]: '' }));
      setActiveNoteSheet(name);
      return name; // Return name to signal success
    } else if (name) {
      toast({ title: "Note Exists", description: "A note sheet with that name already exists.", variant: "destructive" });
    }
    return null; // Return null on failure or cancellation
  }, [notes, toast]);

  // Handler for selecting an existing note sheet
  const handleSelectNote = useCallback((name: string) => {
    setActiveNoteSheet(name);
  }, []);

  // Handler for when the text in the active note editor changes
  const handleNoteChange = useCallback((newText: string) => {
    if (activeNoteSheet) {
      setNotes(prev => ({...prev, [activeNoteSheet]: newText }));
    }
  }, [activeNoteSheet]);

  return {
    notes,
    activeNoteSheet,
    handleCreateNewNote,
    handleSelectNote,
    handleNoteChange,
  };
};