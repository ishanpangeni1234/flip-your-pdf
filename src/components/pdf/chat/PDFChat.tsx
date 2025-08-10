// src/components/pdf/chat/PDFChat.tsx

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Send, Bot, User, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface PDFChatProps {
  messages: ChatMessage[];
  onSendMessage: (prompt: string) => void;
  isGenerating: boolean;
  currentPage: number;
  totalPages: number;
  selectedPages: Set<number>;
  onSelectedPagesChange: React.Dispatch<React.SetStateAction<Set<number>>>;
}

export const PDFChat = ({ messages, onSendMessage, isGenerating, currentPage, totalPages, selectedPages, onSelectedPagesChange }: PDFChatProps) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input);
    setInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const contextPages = [currentPage - 1, currentPage, currentPage + 1]
    .filter(p => p > 0 && p <= totalPages)
    .sort((a, b) => a - b);
    
  const handlePageSelectToggle = (page: number) => {
    const newSet = new Set(selectedPages);
    if (newSet.has(page)) {
      newSet.delete(page);
    } else {
      newSet.add(page);
    }
    onSelectedPagesChange(newSet);
  };

  return (
    <Card className="h-full w-full flex flex-col rounded-none border-0 md:border-l">
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-base truncate flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-medium text-muted-foreground">AI Chat</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={cn("flex items-start gap-3 w-full", message.role === 'user' ? 'justify-end' : 'justify-start')}>
              {message.role === 'model' && (
                <div className="p-2 rounded-full bg-muted flex-shrink-0"><Bot size={18} /></div>
              )}
              <div className={cn(
                "rounded-lg p-3 text-sm max-w-[85%]",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}>
                {message.role === 'user' ? (
                  <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                ) : (
                  <div className="prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="p-2 rounded-full bg-primary text-primary-foreground flex-shrink-0"><User size={18} /></div>
              )}
            </div>
          ))}
          {isGenerating && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-muted flex-shrink-0"><Bot size={18} /></div>
              <div className="rounded-lg p-3 text-sm bg-muted flex items-center space-x-2">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse [animation-delay:0.2s]">●</span>
                <span className="animate-pulse [animation-delay:0.4s]">●</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {contextPages.length > 0 && (
          <div className="border-t p-3 px-4 bg-background">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <Paperclip className="h-3 w-3" />
              Include context from page(s):
            </Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {contextPages.map(page => (
                <div key={`ctx-page-${page}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`page-${page}`}
                    checked={selectedPages.has(page)}
                    onCheckedChange={() => handlePageSelectToggle(page)}
                    disabled={isGenerating}
                  />
                  <Label htmlFor={`page-${page}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Page {page}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t p-3 bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isGenerating}
              className="pdf-chat-input"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isGenerating}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};