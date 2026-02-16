// src/components/pdf/note/use-notes.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { getStoredNotes, storeNotes } from "@/lib/pdf-storage";
import { getNotesFromCloud, saveNotesToCloud } from "@/lib/firebase-service";
import { useAuth } from "@/lib/auth-context";

export const useNotes = (fileName: string) => {
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [activeNoteSheet, setActiveNoteSheet] = useState<string | null>(null);
  const debouncedNotes = useDebounce(notes, 1000);
  const { toast } = useToast();
  const { user } = useAuth();
  const isLoaded = useRef(false);

  // Load notes from storage on initial render or when file or user changes
  useEffect(() => {
    const loadNotes = async () => {
      let storedNotes = null;
      if (user) {
        // Try Cloud
        storedNotes = await getNotesFromCloud(user.uid, fileName);
        if (!storedNotes) {
          storedNotes = await getStoredNotes(fileName);
        }
      } else {
        // Local only
        storedNotes = await getStoredNotes(fileName);
      }
      setNotes(storedNotes || {});
      setActiveNoteSheet(null);
      isLoaded.current = true;
    };
    isLoaded.current = false;
    loadNotes();
  }, [fileName, user]);

  // Save notes to storage when they change (debounced)
  useEffect(() => {
    const saveNotes = async () => {
      if (!fileName || !isLoaded.current) return;

      if (user) {
        // Save to cloud
        await saveNotesToCloud(user.uid, fileName, debouncedNotes);
      } else {
        // Save to local
        if (Object.keys(debouncedNotes).length > 0 || getStoredNotes(fileName) !== null) {
          storeNotes(fileName, debouncedNotes);
        }
      }
    };
    if (isLoaded.current) {
      saveNotes();
    }
  }, [debouncedNotes, fileName, user]);

  // Creates a new note with a unique default name, and returns that name.
  const handleCreateNewNote = useCallback(() => {
    let newName = "New Note";
    let counter = 1;
    while (notes.hasOwnProperty(newName)) {
      newName = `New Note ${counter}`;
      counter++;
    }
    setNotes(prev => ({ ...prev, [newName]: '' }));
    setActiveNoteSheet(newName);
    return newName; // Return name to signal success and allow tracking
  }, [notes]);

  // Handler for selecting an existing note sheet
  const handleSelectNote = useCallback((name: string) => {
    setActiveNoteSheet(name);
  }, []);

  // Handler for when the text in the active note editor changes
  const handleNoteChange = useCallback((newText: string) => {
    if (activeNoteSheet) {
      setNotes(prev => ({ ...prev, [activeNoteSheet]: newText }));
    }
  }, [activeNoteSheet]);

  // Handler for deleting a note
  const handleDeleteNote = useCallback((name: string) => {
    setNotes(prev => {
      const newNotes = { ...prev };
      delete newNotes[name];
      return newNotes;
    });
    if (activeNoteSheet === name) {
      setActiveNoteSheet(null);
    }
  }, [activeNoteSheet]);

  // Handler for renaming a note
  const handleRenameNote = useCallback((oldName: string, newName: string): boolean => {
    if (!newName || newName.trim().length === 0) {
      toast({ title: "Invalid Name", description: "Note name cannot be empty.", variant: "destructive" });
      return false;
    }
    if (newName === oldName) return true;
    if (notes.hasOwnProperty(newName)) {
      toast({ title: "Cannot Rename", description: `A note named "${newName}" already exists.`, variant: "destructive" });
      return false;
    }

    setNotes(prev => {
      const content = prev[oldName];
      const { [oldName]: _, ...rest } = prev;
      return { ...rest, [newName]: content };
    });

    setActiveNoteSheet(currentActiveSheet =>
      currentActiveSheet === oldName ? newName : currentActiveSheet
    );

    toast({ title: "Note Renamed", description: `"${oldName}" is now "${newName}".` })
    return true;
  }, [notes, toast]);

  return {
    notes,
    activeNoteSheet,
    handleCreateNewNote,
    handleSelectNote,
    handleNoteChange,
    handleDeleteNote,
    handleRenameNote,
  };
};