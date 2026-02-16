import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Notes } from '@/components/note/Notes';
import { useNotes } from '@/components/note/use-notes';

const NotesPage = () => {
    const {
        notes,
        activeNoteSheet,
        handleCreateNewNote,
        handleSelectNote,
        handleNoteChange,
        handleDeleteNote,
        handleRenameNote
    } = useNotes('standalone-notes');

    return (
        <Layout>
            <div className="flex-1 h-[calc(100vh-73px)] overflow-hidden bg-editor-background">
                <Notes
                    activeSheetName={activeNoteSheet}
                    notes={notes}
                    onNoteChange={handleNoteChange}
                    onCreateNewNote={handleCreateNewNote}
                    onSelectNote={handleSelectNote}
                    onRenameNote={handleRenameNote}
                    onDeleteNote={handleDeleteNote}
                    isFocusMode={false}
                    onToggleFocusMode={() => { }} // No focus mode in standalone page for now
                    defaultSidebarOpen={true}
                />
            </div>
        </Layout>
    );
};

export default NotesPage;
