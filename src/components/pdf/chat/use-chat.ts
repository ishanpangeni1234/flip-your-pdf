// src/components/pdf/chat/use-chat.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { getStoredChats, storeChats } from '@/lib/pdf-storage';
import type { ChatMessage } from './PDFChat';

interface UseChatProps {
  fileName: string;
}

export const useChat = ({ fileName }: UseChatProps) => {
  const [allChats, setAllChats] = useState<{ [key: string]: ChatMessage[] }>({});
  const [activeChatName, setActiveChatName] = useState<string | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [selectedContextPages, setSelectedContextPages] = useState<Set<number>>(new Set());
  
  const debouncedChats = useDebounce(allChats, 1000);
  const { toast } = useToast();
  const aiClient = useRef<GoogleGenAI | null>(null);

  // Initialize Gemini Client
  useEffect(() => {
    // IMPORTANT: Storing API keys directly in code is not secure for production.
    // Consider using environment variables.
    const apiKey = "AIzaSyAlAylJfvQd15zgdymkHagWW-5nVjQtsac";
    if (apiKey) {
      // FIX: The API key must be passed inside an options object.
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

  // Load chats from storage on initial render or when file changes
  useEffect(() => {
    const loadChats = async () => {
      const storedChats = await getStoredChats(fileName);
      setAllChats(storedChats || {});
      setActiveChatName(null);
    };
    if (fileName) {
      loadChats();
    }
  }, [fileName]);

  // Save chats to storage when they change (debounced)
  useEffect(() => {
    if (fileName && (Object.keys(debouncedChats).length > 0 || getStoredChats(fileName) !== null)) {
      storeChats(fileName, debouncedChats);
    }
  }, [debouncedChats, fileName]);

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
        const newChats = {...prev};
        delete newChats[name];
        return newChats;
    });
    if (activeChatName === name) {
        setActiveChatName(null);
    }
  }, [activeChatName]);

  const handleRenameChat = useCallback((oldName: string, newName: string): boolean => {
      if (!newName || newName.trim().length === 0) {
        toast({ title: "Invalid Name", description: "Chat name cannot be empty.", variant: "destructive"});
        return false;
      }
      if (newName === oldName) return true;
      if (allChats.hasOwnProperty(newName)) {
          toast({ title: "Cannot Rename", description: `A chat named "${newName}" already exists.`, variant: "destructive"});
          return false;
      }

      setAllChats(prev => {
          const content = prev[oldName];
          const { [oldName]: _, ...rest } = prev;
          return { ...rest, [newName]: content };
      });
      
      setActiveChatName(currentActive =>
        currentActive === oldName ? newName : currentActive
      );
      
      toast({ title: "Chat Renamed", description: `"${oldName}" is now "${newName}".`})
      return true;
  }, [allChats, toast]);

  const handleSendMessage = useCallback(async (prompt: string, pdfProxy: PDFDocumentProxy | null) => {
    if (!prompt.trim() || !aiClient.current || !pdfProxy || !activeChatName) return;
    
    const newUserMessage: ChatMessage = { role: 'user', content: prompt };
    setAllChats(prev => ({
        ...prev,
        [activeChatName]: [...(prev[activeChatName] || []), newUserMessage]
    }));
    setIsGeneratingResponse(true);

    const systemPrompt = "The query is by a learning student. Your response should be short, concise, without fillers, and framed in a way that helps the student understand and learn properly. Use markdown for formatting like bolding and lists where appropriate.";
    
    let contextText = "";
    if (selectedContextPages.size > 0) {
      try {
        const pageTexts: string[] = [];
        const sortedPages = Array.from(selectedContextPages).sort((a,b) => a-b);
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

    const finalPrompt = `${systemPrompt}\n\n${contextText ? contextText + '\n\n' : ''}User Question: ${prompt}`;
    setSelectedContextPages(new Set());

    try {
      const res = await aiClient.current.models.generateContent({
        model: "gemini-2.5-flash",
        contents: finalPrompt,
      });
      const aiResponse: ChatMessage = { role: 'model', content: res.text };
      setAllChats(prev => ({
          ...prev,
          [activeChatName]: [...prev[activeChatName], aiResponse]
      }));
    } catch (e: any) {
      const errorMessage: ChatMessage = { role: 'model', content: `Error: ${e.message}` };
      setAllChats(prev => ({
          ...prev,
          [activeChatName]: [...prev[activeChatName], errorMessage]
      }));
      toast({ title: "AI Error", description: "Could not get a response from the AI.", variant: "destructive" });
    } finally {
      setIsGeneratingResponse(false);
    }
  }, [toast, activeChatName, selectedContextPages]);

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
  };
};