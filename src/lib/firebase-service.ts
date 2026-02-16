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

// --- Types ---
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export interface StoredChats {
    userId: string;
    documentId: string;  // Can be a PDF filename or 'standalone-chat' for global chat
    chats: { [chatName: string]: ChatMessage[] };
    updatedAt: Timestamp;
}

export interface StoredNotes {
    userId: string;
    documentId: string;  // Can be a PDF filename or 'standalone-notes' for global notes
    notes: { [sheetName: string]: string };
    updatedAt: Timestamp;
}

// --- Chats Service ---

export const saveChatsToCloud = async (userId: string, documentId: string, chats: { [chatName: string]: ChatMessage[] }) => {
    const docRef = doc(db, "users", userId, "chats", documentId);
    await setDoc(docRef, {
        userId,
        documentId,
        chats,
        updatedAt: Timestamp.now()
    });
};

export const getChatsFromCloud = async (userId: string, documentId: string): Promise<{ [chatName: string]: ChatMessage[] } | null> => {
    const docRef = doc(db, "users", userId, "chats", documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return (docSnap.data() as StoredChats).chats;
    }
    return null;
};

// --- Notes Service ---

export const saveNotesToCloud = async (userId: string, documentId: string, notes: { [sheetName: string]: string }) => {
    const docRef = doc(db, "users", userId, "notes", documentId);
    await setDoc(docRef, {
        userId,
        documentId,
        notes,
        updatedAt: Timestamp.now()
    });
};

export const getNotesFromCloud = async (userId: string, documentId: string): Promise<{ [sheetName: string]: string } | null> => {
    const docRef = doc(db, "users", userId, "notes", documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return (docSnap.data() as StoredNotes).notes;
    }
    return null;
};
