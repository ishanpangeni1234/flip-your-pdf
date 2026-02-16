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
    pdfId: string;
    chats: { [chatName: string]: ChatMessage[] };
    updatedAt: Timestamp;
}

export interface StoredNotes {
    userId: string;
    pdfId: string;
    notes: { [sheetName: string]: string };
    updatedAt: Timestamp;
}

// --- Chats Service ---

export const saveChatsToCloud = async (userId: string, pdfId: string, chats: { [chatName: string]: ChatMessage[] }) => {
    const docRef = doc(db, "users", userId, "chats", pdfId);
    await setDoc(docRef, {
        userId,
        pdfId,
        chats,
        updatedAt: Timestamp.now()
    });
};

export const getChatsFromCloud = async (userId: string, pdfId: string): Promise<{ [chatName: string]: ChatMessage[] } | null> => {
    const docRef = doc(db, "users", userId, "chats", pdfId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return (docSnap.data() as StoredChats).chats;
    }
    return null;
};

// --- Notes Service ---

export const saveNotesToCloud = async (userId: string, pdfId: string, notes: { [sheetName: string]: string }) => {
    const docRef = doc(db, "users", userId, "notes", pdfId);
    await setDoc(docRef, {
        userId,
        pdfId,
        notes,
        updatedAt: Timestamp.now()
    });
};

export const getNotesFromCloud = async (userId: string, pdfId: string): Promise<{ [sheetName: string]: string } | null> => {
    const docRef = doc(db, "users", userId, "notes", pdfId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return (docSnap.data() as StoredNotes).notes;
    }
    return null;
};
