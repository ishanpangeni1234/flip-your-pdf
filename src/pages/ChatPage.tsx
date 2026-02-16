import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Chat } from '@/components/chat/Chat';
import { useChat } from '@/components/chat/use-chat';

const ChatPage = () => {
    const {
        allChats,
        activeChatName,
        isGeneratingResponse,
        selectedContextPages,
        setSelectedContextPages,
        handleCreateNewChat,
        handleSelectChat,
        handleDeleteChat,
        handleRenameChat,
        handleSendMessage
    } = useChat({ fileName: 'standalone-chat' });

    return (
        <Layout>
            <div className="flex-1 h-[calc(100vh-73px)] overflow-hidden bg-background">
                <Chat
                    allChats={allChats}
                    activeChatName={activeChatName}
                    onSendMessage={(prompt) => handleSendMessage(prompt)}
                    isGenerating={isGeneratingResponse}
                    currentPage={0}
                    totalPages={0}
                    selectedPages={selectedContextPages}
                    onSelectedPagesChange={setSelectedContextPages}
                    onCreateNewChat={handleCreateNewChat}
                    onSelectChat={handleSelectChat}
                    onRenameChat={handleRenameChat}
                    onDeleteChat={handleDeleteChat}
                    isFocusMode={false}
                    onToggleFocusMode={() => { }} // No focus mode in standalone page for now
                    defaultSidebarOpen={true}
                />
            </div>
        </Layout>
    );
};

export default ChatPage;
