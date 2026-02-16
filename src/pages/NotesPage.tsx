import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { PDFNotes } from '@/components/pdf/note/PDFNotes';
import { useNotes } from '@/components/pdf/note/use-notes';

const NotesPage = () => {
    const {
        notes,
        activeNoteSheet,
        handleCreateNewNote,
        handleSelectNote,
        handleNoteChange,
        handleDeleteNote,
        handleRenameNote
    } = useNotes('global');

    return (
        <Layout>
            <div className="flex-1 h-[calc(100vh-73px)] overflow-hidden bg-editor-background">
                <PDFNotes
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
