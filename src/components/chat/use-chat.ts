// src/components/chat/use-chat.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';

import { getChatsFromCloud, saveChatsToCloud } from '@/lib/firebase-service';
import { useAuth } from '@/lib/auth-context';
import type { ChatMessage } from './Chat';
import type { FolderStructure } from '@/lib/folder-types';
import { createNewFolder, moveItemToFolder } from '@/lib/folder-types';

interface UseChatProps {
  fileName: string;
}

export const useChat = ({ fileName }: UseChatProps) => {
  const [allChats, setAllChats] = useState<{ [key: string]: ChatMessage[] }>({});
  const [activeChatName, setActiveChatName] = useState<string | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [selectedContextPages, setSelectedContextPages] = useState<Set<number>>(new Set());
  const [folderStructure, setFolderStructure] = useState<FolderStructure>({
    folders: {},
    itemFolderMap: {}
  });

  const debouncedChats = useDebounce(allChats, 1000);
  const debouncedFolders = useDebounce(folderStructure, 1000);
  const { toast } = useToast();
  const { user } = useAuth();
  const isLoaded = useRef(false);
  const aiClient = useRef<GoogleGenAI | null>(null);

  // Initialize Gemini Client
  useEffect(() => {
    // IMPORTANT: Storing API keys directly in code is not secure for production.
    // Consider using environment variables.
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      aiClient.current = new GoogleGenAI({ apiKey });
    } else {
      console.error("Gemini API key is missing.");
      toast({
        title: "Configuration Error",
        description: "AI Chat functionality is disabled. API key is not configured.",
        variant: "destructive",
      })
    }
  }, [toast]);

  // Load chats from cloud only when user is logged in
  useEffect(() => {
    const loadChats = async () => {
      if (user) {
        const storedData = await getChatsFromCloud(user.uid, fileName);
        const validChats: { [key: string]: ChatMessage[] } = {};
        const chats = storedData?.chats || {};

        // Sanitize chats to ensure they are arrays
        Object.entries(chats).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            validChats[key] = value;
          } else {
            console.warn(`Invalid chat data found for chat "${key}". Expected array, got:`, typeof value);
            // Optionally try to recover if it's an object with numbered keys, but for now just skip or reset
            validChats[key] = [];
          }
        });

        setAllChats(validChats);
        setFolderStructure(storedData?.folderStructure || { folders: {}, itemFolderMap: {} });
      } else {
        // Clear state if not logged in
        setAllChats({});
        setFolderStructure({ folders: {}, itemFolderMap: {} });
      }
      setActiveChatName(null);
      isLoaded.current = true;
    };

    if (fileName) {
      isLoaded.current = false;
      loadChats();
    }
  }, [fileName, user]);

  // Save chats to storage when they change (debounced) - Cloud only
  useEffect(() => {
    const saveChats = async () => {
      if (!fileName || !isLoaded.current || !user) return;

      // Save to cloud since user is logged in
      await saveChatsToCloud(user.uid, fileName, debouncedChats, debouncedFolders);
    };

    if (isLoaded.current) {
      saveChats();
    }
  }, [debouncedChats, debouncedFolders, fileName, user]);

  const handleCreateNewChat = useCallback(() => {
    let newName = "New Chat";
    let counter = 1;
    while (allChats.hasOwnProperty(newName)) {
      newName = `New Chat ${counter}`;
      counter++;
    }
    setAllChats(prev => ({ ...prev, [newName]: [] }));
    setActiveChatName(newName);
    return newName;
  }, [allChats]);

  const handleSelectChat = useCallback((name: string) => {
    setActiveChatName(name);
  }, []);

  const handleDeleteChat = useCallback((name: string) => {
    setAllChats(prev => {
      const newChats = { ...prev };
      delete newChats[name];
      return newChats;
    });

    setFolderStructure(prev => {
      const newItemFolderMap = { ...prev.itemFolderMap };
      if (newItemFolderMap.hasOwnProperty(name)) {
        delete newItemFolderMap[name];
      }
      return { ...prev, itemFolderMap: newItemFolderMap };
    });

    if (activeChatName === name) {
      setActiveChatName(null);
    }
  }, [activeChatName]);

  const handleRenameChat = useCallback((oldName: string, newName: string): boolean => {
    if (!newName || newName.trim().length === 0) {
      toast({ title: "Invalid Name", description: "Chat name cannot be empty.", variant: "destructive" });
      return false;
    }
    if (newName === oldName) return true;
    if (allChats.hasOwnProperty(newName)) {
      toast({ title: "Cannot Rename", description: `A chat named "${newName}" already exists.`, variant: "destructive" });
      return false;
    }

    setAllChats(prev => {
      const content = prev[oldName];
      const { [oldName]: _, ...rest } = prev;
      return { ...rest, [newName]: content };
    });

    // Update folder structure map if the chat is in a folder (or unorganized map entry)
    setFolderStructure(prev => {
      const newItemFolderMap = { ...prev.itemFolderMap };
      if (newItemFolderMap.hasOwnProperty(oldName)) {
        const folderId = newItemFolderMap[oldName];
        delete newItemFolderMap[oldName];
        newItemFolderMap[newName] = folderId;
      }
      return { ...prev, itemFolderMap: newItemFolderMap };
    });

    setActiveChatName(currentActive =>
      currentActive === oldName ? newName : currentActive
    );

    toast({ title: "Chat Renamed", description: `"${oldName}" is now "${newName}".` })
    return true;
  }, [allChats, toast]);

  const handleSendMessage = useCallback(async (prompt: string, pdfProxy?: PDFDocumentProxy | null) => {
    if (!prompt.trim() || !aiClient.current || !activeChatName) return;

    const newUserMessage: ChatMessage = { role: 'user', content: prompt };
    setAllChats(prev => ({
      ...prev,
      [activeChatName]: [...(prev[activeChatName] || []), newUserMessage]
    }));
    setIsGeneratingResponse(true);

    const systemPrompt = "The query is by a learning student. Your response should be short, concise, without fillers, and framed in a way that helps the student understand and learn properly. Use markdown for formatting like bolding and lists where appropriate.";

    let contextText = "";
    if (selectedContextPages.size > 0 && pdfProxy) {
      try {
        const pageTexts: string[] = [];
        const sortedPages = Array.from(selectedContextPages).sort((a, b) => a - b);
        for (const pageNum of sortedPages) {
          const page = await pdfProxy.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          pageTexts.push(`--- Page ${pageNum} Content ---\n${pageText}`);
        }
        contextText = `The user has provided the following context from the document. The user may ask a question related to this, so please keep it in mind:\n\n${pageTexts.join('\n\n')}`;
      } catch (error) {
        console.error("Error extracting text from PDF pages:", error);
        toast({ title: "Context Error", description: "Could not extract text from the selected pages.", variant: "destructive" });
      }
    }

    setSelectedContextPages(new Set());

    try {
      // Get the current conversation history
      const conversationHistory = allChats[activeChatName] || [];

      // Build the contents array for Gemini with full conversation history
      const contents = [
        // System instruction as the first user message
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I will provide concise, educational responses.' }] },
      ];

      // Add PDF context if available (as a user message)
      if (contextText) {
        contents.push({ role: 'user', parts: [{ text: contextText }] });
        contents.push({ role: 'model', parts: [{ text: 'I have reviewed the document context you provided.' }] });
      }

      // Add the full conversation history
      conversationHistory.forEach((msg) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });

      // Add the new user message
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const result = await aiClient.current.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      // Initialize streaming content
      setStreamingContent('');

      let fullText = '';
      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          setStreamingContent(prev => prev + chunkText);
        }
      }

      // Add final message to chat history
      const aiResponse: ChatMessage = { role: 'model', content: fullText };
      setAllChats(prev => ({
        ...prev,
        [activeChatName]: [...prev[activeChatName], aiResponse]
      }));
    } catch (e: any) {
      console.error("Gemini Error:", e);
      const errorMessage: ChatMessage = { role: 'model', content: `Error: ${e.message || "Unknown error occurred"}` };
      setAllChats(prev => ({
        ...prev,
        [activeChatName]: [...prev[activeChatName], errorMessage]
      }));
      toast({ title: "AI Error", description: "Could not get a response from the AI.", variant: "destructive" });
    } finally {
      setIsGeneratingResponse(false);
      setStreamingContent(null);
    }
  }, [toast, activeChatName, selectedContextPages, allChats]);

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

  const handleMoveChat = useCallback((chatName: string, targetFolderId: string | null) => {
    setFolderStructure(prev => ({
      ...prev,
      itemFolderMap: moveItemToFolder(chatName, targetFolderId, prev.itemFolderMap)
    }));
  }, []);

  return {
    allChats,
    activeChatName,
    isGeneratingResponse,
    selectedContextPages,
    setSelectedContextPages,
    handleCreateNewChat,
    handleSelectChat,
    handleDeleteChat,
    handleRenameChat,
    handleSendMessage,
    // Folder management
    folderStructure,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveChat,
    streamingContent,
  };
};