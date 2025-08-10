// src/components/pdf/chat/use-chat.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
// Import the `toast` function to infer its type
import { toast } from '@/hooks/use-toast';
import type { ChatMessage } from './PDFChat';

// Infer the toast properties type from the toast function's parameters
type ToastProps = Parameters<typeof toast>[0];

interface UseChatProps {
  pdfProxy: PDFDocumentProxy | null;
  // Use the inferred type for the toast function prop
  toast: (options: ToastProps) => void;
}

export const useChat = ({ pdfProxy, toast }: UseChatProps) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [selectedContextPages, setSelectedContextPages] = useState<Set<number>>(new Set());
  const aiClient = useRef<GoogleGenAI | null>(null);

  // Initialize Gemini Client
  useEffect(() => {
    aiClient.current = new GoogleGenAI({
      apiKey: "AIzaSyAlAylJfvQd15zgdymkHagWW-5nVjQtsac",
    });
  }, []);

  const handleSendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || !aiClient.current || !pdfProxy) return;
    
    const newUserMessage: ChatMessage = { role: 'user', content: prompt };
    setChatMessages(prev => [...prev, newUserMessage]);
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

    // Clear selected pages for the next message
    setSelectedContextPages(new Set());

    try {
      const res = await aiClient.current.models.generateContent({
        model: "gemini-2.5-flash",
        contents: finalPrompt,
      });
      const aiResponse: ChatMessage = { role: 'model', content: res.text };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (e: any) {
      const errorMessage: ChatMessage = { role: 'model', content: `Error: ${e.message}` };
      setChatMessages(prev => [...prev, errorMessage]);
      toast({ title: "AI Error", description: "Could not get a response from the AI.", variant: "destructive" });
    } finally {
      setIsGeneratingResponse(false);
    }
  }, [toast, pdfProxy, selectedContextPages]);

  return {
    chatMessages,
    isGeneratingResponse,
    selectedContextPages,
    setSelectedContextPages,
    handleSendMessage,
    clearChat: () => setChatMessages([]),
  };
};