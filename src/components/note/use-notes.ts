// src/components/note/use-notes.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

import { getNotesFromCloud, saveNotesToCloud } from "@/lib/firebase-service";
import { useAuth } from "@/lib/auth-context";
import type { FolderStructure } from '@/lib/folder-types';
import { createNewFolder, moveItemToFolder } from '@/lib/folder-types';

export const useNotes = (fileName: string) => {
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [activeNoteSheet, setActiveNoteSheet] = useState<string | null>(null);
  const [folderStructure, setFolderStructure] = useState<FolderStructure>({
    folders: {},
    itemFolderMap: {}
  });
  const debouncedNotes = useDebounce(notes, 1000);
  const debouncedFolders = useDebounce(folderStructure, 1000);
  const { toast } = useToast();
  const { user } = useAuth();
  const isLoaded = useRef(false);

  // Load notes from cloud only when user is logged in
  useEffect(() => {
    const loadNotes = async () => {
      if (user) {
        const storedData = await getNotesFromCloud(user.uid, fileName);
        setNotes(storedData?.notes || {});
        setFolderStructure(storedData?.folderStructure || { folders: {}, itemFolderMap: {} });
      } else {
        // Clear state if not logged in
        setNotes({});
        setFolderStructure({ folders: {}, itemFolderMap: {} });
      }
      setActiveNoteSheet(null);
      isLoaded.current = true;
    };
    isLoaded.current = false;
    loadNotes();
  }, [fileName, user]);

  // Save notes to storage when they change (debounced) - Cloud only
  useEffect(() => {
    const saveNotes = async () => {
      if (!fileName || !isLoaded.current || !user) return;

      // Save to cloud
      await saveNotesToCloud(user.uid, fileName, debouncedNotes, debouncedFolders);
    };

    if (isLoaded.current) {
      saveNotes();
    }
  }, [debouncedNotes, debouncedFolders, fileName, user]);

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

    setFolderStructure(prev => {
      const newItemFolderMap = { ...prev.itemFolderMap };
      if (newItemFolderMap.hasOwnProperty(name)) {
        delete newItemFolderMap[name];
      }
      return { ...prev, itemFolderMap: newItemFolderMap };
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

    // Update folder structure map if the note is in a folder
    setFolderStructure(prev => {
      const newItemFolderMap = { ...prev.itemFolderMap };
      if (newItemFolderMap.hasOwnProperty(oldName)) {
        const folderId = newItemFolderMap[oldName];
        delete newItemFolderMap[oldName];
        newItemFolderMap[newName] = folderId;
      }
      return { ...prev, itemFolderMap: newItemFolderMap };
    });

    setActiveNoteSheet(currentActiveSheet =>
      currentActiveSheet === oldName ? newName : currentActiveSheet
    );

    toast({ title: "Note Renamed", description: `"${oldName}" is now "${newName}".` })
    return true;
  }, [notes, toast]);

  // Folder management functions
  const handleCreateFolder = useCallback(() => {
    let folderName = "New Folder";
    let counter = 1;
    const existingNames = Object.values(folderStructure.folders).map(f => f.name);
    while (existingNames.includes(folderName)) {
      folderName = `New Folder ${counter}`;
      counter++;
    }

    const newFolder = createNewFolder(folderName);
    setFolderStructure(prev => ({
      ...prev,
      folders: {
        ...prev.folders,
        [newFolder.id]: newFolder
      }
    }));
    toast({ title: "Folder Created", description: `Created folder "${folderName}".` });
  }, [folderStructure, toast]);

  const handleRenameFolder = useCallback((folderId: string, newName: string): boolean => {
    if (!newName || newName.trim().length === 0) {
      toast({ title: "Invalid Name", description: "Folder name cannot be empty.", variant: "destructive" });
      return false;
    }

    const currentFolder = folderStructure.folders[folderId];
    if (!currentFolder) return false;

    if (newName === currentFolder.name) return true;

    const existingNames = Object.values(folderStructure.folders)
      .filter(f => f.id !== folderId)
      .map(f => f.name);

    if (existingNames.includes(newName)) {
      toast({ title: "Cannot Rename", description: `A folder named "${newName}" already exists.`, variant: "destructive" });
      return false;
    }

    setFolderStructure(prev => ({
      ...prev,
      folders: {
        ...prev.folders,
        [folderId]: { ...currentFolder, name: newName }
      }
    }));

    toast({ title: "Folder Renamed", description: `"${currentFolder.name}" is now "${newName}".` });
    return true;
  }, [folderStructure, toast]);

  const handleDeleteFolder = useCallback((folderId: string) => {
    const folder = folderStructure.folders[folderId];
    if (!folder) return;

    // Move all items in this folder to unorganized
    setFolderStructure(prev => {
      const newItemFolderMap = { ...prev.itemFolderMap };
      Object.keys(newItemFolderMap).forEach(itemName => {
        if (newItemFolderMap[itemName] === folderId) {
          delete newItemFolderMap[itemName];
        }
      });

      const { [folderId]: _, ...remainingFolders } = prev.folders;

      return {
        folders: remainingFolders,
        itemFolderMap: newItemFolderMap
      };
    });

    toast({ title: "Folder Deleted", description: `Deleted folder "${folder.name}". Items moved to unorganized.` });
  }, [folderStructure, toast]);

  const handleMoveNote = useCallback((noteName: string, targetFolderId: string | null) => {
    setFolderStructure(prev => ({
      ...prev,
      itemFolderMap: moveItemToFolder(noteName, targetFolderId, prev.itemFolderMap)
    }));
  }, []);

  return {
    notes,
    activeNoteSheet,
    handleCreateNewNote,
    handleSelectNote,
    handleNoteChange,
    handleDeleteNote,
    handleRenameNote,
    // Folder management
    folderStructure,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveNote,
  };
};