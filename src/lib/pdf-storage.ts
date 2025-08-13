// src/lib/pdf-storage.ts

const DB_NAME = "PDFViewerDB";
const PDF_STORE_NAME = "pdfStore";
const NOTES_STORE_NAME = "notesStore";
const CHATS_STORE_NAME = "chatsStore"; // New Constant
const DB_VERSION = 3; // Incremented version to trigger onupgradeneeded

interface StoredPDF {
  id: string; // Should be a unique identifier, e.g., 'current_pdf'
  file: File;
  timestamp: Date;
}

interface StoredNotes {
  pdfId: string; // Links notes to a specific PDF (using file.name)
  notes: { [sheetName: string]: string };
  timestamp: Date;
}

// New Interfaces for Chats
interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface StoredChats {
  pdfId: string;
  chats: { [chatName: string]: ChatMessage[] };
  timestamp: Date;
}


// Opens the IndexedDB database.
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
        db.createObjectStore(PDF_STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(NOTES_STORE_NAME)) {
        db.createObjectStore(NOTES_STORE_NAME, { keyPath: "pdfId" });
      }
      // Add the new chat store if it doesn't exist
      if (!db.objectStoreNames.contains(CHATS_STORE_NAME)) {
        db.createObjectStore(CHATS_STORE_NAME, { keyPath: "pdfId" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(new Error("Failed to open IndexedDB."));
    };
  });
};

// --- PDF Storage ---

export const storePDF = async (file: File): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(PDF_STORE_NAME, "readwrite");
  const store = transaction.objectStore(PDF_STORE_NAME);

  // Clear any existing PDF first to only store one at a time.
  await new Promise((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => resolve(true);
    clearRequest.onerror = () => reject(clearRequest.error);
  });
  
  const pdfToStore: StoredPDF = {
    id: 'current_pdf', // Use a static ID for the single PDF
    file,
    timestamp: new Date(),
  };

  return new Promise((resolve, reject) => {
    const putRequest = store.put(pdfToStore);
    putRequest.onsuccess = () => {
      console.log("✅ PDF stored successfully.");
      resolve();
    };
    putRequest.onerror = () => reject(putRequest.error);
  });
};

export const getStoredPDF = async (): Promise<File | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PDF_STORE_NAME, "readonly");
    const store = transaction.objectStore(PDF_STORE_NAME);
    const getRequest = store.get('current_pdf');

    getRequest.onsuccess = () => {
      if (getRequest.result) {
        const stored = getRequest.result as StoredPDF;
        console.log("✅ PDF retrieved from IndexedDB:", stored.file.name);
        resolve(stored.file);
      } else {
        resolve(null);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

export const clearStoredPDF = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PDF_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PDF_STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Notes Storage ---

export const storeNotes = async (pdfId: string, notes: { [sheetName: string]: string }): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(NOTES_STORE_NAME, "readwrite");
  const store = transaction.objectStore(NOTES_STORE_NAME);
  
  const notesToStore: StoredNotes = {
    pdfId,
    notes,
    timestamp: new Date(),
  };

  return new Promise((resolve, reject) => {
    const request = store.put(notesToStore);
    request.onsuccess = () => {
      console.log(`✅ Notes for ${pdfId} stored.`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const getStoredNotes = async (pdfId: string): Promise<{ [sheetName: string]: string } | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(NOTES_STORE_NAME, "readonly");
    const store = transaction.objectStore(NOTES_STORE_NAME);
    const request = store.get(pdfId);

    request.onsuccess = () => {
      if (request.result) {
        const stored = request.result as StoredNotes;
        console.log(`✅ Notes for ${pdfId} retrieved.`);
        resolve(stored.notes);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearStoredNotes = async (pdfId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(NOTES_STORE_NAME, "readwrite");
    const store = transaction.objectStore(NOTES_STORE_NAME);
    const request = store.delete(pdfId);
    request.onsuccess = () => {
       console.log(`✅ Notes for ${pdfId} cleared.`);
       resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

// --- Chats Storage ---

export const storeChats = async (pdfId: string, chats: { [chatName: string]: ChatMessage[] }): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(CHATS_STORE_NAME, "readwrite");
  const store = transaction.objectStore(CHATS_STORE_NAME);
  
  const chatsToStore: StoredChats = {
    pdfId,
    chats,
    timestamp: new Date(),
  };

  return new Promise((resolve, reject) => {
    const request = store.put(chatsToStore);
    request.onsuccess = () => {
      console.log(`✅ Chats for ${pdfId} stored.`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const getStoredChats = async (pdfId: string): Promise<{ [chatName: string]: ChatMessage[] } | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHATS_STORE_NAME, "readonly");
    const store = transaction.objectStore(CHATS_STORE_NAME);
    const request = store.get(pdfId);

    request.onsuccess = () => {
      if (request.result) {
        const stored = request.result as StoredChats;
        console.log(`✅ Chats for ${pdfId} retrieved.`);
        resolve(stored.chats);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearStoredChats = async (pdfId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHATS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(CHATS_STORE_NAME);
    const request = store.delete(pdfId);
    request.onsuccess = () => {
       console.log(`✅ Chats for ${pdfId} cleared.`);
       resolve();
    };
    request.onerror = () => reject(request.error);
  });
};