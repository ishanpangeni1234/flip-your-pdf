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
import { Send, Bot, User, Paperclip, MessageSquare, PlusCircle, Trash2, Pencil, PanelLeftClose, ChevronRight, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface PDFChatProps {
  allChats: { [key: string]: ChatMessage[] };
  activeChatName: string | null;
  onSendMessage: (prompt: string) => void;
  isGenerating: boolean;
  currentPage: number;
  totalPages: number;
  selectedPages: Set<number>;
  onSelectedPagesChange: React.Dispatch<React.SetStateAction<Set<number>>>;
  onCreateNewChat: () => void;
  onSelectChat: (name: string) => void;
  onRenameChat: (oldName: string, newName: string) => boolean;
  onDeleteChat: (name: string) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export const PDFChat = ({ allChats, activeChatName, onSendMessage, isGenerating, currentPage, totalPages, selectedPages, onSelectedPagesChange, onCreateNewChat, onSelectChat, onRenameChat, onDeleteChat, isFocusMode, onToggleFocusMode }: PDFChatProps) => {
  const currentMessages = activeChatName ? allChats[activeChatName] ?? [] : [];
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sidebar and rename state
  const [isChatListOpen, setIsChatListOpen] = useState(false); // Pinned state
  const [isHoverMode, setIsHoverMode] = useState(false); // Temporary hover state
  const [renamingName, setRenamingName] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const showSidebar = isChatListOpen || isHoverMode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating || !activeChatName) return;
    onSendMessage(input);
    setInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isGenerating]);

  useEffect(() => {
    if (renamingName) inputRef.current?.focus();
  }, [renamingName]);
  
  useEffect(() => {
    // When active chat changes, clear any renaming state
    setRenamingName(null);
  }, [activeChatName]);


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

  const handleFinishRename = () => {
    if (renamingName) {
        const success = onRenameChat(renamingName, inputValue);
        if (success) {
            setRenamingName(null);
            setInputValue("");
        }
    } else {
        setInputValue("");
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleFinishRename();
    if (e.key === 'Escape') { setRenamingName(null); setInputValue(""); }
  };
  
  const startRename = (name: string) => { setRenamingName(name); setInputValue(name); };

  const handlePinClick = () => { setIsChatListOpen(true); setIsHoverMode(false); };
  const handlePeekHover = () => { if (!isChatListOpen) setIsHoverMode(true); };
  const handleSidebarLeave = () => { if (isHoverMode) setIsHoverMode(false); };
  const handleUnpinClick = () => { setIsChatListOpen(false); setIsHoverMode(false); };

  return (
    <TooltipProvider>
      <Card className={cn("h-full w-full flex flex-col rounded-none border-0 md:border-l", isFocusMode && 'md:border-l-0')}>
        <CardHeader className="p-1 border-b flex-row items-center justify-between">
            <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={isChatListOpen ? handleUnpinClick : handlePinClick}
                      onMouseEnter={handlePeekHover}
                    >
                      {isChatListOpen ? <PanelLeftClose className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{isChatListOpen ? 'Close chat list' : 'Hover to peek, click to pin'}</p>
                  </TooltipContent>
                </Tooltip>
            </div>
            <CardTitle className="text-base truncate flex items-center gap-2 font-medium text-muted-foreground">
                <Bot className="h-5 w-5" />
                <span>AI Chat</span>
            </CardTitle>
            <div className='flex items-center'> {/* Right side controls */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onToggleFocusMode}>
                            {isFocusMode ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}</p></TooltipContent>
                </Tooltip>
            </div>
        </CardHeader>

        <div className="flex flex-1 min-h-0">
          <div 
            className={cn( 
              "flex flex-col bg-muted/20 transition-all duration-300 ease-in-out",
              showSidebar ? "w-64 border-r" : "w-0 overflow-hidden"
            )}
            onMouseLeave={handleSidebarLeave}
          >
              <div className="flex items-center justify-between p-2 border-b flex-shrink-0">
                <h3 className="font-semibold text-sm truncate ml-2">My Chats</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <Button onClick={onCreateNewChat} className="w-full justify-start mb-2" disabled={!!renamingName}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Chat
                </Button>
                <div className="my-2 h-px bg-border" />
                <div className="flex flex-col gap-1 mt-1">
                    {Object.keys(allChats).map(name => (
                        renamingName === name ? (
                            <div key={`renaming-${name}`} className="p-1">
                                <Input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleFinishRename} className="h-9"/>
                            </div>
                        ) : (
                            <Button key={name} variant={activeChatName === name ? "secondary" : "ghost"} onClick={() => onSelectChat(name)} className="w-full justify-start truncate h-9 group pr-2">
                                <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate flex-1 text-left">{name}</span>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); startRename(name);}}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Rename</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteChat(name);}}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Delete</p></TooltipContent></Tooltip>
                                </div>
                            </Button>
                        )
                    ))}
                </div>
              </div>
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            {!activeChatName ? (
              <div className="h-full flex items-center justify-center p-4">
                <p className="text-muted-foreground text-center">Select or create a chat to begin.</p>
              </div>
            ) : (
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {currentMessages.map((message, index) => (
                    <div key={index} className={cn("flex items-start gap-3 w-full", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {message.role === 'model' && ( <div className="p-2 rounded-full bg-muted flex-shrink-0"><Bot size={18} /></div> )}
                      <div className={cn("rounded-lg p-3 text-sm max-w-[85%]", message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {message.role === 'user' ? ( <pre className="whitespace-pre-wrap font-sans">{message.content}</pre> ) : (
                          <div className="prose max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{message.content}</ReactMarkdown></div>
                        )}
                      </div>
                      {message.role === 'user' && ( <div className="p-2 rounded-full bg-primary text-primary-foreground flex-shrink-0"><User size={18} /></div> )}
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-muted flex-shrink-0"><Bot size={18} /></div>
                      <div className="rounded-lg p-3 text-sm bg-muted flex items-center space-x-2">
                        <span className="animate-pulse">●</span><span className="animate-pulse [animation-delay:0.2s]">●</span><span className="animate-pulse [animation-delay:0.4s]">●</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
        
                {!isFocusMode && contextPages.length > 0 && (
                  <div className="border-t p-3 px-4 bg-background">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2"><Paperclip className="h-3 w-3" /> Include context from page(s):</Label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {contextPages.map(page => (
                        <div key={`ctx-page-${page}`} className="flex items-center space-x-2">
                          <Checkbox id={`page-${page}`} checked={selectedPages.has(page)} onCheckedChange={() => handlePageSelectToggle(page)} disabled={isGenerating} />
                          <Label htmlFor={`page-${page}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Page {page}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
        
                <div className="border-t p-3 bg-background">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." disabled={isGenerating || !activeChatName} className="pdf-chat-input" />
                    <Button type="submit" size="icon" disabled={!input.trim() || isGenerating || !activeChatName}><Send className="h-4 w-4" /></Button>
                  </form>
                </div>
              </CardContent>
            )}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};