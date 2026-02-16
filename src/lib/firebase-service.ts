import { db } from "./firebase";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDocs,
    Timestamp
} from "firebase/firestore";
import type { FolderStructure } from "./folder-types";

// --- Types ---
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export interface StoredChats {
    userId: string;
    documentId: string;  // Can be a PDF filename or 'standalone-chat' for global chat
    chats: { [chatName: string]: ChatMessage[] };
    folderStructure?: FolderStructure; // Optional for backward compatibility
    updatedAt: Timestamp;
}

export interface StoredNotes {
    userId: string;
    documentId: string;  // Can be a PDF filename or 'standalone-notes' for global notes
    notes: { [sheetName: string]: string };
    folderStructure?: FolderStructure; // Optional for backward compatibility
    updatedAt: Timestamp;
}

// --- Chats Service ---

export const saveChatsToCloud = async (
    userId: string,
    documentId: string,
    chats: { [chatName: string]: ChatMessage[] },
    folderStructure?: FolderStructure
) => {
    const docRef = doc(db, "users", userId, "chats", documentId);
    await setDoc(docRef, {
        userId,
        documentId,
        chats,
        folderStructure: folderStructure || { folders: {}, itemFolderMap: {} },
        updatedAt: Timestamp.now()
    });
};

export const getChatsFromCloud = async (
    userId: string,
    documentId: string
): Promise<{ chats: { [chatName: string]: ChatMessage[] }, folderStructure: FolderStructure } | null> => {
    const docRef = doc(db, "users", userId, "chats", documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data() as StoredChats;
        return {
            chats: data.chats,
            folderStructure: data.folderStructure || { folders: {}, itemFolderMap: {} }
        };
    }
    return null;
};

// --- Notes Service ---

export const saveNotesToCloud = async (
    userId: string,
    documentId: string,
    notes: { [sheetName: string]: string },
    folderStructure?: FolderStructure
) => {
    const docRef = doc(db, "users", userId, "notes", documentId);
    await setDoc(docRef, {
        userId,
        documentId,
        notes,
        folderStructure: folderStructure || { folders: {}, itemFolderMap: {} },
        updatedAt: Timestamp.now()
    });
};

export const getNotesFromCloud = async (
    userId: string,
    documentId: string
): Promise<{ notes: { [sheetName: string]: string }, folderStructure: FolderStructure } | null> => {
    const docRef = doc(db, "users", userId, "notes", documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data() as StoredNotes;
        return {
            notes: data.notes,
            folderStructure: data.folderStructure || { folders: {}, itemFolderMap: {} }
        };
    }
    return null;
};
